import type { StartDef } from '../../sim/types';
import { COUNTRIES_1836 } from './1836/countries';
import { OWNERSHIP_1836 } from './1836/ownership';
import { POPULATION_1836 } from './1836/population';
import { EXTRA_TECHS_1836 } from './1836/techs';
import { LAWS_1836 } from './1836/laws';
import { COUNTRIES_1776 } from './1776/countries';
import { OWNERSHIP_1776 } from './1776/ownership';
import { POPULATION_1776 } from './1776/population';
import { EXTRA_TECHS_1776 } from './1776/techs';
import { LAWS_1776 } from './1776/laws';
import { LITERACY_1836 } from './1836/literacy';
import { LITERACY_1776 } from './1776/literacy';

export const STARTS: StartDef[] = [
  { id: '1836', name: 'Victorian Era', startDate: { y: 1836, m: 1, d: 1 }, endYear: 1936, countries: COUNTRIES_1836, ownership: OWNERSHIP_1836, regionPopulation: POPULATION_1836, extraTechs: EXTRA_TECHS_1836, laws: LAWS_1836, literacy: LITERACY_1836, defaultLiteracy: 0.05 },
  { id: '1776', name: 'Age of Revolution', startDate: { y: 1776, m: 1, d: 1 }, endYear: 1876, countries: COUNTRIES_1776, ownership: OWNERSHIP_1776, regionPopulation: POPULATION_1776, extraTechs: EXTRA_TECHS_1776, laws: LAWS_1776, literacy: LITERACY_1776, defaultLiteracy: 0.04 },
];

export function getStart(id: string): StartDef {
  const s = STARTS.find(x => x.id === id);
  if (!s) throw new Error(`Unknown start date ${id}`);
  return s;
}
