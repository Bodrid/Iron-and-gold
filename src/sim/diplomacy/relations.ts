// Relations between countries: a target value from circumstances (borders, rivalries, enemies, trade, treaties),
// actions that push it, and monthly drift toward it.
import { personalityOf } from '../../content/personalities';
import { BALANCE } from '../balance';
import { handlers, systems } from '../registry';
import type { Command, CountryId, GameState } from '../types';

const D = BALANCE.diplomacy;
export type RelationLevel = 'hostile' | 'cold' | 'neutral' | 'cordial' | 'friendly';

/** Extra baseline terms from other systems (treaties, infamy…). */
export const relationBaselineHooks: ((state: GameState, a: CountryId, b: CountryId) => number)[] = [];

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

export function baseline(state: GameState, a: CountryId, b: CountryId, borders: Set<number>): number {
  const n = state.countries.length;
  const ca = state.countries[a], cb = state.countries[b];
  let v = 0;
  if (borders.has(Math.min(a, b) * n + Math.max(a, b))) v += D.BORDER;
  if (personalityOf(ca.personality).rivals.includes(cb.tag) || personalityOf(cb.personality).rivals.includes(ca.tag)) v += D.RIVAL;
  const enemiesOf = (c: CountryId) => state.wars.filter(w => w.a === c || w.b === c).map(w => (w.a === c ? w.b : w.a));
  const ea = enemiesOf(a), eb = enemiesOf(b);
  if (!ea.includes(b) && ea.some(e => eb.includes(e))) v += D.SHARED_ENEMY;
  if (state.tradeRoutes.some(r => (r.exporter === a && r.importer === b) || (r.exporter === b && r.importer === a))) v += D.TRADE_ROUTE;
  for (const h of relationBaselineHooks) v += h(state, a, b);
  return v;
}

function target(state: GameState, a: CountryId, b: CountryId, borders: Set<number>): number {
  let t = baseline(state, a, b, borders);
  for (const x of state.diploActions) if ((x.from === a && x.to === b) || (x.from === b && x.to === a)) t += x.kind === 'improve' ? D.ACTION_SHIFT : -D.ACTION_SHIFT;
  return t;
}

export function initRelations(state: GameState): void {
  ensureRelations(state);
  const borders = borderPairs(state);
  for (let a = 1; a < state.countries.length; a++) for (let b = a + 1; b < state.countries.length; b++) setRelation(state, a, b, baseline(state, a, b, borders));
}

export function monthlyRelations(state: GameState): void {
  ensureRelations(state);
  const borders = borderPairs(state);
  state.diploActions = state.diploActions.filter(x => state.countries[x.from].alive && state.countries[x.to].alive);
  for (const x of state.diploActions) { const c = state.countries[x.from]; c.money -= D.RELATION_ACTION_COST; c.income -= D.RELATION_ACTION_COST; }
  for (let a = 1; a < state.countries.length; a++) {
    if (!state.countries[a].alive) continue;
    for (let b = a + 1; b < state.countries.length; b++) {
      if (!state.countries[b].alive) continue;
      const v = relation(state, a, b), t = Math.max(-100, Math.min(100, target(state, a, b, borders)));
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
