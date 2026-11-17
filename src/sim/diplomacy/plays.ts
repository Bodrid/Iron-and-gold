// Diplomatic plays: make a demand, let the world pick sides for 60 days, then the target gives in or war starts.
import { DEMAND_INFAMY } from '../../content/diplomacy';
import { BALANCE } from '../balance';
import { TICKS_PER_DAY } from '../calendar';
import { handlers, systems } from '../registry';
import { atWar, startWar } from '../war';
import type { Command, CountryId, Demand, GameState, Play, SimEvent } from '../types';
import { applyDemands, demandHooks } from './demands';
import { addInfamy, coalitionDefenders } from './infamy';
import { hasTreaty } from './treaties';

const D = BALANCE.diplomacy;

export function involved(state: GameState, c: CountryId): Play | undefined {
  return state.plays.find(p => p.sideA.includes(c) || p.sideB.includes(c));
}

export function sideStrength(state: GameState, side: CountryId[]): number {
  return side.reduce((n, c) => n + state.countries[c].troops + state.countries[c].maxTroops * 0.5, 0);
}

/** Other systems that can forbid a play (power blocs). */
export const playCheckHooks: ((state: GameState, initiator: CountryId, target: CountryId) => string | null)[] = [];

/** Other systems that bring defenders into a play (power blocs). */
export const joinerHooks: ((state: GameState, initiator: CountryId, target: CountryId) => CountryId[])[] = [];

/** AI third parties decide whether to join (the AI module fills this in). */
export const playHooks = { decide: (_s: GameState, _p: Play, _e: SimEvent[]) => {} };

export function playCheck(state: GameState, cmd: Extract<Command, { type: 'startPlay' }>): string | null {
  const c = state.countries[cmd.country], t = state.countries[cmd.target];
  if (!t?.alive || cmd.target <= 0 || cmd.target === cmd.country) return 'no such country';
  if (c.overlord) return 'puppet';
  if (c.rebel || t.rebel) return 'rebels';
  if (t.overlord === cmd.country) return 'alreadyPuppet';
  if (t.overlord) return 'targetIsPuppet';
  if (atWar(state, cmd.country, cmd.target)) return 'atWar';
  if (state.plays.some(p => p.target === cmd.target || p.initiator === cmd.country || p.initiator === cmd.target)) return 'playUnderWay';
  if (hasTreaty(state, cmd.country, cmd.target, 'alliance')) return 'allied';
  for (const h of playCheckHooks) { const r = h(state, cmd.country, cmd.target); if (r) return r; }
  if (!Array.isArray(cmd.demands) || !cmd.demands.length || cmd.demands.length > D.MAX_DEMANDS) return 'badDemands';
  for (const d of cmd.demands) {
    if (d.kind === 'state' && state.states[d.state]?.owner !== cmd.target) return 'notTheirState';
    if (!['state', 'puppet', 'openMarket', 'reparations', 'joinBloc'].includes(d.kind)) return 'badDemands';
    if (d.kind === 'joinBloc') { const bad = demandHooks.joinBlocCheck(state, cmd.country, cmd.target); if (bad) return bad; }
  }
  return null;
}

function joiners(state: GameState, initiator: CountryId, target: CountryId) {
  const busy = (c: CountryId) => !!involved(state, c);
  const allies = (c: CountryId) => state.treaties.filter(t => t.kind === 'alliance' && (t.a === c || t.b === c)).map(t => (t.a === c ? t.b : t.a));
  const sideB = [target];
  for (const t of state.treaties) {
    const other = t.a === target ? t.b : t.b === target ? t.a : 0;
    if (!other || other === initiator) continue;
    // A country bound to both sides stays out.
    if ((t.kind === 'alliance' || t.kind === 'defensivePact') && !sideB.includes(other) && !allies(other).includes(initiator)) sideB.push(other);
    if (t.kind === 'guarantee' && t.b === target && !sideB.includes(t.a)) sideB.push(t.a);
  }
  for (const m of coalitionDefenders(state, initiator, target)) if (!sideB.includes(m)) sideB.push(m);
  for (const h of joinerHooks) for (const m of h(state, initiator, target)) if (m !== initiator && !sideB.includes(m)) sideB.push(m);
  // The initiator's allies come only if they aren't also bound to the defence.
  const sideA = [initiator, ...allies(initiator).filter(a => !sideB.includes(a) && !allies(a).includes(target))];
  // Puppets follow their overlord into wars (warStartHooks), never into someone else's play.
  const free = (c: CountryId) => state.countries[c].alive && !busy(c) && !state.countries[c].overlord;
  return { sideA: sideA.filter((c, i) => i === 0 || free(c)), sideB: sideB.filter((c, i) => i === 0 || (free(c) && !sideA.includes(c))) };
}

