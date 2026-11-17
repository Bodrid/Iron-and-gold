import type { StartDef } from '../../sim/types';
import { COUNTRIES_1836 } from './1836/countries';
import { OWNERSHIP_1836 } from './1836/ownership';
import { POPULATION_1836 } from './1836/population';
import { EXTRA_TECHS_1836 } from './1836/techs';
import { LAWS_1836 } from './1836/laws';

export const STARTS: StartDef[] = [
  { id: '1836', name: 'Victorian Era', startDate: { y: 1836, m: 1, d: 1 }, endYear: 1936, countries: COUNTRIES_1836, ownership: OWNERSHIP_1836, regionPopulation: POPULATION_1836, extraTechs: EXTRA_TECHS_1836, laws: LAWS_1836 },
];

export function getStart(id: string): StartDef {
  const s = STARTS.find(x => x.id === id);
  if (!s) throw new Error(`Unknown start date ${id}`);
  return s;
}
