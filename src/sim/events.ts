// History events: monthly triggers, AI choices by weight, player cards (answered by command or defaulted after 30
// days). Effects reuse the existing systems; ones that no longer make sense are skipped and counted.
import { EVENTS, eventById } from '../content/events';
import type { Condition, EventDef, EventEffect } from '../content/events/types';
import { LAW_BY_ID } from '../content/laws';
import { TECH_BY_ID } from '../content/techs';
import { getStateTiles } from '../map/stateTiles';
import { BALANCE } from './balance';
import { TICKS_PER_DAY, dateAtTick } from './calendar';
import { setTile } from './control';
import { effectSources } from './mods';
import { setLaw } from './politics';
import { handlers, systems } from './registry';
import { nextRandom } from './rng';
import { atWar, warsOf } from './war';
import { blocOf } from './blocs';
import { startRevolt } from './revolts';
import { changeRelation, relation } from './diplomacy/relations';
import { playCheck, startPlay } from './diplomacy/plays';
import { DIFFICULTIES } from './ai/difficulty';
import type { Command, Country, CountryId, Demand, GameDate, GameState, SimEvent } from './types';

const V = BALANCE.events;

const dateNum = (d: GameDate) => d.y * 10000 + d.m * 100 + d.d;

/** Current tags first, then former tags (a country that formed Germany still answers to Prussia's events). */
function tagMap(state: GameState): Map<string, CountryId> {
  const m = new Map<string, CountryId>();
  for (const c of state.countries) if (c.alive && c.id) for (const t of c.formerTags ?? []) m.set(t, c.id);
  for (const c of state.countries) if (c.alive && c.id) m.set(c.tag, c.id);
  return m;
}
const byTag = (state: GameState, tag: string) => state.countries.find(c => c.alive && c.id && c.tag === tag) ?? state.countries.find(c => c.alive && c.id && c.formerTags?.includes(tag));
const stateByKey = (state: GameState, key: string) => state.map.states.find(s => s.key === key)?.id ?? 0;

export function conditionHolds(state: GameState, c: Country, k: Condition): boolean {
  switch (k.kind) {
    case 'hasTech': return c.techs.includes(k.tech);
    case 'law': return Object.values(c.laws).includes(k.law);
    case 'notLaw': return !Object.values(c.laws).includes(k.law);
    case 'ownsState': { const s = stateByKey(state, k.key); return !!s && state.states[s].owner === c.id; }
    case 'notOwnsState': { const s = stateByKey(state, k.key); return !s || state.states[s].owner !== c.id; }
    case 'ownsShare': {
      let total = 0, mine = 0;
      for (const s of state.map.states) if (s.id && k.prefixes.some(p => s.key.startsWith(p))) { total++; if (state.states[s.id].owner === c.id) mine++; }
      return total > 0 && mine / total >= k.share;
    }
    case 'atWar': return warsOf(state, c.id).length > 0;
    case 'atPeace': return warsOf(state, c.id).length === 0;
    case 'atWarWith': { const t = byTag(state, k.tag); return !!t && !!atWar(state, c.id, t.id); }
    case 'exists': return !!byTag(state, k.tag);
    case 'notExists': return !byTag(state, k.tag);
    case 'flag': return (k.global ? state.flags : c.flags).includes(k.flag);
    case 'notFlag': return !(k.global ? state.flags : c.flags).includes(k.flag);
    case 'relationAbove': { const t = byTag(state, k.tag); return !!t && relation(state, c.id, t.id) > k.value; }
    case 'relationBelow': { const t = byTag(state, k.tag); return !!t && relation(state, c.id, t.id) < k.value; }
    case 'isAI': return !c.isPlayer;
    case 'isPuppet': return !!c.overlord;
    case 'notPuppet': return !c.overlord;
    case 'groupRadical': return c.groups[k.group].radicalism > k.above;
    case 'moneyBelow': return c.money < k.value;
    case 'inBloc': return !!blocOf(state, c.id);
    case 'notInBloc': return !blocOf(state, c.id);
  }
}

