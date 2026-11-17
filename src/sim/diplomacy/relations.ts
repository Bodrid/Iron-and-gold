// Relations between countries: a target value from circumstances (borders, rivalries, enemies, trade, treaties),
// actions that push it, and monthly drift toward it.
import { personalityOf } from '../../content/personalities';
import { BALANCE } from '../balance';
import { handlers, systems } from '../registry';
import type { Command, CountryId, GameState } from '../types';

const D = BALANCE.diplomacy;
export type RelationLevel = 'hostile' | 'cold' | 'neutral' | 'cordial' | 'friendly';

/** Extra baseline terms from other systems that are cheap per pair (infamy, puppets). */
export const relationBaselineHooks: ((state: GameState, a: CountryId, b: CountryId) => number)[] = [];
/** Extra baseline terms that come from lists (treaties): each hook adds its terms pair by pair, once a month. */
export const relationPairHooks: ((state: GameState, add: (a: CountryId, b: CountryId, v: number) => void) => void)[] = [];

/** Everything the monthly baseline needs, indexed once per month so the pair loop stays O(1) per pair. */
interface PairIndex { n: number; borders: Set<number>; trade: Set<number>; enemies: Map<CountryId, Set<CountryId>>; actions: Map<number, number>; extra: Map<number, number> }
const pairKey = (n: number, a: CountryId, b: CountryId) => Math.min(a, b) * n + Math.max(a, b);

function buildIndex(state: GameState): PairIndex {
  const n = state.countries.length;
  const trade = new Set<number>();
  for (const r of state.tradeRoutes) trade.add(pairKey(n, r.exporter, r.importer));
  const enemies = new Map<CountryId, Set<CountryId>>();
  const enemy = (a: CountryId, b: CountryId) => { let s = enemies.get(a); if (!s) enemies.set(a, s = new Set()); s.add(b); };
  for (const w of state.wars) for (const a of w.sideA) for (const b of w.sideB) { enemy(a, b); enemy(b, a); }
  const actions = new Map<number, number>();
  for (const x of state.diploActions) { const k = pairKey(n, x.from, x.to); actions.set(k, (actions.get(k) ?? 0) + (x.kind === 'improve' ? D.ACTION_SHIFT : -D.ACTION_SHIFT)); }
  const extra = new Map<number, number>();
  for (const h of relationPairHooks) h(state, (a, b, v) => { const k = pairKey(n, a, b); extra.set(k, (extra.get(k) ?? 0) + v); });
  return { n, borders: borderPairs(state), trade, enemies, actions, extra };
}

export function ensureRelations(state: GameState): void {
  const n = state.countries.length;
  if (state.relations.length === n * n) return;
  const old = state.relations, on = Math.round(Math.sqrt(old.length));
  const next = new Int16Array(n * n);
  for (let a = 0; a < Math.min(n, on); a++) for (let b = 0; b < Math.min(n, on); b++) next[a * n + b] = old[a * on + b];
  state.relations = next;
}

export function relation(state: GameState, a: CountryId, b: CountryId): number {
  ensureRelations(state);
  return state.relations[a * state.countries.length + b];
}

function setRelation(state: GameState, a: CountryId, b: CountryId, v: number): void {
  const n = state.countries.length;
  const x = Math.max(-100, Math.min(100, Math.round(v)));
  state.relations[a * n + b] = x;
  state.relations[b * n + a] = x;
}

export function changeRelation(state: GameState, a: CountryId, b: CountryId, delta: number): void {
  ensureRelations(state);
  setRelation(state, a, b, relation(state, a, b) + delta);
}

export function level(v: number): RelationLevel {
  return v <= -50 ? 'hostile' : v <= -15 ? 'cold' : v < 15 ? 'neutral' : v < 50 ? 'cordial' : 'friendly';
}

export function diploCapacity(state: GameState, c: CountryId): number {
  return D.CAPACITY_BASE + Math.floor(state.countries[c].population / D.CAPACITY_PER_POP);
}

