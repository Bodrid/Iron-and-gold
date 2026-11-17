// The AI at sea: warships, raids, escorts and invasions. Ports and shipyards are chosen by the normal build logic.
import { COAST_BIT } from '../../map/format';
import { getStateTiles } from '../../map/stateTiles';
import { SHIPS } from '../../content/ships';
import { GOODS } from '../../content/goods';
import { nextRandom } from '../rng';
import { canReach, shipyardLevel, validOrder } from '../naval/ships';
import { invasionPlan, landingCell } from '../naval/invasion';
import { portCell } from '../naval/nav';
import { portStates, routesOf } from '../naval/trade';
import type { Command, Country, CountryId, GameState } from '../types';

function warshipsOf(state: GameState, c: CountryId) { return state.ships.filter(s => s.owner === c && s.kind === 'warship'); }

/** A coastal tile of `target` (0 = unclaimed) reachable by sea from one of our ports, nearest to that port. */
export function findBeach(state: GameState, c: Country, target: CountryId, limitStates = 40): number {
  const ports = portStates(state, c.id);
  if (!ports.length) return -1;
  const pcs = ports.map(p => portCell(state.map, p));
  let best = -1, bestD = Infinity;
  let checked = 0;
  for (const st of state.states) {
    if (!st.id || !state.map.states[st.id].coastal) continue;
    if (target === 0 ? st.owner !== 0 : st.owner !== target) continue;
    if (++checked > limitStates) break;
    const tiles = getStateTiles(state.map, st.id);
    for (let k = 0; k < tiles.length; k += 3) {
      const t = tiles[k];
      if (!(state.map.terrain[t] & COAST_BIT) || state.controller[t] !== target) continue;
      const lc = landingCell(state, t);
      for (const pc of pcs) {
        if (!canReach(state, pc, lc)) continue;
        const d = Math.abs((lc % 300) - (pc % 300)) + Math.abs(Math.floor(lc / 300) - Math.floor(pc / 300));
        if (d < bestD) { bestD = d; best = t; }
      }
    }
  }
  return best;
}

export function navalDecisions(state: GameState, c: Country, enemies: CountryId[], landNeighbours: Set<CountryId>, ratio: number, issue: (cmd: Command) => void, navyWeight: number, level = 1): void {
  const ports = portStates(state, c.id);
  if (!ports.length) return;
  const fleet = warshipsOf(state, c.id);
  const routes = routesOf(state, c.id);
  const atWar = enemies.length > 0;

  // Build warships: a few to escort trade in peacetime, more at war.
  const wanted = Math.round((Math.min(3, routes.length / 2) + (atWar ? 3 : 0)) * navyWeight);
  const queued = state.shipBuilds.filter(b => b.country === c.id).length;
  if (fleet.length + queued < wanted) {
    const yard = ports.find(p => shipyardLevel(state, p, c.id) > state.shipBuilds.filter(b => b.state === p).length);
    const def = SHIPS.warship;
    const affordable = c.money - def.cost > 3 * c.troops * 0.1 && GOODS.every(g => (def.inputs[g] ?? 0) <= c.stockpile[g]);
    if (yard && affordable) issue({ type: 'buildShip', country: c.id, state: yard, kind: 'warship' });
  }

  // Orders: raid enemy trade at war (or under a privateer licence), otherwise escort our routes.
  const preyOn = [...enemies, ...state.privateers.filter(p => p.from === c.id).map(p => p.target)];
  for (const w of fleet) {
    if (w.order.type === 'escort' || (w.order.type === 'raid' && preyOn.length)) continue;   // raiders find new work once nobody is prey
    if (preyOn.length) {
      const prey = state.ships.find(s => s.kind === 'trade' && state.tradeRoutes.some(r => r.id === s.routeId && r.exporter !== c.id && r.importer !== c.id && (preyOn.includes(r.exporter) || preyOn.includes(r.importer))) && canReach(state, w.cell, s.cell));
      if (prey) {
        const order = { type: 'raid' as const, cell: prey.cell };
        if (!validOrder(state, w, order)) { issue({ type: 'orderShip', country: c.id, shipId: w.id, order }); continue; }
      }
    }
    // Very Hard and above guard their most valuable routes first.
    const byValue = level >= 3 ? [...routes].sort((a, b) => b.amount * state.countries[b.exporter].prices[b.good] - a.amount * state.countries[a.exporter].prices[a.good] || a.id - b.id) : routes;
    const r = byValue.find(x => !state.ships.some(s => s.order.type === 'escort' && s.order.routeId === x.id));
    if (r) {
      const order = { type: 'escort' as const, routeId: r.id };
      if (!validOrder(state, w, order)) issue({ type: 'orderShip', country: c.id, shipId: w.id, order });
    }
  }

  // Invasions: one boat at a time, planned about once a month (finding a beach is the expensive part).
  if ((Math.floor(state.tick / 4) + c.id) % 30 >= 7) return;
  if (state.ships.some(s => s.owner === c.id && s.order.type === 'invade')) return;
  if (c.troops < c.maxTroops * 0.5) return;
  const targets: CountryId[] = enemies.filter(e => !landNeighbours.has(e));
  if (!landNeighbours.has(0) && nextRandom(state) < 0.5) targets.push(0);
  for (const target of targets) {
    const tile = findBeach(state, c, target);
    if (tile < 0) continue;
    const cmd: Extract<Command, { type: 'navalInvasion' }> = { type: 'navalInvasion', country: c.id, target, tile, ratio };
    if (!('error' in invasionPlan(state, cmd))) { issue(cmd); return; }
  }
}
