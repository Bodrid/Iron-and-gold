// Wars between two sides, started only when a diplomatic play fails: war score, casualties, separate peace,
// returning occupied land and eliminating countries that lose everything.
import { getStateTiles } from '../map/stateTiles';
import { TICKS_PER_DAY } from './calendar';
import { setTile, stateControlShare, statesOwnedBy } from './control';
import { handlers, systems } from './registry';
import type { Command, CountryId, GameState, SimEvent, War } from './types';

export function sideOf(war: War, c: CountryId): 'A' | 'B' | null {
  return war.sideA.includes(c) ? 'A' : war.sideB.includes(c) ? 'B' : null;
}

export function enemiesIn(war: War, c: CountryId): CountryId[] {
  const s = sideOf(war, c);
  return s === 'A' ? war.sideB : s === 'B' ? war.sideA : [];
}

export function warsOf(state: GameState, c: CountryId): War[] {
  return state.wars.filter(w => sideOf(w, c) !== null);
}

export function atWar(state: GameState, a: CountryId, b: CountryId): War | undefined {
  return state.wars.find(w => (w.sideA.includes(a) && w.sideB.includes(b)) || (w.sideA.includes(b) && w.sideB.includes(a)));
}

/** Starts a war with no checks (tests and internal use). */
export function declareWarRaw(state: GameState, a: CountryId, b: CountryId): War {
  const w: War = { id: state.nextId++, a, b, sideA: [a], sideB: [b], goals: [], startTick: state.tick, casualties: [0, 0] };
  state.wars.push(w);
  return w;
}

/** Called with each new war (puppets and other automatic joiners plug in here). */
export const warStartHooks: ((state: GameState, war: War) => void)[] = [];

export function startWar(state: GameState, sideA: CountryId[], sideB: CountryId[], goals: War['goals'], events: SimEvent[]): War {
  const w: War = { id: state.nextId++, a: sideA[0], b: sideB[0], sideA: [...sideA], sideB: [...sideB], goals, startTick: state.tick, casualties: [0, 0] };
  state.wars.push(w);
  for (const h of warStartHooks) h(state, w);
  events.push({ type: 'warDeclared', a: w.a, b: w.b });
  return w;
}

export function addCasualties(state: GameState, country: CountryId, enemy: CountryId, n: number): void {
  const w = atWar(state, country, enemy);
  if (w) w.casualties[sideOf(w, country) === 'A' ? 0 : 1] += n;
}

/**
 * War score for the side `side` is on. About 100 means the war goals are in hand (goal states held); dominating —
 * occupying much of the enemy and bleeding them — goes beyond 100. The defending side's "goal" is to occupy back.
 */
export function warScore(state: GameState, war: War, side: CountryId): number {
  const mine = sideOf(war, side) === 'A';
  const mySide = mine ? war.sideA : war.sideB;
  const enemies = mine ? war.sideB : war.sideA;
  const own = war.casualties[mine ? 0 : 1];
  const theirs = war.casualties[mine ? 1 : 0];
  let occupied = 0, total = 0;
  for (const e of enemies) {
    total += state.countries[e].tiles;
    for (const s of statesOwnedBy(state, e)) for (const t of getStateTiles(state.map, s)) if (state.owner[t] === e && mySide.includes(state.controller[t])) occupied++;
  }
  const occ = occupied / Math.max(1, total);
  const cas = own + theirs > 0 ? theirs / (own + theirs) : 0;
  const goalStates = mine ? war.goals.filter(g => g.kind === 'state').map(g => (g as { state: number }).state) : [];
  const goal = goalStates.length
    ? goalStates.filter(s => mySide.some(c => stateControlShare(state, s, c) > 0.5)).length / goalStates.length
    : Math.min(1, occ * 2);
  return goal * W.GOAL + occ * W.OCCUPATION + cas * W.CASUALTIES;
}

const W = { GOAL: 70, OCCUPATION: 60, CASUALTIES: 30 };

