// The research trees: three trees, five eras, four techs per tree per era.
import type { Effects } from './effects';

export type TechTree = 'production' | 'military' | 'society';
export interface TechDef { id: string; name: string; tree: TechTree; era: 1 | 2 | 3 | 4 | 5; requires: string[]; effects: Effects; description: string }

export const TREES: { id: TechTree; name: string }[] = [
  { id: 'production', name: 'Production' }, { id: 'military', name: 'Military' }, { id: 'society', name: 'Society' },
];
export const ERAS = [
  { era: 1, name: 'Age of Revolution', from: 1770 },
  { era: 2, name: 'Industrial Revolution', from: 1810 },
  { era: 3, name: 'Age of Steam', from: 1850 },
  { era: 4, name: 'Age of Steel', from: 1880 },
  { era: 5, name: 'Machine Age', from: 1910 },
] as const;

const t = (id: string, name: string, tree: TechTree, era: TechDef['era'], requires: string[], effects: Effects, description: string): TechDef =>
  ({ id, name, tree, era, requires, effects, description });

const INDUSTRY = (pct: number) => ({ textileMill: pct, toolWorkshop: pct, armsFactory: pct, luxuryWorkshop: pct });
const MINES = (pct: number) => ({ coalMine: pct, ironMine: pct });

