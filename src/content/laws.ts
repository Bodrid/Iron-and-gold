// Eight law areas with 3 options each. Every option has trade-offs and is liked or hated by interest groups.
import type { Effects } from './effects';
import type { GroupId } from './groups';

export type LawArea = 'government' | 'voting' | 'trade' | 'labour' | 'army' | 'taxes' | 'education' | 'welfare';
export const LAW_AREAS: { id: LawArea; name: string }[] = [
  { id: 'government', name: 'Government' }, { id: 'voting', name: 'Voting' }, { id: 'trade', name: 'Trade' }, { id: 'labour', name: 'Labour' },
  { id: 'army', name: 'Army' }, { id: 'taxes', name: 'Taxes' }, { id: 'education', name: 'Education' }, { id: 'welfare', name: 'Welfare' },
];

/** −2 (hates) … +2 (loves). Groups not listed don't care. */
export type Attitudes = Partial<Record<GroupId, number>>;
export interface LawDef { id: string; area: LawArea; name: string; description: string; effects: Effects; attitudes: Attitudes }

const l = (id: string, area: LawArea, name: string, effects: Effects, attitudes: Attitudes, description: string): LawDef => ({ id, area, name, effects, attitudes, description });

export const LAWS: LawDef[] = [
  l('absoluteMonarchy', 'government', 'Absolute Monarchy', { taxPct: 5, researchPct: -10 }, { landowners: 2, clergy: 1, army: 1, industrialists: -1, intellectuals: -2, workers: -1 }, 'The crown rules alone.'),
  l('constitutionalMonarchy', 'government', 'Constitutional Monarchy', { researchPct: 5 }, { landowners: 0, industrialists: 1, intellectuals: 1, clergy: 0 }, 'A king bound by a parliament.'),
  l('republic', 'government', 'Republic', { researchPct: 10, sol: 0.5, taxPct: -5 }, { intellectuals: 2, industrialists: 1, workers: 1, landowners: -2, clergy: -1, army: -1 }, 'No crown: elected leaders.'),

  l('noVoting', 'voting', 'No Elections', {}, { landowners: 1, army: 1, intellectuals: -1, workers: -1 }, 'Nobody votes.'),
  l('wealthVoting', 'voting', 'Wealth-Based Voting', { taxPct: 3 }, { industrialists: 2, landowners: 0, workers: -1 }, 'Property owners vote.'),
  l('universalSuffrage', 'voting', 'Universal Suffrage', { sol: 1 }, { workers: 2, intellectuals: 1, landowners: -2, industrialists: -1 }, 'Every adult votes.'),

  l('mercantilism', 'trade', 'Mercantilism', { tradePct: -20, industryPct: 5 }, { landowners: 1, industrialists: 1, intellectuals: -1 }, 'Hoard gold, export, never import.'),
  l('protectionism', 'trade', 'Protectionism', { tradePct: -10, industryPct: 10 }, { industrialists: 2, workers: 1, landowners: -1 }, 'Tariffs shelter home industry.'),
  l('freeTrade', 'trade', 'Free Trade', { tradePct: 30, industryPct: -10 }, { landowners: 1, intellectuals: 1, industrialists: -1, workers: -1 }, 'Open markets: more trade income, weaker home industry.'),

  l('serfdom', 'labour', 'Serfdom', { outputPct: { farm: 10 }, growthPct: -10, literacyPct: -20 }, { landowners: 2, workers: -2, intellectuals: -2, industrialists: -1 }, 'Peasants are bound to the land.'),
  l('slavery', 'labour', 'Slavery', { outputPct: { farm: 15 }, sol: -2 }, { landowners: 2, intellectuals: -2, workers: -1, clergy: -1, industrialists: -1 }, 'People held as property.'),
  l('freeLabour', 'labour', 'Free Labour', { industryPct: 10 }, { industrialists: 2, workers: 1, intellectuals: 1, landowners: -2 }, 'Workers choose their employers.'),

  l('professionalArmy', 'army', 'Professional Army', { maxTroopsPct: -20, attackPct: 10, armyUpkeepPct: 20 }, { army: 2, workers: 1 }, 'A small army of career soldiers.'),
  l('conscription', 'army', 'Conscription', { maxTroopsPct: 25, growthPct: -5 }, { army: 1, workers: -1 }, 'Young men serve their time.'),
  l('massConscription', 'army', 'Mass Conscription', { maxTroopsPct: 60, growthPct: -15, sol: -1 }, { army: 1, workers: -2, intellectuals: -1, industrialists: -1 }, 'A huge troop pool, slower growth.'),

  l('lowTaxes', 'taxes', 'Low Taxes', { taxPct: -25, sol: 1 }, { landowners: 1, industrialists: 2, workers: 1 }, 'Light taxes keep people happy.'),
  l('mediumTaxes', 'taxes', 'Medium Taxes', {}, {}, 'The usual burden.'),
  l('highTaxes', 'taxes', 'High Taxes', { taxPct: 30, sol: -1.5 }, { landowners: -1, industrialists: -2, workers: -1, army: 1 }, 'A full treasury and grumbling people.'),

  l('noEducation', 'education', 'No Schooling', { literacyPct: -50 }, { clergy: 1, landowners: 1, intellectuals: -2 }, 'Children work, not learn.'),
  l('religiousSchools', 'education', 'Religious Schools', { literacyPct: 20 }, { clergy: 2, intellectuals: -1 }, 'The church teaches reading and faith.'),
  l('publicSchools', 'education', 'Public Schools', { literacyPct: 60, researchPct: 10, taxPct: -5 }, { intellectuals: 2, workers: 1, industrialists: 1, clergy: -2 }, 'Free state schools for all.'),

  l('noWelfare', 'welfare', 'No Welfare', {}, { industrialists: 1, landowners: 1, workers: -1 }, 'Everyone fends for themselves.'),
  l('poorLaws', 'welfare', 'Poor Laws', { sol: 1, taxPct: -5 }, { workers: 1, clergy: 1 }, 'Workhouses and parish relief.'),
  l('socialSecurity', 'welfare', 'Social Security', { sol: 2.5, growthPct: 5, taxPct: -15 }, { workers: 2, intellectuals: 1, industrialists: -2, landowners: -1 }, 'Pensions and insurance paid by the state.'),
];

export const LAW_BY_ID: Record<string, LawDef> = Object.fromEntries(LAWS.map(x => [x.id, x]));
export const lawsIn = (area: LawArea) => LAWS.filter(x => x.area === area);

export const DEFAULT_LAWS: Record<LawArea, string> = {
  government: 'absoluteMonarchy', voting: 'noVoting', trade: 'mercantilism', labour: 'freeLabour',
  army: 'professionalArmy', taxes: 'mediumTaxes', education: 'religiousSchools', welfare: 'noWelfare',
};
