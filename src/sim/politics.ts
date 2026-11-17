// Laws and interest groups: clout from the economy, approval from laws, living standards and wars, radicalism
// when groups stay angry, and passing new laws with enough support.
import { GROUP_IDS, type GroupId } from '../content/groups';
import { LAW_AREAS, LAW_BY_ID, type LawArea } from '../content/laws';
import { BUILDINGS } from '../content/buildings';
import { BALANCE } from './balance';
import { TICKS_PER_DAY } from './calendar';
import { effectSources, mods } from './mods';
import { handlers, systems } from './registry';
import { nextRandom } from './rng';
import { warsOf } from './war';
import type { Command, Country, GameState, SimEvent } from './types';

const P = BALANCE.politics;
const YEAR = 365 * TICKS_PER_DAY;

export interface GroupState { clout: number; approval: number; radicalism: number }

export function emptyGroups(): Record<GroupId, GroupState> {
  return Object.fromEntries(GROUP_IDS.map(g => [g, { clout: 1 / GROUP_IDS.length, approval: 0, radicalism: 0 }])) as Record<GroupId, GroupState>;
}

export const attitude = (g: GroupId, law: string) => LAW_BY_ID[law]?.attitudes[g] ?? 0;

// ---- clout ----
interface Workforce { agri: number; industry: number; employed: number; barracks: number; universities: number; states: number }

/** One pass over all states, grouped by owner. */
function workforces(state: GameState): Map<number, Workforce> {
  const out = new Map<number, Workforce>();
  for (const st of state.states) {
    if (!st.id || !st.owner) continue;
    let w = out.get(st.owner);
    if (!w) out.set(st.owner, w = { agri: 0, industry: 0, employed: 0, barracks: 0, universities: 0, states: 0 });
    w.states++;
    for (const b of st.buildings) {
      const def = BUILDINGS[b.type];
      const n = def.workers * b.level;
      w.employed += n;
      if (b.type === 'farm' || b.type === 'loggingCamp') w.agri += n;
      else if (def.category === 'industry' || b.type === 'coalMine' || b.type === 'ironMine') w.industry += n;
      if (b.type === 'barracks') w.barracks += b.level;
      if (b.type === 'university') w.universities += b.level;
    }
  }
  return out;
}

export function computeClout(c: Country, w: Workforce | undefined): Record<GroupId, number> {
  const emp = Math.max(1, w?.employed ?? 0);
  const agri = (w?.agri ?? 0) / emp, ind = (w?.industry ?? 0) / emp;
  const laws = c.laws;
  const raw: Record<GroupId, number> = {
    landowners: 1 + 4 * agri + (laws.labour === 'serfdom' || laws.labour === 'slavery' ? 1 : 0),
    industrialists: 0.2 + 4 * ind,
    workers: 0.2 + 3 * ind + (laws.voting === 'universalSuffrage' ? 0.5 : 0),
    clergy: Math.max(0.2, 1.2 - c.literacy) + (laws.education === 'religiousSchools' ? 0.3 : 0),
    army: 0.4 + Math.min(2, (c.troops / Math.max(1, c.population)) * 100) + ((w?.barracks ?? 0) / Math.max(1, w?.states ?? 1)) * 0.5,
    intellectuals: 0.1 + 2 * c.literacy + Math.min(1, (w?.universities ?? 0) * 0.1),
  };
  // Who holds power: the voting law and the government amplify some groups.
  if (laws.voting === 'noVoting') { raw.landowners *= 1.5; raw.army *= 1.2; }
  if (laws.voting === 'wealthVoting') raw.industrialists *= 1.4;
  if (laws.voting === 'universalSuffrage') raw.workers *= 1.5;
  if (laws.government === 'absoluteMonarchy') { raw.landowners *= 1.2; raw.army *= 1.2; }
  if (laws.government === 'republic') raw.intellectuals *= 1.3;
  let sum = 0;
  for (const g of GROUP_IDS) sum += raw[g];
  for (const g of GROUP_IDS) raw[g] /= sum;
  return raw;
}

// ---- approval ----
/** Other sources of approval for one group (company monopolies…). */
export const approvalHooks: ((state: GameState, c: Country, g: GroupId) => number)[] = [];

export function approvalTarget(state: GameState, c: Country, g: GroupId): number {
  let v = 0;
  for (const h of approvalHooks) v += h(state, c, g);
  for (const a of LAW_AREAS) v += attitude(g, c.laws[a.id]);
  v += ((c.sol - P.SOL_NEUTRAL) / 2) * (g === 'workers' ? 1 : 0.4);
  const longWar = warsOf(state, c.id).some(w => state.tick - w.startTick > 2 * YEAR);
  if (longWar) v -= g === 'army' ? 0 : g === 'workers' ? 3 : 1.5;
  if (c.lastDefeat && state.tick - c.lastDefeat < P.DEFEAT_YEARS * YEAR) v -= g === 'army' ? 4 : 1;
  v += mods(state, c).approval;
  return Math.max(-10, Math.min(10, v));
}

