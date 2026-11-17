// Wars between countries. Stage-1 placeholder for Victoria-style diplomatic plays:
// declare war, fight, then a peace deal hands over every state the winner occupies by majority.
import { getStateTiles } from '../map/stateTiles';
import { TICKS_PER_DAY } from './calendar';
import { BALANCE } from './balance';
import { setTile, stateControlShare, statesOwnedBy } from './control';
import { handlers, systems } from './registry';
import type { Command, CountryId, GameState, SimEvent, War } from './types';

export function atWar(state: GameState, a: CountryId, b: CountryId): War | undefined {
  return state.wars.find(w => (w.a === a && w.b === b) || (w.a === b && w.b === a));
}

/** Starts a war with no checks (tests and internal use). */
export function declareWarRaw(state: GameState, a: CountryId, b: CountryId): War {
  const w: War = { id: state.nextId++, a, b, startTick: state.tick, casualties: [0, 0] };
  state.wars.push(w);
  return w;
}

export function addCasualties(state: GameState, country: CountryId, enemy: CountryId, n: number): void {
  const w = atWar(state, country, enemy);
  if (w) w.casualties[w.a === country ? 0 : 1] += n;
}

export function declareWar(state: GameState, a: CountryId, b: CountryId, events: SimEvent[]): string | null {
  if (a === b) return 'cannot declare war on yourself';
  if (!state.countries[b]?.alive || b === 0) return 'no such country';
  if (atWar(state, a, b)) return 'already at war';
  declareWarRaw(state, a, b);
  events.push({ type: 'warDeclared', a, b });
  return null;
}

/** 0..100 for `side`: mostly how much of the enemy's land it occupies, partly the casualty balance. */
export function warScore(state: GameState, war: War, side: CountryId): number {
  const enemy = war.a === side ? war.b : war.a;
  const own = war.casualties[war.a === side ? 0 : 1];
  const theirs = war.casualties[war.a === side ? 1 : 0];
  let occupied = 0;
  for (const s of statesOwnedBy(state, enemy)) for (const t of getStateTiles(state.map, s)) if (state.owner[t] === enemy && state.controller[t] === side) occupied++;
  const occ = occupied / Math.max(1, state.countries[enemy].tiles);
  const cas = own + theirs > 0 ? theirs / (own + theirs) : 0.5;
  return Math.min(100, occ * 150) * 0.75 + cas * 25;
}

/** How an AI answers a peace offer. The AI module replaces this. */
export const peacePolicy = {
  accepts(state: GameState, ai: CountryId, from: CountryId): boolean {
    const w = atWar(state, ai, from)!;
    return warScore(state, w, from) >= 50 || warScore(state, w, ai) < 25;
  },
};

export function makePeace(state: GameState, war: War, events: SimEvent[], changed: number[]): void {
  const sa = warScore(state, war, war.a), sb = warScore(state, war, war.b);
  const winner = sa > sb ? war.a : sb > sa ? war.b : 0;
  const loser = winner === war.a ? war.b : war.a;
  const transferred: number[] = [];
  if (winner) {
    for (const s of statesOwnedBy(state, loser)) {
      if (stateControlShare(state, s, winner) > 0.5) {
        transferred.push(s);
        for (const t of getStateTiles(state.map, s)) if (state.owner[t] === loser) setTile(state, t, winner, winner, changed);
      }
    }
  }
  for (const side of [war.a, war.b]) {
    const other = side === war.a ? war.b : war.a;
    for (const s of statesOwnedBy(state, side)) for (const t of getStateTiles(state.map, s)) {
      if (state.owner[t] === side && state.controller[t] === other) setTile(state, t, side, side, changed);
    }
  }
  if (winner && transferred.length) state.countries[winner].infamy += BALANCE.diplomacy.INFAMY_PER_STATE * transferred.length;
  endAttacksBetween(state, war.a, war.b, true);
  state.wars = state.wars.filter(w => w !== war);
  state.peaceOffers = state.peaceOffers.filter(o => !((o.from === war.a && o.to === war.b) || (o.from === war.b && o.to === war.a)));
  events.push({ type: 'peace', a: war.a, b: war.b, transferred });
}

/** Attack cleanup lives in combat.ts; registered here to avoid an import cycle. */
export const attackHooks = { endBetween: (_s: GameState, _a: CountryId, _b: CountryId, _ret: boolean) => {}, endAllOf: (_s: GameState, _c: CountryId) => {} };
function endAttacksBetween(state: GameState, a: CountryId, b: CountryId, ret: boolean) { attackHooks.endBetween(state, a, b, ret); }

export function offerPeace(state: GameState, from: CountryId, to: CountryId, events: SimEvent[], changed: number[]): string | null {
  const war = atWar(state, from, to);
  if (!war) return 'not at war';
  const target = state.countries[to];
  if (!target.isPlayer) {
    if (peacePolicy.accepts(state, to, from)) makePeace(state, war, events, changed);
    else events.push({ type: 'peaceRefused', from, to });
    return null;
  }
  if (state.peaceOffers.some(o => o.from === from && o.to === to)) return 'already offered';
  state.peaceOffers.push({ from, to, tick: state.tick });
  events.push({ type: 'peaceOffered', from, to });
  return null;
}

export function checkElimination(state: GameState, events: SimEvent[], changed: number[]): void {
  for (const c of state.countries) {
    if (!c.alive || c.id === 0 || c.tiles > 0) continue;
    c.alive = false;
    attackHooks.endAllOf(state, c.id);
    for (const w of state.wars.filter(x => x.a === c.id || x.b === c.id)) {
      const other = w.a === c.id ? w.b : w.a;
      for (const s of statesOwnedBy(state, other)) for (const t of getStateTiles(state.map, s)) {
        if (state.owner[t] === other && state.controller[t] === c.id) setTile(state, t, other, other, changed);
      }
    }
    state.wars = state.wars.filter(w => w.a !== c.id && w.b !== c.id);
    state.peaceOffers = state.peaceOffers.filter(o => o.from !== c.id && o.to !== c.id);
    c.troops = 0;
    events.push({ type: 'eliminated', country: c.id });
  }
}

handlers.declareWar = (state, cmd: Extract<Command, { type: 'declareWar' }>, events) => declareWar(state, cmd.country, cmd.target, events);
handlers.offerPeace = (state, cmd: Extract<Command, { type: 'offerPeace' }>, events, changed) => offerPeace(state, cmd.country, cmd.target, events, changed);
handlers.respondPeace = (state, cmd: Extract<Command, { type: 'respondPeace' }>, events, changed) => {
  const offer = state.peaceOffers.find(o => o.from === cmd.from && o.to === cmd.country);
  if (!offer) return 'no such offer';
  state.peaceOffers = state.peaceOffers.filter(o => o !== offer);
  const war = atWar(state, cmd.from, cmd.country);
  if (!war) return null;
  if (cmd.accept) makePeace(state, war, events, changed);
  else events.push({ type: 'peaceRefused', from: cmd.from, to: cmd.country });
  return null;
};
systems.day.push((state, events, changed) => {
  state.peaceOffers = state.peaceOffers.filter(o => state.tick - o.tick <= 30 * TICKS_PER_DAY);
  checkElimination(state, events, changed);
});
