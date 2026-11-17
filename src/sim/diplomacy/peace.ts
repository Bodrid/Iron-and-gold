// Peace deals: the winner's points (war score, plus its own losses) pay for demands; extra demands cost more.
import { DEMAND_COST } from '../../content/diplomacy';
import { TICKS_PER_DAY } from '../calendar';
import { handlers } from '../registry';
import { endWar, returnOccupied, sideOf, warScore } from '../war';
import type { Command, CountryId, Demand, GameState, PeaceTerms, SimEvent, War } from '../types';
import { applyDemands } from './demands';

const C = DEMAND_COST;

function sameDemand(a: Demand, b: Demand): boolean {
  return a.kind === b.kind && (a.kind !== 'state' || a.state === (b as { state: number }).state) && (a.kind !== 'law' || a.law === (b as { law: string }).law);
}

export function demandCost(state: GameState, d: Demand): number {
  if (d.kind === 'state') {
    const st = state.states[d.state];
    const owner = st ? state.countries[st.owner] : undefined;
    const share = owner && owner.population > 0 ? st.population / owner.population : 0;
    return Math.min(C.stateMax, C.stateBase + C.statePerShare * share);
  }
  return C[d.kind as Exclude<Demand['kind'], 'state'>];
}

/** Points the demands cost for the side `side` is on. The play's war goals share `goalTotal` points between them;
 *  anything else costs its full price times `nonGoalFactor`. */
export function termsCost(state: GameState, war: War, side: CountryId, demands: Demand[]): number {
  const goals = sideOf(war, side) === 'A' ? war.goals : [];
  const goalSum = goals.reduce((n, g) => n + demandCost(state, g), 0);
  return demands.reduce((n, d) => n + (goals.some(g => sameDemand(g, d))
    ? C.goalTotal * demandCost(state, d) / Math.max(1e-9, goalSum)
    : demandCost(state, d) * C.nonGoalFactor), 0);
}

/** `available` is what the side can spend on demands: nothing unless it leads the enemy by `minLead`; then its score
 *  plus a bonus for its own losses (a costly victory earns more). */
export function peacePoints(state: GameState, war: War, side: CountryId): { score: number; available: number; winning: boolean } {
  const mine = sideOf(war, side) === 'A';
  const own = war.casualties[mine ? 0 : 1];
  const maxTroops = (mine ? war.sideA : war.sideB).reduce((n, c) => n + state.countries[c].maxTroops, 0);
  const score = warScore(state, war, side);
  const enemy = mine ? war.b : war.a;
  const winning = score >= warScore(state, war, enemy) + C.minLead;
  return { score, winning, available: winning ? score + C.casualtyPoints * own / Math.max(1, maxTroops) : 0 };
}

/** How an AI leader answers peace terms (the AI module may refine this). */
export const peacePolicy = {
  accepts(state: GameState, war: War, ai: CountryId, from: CountryId, terms: PeaceTerms): boolean {
    const mine = peacePoints(state, war, ai).score, theirs = peacePoints(state, war, from);
    const age = state.tick - war.startTick;
    const year = 365 * TICKS_PER_DAY;
    if (terms.white) {
      if (age >= 2 * year) return true;
      // An AI pressing its own war goals holds out for a year unless it is losing.
      const pressing = sideOf(war, ai) === 'A' && war.goals.length > 0 && age < year;
      return pressing ? mine < theirs.score : mine <= theirs.score + C.minLead;
    }
    if (terms.give) return mine < 60 || age >= year || termsCost(state, war, ai, terms.demands) >= mine * 0.4;
    return theirs.winning && termsCost(state, war, from, terms.demands) <= theirs.available;
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
  // The losing side's army won't forget this for a while (unless it was a white peace).
  if (!terms.white) for (const c of losers) state.countries[c].lastDefeat = state.tick;
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
    events.push({ type: 'peaceOffered', from: cmd.country, to: other, terms });
    return null;
  }
  if (peacePolicy.accepts(state, war, other, cmd.country, terms)) concludePeace(state, war, cmd.country, terms, events, changed);
  else refused(war, cmd.country, other, state, events);
  return null;
};

handlers.respondPeace = (state, cmd: Extract<Command, { type: 'respondPeace' }>, events, changed) => {
  const offer = state.peaceOffers.find(o => o.from === cmd.from && o.to === cmd.country);
  if (!offer) return 'no such offer';
  state.peaceOffers = state.peaceOffers.filter(o => o !== offer);
  const war = state.wars.find(w => w.id === offer.warId);
  if (!war) return null;
  if (cmd.accept) concludePeace(state, war, offer.from, offer.terms, events, changed);
  else refused(war, cmd.from, cmd.country, state, events);
  return null;
};

function refused(war: War, from: CountryId, to: CountryId, state: GameState, events: SimEvent[]): void {
  war.refusals = (war.refusals ?? []).filter(r => r.from !== from).concat({ from, tick: state.tick });
  events.push({ type: 'peaceRefused', from, to });
}

/** Days since `from` last had a proposal refused in this war (Infinity if never). */
export function daysSinceRefused(state: GameState, war: War, from: CountryId): number {
  const r = war.refusals?.find(x => x.from === from);
  return r ? (state.tick - r.tick) / TICKS_PER_DAY : Infinity;
}
