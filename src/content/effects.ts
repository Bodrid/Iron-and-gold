import type { BuildingType } from './buildingTypes';

/** Modifiers that techs and laws give a country. Percentages add up; the sim turns them into multipliers. */
export interface Effects {
  /** Extra output by building type ('all' applies to every building). */
  outputPct?: Partial<Record<BuildingType | 'all', number>>;
  /** Buildings that need this tech before they can be built. */
  unlocks?: BuildingType[];
  maxTroopsPct?: number;
  refillPct?: number;
  /** Attacks spend fewer troops per tile. */
  attackPct?: number;
  /** Attackers spend more troops taking your tiles. */
  defensePct?: number;
  shipStrengthPct?: number;
  shipSpeedPct?: number;
  /** Flat living standards. */
  sol?: number;
  /** Faster literacy growth. */
  literacyPct?: number;
  taxPct?: number;
  /** Faster population growth. */
  growthPct?: number;
  researchPct?: number;
  /** More income from trade. */
  tradePct?: number;
  buildCostPct?: number;
  /** Army upkeep per soldier. */
  armyUpkeepPct?: number;
  /** Laws: home industry output when trade is opened up (negative = weaker). */
  industryPct?: number;
  /** Fewer troops spent taking unclaimed land. */
  colonisePct?: number;
  /** Approval of every interest group. */
  approval?: number;
}

export const EFFECT_KEYS = ['maxTroopsPct', 'refillPct', 'attackPct', 'defensePct', 'shipStrengthPct', 'shipSpeedPct', 'sol', 'literacyPct', 'taxPct', 'growthPct', 'researchPct', 'tradePct', 'buildCostPct', 'armyUpkeepPct', 'industryPct', 'colonisePct', 'approval'] as const;
export type ScalarEffect = typeof EFFECT_KEYS[number];

const LABELS: Record<ScalarEffect, string> = {
  maxTroopsPct: 'troop limit', refillPct: 'troop refill', attackPct: 'attack strength', defensePct: 'defence', shipStrengthPct: 'ship strength',
  shipSpeedPct: 'ship speed', sol: 'living standards', literacyPct: 'literacy growth', taxPct: 'taxes', growthPct: 'population growth',
  researchPct: 'research', tradePct: 'trade income', buildCostPct: 'building cost', armyUpkeepPct: 'army upkeep', industryPct: 'industry output', colonisePct: 'colonising strength', approval: 'interest group approval',
};

const BUILDING_LABEL: Partial<Record<BuildingType | 'all', string>> = {
  all: 'all output', farm: 'farm output', loggingCamp: 'logging output', coalMine: 'coal mine output', ironMine: 'iron mine output',
  textileMill: 'textile output', toolWorkshop: 'tool output', armsFactory: 'arms output', luxuryWorkshop: 'luxury output',
};

/** One short line per effect, e.g. "+10% farm output", "Unlocks Railway". */
export function describeEffects(e: Effects, buildingName: (t: BuildingType) => string = t => t): string[] {
  const out: string[] = [];
  const sign = (v: number) => (v > 0 ? `+${v}` : `${v}`);
  for (const t of e.unlocks ?? []) out.push(`Unlocks ${buildingName(t)}`);
  for (const [k, v] of Object.entries(e.outputPct ?? {}) as [BuildingType | 'all', number][]) out.push(`${sign(v)}% ${BUILDING_LABEL[k] ?? `${buildingName(k as BuildingType)} output`}`);
  for (const k of EFFECT_KEYS) {
    const v = e[k];
    if (!v) continue;
    out.push(k === 'sol' || k === 'approval' ? `${sign(v)} ${LABELS[k]}` : `${sign(v)}% ${LABELS[k]}`);
  }
  return out;
}
