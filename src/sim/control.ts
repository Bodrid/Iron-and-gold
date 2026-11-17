// Who owns and controls each tile and state. Keeps per-state counts up to date as tiles change.
import { getStateTiles } from '../map/stateTiles';
import type { CountryId, GameState } from './types';

interface Counts { owned: Map<CountryId, number>[]; controlled: Map<CountryId, number>[] }
const cache = new WeakMap<GameState, Counts>();

function rebuild(state: GameState): Counts {
  const n = state.map.states.length;
  const c: Counts = { owned: [], controlled: [] };
  for (let s = 0; s < n; s++) { c.owned.push(new Map()); c.controlled.push(new Map()); }
  const { stateOf } = state.map;
  for (let i = 0; i < stateOf.length; i++) {
    const s = stateOf[i];
    if (!s) continue;
    const o = state.owner[i], k = state.controller[i];
    c.owned[s].set(o, (c.owned[s].get(o) ?? 0) + 1);
    c.controlled[s].set(k, (c.controlled[s].get(k) ?? 0) + 1);
  }
  cache.set(state, c);
  return c;
}

function counts(state: GameState): Counts { return cache.get(state) ?? rebuild(state); }

/** Recount everything from the tile arrays (after load or bulk edits). */
export function rebuildControl(state: GameState): void {
  const c = rebuild(state);
  for (const country of state.countries) { country.tiles = 0; country.controlled = 0; }
  for (let s = 1; s < c.owned.length; s++) {
    for (const [id, n] of c.owned[s]) if (id) state.countries[id].tiles += n;
    for (const [id, n] of c.controlled[s]) if (id) state.countries[id].controlled += n;
    refreshState(state, s);
  }
}

function bump(m: Map<CountryId, number>, id: CountryId, d: number) {
  const v = (m.get(id) ?? 0) + d;
  if (v) m.set(id, v); else m.delete(id);
}

export function setTile(state: GameState, tile: number, owner: CountryId, controller: CountryId, changed: number[]): void {
  const oldO = state.owner[tile], oldC = state.controller[tile];
  if (oldO === owner && oldC === controller) return;
  const s = state.map.stateOf[tile];
  const c = counts(state);
  if (oldO !== owner) {
    bump(c.owned[s], oldO, -1); bump(c.owned[s], owner, 1);
    if (oldO) state.countries[oldO].tiles--;
    if (owner) state.countries[owner].tiles++;
    state.owner[tile] = owner;
  }
  if (oldC !== controller) {
    bump(c.controlled[s], oldC, -1); bump(c.controlled[s], controller, 1);
    if (oldC) state.countries[oldC].controlled--;
    if (controller) state.countries[controller].controlled++;
    state.controller[tile] = controller;
  }
  changed.push(tile);
  refreshState(state, s);
}

/** State owner = country owning the most of its tiles (current owner keeps ties); controller = country controlling > 50%, else the owner. */
export function refreshState(state: GameState, s: number): void {
  const c = counts(state);
  const st = state.states[s];
  const total = state.map.states[s].tiles;
  let best = st.owner, bestN = c.owned[s].get(st.owner) ?? 0;
  for (const [id, n] of c.owned[s]) if (n > bestN || (n === bestN && id < best && best !== st.owner)) { best = id; bestN = n; }
  if (best !== st.owner) {
    const pop = st.population;
    if (st.owner) state.countries[st.owner].population -= pop;
    if (best) state.countries[best].population += pop;
    st.owner = best;
  }
  let ctrl = st.owner;
  for (const [id, n] of c.controlled[s]) if (n * 2 > total) ctrl = id;
  st.controller = ctrl;
}

export function stateOwnerShare(state: GameState, stateId: number, country: CountryId): number {
  return (counts(state).owned[stateId].get(country) ?? 0) / state.map.states[stateId].tiles;
}

export function stateControlShare(state: GameState, stateId: number, country: CountryId): number {
  return (counts(state).controlled[stateId].get(country) ?? 0) / state.map.states[stateId].tiles;
}

/** Owned tiles of `country` in a state. */
export function stateTilesOwnedBy(state: GameState, stateId: number, country: CountryId): number[] {
  const out: number[] = [];
  for (const t of getStateTiles(state.map, stateId)) if (state.owner[t] === country) out.push(t);
  return out;
}