// ---- support for a law ----
/** −4…4: how much more the country's groups like `law` than the law it replaces, weighted by clout. */
export function lawSupport(c: Country, law: string): number {
  const def = LAW_BY_ID[law];
  if (!def) return -Infinity;
  const current = c.laws[def.area];
  let s = 0;
  for (const g of GROUP_IDS) s += c.groups[g].clout * (attitude(g, law) - attitude(g, current));
  return s;
}

/** Monthly chance the law passes once the minimum months are up. */
export function passChance(support: number): number {
  return Math.max(0, Math.min(P.PASS_MAX, P.PASS_BASE + P.PASS_PER_SUPPORT * support));
}

export function enactCheck(state: GameState, c: Country, law: string): string | null {
  const def = LAW_BY_ID[law];
  if (!def) return 'unknown law';
  if (c.laws[def.area] === law) return 'alreadyLaw';
  if (c.enacting) return 'alreadyEnacting';
  if (c.overlord) return 'puppet';
  if (lawSupport(c, law) < P.FAIL_SUPPORT) return 'noSupport';
  void state;
  return null;
}

/** Switches a law immediately (law passed, revolution, or start-of-game setup). */
export function setLaw(c: Country, law: string): void {
  const def = LAW_BY_ID[law];
  if (def) c.laws = { ...c.laws, [def.area]: law };
}

function endEnactment(c: Country, events: SimEvent[], reason: 'noSupport' | 'timeout' | 'puppeted' | null): void {
  const law = c.enacting!.law;
  c.enacting = null;
  if (reason) events.push({ type: 'lawFailed', country: c.id, law, reason });
  else { setLaw(c, law); events.push({ type: 'lawPassed', country: c.id, law }); }
}

export function monthlyPolitics(state: GameState, events: SimEvent[]): void {
  const wf = workforces(state);
  for (const c of state.countries) {
    if (!c.alive) { c.enacting = null; continue; }
    const clout = computeClout(c, wf.get(c.id));
    for (const g of GROUP_IDS) {
      const gs = c.groups[g];
      gs.clout = clout[g];
      const t = approvalTarget(state, c, g);
      gs.approval = Math.abs(t - gs.approval) <= P.APPROVAL_STEP ? t : gs.approval + Math.sign(t - gs.approval) * P.APPROVAL_STEP;
      gs.radicalism = gs.approval <= P.ANGRY_AT
        ? Math.min(100, gs.radicalism + (-gs.approval - P.ANGRY_RISE_OFFSET) * P.ANGRY_RISE_MULT)
        : Math.max(0, gs.radicalism - P.RADICAL_DECAY);
    }
    if (!c.enacting) continue;
    const e = c.enacting;
    e.months++;
    if (c.overlord) { endEnactment(c, events, 'puppeted'); continue; }
    const support = lawSupport(c, e.law);
    if (support < P.FAIL_SUPPORT) { endEnactment(c, events, 'noSupport'); continue; }
    if (e.months >= P.ENACT_MIN_MONTHS && nextRandom(state) < passChance(support)) { endEnactment(c, events, null); continue; }
    if (e.months >= P.ENACT_MAX_MONTHS) endEnactment(c, events, 'timeout');
  }
}

// ---- wiring ----
effectSources.push({
  sig: (_s, c) => LAW_AREAS.map(a => c.laws[a.id]).join(','),
  effects: (_s, c) => LAW_AREAS.map(a => LAW_BY_ID[c.laws[a.id]]?.effects ?? {}),
});

handlers.enactLaw = (state, cmd: Extract<Command, { type: 'enactLaw' }>) => {
  const c = state.countries[cmd.country];
  const bad = enactCheck(state, c, cmd.law);
  if (bad) return bad;
  c.enacting = { law: cmd.law, startTick: state.tick, months: 0 };
  return null;
};
handlers.cancelEnactment = (state, cmd: Extract<Command, { type: 'cancelEnactment' }>) => {
  const c = state.countries[cmd.country];
  if (!c.enacting) return 'notEnacting';
  c.enacting = null;
  return null;
};

systems.init.push(state => {
  // Clout and approval start where they would settle, so the first months aren't a jolt.
  const wf = workforces(state);
  for (const c of state.countries) {
    if (!c.alive) continue;
    const clout = computeClout(c, wf.get(c.id));
    for (const g of GROUP_IDS) { c.groups[g].clout = clout[g]; c.groups[g].approval = approvalTarget(state, c, g); }
  }
});
systems.month.push((state, events) => monthlyPolitics(state, events));

export type { LawArea };
