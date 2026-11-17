// OpenFront-style attacks: an attack spends its troops taking frontier tiles one at a time, cheapest first.
import { getStateTiles } from '../map/stateTiles';
import { RIVER_BIT, Terrain, TERRAIN_MASK } from '../map/format';
import { BALANCE } from './balance';
import { controlListeners, setTile, statesControlledBy } from './control';
import { handlers, systems } from './registry';
import { tileHash } from './rng';
import { Heap } from './heap';
import { mods, pctMult } from './mods';
import { addCasualties, atWar, attackHooks } from './war';
import type { Attack, Command, CountryId, GameState, SimEvent } from './types';

const C = BALANCE.combat;

// ---- per-attack frontier heap (a cache; rebuilt from the map when missing, e.g. after loading a save) ----
const heaps = new WeakMap<Attack, Heap>();

function staticCost(state: GameState, tile: number): number {
  const b = state.map.terrain[tile];
  const tc = C.TERRAIN_COST;
  let c: number;
  switch (b & TERRAIN_MASK) {
    case Terrain.Forest: c = tc.forest; break;
    case Terrain.Hills: c = tc.hills; break;
    case Terrain.Mountains: c = tc.mountains; break;
    case Terrain.Desert: c = tc.desert; break;
    default: c = tc.plains;
  }
  return b & RIVER_BIT ? c * C.RIVER_MULT : c;
}

function heapKey(state: GameState, tile: number, attack: Attack): number {
  return Math.round(staticCost(state, tile) * 10) * 4294967296 + tileHash(tile, attack.id);
}

function isLand(state: GameState, t: number): boolean { return state.map.stateOf[t] !== 0; }

function forEachNeighbor(state: GameState, t: number, f: (n: number) => void) {
  const w = state.map.width, x = t % w;
  if (x > 0) f(t - 1);
  if (x < w - 1) f(t + 1);
  if (t >= w) f(t - w);
  if (t + w < state.owner.length) f(t + w);
}

function isFrontier(state: GameState, t: number, attack: Attack): boolean {
  if (!isLand(state, t) || state.controller[t] !== attack.target) return false;
  let ok = false;
  forEachNeighbor(state, t, n => { if (state.controller[n] === attack.attacker) ok = true; });
  return ok;
}

function scanFrontier(state: GameState, attack: Attack): Heap {
  const h = new Heap();
  for (const s of statesControlledBy(state, attack.attacker)) {
    for (const t of getStateTiles(state.map, s)) {
      if (state.controller[t] !== attack.attacker) continue;
      forEachNeighbor(state, t, n => { if (isLand(state, n) && state.controller[n] === attack.target) h.push(heapKey(state, n, attack), n); });
    }
  }
  heaps.set(attack, h);
  return h;
}

function heapOf(state: GameState, attack: Attack): Heap { return heaps.get(attack) ?? scanFrontier(state, attack); }

controlListeners.push((state, tile, controller) => {
  for (const a of state.attacks) {
    const h = heaps.get(a);
    if (!h) continue;
    if (a.attacker === controller) forEachNeighbor(state, tile, n => { if (isLand(state, n) && state.controller[n] === a.target) h.push(heapKey(state, n, a), n); });
    if (a.target === controller && isFrontier(state, tile, a)) h.push(heapKey(state, tile, a), tile);
  }
});

// ---- rules ----
export function canAttack(state: GameState, attacker: CountryId, target: CountryId): boolean {
  if (attacker === target) return false;
  if (target === 0) return true;
  return state.countries[target]?.alive === true && atWar(state, attacker, target) !== undefined;
}

export function sharesBorder(state: GameState, a: CountryId, b: CountryId): boolean {
  for (const s of statesControlledBy(state, a)) for (const t of getStateTiles(state.map, s)) {
    if (state.controller[t] !== a) continue;
    let hit = false;
    forEachNeighbor(state, t, n => { if (!hit && isLand(state, n) && state.controller[n] === b) hit = true; });
    if (hit) return true;
  }
  return false;
}

function fortLevel(state: GameState, tile: number): number {
  const st = state.states[state.map.stateOf[tile]];
  let n = 0;
  for (const b of st.buildings) if (b.type === 'fort') n += b.level;
  return n;
}

/** Troops `attacker` spends to take `tile` from `target` (0 = unclaimed land). */
export function tileCost(state: GameState, tile: number, target: CountryId, attacker: CountryId = 0): number {
  const atk = attacker ? pctMult(mods(state, state.countries[attacker]).attackPct) : 1;
  const base = staticCost(state, tile) / atk;
  if (target === 0) return base * C.UNCLAIMED_COST_MULT / (attacker ? pctMult(mods(state, state.countries[attacker]).colonisePct) : 1);
  const d = state.countries[target];
  const density = d.troops / Math.max(1, d.controlled);
  return base * pctMult(mods(state, d).defensePct) * (1 + fortLevel(state, tile) * (C.FORT_MULT - 1)) * (1 + density / C.DENSITY_REF);
}

