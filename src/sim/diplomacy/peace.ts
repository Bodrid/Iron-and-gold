// Peace deals: the winner's points (war score, plus its own losses) pay for demands; extra demands cost more.
import { DEMAND_COST } from '../../content/diplomacy';
import { TICKS_PER_DAY } from '../calendar';
import { handlers } from '../registry';
import { endWar, returnOccupied, sideOf, warScore } from '../war';
import type { Command, CountryId, Demand, GameState, PeaceTerms, SimEvent, War } from '../types';
import { applyDemands } from './demands';

const C = DEMAND_COST;

function sameDemand(a: Demand, b: Demand): boolean {
  return a.kind === b.kind && (a.kind !== 'state' || a.state === (b as { state: number }).state);
}

export function demandCost(state: GameState, d: Demand): number {
  if (d.kind === 'state') {
    const st = state.states[d.state];
    const owner = st ? state.countries[st.owner] : undefined;
    const share = owner && owner.population > 0 ? st.population / owner.population : 0;
    return Math.min(C.stateMax, C.stateBase + C.statePerShare * share);
  }
  return C[d.kind];
}

/** Points the demands cost for the side `side` is on (its own war goals cost less). */
export function termsCost(state: GameState, war: War, side: CountryId, demands: Demand[]): number {
  const goals = sideOf(war, side) === 'A' ? war.goals : [];
  return demands.reduce((n, d) => n + demandCost(state, d) * (goals.some(g => sameDemand(g, d)) ? 1 : C.nonGoalFactor), 0);
}

export function peacePoints(state: GameState, war: War, side: CountryId): { score: number; available: number } {
  const mine = sideOf(war, side) === 'A';
  const own = war.casualties[mine ? 0 : 1];
  const maxTroops = (mine ? war.sideA : war.sideB).reduce((n, c) => n + state.countries[c].maxTroops, 0);
  const score = warScore(state, war, side);
  return { score, available: score + C.casualtyPoints * own / Math.max(1, maxTroops) };
}

/** How an AI leader answers peace terms (the AI module may refine this). */
export const peacePolicy = {
  accepts(state: GameState, war: War, ai: CountryId, from: CountryId, terms: PeaceTerms): boolean {
    const mine = peacePoints(state, war, ai).score, theirs = peacePoints(state, war, from);
    const age = state.tick - war.startTick;
    if (terms.white) return mine <= theirs.score + 20 || age >= 2 * 365 * TICKS_PER_DAY;
    if (terms.give) return mine < 60 || termsCost(state, war, ai, terms.demands) >= mine * 0.6;
    return termsCost(state, war, from, terms.demands) <= theirs.available;
  },
};

export function concludePeace(state: GameState, war: War, proposer: CountryId, terms: PeaceTerms, events: SimEvent[], changed: number[]): void {
  const proposerSide = sideOf(war, proposer) === 'A' ? war.sideA : war.sideB;
  const otherSide = proposerSide === war.sideA ? war.sideB : war.sideA;
  const winner = terms.give ? (otherSide === war.sideA ? war.a : war.b) : (proposerSide === war.sideA ? war.a : war.b);
  const losers = terms.give ? proposerSide : otherSide;
  const loserLeader = losers === war.sideA ? war.a : war.b;
  returnOccupied(state, war, changed);
  const transferred: number[] = [];
  if (!terms.white) {
    for (const d of terms.demands) {
      const from = d.kind === 'state' ? state.states[d.state]?.owner ?? 0 : loserLeader;
      if (!losers.includes(from)) continue;               // stale: no longer the losing side's
      const done = applyDemands(state, winner, from, [d], events, changed);
      if (done.length && d.kind === 'state') transferred.push(d.state);
    }
  }
  endWar(state, war);
  events.push({ type: 'peace', a: war.a, b: war.b, transferred });
}

handlers.proposePeace = (state, cmd: Extract<Command, { type: 'proposePeace' }>, events, changed) => {
  const war = state.wars.find(w => w.id === cmd.warId);
  if (!war || !sideOf(war, cmd.country)) return 'no such war';
  if (war.a !== cmd.country && war.b !== cmd.country) return 'leader';
  const terms: PeaceTerms = { demands: (cmd.terms?.demands ?? []).map(d => ({ ...d })), white: !!cmd.terms?.white || !(cmd.terms?.demands ?? []).length, give: !!cmd.terms?.give };
  const other = war.a === cmd.country ? war.b : war.a;
  if (state.countries[other].isPlayer) {
    if (state.peaceOffers.some(o => o.from === cmd.country && o.to === other)) return 'already offered';
    state.peaceOffers.push({ from: cmd.country, to: other, tick: state.tick, warId: war.id, terms });
    events.push({ type: 'peaceOffered', from: cmd.country, to: other });
    return null;
  }
  if (peacePolicy.accepts(state, war, other, cmd.country, terms)) concludePeace(state, war, cmd.country, terms, events, changed);
  else events.push({ type: 'peaceRefused', from: cmd.country, to: other });
  return null;
};

handlers.respondPeace = (state, cmd: Extract<Command, { type: 'respondPeace' }>, events, changed) => {
  const offer = state.peaceOffers.find(o => o.from === cmd.from && o.to === cmd.country);
  if (!offer) return 'no such offer';
  state.peaceOffers = state.peaceOffers.filter(o => o !== offer);
  const war = state.wars.find(w => w.id === offer.warId);
  if (!war) return null;
  if (cmd.accept) concludePeace(state, war, offer.from, offer.terms, events, changed);
  else events.push({ type: 'peaceRefused', from: cmd.from, to: cmd.country });
  return null;
};

export function leaderOf(war: War, side: 'A' | 'B'): CountryId { return side === 'A' ? war.a : war.b; }
