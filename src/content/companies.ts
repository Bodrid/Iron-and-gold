// Companies boost the output of their buildings; charters give more at a price.
import type { BuildingType } from './buildingTypes';

export type CharterKind = 'colonial' | 'monopoly' | 'investment';
export interface CompanyDef { id: string; name: string; buildings: BuildingType[]; /** Only this country can found it (historical). */ tag?: string; description: string }

export const COMPANIES: CompanyDef[] = [
  { id: 'eastIndia', name: 'East India Company', buildings: ['textileMill', 'port'], tag: 'GBR', description: 'Cloth and trade from India to London.' },
  { id: 'hudsonsBay', name: 'Hudson’s Bay Company', buildings: ['loggingCamp'], tag: 'GBR', description: 'Furs and timber from the far north.' },
  { id: 'dutchTrading', name: 'Netherlands Trading Society', buildings: ['port', 'luxuryWorkshop'], tag: 'NET', description: 'Spices, coffee and fine goods.' },
  { id: 'krupp', name: 'Krupp', buildings: ['armsFactory', 'ironMine'], tag: 'PRU', description: 'Steel and guns from the Ruhr.' },
  { id: 'russianAmerican', name: 'Russian-American Company', buildings: ['loggingCamp', 'port'], tag: 'RUS', description: 'Furs and timber across the Pacific.' },
  { id: 'saintGobain', name: 'Saint-Gobain', buildings: ['luxuryWorkshop'], tag: 'FRA', description: 'Glass and mirrors for the palaces of Europe.' },
  { id: 'mitsui', name: 'Mitsui', buildings: ['textileMill', 'toolWorkshop'], tag: 'JAP', description: 'Merchants turned industrialists.' },
  { id: 'baltimoreOhio', name: 'Baltimore & Ohio Railroad', buildings: ['railway', 'coalMine'], tag: 'USA', description: 'The first common carrier railroad.' },
  { id: 'coalCompany', name: 'National Coal Company', buildings: ['coalMine'], description: 'Pits and pit villages.' },
  { id: 'ironWorks', name: 'Iron Works', buildings: ['ironMine', 'toolWorkshop'], description: 'Ore to tools under one roof.' },
  { id: 'textileCombine', name: 'Textile Combine', buildings: ['textileMill'], description: 'Mills that clothe the nation.' },
  { id: 'timberCompany', name: 'Timber Company', buildings: ['loggingCamp'], description: 'Forests felled and floated downriver.' },
  { id: 'armsConsortium', name: 'Arms Consortium', buildings: ['armsFactory'], description: 'Rifles and cannon for the army.' },
  { id: 'railwayCompany', name: 'Railway Company', buildings: ['railway'], description: 'Lines to every corner of the country.' },
  { id: 'agriculturalSociety', name: 'Agricultural Society', buildings: ['farm'], description: 'Better seed and bigger harvests.' },
];
export const COMPANY_BY_ID: Record<string, CompanyDef> = Object.fromEntries(COMPANIES.map(c => [c.id, c]));

export const CHARTERS: Record<CharterKind, { name: string; description: string }> = {
  colonial: { name: 'Colonial charter', description: 'Expeditions into unclaimed land cost 25% fewer troops; the company keeps 5% of your taxes.' },
  monopoly: { name: 'Monopoly', description: '+15% more output from its buildings, but no trade bonus. Industrialists like having monopolies, workers don’t.' },
  investment: { name: 'Investment charter', description: 'Its buildings in your puppets count too and they pay 5% more tribute, but puppets resent it (−10 relations).' },
};