/** Applies one effect for country `c`; false when it no longer makes sense and was skipped. */
function applyEffect(state: GameState, c: Country, e: EventEffect, events: SimEvent[], changed: number[]): boolean {
  if (!c.alive) return false;
  switch (e.kind) {
    case 'money': c.money += e.amount; return true;
    case 'incomeMonths': c.money += Math.max(V.MIN_MONTHLY_INCOME, Math.abs(c.income)) * e.months; return true;
    case 'setLaw': if (!LAW_BY_ID[e.law] || Object.values(c.laws).includes(e.law)) return false; setLaw(c, e.law, events); return true;
    case 'relation': { const t = byTag(state, e.tag); if (!t || t.id === c.id) return false; changeRelation(state, c.id, t.id, e.delta); return true; }
    case 'flag': { const list = e.global ? state.flags : c.flags; if (!list.includes(e.flag)) list.push(e.flag); return true; }
    case 'clearFlag': { if (e.global) state.flags = state.flags.filter(f => f !== e.flag); else c.flags = c.flags.filter(f => f !== e.flag); return true; }
    case 'modifier': c.modifiers.push({ name: e.name, effects: e.effects, until: state.tick + Math.round(e.months * 30.44 * TICKS_PER_DAY) }); return true;
    case 'tech': if (!TECH_BY_ID[e.tech] || c.techs.includes(e.tech)) return false; c.techs.push(e.tech); return true;
    case 'troops': c.troops = Math.max(0, c.troops + e.share * c.maxTroops); return true;
    case 'approval': { const gs = c.groups[e.group]; gs.radicalism = Math.max(0, Math.min(100, gs.radicalism + e.radicalism)); return true; }
    case 'startPlay': {
      const t = byTag(state, e.target);
      if (!t) return false;
      const demands: Demand[] = [];
      for (const d of e.demands) {
        if (d.kind !== 'state') { demands.push(d); continue; }
        const s = stateByKey(state, d.key);
        if (s && state.states[s].owner === t.id) demands.push({ kind: 'state', state: s });
      }
      const cmd = { type: 'startPlay' as const, country: c.id, target: t.id, demands };
      if (!demands.length || playCheck(state, cmd)) return false;
      startPlay(state, c.id, t.id, demands, events);
      return true;
    }
    case 'transferStates': {
      const to = e.to === 'self' ? c : byTag(state, e.to);
      const from = e.from ? (e.from === 'self' ? c : byTag(state, e.from)) : undefined;
      if (!to || (e.from && !from)) return false;
      let moved = 0;
      const fromPlayer = new Map<CountryId, number[]>();
      for (const key of e.keys) {
        const s = stateByKey(state, key);
        const owner = s ? state.states[s].owner : 0;
        if (!s || !owner || owner === to.id || (from && owner !== from.id)) continue;
        const o = state.countries[owner];
        // Never land someone else is occupying: that changes hands only through war.
        if (state.states[s].controller !== owner) continue;
        // The player is never annexed by an AI's event: the AI makes demands instead (a diplomatic play, never the capital).
        if (o.isPlayer && !c.isPlayer) { if (s !== o.capitalState) fromPlayer.set(owner, [...(fromPlayer.get(owner) ?? []), s]); continue; }
        // Tiles a third country occupies stay with it only if it is at war with the new owner.
        for (const t of getStateTiles(state.map, s)) if (state.owner[t] === owner) { const k = state.controller[t]; setTile(state, t, to.id, k === owner || !atWar(state, k, to.id) ? to.id : k, changed); }
        // A country that loses its capital (unification of minors) moves it to its most populous remaining state.
        if (s === o.capitalState) {
          const rest = state.states.filter(x => x.id && x.owner === owner && x.controller === owner).sort((a, b) => b.population - a.population || a.id - b.id)[0];
          if (rest) o.capitalState = rest.id;
        }
        moved++;
      }
      for (const [owner, ids] of fromPlayer) {
        const cmd = { type: 'startPlay' as const, country: to.id, target: owner, demands: ids.slice(0, BALANCE.diplomacy.MAX_DEMANDS).map(s => ({ kind: 'state' as const, state: s })) };
        if (!playCheck(state, cmd)) { startPlay(state, to.id, owner, cmd.demands, events); moved++; }
      }
      return moved > 0;
    }
    case 'revolt': return !!startRevolt(state, c, e.group, events, changed);
    case 'foundBloc': return !handlers.foundBloc!(state, { type: 'foundBloc', country: c.id, blocType: e.blocType, principles: [e.blocType === 'tradeLeague' ? 'marketIntegration' : 'freeTradeArea'] }, events, changed);
    case 'inviteToBloc': { const t = byTag(state, e.tag); return !!t && !handlers.inviteToBloc!(state, { type: 'inviteToBloc', country: c.id, target: t.id }, events, changed); }
    case 'independence': case 'release': case 'formNation': return effectHooks[e.kind](state, c, e as never, events, changed);
  }
}

/** Independence, release and formNation plug in from their own modules. */
export const effectHooks: Record<'independence' | 'release' | 'formNation', (state: GameState, c: Country, e: never, events: SimEvent[], changed: number[]) => boolean> = {
  independence: () => false, release: () => false, formNation: () => false,
};

