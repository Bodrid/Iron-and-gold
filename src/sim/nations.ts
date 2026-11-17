// Independence revolts, released nations and formable nations (Germany, Italy…).
import { FORMABLES, formableByTag, type FormableDef } from '../content/formables';
import type { GroupId } from '../content/groups';
import { BALANCE } from './balance';
import { TICKS_PER_DAY } from './calendar';
import { setTile } from './control';
import { changeRelation } from './diplomacy/relations';
import { effectHooks } from './events';
import { handlers, systems } from './registry';
import { splinter } from './revolts';
import { eliminate, startWar, warsOf } from './war';
import type { Command, Country, CountryId, GameState, SimEvent } from './types';

const N = BALANCE.nations;
const stateIdsFor = (state: GameState, keys: string[]) => keys.map(k => state.map.states.find(s => s.key === k)?.id ?? 0).filter(s => s > 0);
const tagTaken = (state: GameState, tag: string) => state.countries.some(c => c.alive && c.id && c.tag === tag);

interface Who { tag: string; name: string; color: number; keys: string[]; group?: GroupId; troops?: number; defensePct?: number }

/** Rebels rise for independence in the listed states the parent owns (never its capital). */
export function startIndependence(state: GameState, parent: Country, who: Who, events: SimEvent[], changed: number[]): Country | null {
  if (!parent.alive || tagTaken(state, who.tag) || state.countries.length >= BALANCE.politics.MAX_COUNTRIES) return null;
  const ids = stateIdsFor(state, who.keys).filter(s => state.states[s].owner === parent.id && s !== parent.capitalState);
  if (!ids.length) return null;
  const pop = ids.reduce((n, s) => n + state.states[s].population, 0);
  const share = Math.min(N.INDEPENDENCE_MAX_SHARE, N.INDEPENDENCE_BASE_SHARE + pop / Math.max(1, parent.population));
  const rebels = splinter(state, parent, who, ids, share, changed);
  rebels.rebel = { parent: parent.id, group: who.group ?? 'intellectuals', law: '', independence: true };
  // Independence fighters raise more than their numbers suggest and defend their homes fiercely for some years.
  const extra = Math.max(0, Math.round(Math.max(pop * BALANCE.troops.MANPOWER_SHARE * N.INDEPENDENCE_TROOPS, parent.troops * (who.troops ?? N.INDEPENDENCE_MIN_PARENT_SHARE))) - rebels.troops);
  rebels.troops += extra;
  // The troop limit rises enough to keep the army they start with (it would otherwise melt back down to the limit).
  const baseMax = Math.max(1, pop * BALANCE.troops.MANPOWER_SHARE);
  const maxPct = Math.max(N.INDEPENDENCE_MAX_TROOPS_PCT, Math.round(100 * (rebels.troops / baseMax - 1)));
  rebels.modifiers.push({ name: 'War of independence', effects: { defensePct: who.defensePct ?? N.INDEPENDENCE_DEFENSE_PCT, refillPct: N.INDEPENDENCE_REFILL_PCT, maxTroopsPct: maxPct }, until: state.tick + N.INDEPENDENCE_MONTHS * 30 * TICKS_PER_DAY });
  changeRelation(state, rebels.id, parent.id, -100);
  startWar(state, [rebels.id], [parent.id], [{ kind: 'independence' }], events);
  events.push({ type: 'revolt', country: parent.id, rebels: rebels.id, group: rebels.rebel.group, law: '' });
  return rebels;
}

/** A new country takes the listed states peacefully. */
export function releaseNation(state: GameState, parent: Country, who: Who, events: SimEvent[], changed: number[] = []): Country | null {
  if (!parent.alive || tagTaken(state, who.tag)) return null;
  const ids = stateIdsFor(state, who.keys).filter(s => state.states[s].owner === parent.id && s !== parent.capitalState);
  if (!ids.length) return null;
  const pop = ids.reduce((n, s) => n + state.states[s].population, 0);
  const c = splinter(state, parent, who, ids, Math.min(0.5, pop / Math.max(1, parent.population)), changed);
  changeRelation(state, c.id, parent.id, N.RELEASE_RELATION);
  events.push({ type: 'nationReleased', country: c.id, from: parent.id });
  return c;
}

export function coreStates(state: GameState, f: FormableDef): number[] {
  return state.map.states.filter(s => s.id && f.cores.some(p => s.key.startsWith(p))).map(s => s.id);
}
export function coreShare(state: GameState, c: CountryId, f: FormableDef): number {
  const cores = coreStates(state, f);
  return cores.length ? cores.filter(s => state.states[s].owner === c).length / cores.length : 0;
}

export function formCheck(state: GameState, c: CountryId, tag: string): string | null {
  const f = formableByTag(tag);
  const x = state.countries[c];
  if (!f) return 'unknown nation';
  if (tagTaken(state, tag)) return 'alreadyExists';
  if (!f.from.includes(x.tag)) return 'notEligible';
  if (x.overlord) return 'puppet';
  if (x.rebel) return 'rebels';
  if (warsOf(state, c).length) return 'atWar';
  if (coreShare(state, c, f) < f.share) return 'needsCores';
  return null;
}

export function formNation(state: GameState, c: CountryId, tag: string, events: SimEvent[], changed: number[]): void {
  const f = formableByTag(tag)!;
  const x = state.countries[c];
  x.tag = f.tag; x.name = f.name; x.color = f.color;
  x.modifiers.push({ name: `${f.name} united`, effects: { outputPct: { all: N.FORM_OUTPUT_PCT } }, until: Number.MAX_SAFE_INTEGER });
  // Its puppets inside the nation's lands join it.
  const cores = new Set(coreStates(state, f));
  for (const p of state.countries.filter(y => y.alive && y.overlord === c)) {
    if (![...cores].some(s => state.states[s].owner === p.id)) continue;
    for (let t = 0; t < state.owner.length; t++) if (state.owner[t] === p.id) setTile(state, t, c, state.controller[t] === p.id ? c : state.controller[t], changed);
    eliminate(state, p.id, events, changed, true);
    events.push({ type: 'annexed', overlord: c, puppet: p.id });
  }
  events.push({ type: 'nationFormed', country: c, tag: f.tag, name: f.name });
}

handlers.formNation = (state, cmd: Extract<Command, { type: 'formNation' }>, events, changed) => {
  const bad = formCheck(state, cmd.country, cmd.tag);
  if (bad) return bad;
  formNation(state, cmd.country, cmd.tag, events, changed);
  return null;
};

effectHooks.independence = (state, c, e: Who, events, changed) => !!startIndependence(state, c, e, events, changed);
effectHooks.release = (state, c, e: { tag: string; name: string; color: number; keys: string[] }, events, changed) => !!releaseNation(state, c, e, events, changed);
effectHooks.formNation = (state, c, e: { tag: string }, events, changed) => { if (formCheck(state, c.id, e.tag)) return false; formNation(state, c.id, e.tag, events, changed); return true; };

// AI countries proclaim a nation as soon as they can (checked monthly; cheap: few formables, few eligible tags).
systems.month.push((state, events, changed) => {
  if (state.setup.aiDisabled) return;
  for (const f of FORMABLES) {
    if (tagTaken(state, f.tag)) continue;
    for (const c of state.countries) {
      if (!c.alive || c.isPlayer || !f.from.includes(c.tag)) continue;
      if (!formCheck(state, c.id, f.tag)) { formNation(state, c.id, f.tag, events, changed); break; }
    }
  }
});
