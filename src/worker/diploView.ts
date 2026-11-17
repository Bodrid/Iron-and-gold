// The player's diplomatic picture, for the Diplomacy tab.
import { DEMAND_NAMES } from '../content/diplomacy';
import { TICKS_PER_DAY } from '../sim/calendar';
import { coalitionAgainst } from '../sim/diplomacy/infamy';
import { peacePoints, termsCost } from '../sim/diplomacy/peace';
import { playCheck, sideStrength, joinCheck } from '../sim/diplomacy/plays';
import { diploCapacity, relation } from '../sim/diplomacy/relations';
import { annexCheck } from '../sim/diplomacy/subjects';
import { treatyCheck } from '../sim/diplomacy/treaties';
import { sideOf, warScore } from '../sim/war';
import type { CountryId, Demand, GameState, TreatyKind } from '../sim/types';
import type { CountryDetail, DiploView } from './protocol';

export function demandLabel(state: GameState, d: Demand): string {
  return d.kind === 'state' ? `Take ${state.map.states[d.state]?.name ?? 'a state'}` : DEMAND_NAMES[d.kind];
}

export function diploView(state: GameState, me: CountryId): DiploView {
  const n = state.countries.length;
  return {
    infamy: state.countries[me].infamy,
    capacity: { used: state.diploActions.filter(a => a.from === me).length, total: diploCapacity(state, me) },
    relations: Array.from({ length: n }, (_, i) => (i === me || !i ? 0 : relation(state, me, i))),
    actions: state.diploActions.filter(a => a.from === me).map(a => ({ to: a.to, kind: a.kind })),
    treaties: state.treaties.filter(t => t.a === me || t.b === me).map(t => ({ id: t.id, kind: t.kind, a: t.a, b: t.b })),
    treatyOffers: state.treatyOffers.filter(o => o.to === me).map(o => ({ from: o.from, kind: o.kind })),
    peaceOffers: state.peaceOffers.filter(o => o.to === me).map(o => ({ from: o.from, warId: o.warId, white: !!o.terms.white, give: !!o.terms.give, demands: o.terms.demands.map(d => demandLabel(state, d)) })),
    plays: state.plays.map(p => ({ id: p.id, initiator: p.initiator, target: p.target, demands: p.demands.map(d => demandLabel(state, d)), sideA: [...p.sideA], sideB: [...p.sideB],
      strengthA: sideStrength(state, p.sideA), strengthB: sideStrength(state, p.sideB), daysLeft: Math.max(0, Math.ceil((p.endTick - state.tick) / TICKS_PER_DAY)), join: joinCheck(state, me, p.id) })),
    wars: state.wars.filter(w => sideOf(w, me)).map(w => {
      const mineA = sideOf(w, me) === 'A';
      const enemySide = mineA ? w.sideB : w.sideA;
      const enemyLeader = mineA ? w.b : w.a;
      const goals = mineA ? w.goals : [];
      const sameGoal = (d: Demand) => goals.some(g => g.kind === d.kind && (d.kind !== 'state' || (g as { state: number }).state === d.state));
      const states = state.states.filter(s => s.id && enemySide.includes(s.owner)).sort((a, b) => (sameGoal({ kind: 'state', state: b.id }) ? 1 : 0) - (sameGoal({ kind: 'state', state: a.id }) ? 1 : 0) || b.population - a.population).slice(0, 25);
      const demands: Demand[] = [...states.map(s => ({ kind: 'state' as const, state: s.id })), { kind: 'puppet' }, { kind: 'openMarket' }, { kind: 'reparations' }];
      return {
        id: w.id, leader: w.a === me || w.b === me, mySide: mineA ? [...w.sideA] : [...w.sideB], enemySide: [...enemySide],
        myScore: warScore(state, w, me), enemyScore: warScore(state, w, enemyLeader), available: peacePoints(state, w, me).available, goals: goals.map(d => demandLabel(state, d)),
        candidates: demands.map(d => ({ demand: d, label: demandLabel(state, d), cost: termsCost(state, w, me, [d]), goal: sameGoal(d) })),
      };
    }),
    puppets: state.countries.filter(c => c.alive && c.overlord === me).map(c => ({ id: c.id, annex: annexCheck(state, me, c.id) })),
    privateers: state.privateers.filter(p => p.from === me).map(p => p.target),
    coalitionAgainstMe: coalitionAgainst(state, me)?.members ?? [],
  };
}

const KINDS: TreatyKind[] = ['alliance', 'defensivePact', 'tradeAgreement', 'guarantee', 'embargo'];

export function countryDetail(state: GameState, me: CountryId, id: CountryId): CountryDetail | null {
  if (!state.countries[id]?.alive || id === me) return null;
  const treaty = Object.fromEntries(KINDS.map(k => [k, treatyCheck(state, me, id, k)])) as Record<TreatyKind, string | null>;
  return {
    id, treaty,
    play: playCheck(state, { type: 'startPlay', country: me, target: id, demands: [{ kind: 'reparations' }] }),
    states: state.states.filter(s => s.id && s.owner === id).map(s => ({ id: s.id, name: state.map.states[s.id].name, population: Math.round(s.population) })).sort((a, b) => b.population - a.population),
    privateers: relation(state, me, id) <= -50 ? null : 'needsHostile',
  };
}
