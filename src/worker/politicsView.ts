// What the Research tab and the Nation tab's politics need about the player.
import { COMPANIES, type CharterKind } from '../content/companies';
import { charterCheck, companyLimit, foundCompanyCheck } from '../sim/companies';
import { GROUP_IDS } from '../content/groups';
import { LAW_AREAS, lawsIn } from '../content/laws';
import { TECHS } from '../content/techs';
import { canResearch, techCost } from '../sim/research';
import { enactCheck, lawSupport, passChance } from '../sim/politics';
import { wantedLaw } from '../sim/revolts';
import { BALANCE } from '../sim/balance';
import type { CountryId, GameState } from '../sim/types';
import type { PoliticsView } from './protocol';

export function politicsView(state: GameState, me: CountryId): PoliticsView {
  const c = state.countries[me];
  const status = (id: string) => c.techs.includes(id) ? 'known' as const : c.researching === id ? 'researching' as const
    : c.researchQueue.includes(id) ? 'queued' as const : canResearch(state, c, id) ? 'available' as const : 'locked' as const;
  return {
    research: {
      researching: c.researching, queue: [...c.researchQueue], points: c.researchPoints, rate: c.researchRate,
      cost: c.researching ? techCost(state, c, c.researching) : 0,
      techs: TECHS.map(t => ({ id: t.id, status: status(t.id), cost: techCost(state, c, t.id) })),
    },
    laws: LAW_AREAS.map(a => ({
      area: a.id, current: c.laws[a.id],
      options: lawsIn(a.id).filter(l => l.id !== c.laws[a.id]).map(l => {
        const support = lawSupport(c, l.id);
        return { id: l.id, support, chance: passChance(support), check: enactCheck(state, c, l.id) };
      }),
    })),
    enacting: c.enacting ? { law: c.enacting.law, months: c.enacting.months, support: lawSupport(c, c.enacting.law), chance: passChance(lawSupport(c, c.enacting.law)), minMonths: BALANCE.politics.ENACT_MIN_MONTHS, maxMonths: BALANCE.politics.ENACT_MAX_MONTHS } : null,
    groups: GROUP_IDS.map(g => ({ id: g, ...c.groups[g], wants: wantedLaw(c, g) })),
    companies: {
      limit: companyLimit(state, me), cost: BALANCE.companies.FOUND_COST,
      mine: c.companies.map(k => ({ id: k.id, bonus: k.bonus, charter: k.charter, charters: Object.fromEntries((['colonial', 'monopoly', 'investment'] as CharterKind[]).map(x => [x, charterCheck(state, me, k.id, x)])) as Record<CharterKind, string | null> })),
      available: COMPANIES.filter(k => !k.tag || k.tag === c.tag).filter(k => !c.companies.some(x => x.id === k.id)).map(k => ({ id: k.id, check: foundCompanyCheck(state, me, k.id) })),
    },
  };
}
