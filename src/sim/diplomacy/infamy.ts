// Infamy: taking land makes others wary; enough of it and they band together in a coalition.
import { BALANCE } from '../balance';
import { systems } from '../registry';
import type { CountryId, GameState, SimEvent } from '../types';
import { relation, relationBaselineHooks } from './relations';

const D = BALANCE.diplomacy;

export function addInfamy(state: GameState, c: CountryId, n: number): void {
  state.countries[c].infamy = Math.max(0, state.countries[c].infamy + n);
}

export function coalitionAgainst(state: GameState, target: CountryId) {
  return state.coalitions.find(x => x.target === target);
}

/** Coalition members (other than the defender) who come to the defender's aid when `attacker` attacks it. */
export function coalitionDefenders(state: GameState, attacker: CountryId, defender: CountryId): CountryId[] {
  const c = coalitionAgainst(state, attacker);
  if (!c || !c.members.includes(defender)) return [];
  return c.members.filter(m => m !== defender && state.countries[m].alive);
}

relationBaselineHooks.push((state, a, b) =>
  (state.countries[a].infamy >= D.INFAMY_COOL || state.countries[b].infamy >= D.INFAMY_COOL ? D.INFAMY_COOL_RELATION : 0));

export function monthlyInfamy(state: GameState, events: SimEvent[]): void {
  for (const c of state.countries) if (c.alive) c.infamy = Math.max(0, c.infamy - D.INFAMY_DECAY);
  for (const co of state.coalitions.slice()) {
    if (!state.countries[co.target].alive || state.countries[co.target].infamy < D.INFAMY_COOL) {
      state.coalitions = state.coalitions.filter(x => x !== co);
      events.push({ type: 'coalitionDissolved', target: co.target });
    } else co.members = co.members.filter(m => state.countries[m].alive);
  }
  for (const t of state.countries) {
    if (!t.alive || !t.id || t.infamy < D.INFAMY_COALITION) continue;
    const members = state.countries.filter(c => c.alive && c.id && c.id !== t.id && !c.isPlayer && relation(state, c.id, t.id) <= D.COALITION_RELATION).map(c => c.id);
    const existing = coalitionAgainst(state, t.id);
    if (existing) { for (const m of members) if (!existing.members.includes(m)) existing.members.push(m); continue; }
    if (members.length >= 2) {
      state.coalitions.push({ id: state.nextId++, target: t.id, members });
      events.push({ type: 'coalitionFormed', target: t.id, members });
    }
  }
}

systems.month.push((state, events) => monthlyInfamy(state, events));