export function startPlay(state: GameState, initiator: CountryId, target: CountryId, demands: Demand[], events: SimEvent[]): Play {
  const { sideA, sideB } = joiners(state, initiator, target);
  const p: Play = { id: state.nextId++, initiator, target, demands, sideA, sideB, startTick: state.tick, endTick: state.tick + D.PLAY_DAYS * TICKS_PER_DAY };
  state.plays.push(p);
  addInfamy(state, initiator, demands.reduce((n, d) => n + DEMAND_INFAMY[d.kind], 0) * 0.5);
  events.push({ type: 'playStarted', initiator, target, playId: p.id });
  return p;
}

function yieldPlay(state: GameState, p: Play, events: SimEvent[], changed: number[]) {
  state.plays = state.plays.filter(x => x !== p);
  const done = applyDemands(state, p.initiator, p.target, p.demands, events, changed);
  events.push({ type: 'playYielded', initiator: p.initiator, target: p.target, demands: done });
}

function cancelPlay(state: GameState, p: Play, events: SimEvent[]) {
  state.plays = state.plays.filter(x => x !== p);
  events.push({ type: 'playCancelled', initiator: p.initiator, target: p.target });
}

export function playTick(state: GameState, events: SimEvent[], changed: number[]): void {
  for (const p of state.plays.slice()) {
    p.sideA = p.sideA.filter(c => state.countries[c].alive);
    p.sideB = p.sideB.filter(c => state.countries[c].alive);
    if (!state.countries[p.initiator].alive || !state.countries[p.target].alive) { cancelPlay(state, p, events); continue; }
    if (!p.decided && state.tick >= p.startTick + Math.floor(D.PLAY_DAYS / 2) * TICKS_PER_DAY) { p.decided = true; playHooks.decide(state, p, events); }
    if (state.tick < p.endTick) continue;
    const target = state.countries[p.target];
    if (!target.isPlayer && sideStrength(state, p.sideB) < D.BACK_DOWN_RATIO * sideStrength(state, p.sideA)) { yieldPlay(state, p, events, changed); continue; }
    state.plays = state.plays.filter(x => x !== p);
    startWar(state, p.sideA, p.sideB, p.demands, events);
  }
}

handlers.startPlay = (state, cmd: Extract<Command, { type: 'startPlay' }>, events) => {
  const bad = playCheck(state, cmd);
  if (bad) return bad;
  startPlay(state, cmd.country, cmd.target, cmd.demands.map(d => ({ ...d })), events);
  return null;
};
export function joinCheck(state: GameState, country: CountryId, playId: number): string | null {
  if (!state.plays.some(x => x.id === playId)) return 'no such play';
  if (involved(state, country)) return 'alreadyInvolved';
  if (state.countries[country].overlord) return 'puppet';
  if (state.countries[country].rebel) return 'rebels';
  return null;
}

handlers.joinPlay = (state, cmd: Extract<Command, { type: 'joinPlay' }>, events) => {
  const bad = joinCheck(state, cmd.country, cmd.playId);
  if (bad) return bad;
  const p = state.plays.find(x => x.id === cmd.playId)!;
  (cmd.side === 'A' ? p.sideA : p.sideB).push(cmd.country);
  events.push({ type: 'playJoined', country: cmd.country, playId: p.id, side: cmd.side });
  return null;
};
handlers.backDown = (state, cmd: Extract<Command, { type: 'backDown' }>, events, changed) => {
  const p = state.plays.find(x => x.id === cmd.playId);
  if (!p) return 'no such play';
  if (cmd.country === p.target) { yieldPlay(state, p, events, changed); return null; }
  if (cmd.country === p.initiator) { cancelPlay(state, p, events); return null; }
  const before = p.sideA.length + p.sideB.length;
  p.sideA = p.sideA.filter(c => c !== cmd.country); p.sideB = p.sideB.filter(c => c !== cmd.country);
  return p.sideA.length + p.sideB.length === before ? 'notInvolved' : null;
};
systems.tick.push((state, events, changed) => { if (state.tick % TICKS_PER_DAY === 0) playTick(state, events, changed); });