export function resolveEvent(state: GameState, def: EventDef, c: Country, option: number, events: SimEvent[], changed: number[]): void {
  const opt = def.options[option] ?? def.options[0];
  let skipped = 0;
  // A card answered later than it fired: if its circumstances changed, nothing applies (rather than half of it).
  const stillHolds = def.conditions.every(k => conditionHolds(state, c, k));
  for (const e of opt.effects) if (!stillHolds || !applyEffect(state, c, e, events, changed)) skipped++;
  state.eventLog.push({ event: def.id, country: c.id, tick: state.tick, option });
  events.push({ type: 'eventResolved', country: c.id, event: def.id, option, skipped });
}

function aiChoice(state: GameState, def: EventDef, c: Country): number {
  const hard = DIFFICULTIES[c.difficulty].level >= 2;
  const w = def.options.map(o => Math.max(0, hard && o.aiHard !== undefined ? o.aiHard : o.ai));
  const total = w.reduce((a, b) => a + b, 0);
  if (total <= 0) return 0;
  let r = nextRandom(state) * total;
  for (let i = 0; i < w.length; i++) { r -= w[i]; if (r < 0) return i; }
  return w.length - 1;
}

export function monthlyEvents(state: GameState, events: SimEvent[], changed: number[] = []): void {
  for (const c of state.countries) if (c.alive && c.modifiers.length) c.modifiers = c.modifiers.filter(m => m.until > state.tick);
  const now = dateNum(dateAtTick(state.startDate, state.tick));
  const tags = tagMap(state);
  for (const def of EVENTS) {
    if (def.starts && !def.starts.includes(state.setup.startId)) continue;
    if ((def.start && now < dateNum(def.start)) || (def.end && now > dateNum(def.end))) continue;
    const ids = def.countries === 'any' ? state.countries.filter(c => c.alive && c.id).map(c => c.id) : def.countries.map(t => tags.get(t)).filter((x): x is CountryId => !!x);
    for (const id of ids) {
      const c = state.countries[id];
      if (!c.alive) continue;
      if (!def.repeat && (state.eventLog.some(l => l.event === def.id && l.country === id) || state.pendingEvents.some(p => p.event === def.id && p.country === id))) continue;
      if (c.isPlayer && state.pendingEvents.filter(p => p.country === id).length >= V.MAX_OPEN_CARDS) continue;
      if (!def.conditions.every(k => conditionHolds(state, c, k))) continue;
      if (def.mtthMonths > 0 && !(nextRandom(state) < 1 / def.mtthMonths)) continue;
      if (c.isPlayer) {
        const p = { id: state.nextId++, event: def.id, country: id, tick: state.tick };
        state.pendingEvents.push(p);
        events.push({ type: 'eventFired', country: id, event: def.id, pending: p.id });
      } else resolveEvent(state, def, c, aiChoice(state, def, c), events, changed);
    }
  }
}

/** Unanswered cards take their first option after 30 days; cards for countries that are gone just close. */
export function eventDay(state: GameState, events: SimEvent[], changed: number[]): void {
  if (!state.pendingEvents.length) return;
  for (const p of state.pendingEvents.slice()) {
    const c = state.countries[p.country];
    const def = eventById(p.event);
    if (!c?.alive || !def) { state.pendingEvents = state.pendingEvents.filter(x => x !== p); continue; }
    if (state.tick - p.tick < V.CARD_DAYS * TICKS_PER_DAY) continue;
    state.pendingEvents = state.pendingEvents.filter(x => x !== p);
    resolveEvent(state, def, c, 0, events, changed);
  }
}

// ---- wiring ----
effectSources.push({
  sig: (_s, c) => c.modifiers.map(m => `${m.name}@${m.until}`).join(','),
  effects: (_s, c) => c.modifiers.map(m => m.effects),
});

handlers.chooseEventOption = (state, cmd: Extract<Command, { type: 'chooseEventOption' }>, events, changed) => {
  const p = state.pendingEvents.find(x => x.id === cmd.pending && x.country === cmd.country);
  if (!p) return 'no such event';
  const def = eventById(p.event);
  if (!def) return 'no such event';
  if (!Number.isInteger(cmd.option) || cmd.option < 0 || cmd.option >= def.options.length) return 'bad option';
  state.pendingEvents = state.pendingEvents.filter(x => x !== p);
  resolveEvent(state, def, state.countries[cmd.country], cmd.option, events, changed);
  return null;
};

systems.month.push((state, events, changed) => monthlyEvents(state, events, changed));
systems.day.push((state, events, changed) => eventDay(state, events, changed));
