// Research: points bank up monthly and are spent on the current tech; the queue supplies the next one.
import { ERAS, ERA_COST, TECHS, TECH_BY_ID } from '../content/techs';
import { BALANCE } from './balance';
import { dateAtTick } from './calendar';
import { handlers, systems } from './registry';
import type { Command, Country, GameState, SimEvent } from './types';

const R = BALANCE.research;

export function eraOfYear(year: number): number {
  let e = 1;
  for (const x of ERAS) if (year >= x.from) e = x.era;
  return e;
}
export function currentEra(state: GameState): number { return eraOfYear(dateAtTick(state.startDate, state.tick).y); }

/** Share of living countries that know each tech, cached until any country's tech list changes (techs are never lost). */
const shareCache = new WeakMap<GameState, { sig: string; share: Map<string, number> }>();
function knownShare(state: GameState, tech: string): number {
  let n = 0, alive = 0;
  for (const c of state.countries) if (c.alive) { alive++; n += c.techs.length; }
  const sig = `${state.countries.length}:${alive}:${n}`;
  let e = shareCache.get(state);
  if (!e || e.sig !== sig) { e = { sig, share: computeShare(state) }; shareCache.set(state, e); }
  return e.share.get(tech) ?? 0;
}
function computeShare(state: GameState): Map<string, number> {
  const count = new Map<string, number>();
  let alive = 0;
  for (const c of state.countries) {
    if (!c.alive) continue;
    alive++;
    for (const t of c.techs) count.set(t, (count.get(t) ?? 0) + 1);
  }
  const share = new Map<string, number>();
  for (const [t, n] of count) share.set(t, n / Math.max(1, alive));
  return share;
}

export function techCost(state: GameState, _c: Country, tech: string): number {
  const def = TECH_BY_ID[tech];
  if (!def) return Infinity;
  const ahead = Math.max(0, def.era - currentEra(state));
  return Math.round(ERA_COST[def.era] * (1 - R.SPREAD_DISCOUNT * knownShare(state, tech)) * (1 + R.AHEAD_PENALTY * ahead));
}

export function knows(c: Country, tech: string): boolean { return c.techs.includes(tech); }

/** Can start researching right now: exists, not known, prerequisites known. */
export function canResearch(_state: GameState, c: Country, tech: string): boolean {
  const def = TECH_BY_ID[tech];
  return !!def && !knows(c, tech) && def.requires.every(r => knows(c, r));
}

/** Can be queued: like canResearch, but prerequisites may be researching or earlier in the queue. */
function canQueue(c: Country, tech: string): boolean {
  const def = TECH_BY_ID[tech];
  if (!def || knows(c, tech) || c.researching === tech || c.researchQueue.includes(tech)) return false;
  return def.requires.every(r => knows(c, r) || c.researching === r || c.researchQueue.includes(r));
}

/** Techs available to research now, in tree/era order. */
export function availableTechs(state: GameState, c: Country): string[] {
  return TECHS.filter(t => canResearch(state, c, t.id)).map(t => t.id);
}

function startNext(state: GameState, c: Country): void {
  const i = c.researchQueue.findIndex(t => canResearch(state, c, t));
  if (i < 0) { c.researching = null; return; }
  c.researching = c.researchQueue[i];
  c.researchQueue.splice(i, 1);
}

export function researchMonth(state: GameState, events: SimEvent[]): void {
  for (const c of state.countries) {
    if (!c.alive) continue;
    // Drop anything already known (another path taught it, or an old save).
    c.researchQueue = c.researchQueue.filter(t => TECH_BY_ID[t] && !knows(c, t));
    if (c.researching && !canResearch(state, c, c.researching)) c.researching = null;
    if (!c.researching) startNext(state, c);
    // A few techs can finish in one month when lots of points are banked.
    for (let guard = 0; c.researching && guard < 5; guard++) {
      const cost = techCost(state, c, c.researching);
      if (!(c.researchPoints >= cost)) break;
      c.researchPoints -= cost;
      c.techs.push(c.researching);
      events.push({ type: 'techResearched', country: c.id, tech: c.researching });
      startNext(state, c);
    }
  }
}

// ---- commands ----
handlers.research = (state, cmd: Extract<Command, { type: 'research' }>) => {
  const c = state.countries[cmd.country];
  if (!canResearch(state, c, cmd.tech)) return TECH_BY_ID[cmd.tech] ? (knows(c, cmd.tech) ? 'already known' : 'needs earlier techs') : 'unknown tech';
  c.researchQueue = c.researchQueue.filter(t => t !== cmd.tech);
  if (c.researching && c.researching !== cmd.tech) c.researchQueue.unshift(c.researching);
  c.researching = cmd.tech;
  return null;
};
handlers.queueTech = (_state, cmd: Extract<Command, { type: 'queueTech' }>) => {
  const c = _state.countries[cmd.country];
  if (c.researchQueue.length >= R.MAX_QUEUE) return 'queue full';
  if (!canQueue(c, cmd.tech)) return TECH_BY_ID[cmd.tech] ? 'cannot queue' : 'unknown tech';
  if (!c.researching && canResearch(_state, c, cmd.tech)) c.researching = cmd.tech;
  else c.researchQueue.push(cmd.tech);
  return null;
};
handlers.unqueueTech = (_state, cmd: Extract<Command, { type: 'unqueueTech' }>) => {
  const c = _state.countries[cmd.country];
  if (c.researching === cmd.tech) { c.researching = null; return null; }
  if (!c.researchQueue.includes(cmd.tech)) return 'not queued';
  c.researchQueue = c.researchQueue.filter(t => t !== cmd.tech);
  return null;
};

systems.month.push((state, events) => researchMonth(state, events));
