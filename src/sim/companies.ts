// Companies: each boosts the output of its building types, more as the country owns more of them (bonus
// recomputed monthly, so the modifier cache stays cheap). Charters trade a bigger bonus for a cost.
import { hasTag } from './tags';
import { BUILDINGS } from '../content/buildings';
import { CHARTERS, COMPANY_BY_ID, type CharterKind } from '../content/companies';
import type { Effects } from '../content/effects';
import { BALANCE } from './balance';
import { TICKS_PER_DAY } from './calendar';
import { effectSources } from './mods';
import { approvalHooks } from './politics';
import { handlers, systems } from './registry';
import { relationPairHooks } from './diplomacy/relations';
import { tributeHooks } from './diplomacy/subjects';
import type { Command, CountryId, GameState, SimEvent } from './types';

const K = BALANCE.companies;

/** Levels of industry buildings and mines the country owns (for the company limit). */
function industryLevels(state: GameState, c: CountryId): number {
  let n = 0;
  for (const s of state.states) if (s.id && s.owner === c) for (const b of s.buildings) {
    if (BUILDINGS[b.type].category === 'industry' || b.type === 'coalMine' || b.type === 'ironMine') n += b.level;
  }
  return n;
}

export function companyLimit(state: GameState, c: CountryId): number {
  return Math.min(K.MAX, 1 + Math.floor(industryLevels(state, c) / K.LEVELS_PER_EXTRA));
}

export function foundCompanyCheck(state: GameState, c: CountryId, id: string): string | null {
  const def = COMPANY_BY_ID[id];
  const x = state.countries[c];
  if (!def) return 'unknown company';
  if (x.rebel) return 'rebels';
  if (def.tag && !hasTag(x, def.tag)) return 'notYours';
  if (x.companies.some(k => k.id === id)) return 'alreadyFounded';
  if (x.companies.length >= companyLimit(state, c)) return 'tooMany';
  if (x.money < K.FOUND_COST) return 'cantAfford';
  return null;
}

export function charterCheck(state: GameState, c: CountryId, id: string, charter: CharterKind): string | null {
  const x = state.countries[c];
  const k = x.companies.find(y => y.id === id);
  if (!k) return 'noCompany';
  if (!Object.hasOwn(CHARTERS, charter)) return 'unknown charter';
  if (k.charterSet !== undefined && state.tick - k.charterSet < K.CHARTER_DAYS * TICKS_PER_DAY) return 'tooSoon';
  if (k.charter === charter) return 'alreadyGranted';
  if (charter === 'investment' && !state.countries.some(p => p.alive && p.overlord === c)) return 'noPuppets';
  return null;
}

/** Levels of the company's buildings that count: the country's own, plus its puppets' with an investment charter. */
function companyLevels(state: GameState, c: CountryId, id: string, withPuppets: boolean): number {
  const def = COMPANY_BY_ID[id];
  let n = 0;
  for (const s of state.states) {
    if (!s.id || !s.owner) continue;
    const mine = s.owner === c || (withPuppets && state.countries[s.owner].overlord === c);
    if (!mine) continue;
    for (const b of s.buildings) if (def.buildings.includes(b.type)) n += b.level;
  }
  return n;
}

export function companiesMonth(state: GameState, events: SimEvent[]): void {
  for (const x of state.countries) if (x.alive) countryCompanies(state, x.id, events);
}

function countryCompanies(state: GameState, id: CountryId, events: SimEvent[]): void {
  const x = state.countries[id];
  {
    for (const k of x.companies) {
      if (k.charter === 'investment' && !state.countries.some(p => p.alive && p.overlord === x.id)) {
        k.charter = null;
        events.push({ type: 'charterEnded', country: x.id, company: k.id });
      }
      const levels = companyLevels(state, x.id, k.id, k.charter === 'investment');
      k.bonus = Math.min(K.BONUS_CAP, Math.floor(levels / K.LEVELS_PER_STEP) * K.BONUS_PER_STEP);
    }
  }
}

// ---- wiring ----
effectSources.push({
  sig: (_s, c) => c.companies.map(k => `${k.id}:${k.bonus}:${k.charter ?? ''}`).join(','),
  effects: (_s, c) => c.companies.map(k => {
    const def = COMPANY_BY_ID[k.id];
    const e: Effects = { outputPct: {} };
    const out = k.bonus + (k.charter === 'monopoly' ? K.MONOPOLY_PCT : 0);
    for (const b of def.buildings) e.outputPct![b] = out;
    if (k.charter !== 'monopoly') e.tradePct = K.TRADE_PCT;
    if (k.charter === 'colonial') { e.colonisePct = K.COLONIAL_PCT; e.taxPct = -K.COLONIAL_TAX_PCT; }
    return e;
  }),
});
approvalHooks.push((_s, c, g) => {
  // Any monopoly pleases industrialists and angers workers (it doesn't stack).
  if (!c.companies.some(k => k.charter === 'monopoly')) return 0;
  return g === 'industrialists' ? 1 : g === 'workers' ? -1 : 0;
});
tributeHooks.push((state, puppet) => {
  const o = state.countries[puppet].overlord;
  return o && state.countries[o].companies.some(k => k.charter === 'investment') ? K.INVESTMENT_TRIBUTE : 0;
});
relationPairHooks.push((state, add) => {
  for (const x of state.countries) {
    if (!x.alive || !x.companies.some(k => k.charter === 'investment')) continue;
    for (const p of state.countries) if (p.alive && p.overlord === x.id) add(x.id, p.id, K.INVESTMENT_RELATION);
  }
});

handlers.foundCompany = (state, cmd: Extract<Command, { type: 'foundCompany' }>, events) => {
  const bad = foundCompanyCheck(state, cmd.country, cmd.company);
  if (bad) return bad;
  const x = state.countries[cmd.country];
  x.money -= K.FOUND_COST;
  x.companies.push({ id: cmd.company, founded: state.tick, charter: null, bonus: 0 });
  countryCompanies(state, cmd.country, events);   // the bonus shows at once
  events.push({ type: 'companyFounded', country: cmd.country, company: cmd.company });
  return null;
};
handlers.grantCharter = (state, cmd: Extract<Command, { type: 'grantCharter' }>) => {
  const bad = charterCheck(state, cmd.country, cmd.company, cmd.charter);
  if (bad) return bad;
  const k = state.countries[cmd.country].companies.find(y => y.id === cmd.company)!;
  k.charter = cmd.charter; k.charterSet = state.tick;
  return null;
};
handlers.revokeCharter = (state, cmd: Extract<Command, { type: 'revokeCharter' }>) => {
  const k = state.countries[cmd.country].companies.find(y => y.id === cmd.company);
  if (!k) return 'noCompany';
  if (!k.charter) return 'noCharter';
  if (k.charterSet !== undefined && state.tick - k.charterSet < K.CHARTER_DAYS * TICKS_PER_DAY) return 'tooSoon';
  k.charter = null; k.charterSet = state.tick;
  return null;
};

systems.month.push((state, events) => companiesMonth(state, events));
