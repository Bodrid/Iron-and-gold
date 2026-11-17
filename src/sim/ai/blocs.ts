// The AI's power blocs and companies: majors found blocs that suit them, invite friends (rarely the player),
// leave a bloc whose leader they've fallen out with, and found companies for their biggest industries.
import { BLOC_TYPES, type BlocType, type PrincipleId } from '../../content/blocs';
import { COMPANIES, COMPANY_BY_ID } from '../../content/companies';
import { BUILDINGS } from '../../content/buildings';
import { personalityOf } from '../../content/personalities';
import { BALANCE } from '../balance';
import { TICKS_PER_DAY } from '../calendar';
import { nextRandom } from '../rng';
import { blocOf, blocPolicy, foundCheck, inviteCheck, isMajor } from '../blocs';
import { charterCheck, foundCompanyCheck } from '../companies';
import { relation } from '../diplomacy/relations';
import type { Command, Country, GameState } from '../types';
import type { DifficultyParams } from './difficulty';

const B = BALANCE.blocs;
const DEFAULT_BLOC: { type: BlocType; principles: PrincipleId[] } = { type: 'tradeLeague', principles: ['marketIntegration'] };

export function blocDecisions(state: GameState, c: Country, d: DifficultyParams, issue: (cmd: Command) => void): void {
  // Big decisions about once a season.
  if (nextRandom(state) * 90 >= d.decisionDays) return;
  const mine = blocOf(state, c.id);
  if (!mine) {
    if (c.money >= B.FOUND_COST * 2 && !c.overlord && c.population >= B.MAJOR_POPULATION * 0.5) {
      const pref = personalityOf(c.personality).bloc ?? DEFAULT_BLOC;
      const picks = pref.principles.filter(p => p !== BLOC_TYPES[pref.type].fixed);
      if (!foundCheck(state, c.id, pref.type, picks)) { issue({ type: 'foundBloc', country: c.id, blocType: pref.type, principles: picks }); return; }
    }
  } else if (mine.leader === c.id) {
    // Invite one likely member: AI friends who will say yes, or the player now and then.
    // Cheap filters first (relations), then the full checks on the warmest few.
    const warm = state.countries.filter(x => x.alive && x.id && x.id !== c.id && relation(state, c.id, x.id) >= B.INVITE_MIN_RELATION)
      .sort((a, b) => relation(state, c.id, b.id) - relation(state, c.id, a.id) || b.troops - a.troops || a.id - b.id);
    let pick: Country | undefined;
    for (const x of warm.slice(0, B.AI_INVITE_CANDIDATES)) {
      if (inviteCheck(state, c.id, x.id)) continue;
      const ok = x.isPlayer
        ? relation(state, c.id, x.id) >= (isMajor(state, x.id) ? B.AI_MAJOR_JOIN_RELATION : B.AI_INVITE_PLAYER_RELATION) && state.tick - (mine.lastPlayerInvite ?? -Infinity) >= B.PLAYER_INVITE_DAYS * TICKS_PER_DAY
        : blocPolicy.accepts(state, x.id, mine);
      if (ok) { pick = x; break; }
    }
    if (pick) issue({ type: 'inviteToBloc', country: c.id, target: pick.id });
  } else if (mine.members.includes(c.id) && relation(state, c.id, mine.leader) <= B.AI_LEAVE_RELATION) {
    issue({ type: 'leaveBloc', country: c.id });
  }
}

export function companyDecisions(state: GameState, c: Country, d: DifficultyParams, issue: (cmd: Command) => void): void {
  if (nextRandom(state) * 60 >= d.decisionDays) return;
  // Found the company whose buildings we have most of (historical ones count double).
  if (c.money >= BALANCE.companies.FOUND_COST * 3) {
    const levels = new Map<string, number>();
    for (const s of state.states) if (s.id && s.owner === c.id) for (const b of s.buildings) levels.set(b.type, (levels.get(b.type) ?? 0) + b.level);
    let best: string | null = null, bestScore = 9;
    for (const k of COMPANIES) {
      if (foundCompanyCheck(state, c.id, k.id)) continue;
      const n = k.buildings.reduce((sum, b) => sum + (BUILDINGS[b].category === 'infrastructure' ? 0.5 : 1) * (levels.get(b) ?? 0), 0) * (k.tag ? 2 : 1);
      if (n > bestScore) { best = k.id; bestScore = n; }
    }
    if (best) { issue({ type: 'foundCompany', country: c.id, company: best }); return; }
  }
  // Charters: monopolies where industrialists outweigh workers, investment when we have puppets.
  for (const k of c.companies) {
    if (k.charter) continue;
    if (!charterCheck(state, c.id, k.id, 'investment') && COMPANY_BY_ID[k.id]) { issue({ type: 'grantCharter', country: c.id, company: k.id, charter: 'investment' }); return; }
    const hasMonopoly = c.companies.some(x => x.charter === 'monopoly');
    if (!hasMonopoly && c.groups.industrialists.clout > c.groups.workers.clout * 1.5 && c.groups.workers.radicalism < 30 && !charterCheck(state, c.id, k.id, 'monopoly')) {
      issue({ type: 'grantCharter', country: c.id, company: k.id, charter: 'monopoly' });
      return;
    }
  }
}
