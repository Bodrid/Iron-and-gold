// Treaties: alliances, defensive pacts, trade agreements, guarantees of independence, embargoes.
import { BALANCE } from '../balance';
import { handlers, systems } from '../registry';
import { TICKS_PER_DAY } from '../calendar';
import { atWar } from '../war';
import { closeRoute, tradeHooks } from '../naval/trade';
import type { Command, CountryId, GameState, SimEvent, Treaty, TreatyKind } from '../types';
import { changeRelation, relation, relationPairHooks } from './relations';

const D = BALANCE.diplomacy;
const TWO_WAY: TreatyKind[] = ['alliance', 'defensivePact', 'tradeAgreement'];

export function hasTreaty(state: GameState, a: CountryId, b: CountryId, kind: TreatyKind): boolean {
  return state.treaties.some(t => t.kind === kind && ((t.a === a && t.b === b) || (TWO_WAY.includes(kind) && t.a === b && t.b === a)));
}

export function treatiesOf(state: GameState, c: CountryId): Treaty[] {
  return state.treaties.filter(t => t.a === c || t.b === c);
}

export function embargoed(state: GameState, a: CountryId, b: CountryId): boolean {
  return state.treaties.some(t => t.kind === 'embargo' && ((t.a === a && t.b === b) || (t.a === b && t.b === a)));
}

/** Why a treaty can't be made right now, or null. */
export function treatyCheck(state: GameState, from: CountryId, to: CountryId, kind: TreatyKind): string | null {
  if (from === to || !state.countries[to]?.alive || to <= 0) return 'no such country';
  if (hasTreaty(state, from, to, kind)) return 'alreadySigned';
  if (atWar(state, from, to)) return 'atWar';
  if ((state.countries[from].overlord || state.countries[to].overlord) && kind !== 'tradeAgreement') return 'puppet';
  const rel = relation(state, from, to);
  switch (kind) {
    case 'alliance': case 'defensivePact': return rel >= 15 ? null : 'needsCordial';
    case 'guarantee': return rel <= -15 ? 'needsNeutral' : state.countries[from].troops > state.countries[to].troops ? null : 'notStronger';
    case 'tradeAgreement': return rel <= -50 ? 'hostile' : null;
    case 'embargo': return hasTreaty(state, from, to, 'alliance') ? 'allied' : null;
  }
}

/** How an AI answers a treaty offer. The AI module may replace this. */
export const treatyPolicy = {
  accepts(state: GameState, ai: CountryId, from: CountryId, kind: TreatyKind): boolean {
    const rel = relation(state, ai, from);
    return kind === 'alliance' ? rel >= 30 : kind === 'defensivePact' ? rel >= 20 : kind === 'guarantee' ? rel >= 0 : rel >= -10;
  },
};

export function sign(state: GameState, a: CountryId, b: CountryId, kind: TreatyKind, events: SimEvent[]): void {
  state.treaties.push({ id: state.nextId++, kind, a, b, since: state.tick });
  state.treatyOffers = state.treatyOffers.filter(o => !(o.kind === kind && ((o.from === a && o.to === b) || (o.from === b && o.to === a))));
  events.push({ type: 'treatySigned', a, b, kind });
  if (kind === 'embargo') for (const r of state.tradeRoutes.slice()) if ((r.exporter === a && r.importer === b) || (r.exporter === b && r.importer === a)) closeRoute(state, r);
}

export function endTreaty(state: GameState, t: Treaty, events: SimEvent[]): void {
  state.treaties = state.treaties.filter(x => x !== t);
  events.push({ type: 'treatyEnded', a: t.a, b: t.b, kind: t.kind });
}

relationPairHooks.push((state, add) => { for (const t of state.treaties) add(t.a, t.b, D.TREATY_RELATION[t.kind]); });

handlers.proposeTreaty = (state, cmd: Extract<Command, { type: 'proposeTreaty' }>, events) => {
  const bad = treatyCheck(state, cmd.country, cmd.target, cmd.kind);
  if (bad) return bad;
  if (cmd.kind === 'embargo') { sign(state, cmd.country, cmd.target, 'embargo', events); return null; }
  const target = state.countries[cmd.target];
  if (target.isPlayer) {
    if (state.treatyOffers.some(o => o.from === cmd.country && o.to === cmd.target && o.kind === cmd.kind)) return 'alreadyOffered';
    state.treatyOffers.push({ from: cmd.country, to: cmd.target, kind: cmd.kind, tick: state.tick });
    events.push({ type: 'treatyOffered', from: cmd.country, to: cmd.target, kind: cmd.kind });
    return null;
  }
  if (treatyPolicy.accepts(state, cmd.target, cmd.country, cmd.kind)) sign(state, cmd.country, cmd.target, cmd.kind, events);
  else events.push({ type: 'treatyRefused', from: cmd.country, to: cmd.target, kind: cmd.kind });
  return null;
};

handlers.respondTreaty = (state, cmd: Extract<Command, { type: 'respondTreaty' }>, events) => {
  const offer = state.treatyOffers.find(o => o.from === cmd.from && o.to === cmd.country && o.kind === cmd.kind);
  if (!offer) return 'no such offer';
  state.treatyOffers = state.treatyOffers.filter(o => o !== offer);
  if (!cmd.accept) { events.push({ type: 'treatyRefused', from: cmd.from, to: cmd.country, kind: cmd.kind }); return null; }
  const bad = treatyCheck(state, cmd.from, cmd.country, cmd.kind);
  if (bad) return bad;
  sign(state, cmd.from, cmd.country, cmd.kind, events);
  return null;
};

handlers.cancelTreaty = (state, cmd: Extract<Command, { type: 'cancelTreaty' }>, events) => {
  const t = state.treaties.find(x => x.id === cmd.treatyId && (x.a === cmd.country || (x.b === cmd.country && x.kind !== 'embargo')));
  if (!t) return 'no such treaty';
  endTreaty(state, t, events);
  if (t.kind === 'alliance') changeRelation(state, t.a, t.b, D.ALLIANCE_CANCEL_PENALTY);
  return null;
};

systems.day.push((state, events) => {
  state.treatyOffers = state.treatyOffers.filter(o => state.tick - o.tick <= D.OFFER_DAYS * TICKS_PER_DAY);
  for (const t of state.treaties.slice()) {
    if (!state.countries[t.a].alive || !state.countries[t.b].alive || (t.kind !== 'embargo' && atWar(state, t.a, t.b))) endTreaty(state, t, events);
  }
});

// Between AI countries, a trade agreement lapses once no route links them (the player keeps theirs until cancelled).
systems.month.push((state, events) => {
  const linked = new Set<string>();
  for (const r of state.tradeRoutes) linked.add(`${Math.min(r.exporter, r.importer)}:${Math.max(r.exporter, r.importer)}`);
  for (const t of state.treaties.slice()) {
    if (t.kind !== 'tradeAgreement' || state.countries[t.a].isPlayer || state.countries[t.b].isPlayer) continue;
    if (!linked.has(`${Math.min(t.a, t.b)}:${Math.max(t.a, t.b)}`)) endTreaty(state, t, events);
  }
});

tradeHooks.blocked = embargoed;
tradeHooks.bonus = (state, a, b) => (hasTreaty(state, a, b, 'tradeAgreement') ? D.TRADE_AGREEMENT_BONUS : 0);
