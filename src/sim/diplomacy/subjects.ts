// Puppets: pay tribute, fight in their overlord's wars, can be annexed after years; no puppet chains.
import { getStateTiles } from '../../map/stateTiles';
import { BALANCE } from '../balance';
import { TICKS_PER_DAY } from '../calendar';
import { setTile, statesOwnedBy } from '../control';
import { handlers, systems } from '../registry';
import { sideOf, warsOf, warStartHooks } from '../war';
import type { Command, CountryId, GameState, SimEvent, TreatyKind } from '../types';
import { endTreaty } from './treaties';
import { subjectHooks } from './demands';
import { addInfamy } from './infamy';
import { relation, relationBaselineHooks } from './relations';

const D = BALANCE.diplomacy;

/** Extra tribute share a puppet pays (investment charters). */
export const tributeHooks: ((state: GameState, puppet: CountryId) => number)[] = [];

export function puppetsOf(state: GameState, c: CountryId): CountryId[] {
  return state.countries.filter(x => x.alive && x.overlord === c).map(x => x.id);
}

export function makePuppet(state: GameState, overlord: CountryId, puppet: CountryId, events: SimEvent[]): void {
  for (const id of puppetsOf(state, puppet)) state.countries[id].overlord = 0;   // no chains
  if (state.countries[overlord].overlord === puppet) state.countries[overlord].overlord = 0;
  state.countries[puppet].overlord = overlord;
  state.countries[puppet].puppetSince = state.tick;
  // A puppet's foreign policy is its overlord's: its alliances, pacts and guarantees end.
  for (const t of state.treaties.slice()) {
    if ((t.a === puppet || t.b === puppet) && PUPPET_ENDS.includes(t.kind)) endTreaty(state, t, events);
  }
  events.push({ type: 'puppeted', overlord, puppet });
}
const PUPPET_ENDS: TreatyKind[] = ['alliance', 'defensivePact', 'guarantee'];
subjectHooks.makePuppet = makePuppet;

relationBaselineHooks.push((state, a, b) => (state.countries[a].overlord === b || state.countries[b].overlord === a ? D.PUPPET_RELATION : 0));

warStartHooks.push((state, war) => {
  for (const side of [war.sideA, war.sideB]) {
    for (const c of [...side]) for (const p of puppetsOf(state, c)) {
      if (!sideOf(war, p)) side.push(p);
    }
  }
});

export function annexCheck(state: GameState, c: CountryId, puppet: CountryId): string | null {
  const p = state.countries[puppet];
  if (!p?.alive || p.overlord !== c) return 'notYourPuppet';
  if (state.tick - p.puppetSince < D.ANNEX_YEARS * 365 * TICKS_PER_DAY) return 'tooSoon';
  if (relation(state, c, puppet) <= -15) return 'needsNeutral';
  if (warsOf(state, puppet).length || warsOf(state, c).length) return 'atWar';
  return null;
}

handlers.annexPuppet = (state, cmd: Extract<Command, { type: 'annexPuppet' }>, events, changed) => {
  const bad = annexCheck(state, cmd.country, cmd.puppet);
  if (bad) return bad;
  for (const s of statesOwnedBy(state, cmd.puppet)) for (const t of getStateTiles(state.map, s)) {
    if (state.owner[t] === cmd.puppet) setTile(state, t, cmd.country, state.controller[t] === cmd.puppet ? cmd.country : state.controller[t], changed);
  }
  addInfamy(state, cmd.country, D.ANNEX_INFAMY);
  events.push({ type: 'annexed', overlord: cmd.country, puppet: cmd.puppet });
  return null;
};

systems.day.push((state, events) => {
  for (const c of state.countries) {
    if (c.overlord && (!c.alive || !state.countries[c.overlord].alive)) {
      const wasAlive = c.alive;
      c.overlord = 0;
      if (wasAlive) events.push({ type: 'freed', puppet: c.id });
    }
  }
});
systems.month.push(state => {
  for (const c of state.countries) {
    if (!c.alive || !c.overlord) continue;
    let share: number = D.PUPPET_TRIBUTE;
    for (const h of tributeHooks) share += h(state, c.id);
    const pay = Math.max(0, c.income) * share;
    const o = state.countries[c.overlord];
    c.money -= pay; c.income -= pay; o.money += pay; o.income += pay;
  }
});
