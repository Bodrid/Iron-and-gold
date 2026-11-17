// Naval invasions: troops sail to a beach and fight on from there, OpenFront-style.
import { COAST_BIT, Terrain, TERRAIN_MASK } from '../../map/format';
import { SHIPS } from '../../content/ships';
import { BALANCE } from '../balance';
import { canAttack, launchAttackFrom } from '../combat';
import { handlers, systems } from '../registry';
import type { Command, CountryId, GameState, Ship, SimEvent } from '../types';
import { getNavGrid, NAV_CELL, portCell, seaPath } from './nav';
import { canReach, lane, removeShip, sailTo } from './ships';
import { portStates } from './trade';

const N = BALANCE.navy;

/** A navigable cell next to a coastal tile, or -1. */
export function landingCell(state: GameState, tile: number): number {
  const g = getNavGrid(state.map);
  const x = Math.floor((tile % state.map.width) / NAV_CELL), y = Math.floor(Math.floor(tile / state.map.width) / NAV_CELL);
  let best = -1, bestD = Infinity;
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    const cx = x + dx, cy = y + dy;
    if (cx < 0 || cy < 0 || cx >= g.w || cy >= g.h) continue;
    const c = cy * g.w + cx;
    const d = dx * dx + dy * dy;
    if (g.sea[c] && d < bestD) { bestD = d; best = c; }
  }
  return best;
}

function attackableBeach(state: GameState, attacker: CountryId, target: CountryId, tile: number): boolean {
  const b = state.map.terrain[tile];
  if (!state.map.stateOf[tile] || !(b & COAST_BIT) || (b & TERRAIN_MASK) === Terrain.Lake) return false;
  return state.controller[tile] === target && canAttack(state, attacker, target);
}

/** Nearest beach within reach of the ship that the attacker may land on (same target first, then any). */
function rerouteBeach(state: GameState, s: Ship, target: CountryId): { tile: number; target: CountryId } | null {
  const g = getNavGrid(state.map);
  const W = state.map.width;
  const [cx, cy] = [(s.cell % g.w) * NAV_CELL, Math.floor(s.cell / g.w) * NAV_CELL];
  const r = N.REROUTE_CELLS * NAV_CELL;
  let best: { tile: number; target: CountryId } | null = null, bestD = Infinity;
  for (let y = Math.max(0, cy - r); y < Math.min(state.map.height, cy + r); y++) for (let x = Math.max(0, cx - r); x < Math.min(W, cx + r); x++) {
    const t = y * W + x;
    if (!(state.map.terrain[t] & COAST_BIT) || !state.map.stateOf[t]) continue;
    const k = state.controller[t];
    if (k === s.owner || !attackableBeach(state, s.owner, k, t)) continue;
    const lc = landingCell(state, t);
    if (!canReach(state, s.cell, lc)) continue;
    const d = (x - cx) * (x - cx) + (y - cy) * (y - cy) + (k === target ? 0 : 1e6);
    if (d < bestD) { bestD = d; best = { tile: t, target: k }; }
  }
  return best;
}

function goHome(state: GameState, s: Ship, events: SimEvent[]) {
  const c = state.countries[s.owner];
  c.troops += s.troops ?? 0;
  s.troops = 0;
  if (s.temp) { removeShip(state, s, null); return; }
  const port = portStates(state, s.owner).find(p => canReach(state, s.cell, portCell(state.map, p)));
  if (!port) { removeShip(state, s, events); return; }
  s.order = { type: 'idle', port };
  sailTo(state, s, portCell(state.map, port));
}

export function invasionArrivals(state: GameState, events: SimEvent[], changed: number[] = []): void {
  for (const s of state.ships.slice()) {
    if (s.order.type !== 'invade' || !state.ships.includes(s)) continue;
    const path = lane(state, s);
    if (path && s.pathPos < path.length - 1) continue;
    let { tile, target } = s.order;
    if (!attackableBeach(state, s.owner, target, tile)) {
      const alt = rerouteBeach(state, s, target);
      if (!alt) { goHome(state, s, events); continue; }
      ({ tile, target } = alt);
      if (landingCell(state, tile) !== s.cell) { s.order = { type: 'invade', tile, target }; sailTo(state, s, landingCell(state, tile)); continue; }
    }
    const left = launchAttackFrom(state, s.owner, target, s.troops ?? 0, tile, changed);
    s.troops = left;
    goHome(state, s, events);
  }
}

/** What an invasion would use, or why it can't happen. Shared by the command handler and the AI. */
export function invasionPlan(state: GameState, cmd: Extract<Command, { type: 'navalInvasion' }>): { error: string } | { port: number; transport: Ship | undefined; troops: number; landing: number } {
  const c = state.countries[cmd.country];
  if (!(cmd.ratio >= 0.01 && cmd.ratio <= 1)) return { error: 'bad ratio' };
  if (!(cmd.tile >= 0 && cmd.tile < state.owner.length) || !attackableBeach(state, cmd.country, cmd.target, cmd.tile)) return { error: cmd.target && !canAttack(state, cmd.country, cmd.target) ? 'not at war' : 'bad landing' };
  const lc = landingCell(state, cmd.tile);
  const port = portStates(state, cmd.country).find(p => canReach(state, portCell(state.map, p), lc));
  if (!port) return { error: 'no port on that sea' };
  const transport = state.ships.find(s => s.owner === cmd.country && s.kind === 'transport' && !s.temp && s.order.type === 'idle' && canReach(state, s.cell, lc));
  const capacity = transport ? SHIPS.transport.capacity : N.BOAT_TROOPS_MAX;
  const troops = Math.min(capacity, Math.floor(c.troops * cmd.ratio));
  if (troops < BALANCE.combat.MIN_ATTACK_TROOPS * 2) return { error: 'not enough troops' };
  if (!seaPathOk(state, transport ? transport.cell : portCell(state.map, port), lc)) return { error: 'unreachable' };
  return { port, transport, troops, landing: lc };
}

function seaPathOk(state: GameState, from: number, to: number): boolean {
  return from === to || seaPath(state.map, from, to) !== null;
}

handlers.navalInvasion = (state, cmd: Extract<Command, { type: 'navalInvasion' }>) => {
  const plan = invasionPlan(state, cmd);
  if ('error' in plan) return plan.error;
  const { port, transport, troops, landing } = plan;
  state.countries[cmd.country].troops -= troops;
  const pc = portCell(state.map, port);
  const ship: Ship = transport ?? { id: state.nextId++, owner: cmd.country, kind: 'transport', cell: pc, fromCell: pc, toCell: pc, pathPos: 0, dir: 1, order: { type: 'idle', port }, hp: 1, temp: true };
  if (!transport) state.ships.push(ship);
  ship.troops = troops;
  ship.order = { type: 'invade', tile: cmd.tile, target: cmd.target };
  sailTo(state, ship, landing);
  return null;
};

systems.day.push((state, events, changed) => invasionArrivals(state, events, changed));