/** A war member other than the leaders leaves with a white peace. */
export function separatePeace(state: GameState, war: War, c: CountryId, changed: number[]): void {
  const enemies = enemiesIn(war, c);
  for (const e of enemies) {
    for (const s of statesOwnedBy(state, c)) for (const t of getStateTiles(state.map, s)) if (state.owner[t] === c && state.controller[t] === e) setTile(state, t, c, c, changed);
    for (const s of statesOwnedBy(state, e)) for (const t of getStateTiles(state.map, s)) if (state.owner[t] === e && state.controller[t] === c) setTile(state, t, e, e, changed);
    endAttacksBetween(state, c, e, true);
  }
  war.sideA = war.sideA.filter(x => x !== c);
  war.sideB = war.sideB.filter(x => x !== c);
}

/** Returns every tile occupied between the two sides to its owner. */
export function returnOccupied(state: GameState, war: War, changed: number[]): void {
  for (const side of [war.sideA, war.sideB]) {
    const other = side === war.sideA ? war.sideB : war.sideA;
    for (const c of side) for (const s of statesOwnedBy(state, c)) for (const t of getStateTiles(state.map, s)) {
      if (state.owner[t] === c && other.includes(state.controller[t])) setTile(state, t, c, c, changed);
    }
  }
}

export function endWar(state: GameState, war: War): void {
  for (const a of war.sideA) for (const b of war.sideB) endAttacksBetween(state, a, b, true);
  state.wars = state.wars.filter(w => w !== war);
  state.peaceOffers = state.peaceOffers.filter(o => !((war.sideA.includes(o.from) && war.sideB.includes(o.to)) || (war.sideB.includes(o.from) && war.sideA.includes(o.to))));
}

/** Attack cleanup lives in combat.ts; registered here to avoid an import cycle. */
export const attackHooks = { endBetween: (_s: GameState, _a: CountryId, _b: CountryId, _ret: boolean) => {}, endAllOf: (_s: GameState, _c: CountryId) => {} };
function endAttacksBetween(state: GameState, a: CountryId, b: CountryId, ret: boolean) { attackHooks.endBetween(state, a, b, ret); }

export function checkElimination(state: GameState, events: SimEvent[], changed: number[]): void {
  for (const c of state.countries) {
    if (!c.alive || c.id === 0 || c.tiles > 0) continue;
    c.alive = false;
    attackHooks.endAllOf(state, c.id);
    for (const w of warsOf(state, c.id)) {
      for (const other of enemiesIn(w, c.id)) for (const s of statesOwnedBy(state, other)) for (const t of getStateTiles(state.map, s)) {
        if (state.owner[t] === other && state.controller[t] === c.id) setTile(state, t, other, other, changed);
      }
      w.sideA = w.sideA.filter(x => x !== c.id);
      w.sideB = w.sideB.filter(x => x !== c.id);
      if (w.a === c.id) w.a = w.sideA[0] ?? 0;
      if (w.b === c.id) w.b = w.sideB[0] ?? 0;
      if (!w.sideA.length || !w.sideB.length) endWar(state, w);
    }
    state.peaceOffers = state.peaceOffers.filter(o => o.from !== c.id && o.to !== c.id);
    c.troops = 0;
    events.push({ type: 'eliminated', country: c.id });
  }
}

handlers.separatePeace = (state, cmd: Extract<Command, { type: 'separatePeace' }>, _events, changed) => {
  const w = state.wars.find(x => x.id === cmd.warId && sideOf(x, cmd.country));
  if (!w) return 'no such war';
  if (w.a === cmd.country || w.b === cmd.country) return 'leader';
  separatePeace(state, w, cmd.country, changed);
  return null;
};
systems.day.push((state, events, changed) => {
  state.peaceOffers = state.peaceOffers.filter(o => state.tick - o.tick <= 30 * TICKS_PER_DAY);
  checkElimination(state, events, changed);
});