export function launchAttack(state: GameState, cmd: Extract<Command, { type: 'attack' }>): string | null {
  const c = state.countries[cmd.country];
  if (!(cmd.ratio >= 0.01 && cmd.ratio <= 1)) return 'bad ratio';
  if (!canAttack(state, cmd.country, cmd.target)) return cmd.target === 0 || state.countries[cmd.target]?.alive ? 'not at war' : 'no such target';
  const troops = Math.floor(c.troops * cmd.ratio);
  if (troops < C.MIN_ATTACK_TROOPS) return 'not enough troops';
  const existing = state.attacks.find(a => a.attacker === cmd.country && a.target === cmd.target);
  if (existing) { existing.troops += troops; c.troops -= troops; return null; }
  const attack: Attack = { id: state.nextId, attacker: cmd.country, target: cmd.target, troops };
  if (scanFrontier(state, attack).size === 0) return 'no border';
  state.nextId++;
  c.troops -= troops;
  state.attacks.push(attack);
  return null;
}

/** Troops come ashore at a tile and fight on from there (naval invasions). Returns troops that could not land. */
export function launchAttackFrom(state: GameState, attacker: CountryId, target: CountryId, troops: number, tile: number, changed: number[] = []): number {
  const cost = tileCost(state, tile, target, attacker);
  if (troops < cost + C.MIN_ATTACK_TROOPS) return troops;
  troops -= cost;
  setTile(state, tile, target === 0 ? attacker : state.owner[tile], attacker, changed);
  const existing = state.attacks.find(a => a.attacker === attacker && a.target === target);
  if (existing) { existing.troops += troops; return 0; }
  const attack: Attack = { id: state.nextId++, attacker, target, troops };
  state.attacks.push(attack);
  scanFrontier(state, attack);
  return 0;
}

export function endAttack(state: GameState, attack: Attack, returnTroops = true): void {
  if (returnTroops && state.countries[attack.attacker].alive) state.countries[attack.attacker].troops += attack.troops;
  state.attacks = state.attacks.filter(a => a !== attack);
  heaps.delete(attack);
}

export function combatTick(state: GameState, changed: number[], _events: SimEvent[]): void {
  for (const attack of state.attacks.slice()) {
    const heap = heapOf(state, attack);
    const steps = Math.max(1, Math.min(C.MAX_TILES_PER_TICK, Math.floor(attack.troops / C.TROOPS_PER_TILE_RATE)));
    let done = false;
    for (let k = 0; k < steps; k++) {
      while (heap.size && !isFrontier(state, heap.peek(), attack)) heap.pop();
      if (!heap.size) { done = true; break; }
      const tile = heap.peek();
      const cost = tileCost(state, tile, attack.target, attack.attacker);
      if (attack.troops < cost) { done = true; break; }
      heap.pop();
      attack.troops -= cost;
      if (attack.target !== 0) {
        const d = state.countries[attack.target];
        const loss = Math.min(d.troops, (d.troops / Math.max(1, d.controlled)) * C.DEFENDER_LOSS);
        d.troops -= loss;
        addCasualties(state, attack.attacker, attack.target, cost);
        addCasualties(state, attack.target, attack.attacker, loss);
        setTile(state, tile, state.owner[tile], attack.attacker, changed);
      } else {
        setTile(state, tile, attack.attacker, attack.attacker, changed);
      }
    }
    if (done) endAttack(state, attack);
  }
}

attackHooks.endBetween = (state, a, b, ret) => {
  for (const x of state.attacks.slice()) if ((x.attacker === a && x.target === b) || (x.attacker === b && x.target === a)) endAttack(state, x, ret);
};
attackHooks.endAllOf = (state, c) => {
  for (const x of state.attacks.slice()) {
    if (x.attacker === c) endAttack(state, x, false);
    else if (x.target === c) endAttack(state, x, true);
  }
};
handlers.attack = (state, cmd) => launchAttack(state, cmd);
handlers.cancelAttack = (state, cmd: Extract<Command, { type: 'cancelAttack' }>) => {
  const a = state.attacks.find(x => x.id === cmd.attackId && x.attacker === cmd.country);
  if (!a) return 'no such attack';
  endAttack(state, a);
  return null;
};
systems.tick.push((state, events, changed) => combatTick(state, changed, events));
