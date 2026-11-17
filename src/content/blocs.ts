// Power bloc types and principles. The leader gets a principle's `leader` effects, members its `member` effects.
import type { Effects } from './effects';

export type BlocType = 'tradeLeague' | 'empire' | 'militaryAlliance' | 'ideologicalUnion';
export type PrincipleId = 'freeTradeArea' | 'commonDefence' | 'militaryDrill' | 'sharedScience' | 'railwayUnion' | 'colonialOffice'
  | 'mercantileNavy' | 'imperialTribute' | 'ideologicalUnity' | 'marketIntegration';

export interface PrincipleDef { id: PrincipleId; name: string; description: string; leader: Effects; member: Effects }
export interface BlocTypeDef { id: BlocType; name: string; description: string; fixed: PrincipleId }

export const PRINCIPLES: Record<PrincipleId, PrincipleDef> = {
  freeTradeArea: { id: 'freeTradeArea', name: 'Free Trade Area', description: 'Trade between members earns 30% more and is never embargoed.', leader: { tradePct: 10 }, member: { tradePct: 5 } },
  commonDefence: { id: 'commonDefence', name: 'Common Defence', description: 'Members come to each other’s defence when a play is made against one of them.', leader: { defensePct: 5 }, member: { defensePct: 5 } },
  militaryDrill: { id: 'militaryDrill', name: 'Military Drill', description: 'Shared officer schools refill armies faster.', leader: { refillPct: 15 }, member: { refillPct: 7.5 } },
  sharedScience: { id: 'sharedScience', name: 'Shared Science', description: 'Universities share their findings.', leader: { researchPct: 15 }, member: { researchPct: 7.5 } },
  railwayUnion: { id: 'railwayUnion', name: 'Railway Union', description: 'Common gauges and timetables.', leader: { outputPct: { railway: 10 }, industryPct: 5 }, member: { outputPct: { railway: 5 }, industryPct: 2.5 } },
  colonialOffice: { id: 'colonialOffice', name: 'Colonial Office', description: 'Expeditions into unclaimed land cost fewer troops.', leader: { colonisePct: 30 }, member: { colonisePct: 15 } },
  mercantileNavy: { id: 'mercantileNavy', name: 'Mercantile Navy', description: 'Shared bases and convoys at sea.', leader: { shipStrengthPct: 20, shipSpeedPct: 10 }, member: { shipStrengthPct: 10, shipSpeedPct: 5 } },
  imperialTribute: { id: 'imperialTribute', name: 'Imperial Tribute', description: 'Members pay 5% of their income to the leader.', leader: {}, member: {} },
  ideologicalUnity: { id: 'ideologicalUnity', name: 'Ideological Unity', description: 'A shared cause keeps interest groups content.', leader: { approval: 1 }, member: { approval: 0.5 } },
  marketIntegration: { id: 'marketIntegration', name: 'Market Integration', description: 'One market for the goods of every member.', leader: { industryPct: 10 }, member: { industryPct: 5 } },
};
export const PRINCIPLE_IDS = Object.keys(PRINCIPLES) as PrincipleId[];

export const BLOC_TYPES: Record<BlocType, BlocTypeDef> = {
  tradeLeague: { id: 'tradeLeague', name: 'Trade League', description: 'A market without borders.', fixed: 'freeTradeArea' },
  empire: { id: 'empire', name: 'Empire', description: 'One crown over many lands, paid for by its members.', fixed: 'imperialTribute' },
  militaryAlliance: { id: 'militaryAlliance', name: 'Military Alliance', description: 'An attack on one is an attack on all.', fixed: 'commonDefence' },
  ideologicalUnion: { id: 'ideologicalUnion', name: 'Ideological Union', description: 'Nations bound by shared ideals.', fixed: 'ideologicalUnity' },
};
export const BLOC_TYPE_IDS = Object.keys(BLOC_TYPES) as BlocType[];