export const TECHS: TechDef[] = [
  // ---- Production ----
  t('cropRotation', 'Crop Rotation', 'production', 1, [], { outputPct: { farm: 10 } }, 'Turnips and clover keep fields fertile year after year.'),
  t('deepMining', 'Deep Shaft Mining', 'production', 1, [], { outputPct: MINES(10) }, 'Pumps let miners dig below the water table.'),
  t('waterFrame', 'Water Frame', 'production', 1, [], { outputPct: { textileMill: 10 } }, 'River-powered spinning in the first mills.'),
  t('canals', 'Canal Building', 'production', 1, [], { outputPct: { all: 3 }, tradePct: 5 }, 'Cheap bulk transport inland.'),
  t('steamEngine', 'Steam Engine', 'production', 2, ['waterFrame'], { outputPct: INDUSTRY(10) }, 'Watt\'s engine frees industry from the riverbank.'),
  t('railways', 'Railways', 'production', 2, ['steamEngine', 'canals'], { unlocks: ['railway'] }, 'Iron roads carry goods and soldiers at speed.'),
  t('threshingMachines', 'Threshing Machines', 'production', 2, ['cropRotation'], { outputPct: { farm: 10 } }, 'Machines do the work of a dozen labourers.'),
  t('puddling', 'Iron Puddling', 'production', 2, ['deepMining'], { outputPct: { ironMine: 15, toolWorkshop: 10 } }, 'Wrought iron in quantity.'),
  t('powerLooms', 'Power Looms', 'production', 3, ['steamEngine'], { outputPct: { textileMill: 20, luxuryWorkshop: 10 } }, 'Steam weaves cloth faster than any hand.'),
  t('bessemer', 'Bessemer Steel', 'production', 3, ['puddling'], { outputPct: { toolWorkshop: 15, armsFactory: 15 } }, 'Cheap steel by blowing air through molten iron.'),
  t('dynamite', 'Dynamite', 'production', 3, ['puddling'], { outputPct: MINES(20) }, 'Safer, stronger blasting for mines.'),
  t('telegraph', 'Telegraph', 'production', 3, ['railways'], { outputPct: { all: 5 }, taxPct: 5 }, 'Instant news along every railway line.'),
  t('electricity', 'Electricity', 'production', 4, ['telegraph'], { outputPct: { all: 10 } }, 'Dynamos light factories through the night.'),
  t('fertilizer', 'Chemical Fertiliser', 'production', 4, ['threshingMachines'], { outputPct: { farm: 25 } }, 'Nitrates double the harvest.'),
  t('openHearth', 'Open-Hearth Steel', 'production', 4, ['bessemer'], { outputPct: INDUSTRY(15) }, 'Better steel, made in bulk.'),
  t('refrigeration', 'Refrigeration', 'production', 4, ['powerLooms'], { outputPct: { luxuryWorkshop: 20 }, sol: 1 }, 'Fresh food carried across oceans.'),
  t('assemblyLine', 'Assembly Line', 'production', 5, ['electricity', 'openHearth'], { outputPct: INDUSTRY(25) }, 'Mass production of everything.'),
  t('tractors', 'Tractors', 'production', 5, ['fertilizer', 'electricity'], { outputPct: { farm: 30 } }, 'Engines replace horses on the farm.'),
  t('combustionEngine', 'Combustion Engine', 'production', 5, ['electricity'], { outputPct: { all: 5 }, shipSpeedPct: 15 }, 'Oil-powered engines on land and sea.'),
  t('mechanisedMining', 'Mechanised Mining', 'production', 5, ['dynamite', 'electricity'], { outputPct: MINES(30) }, 'Cutting machines and conveyors underground.'),
  // ---- Military ----
  t('lineInfantry', 'Line Infantry', 'military', 1, [], { attackPct: 5 }, 'Drilled volleys win battles.'),
  t('starForts', 'Star Forts', 'military', 1, [], { defensePct: 10 }, 'Angled bastions that shrug off cannon.'),
  t('shipsOfTheLine', 'Ships of the Line', 'military', 1, [], { shipStrengthPct: 10 }, 'Wooden walls with a hundred guns.'),
  t('standingArmy', 'Standing Army', 'military', 1, [], { maxTroopsPct: 10 }, 'Soldiers kept under arms in peacetime.'),
  t('percussionCaps', 'Percussion Caps', 'military', 2, ['lineInfantry'], { attackPct: 10 }, 'Muskets that fire in the rain.'),
  t('generalStaff', 'General Staff', 'military', 2, ['standingArmy'], { refillPct: 10, attackPct: 5 }, 'Planning wars before they start.'),
  t('steamships', 'Steamships', 'military', 2, ['shipsOfTheLine'], { shipSpeedPct: 20, shipStrengthPct: 5 }, 'Ships that ignore the wind.'),
  t('fieldFortifications', 'Field Fortifications', 'military', 2, ['starForts'], { defensePct: 10 }, 'Earthworks dug overnight.'),
  t('breechLoaders', 'Breech-Loading Rifles', 'military', 3, ['percussionCaps'], { attackPct: 15 }, 'Reload lying down, fire five times faster.'),
  t('ironclads', 'Ironclads', 'military', 3, ['steamships'], { shipStrengthPct: 25 }, 'Armoured steam warships.'),
  t('railMobilisation', 'Rail Mobilisation', 'military', 3, ['generalStaff'], { refillPct: 15 }, 'Whole armies moved by timetable.'),
  t('rifledArtillery', 'Rifled Artillery', 'military', 3, ['fieldFortifications'], { attackPct: 10, defensePct: 5 }, 'Accurate guns at long range.'),
  t('machineGuns', 'Machine Guns', 'military', 4, ['breechLoaders'], { defensePct: 20 }, 'One gun holds a hundred yards of front.'),
  t('dreadnoughts', 'Dreadnoughts', 'military', 4, ['ironclads'], { shipStrengthPct: 30 }, 'All-big-gun battleships.'),
  t('reserveSystem', 'Reserve System', 'military', 4, ['railMobilisation'], { maxTroopsPct: 20 }, 'Every trained man can be called back.'),
  t('smokelessPowder', 'Smokeless Powder', 'military', 4, ['rifledArtillery'], { attackPct: 15 }, 'Hidden riflemen and longer range.'),
  t('trenchWarfare', 'Trench Warfare', 'military', 5, ['machineGuns'], { defensePct: 25 }, 'Lines of trenches from sea to mountains.'),
  t('tanks', 'Tanks', 'military', 5, ['smokelessPowder'], { attackPct: 25 }, 'Armoured machines break the deadlock.'),
  t('aircraft', 'Military Aircraft', 'military', 5, ['reserveSystem'], { attackPct: 10, defensePct: 10 }, 'Eyes and bombs from the sky.'),
  t('submarines', 'Submarines', 'military', 5, ['dreadnoughts'], { shipStrengthPct: 20 }, 'Hunters beneath the waves.'),
  // ---- Society ----
  t('enlightenment', 'Enlightenment', 'society', 1, [], { researchPct: 10, unlocks: ['university'] }, 'Reason, science and the first universities open to all.'),
  t('banking', 'Central Banking', 'society', 1, [], { taxPct: 5, unlocks: ['governmentOffice'] }, 'A national bank and a reliable currency.'),
  t('printingPress', 'Mass Printing', 'society', 1, [], { literacyPct: 20 }, 'Cheap books and newspapers.'),
  t('inoculation', 'Inoculation', 'society', 1, [], { growthPct: 10 }, 'Smallpox loses its terror.'),
  t('jointStock', 'Joint-Stock Companies', 'society', 2, ['banking'], { taxPct: 5, buildCostPct: -5 }, 'Shares spread the risk of big ventures.'),
  t('sanitation', 'Sanitation', 'society', 2, ['inoculation'], { growthPct: 10 }, 'Sewers and clean water in the cities.'),
  t('romanticism', 'Romanticism', 'society', 2, ['printingPress'], { sol: 1 }, 'Art, poetry and national pride.'),
  t('statistics', 'Statistics', 'society', 2, ['enlightenment'], { researchPct: 10, taxPct: 5 }, 'Counting people, harvests and taxes.'),
  t('germTheory', 'Germ Theory', 'society', 3, ['sanitation'], { growthPct: 15 }, 'Disease has causes, and cures.'),
  t('positivism', 'Positivism', 'society', 3, ['statistics'], { researchPct: 15 }, 'Science applied to every question.'),
  t('investmentBanks', 'Investment Banks', 'society', 3, ['jointStock'], { buildCostPct: -10 }, 'Capital pooled for railways and mills.'),
  t('massEducation', 'Mass Education', 'society', 3, ['romanticism'], { literacyPct: 30 }, 'A school in every village.'),
  t('socialScience', 'Social Science', 'society', 4, ['positivism'], { researchPct: 10, sol: 1 }, 'Studying how societies work.'),
  t('publicHealth', 'Public Health', 'society', 4, ['germTheory'], { growthPct: 15, sol: 1 }, 'Hospitals, nurses and vaccination drives.'),
  t('stockExchange', 'Stock Exchange', 'society', 4, ['investmentBanks'], { taxPct: 10 }, 'A market for every company.'),
  t('massMedia', 'Mass Media', 'society', 4, ['massEducation'], { literacyPct: 20, sol: 1 }, 'Daily papers for millions.'),
  t('antibiotics', 'Antibiotics', 'society', 5, ['publicHealth'], { growthPct: 20 }, 'Infections that once killed are cured.'),
  t('macroeconomics', 'Macroeconomics', 'society', 5, ['stockExchange'], { taxPct: 10, buildCostPct: -10 }, 'Governments learn to steer the economy.'),
  t('researchLabs', 'Research Laboratories', 'society', 5, ['socialScience'], { researchPct: 25 }, 'Science as an industry.'),
  t('consumerism', 'Consumer Society', 'society', 5, ['massMedia'], { sol: 2 }, 'Radios, cars and department stores.'),
];

/** No prototype: a bad id from a command is simply undefined. */
export const TECH_BY_ID: Record<string, TechDef> = Object.assign(Object.create(null), Object.fromEntries(TECHS.map(x => [x.id, x])));
/** Base cost in research points by era. */
export const ERA_COST = [0, 200, 450, 900, 2000, 3800] as const;