/** Pairs of countries sharing a land border (state level). */
function borderPairs(state: GameState): Set<number> {
  const n = state.countries.length;
  const out = new Set<number>();
  for (const st of state.states) {
    if (!st.id || !st.owner) continue;
    for (const nb of state.map.states[st.id].neighbors) {
      const o = state.states[nb].owner;
      if (o && o !== st.owner) out.add(Math.min(o, st.owner) * n + Math.max(o, st.owner));
    }
  }
  return out;
}

function baseline(state: GameState, a: CountryId, b: CountryId, idx: PairIndex): number {
  const k = pairKey(idx.n, a, b);
  const ca = state.countries[a], cb = state.countries[b];
  let v = idx.extra.get(k) ?? 0;
  if (idx.borders.has(k)) v += D.BORDER;
  if (personalityOf(ca.personality).rivals.includes(cb.tag) || personalityOf(cb.personality).rivals.includes(ca.tag)) v += D.RIVAL;
  const ea = idx.enemies.get(a), eb = idx.enemies.get(b);
  if (ea && eb && !ea.has(b)) { for (const e of ea) if (eb.has(e)) { v += D.SHARED_ENEMY; break; } }
  if (idx.trade.has(k)) v += D.TRADE_ROUTE;
  for (const h of relationBaselineHooks) v += h(state, a, b);
  return v;
}

function target(state: GameState, a: CountryId, b: CountryId, idx: PairIndex): number {
  return baseline(state, a, b, idx) + (idx.actions.get(pairKey(idx.n, a, b)) ?? 0);
}

export function initRelations(state: GameState): void {
  ensureRelations(state);
  const idx = buildIndex(state);
  for (let a = 1; a < state.countries.length; a++) for (let b = a + 1; b < state.countries.length; b++) setRelation(state, a, b, baseline(state, a, b, idx));
}

export function monthlyRelations(state: GameState): void {
  ensureRelations(state);
  state.diploActions = state.diploActions.filter(x => state.countries[x.from].alive && state.countries[x.to].alive);
  for (const x of state.diploActions) { const c = state.countries[x.from]; c.money -= D.RELATION_ACTION_COST; c.income -= D.RELATION_ACTION_COST; }
  const idx = buildIndex(state);
  for (let a = 1; a < state.countries.length; a++) {
    if (!state.countries[a].alive) continue;
    for (let b = a + 1; b < state.countries.length; b++) {
      if (!state.countries[b].alive) continue;
      const v = relation(state, a, b), t = Math.max(-100, Math.min(100, target(state, a, b, idx)));
      if (v !== t) setRelation(state, a, b, Math.abs(t - v) <= D.DRIFT ? t : v + Math.sign(t - v) * D.DRIFT);
    }
  }
}

function action(kind: 'improve' | 'worsen') {
  return (state: GameState, cmd: { country: CountryId; target: CountryId }) => {
    if (cmd.target === cmd.country || !state.countries[cmd.target]?.alive || cmd.target <= 0) return 'no such country';
    const existing = state.diploActions.find(x => x.from === cmd.country && x.to === cmd.target);
    if (existing) { existing.kind = kind; return null; }
    if (state.diploActions.filter(x => x.from === cmd.country).length >= diploCapacity(state, cmd.country)) return 'noCapacity';
    state.diploActions.push({ from: cmd.country, to: cmd.target, kind });
    return null;
  };
}

handlers.improveRelations = action('improve');
handlers.worsenRelations = action('worsen');
handlers.stopDiploAction = (state, cmd: Extract<Command, { type: 'stopDiploAction' }>) => {
  const before = state.diploActions.length;
  state.diploActions = state.diploActions.filter(x => !(x.from === cmd.country && x.to === cmd.target));
  return state.diploActions.length === before ? 'no such action' : null;
};
systems.init.push(state => initRelations(state));
systems.month.push(state => monthlyRelations(state));
