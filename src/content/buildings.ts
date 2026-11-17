import type { BuildingType } from './buildingTypes';
import type { Good } from '../sim/types';

export type { BuildingType };

export interface BuildingEffects {
  troopRefillPct?: number; maxTroops?: number; defenseMult?: number; researchPoints?: number; stateOutputPct?: number; taxPct?: number;
  /** Stage 2: trade routes this port supports. */ tradeRoutes?: number;
  /** Stage 2: ships this yard can build at once. */ shipBuilding?: number;
}

export interface BuildingDef {
  type: BuildingType; name: string; description: string; category: 'production' | 'industry' | 'military' | 'infrastructure' | 'knowledge';
  cost: number; buildDays: number; upkeep: number; workers: number;
  /** Per level per month at full efficiency. */
  inputs: Partial<Record<Good, number>>; outputs: Partial<Record<Good, number>>;
  requires?: { coastal?: true; coal?: true; iron?: true; minFertility?: number; minForest?: number };
  effects?: BuildingEffects;
  maxLevel?: number;
}

const b = (d: BuildingDef) => d;

export const BUILDINGS: Record<BuildingType, BuildingDef> = {
  farm: b({ type: 'farm', name: 'Farm', category: 'production', description: 'Grows grain to feed your people and your mills.', cost: 8_000, buildDays: 60, upkeep: 100, workers: 25_000, inputs: {}, outputs: { grain: 250 }, requires: { minFertility: 0.2 } }),
  loggingCamp: b({ type: 'loggingCamp', name: 'Logging Camp', category: 'production', description: 'Cuts wood for tools and furniture.', cost: 7_000, buildDays: 60, upkeep: 100, workers: 15_000, inputs: {}, outputs: { wood: 150 }, requires: { minForest: 0.15 } }),
  coalMine: b({ type: 'coalMine', name: 'Coal Mine', category: 'production', description: 'Digs coal to fuel mills and railways.', cost: 16_000, buildDays: 120, upkeep: 200, workers: 15_000, inputs: {}, outputs: { coal: 120 }, requires: { coal: true } }),
  ironMine: b({ type: 'ironMine', name: 'Iron Mine', category: 'production', description: 'Digs iron for tools and arms.', cost: 18_000, buildDays: 120, upkeep: 200, workers: 15_000, inputs: {}, outputs: { iron: 120 }, requires: { iron: true } }),
  textileMill: b({ type: 'textileMill', name: 'Textile Mill', category: 'industry', description: 'Turns grain and coal into textiles that raise living standards.', cost: 22_000, buildDays: 120, upkeep: 250, workers: 15_000, inputs: { grain: 60, coal: 20 }, outputs: { textiles: 120 } }),
  toolWorkshop: b({ type: 'toolWorkshop', name: 'Tool Workshop', category: 'industry', description: 'Turns wood and iron into tools.', cost: 26_000, buildDays: 150, upkeep: 300, workers: 12_000, inputs: { wood: 40, iron: 40 }, outputs: { tools: 80 } }),
  armsFactory: b({ type: 'armsFactory', name: 'Arms Factory', category: 'industry', description: 'Turns iron and tools into arms that keep your army refilling.', cost: 34_000, buildDays: 150, upkeep: 350, workers: 12_000, inputs: { iron: 40, tools: 20 }, outputs: { arms: 80 } }),
  luxuryWorkshop: b({ type: 'luxuryWorkshop', name: 'Luxury Workshop', category: 'industry', description: 'Turns wood and textiles into fine goods that lift living standards.', cost: 30_000, buildDays: 150, upkeep: 300, workers: 10_000, inputs: { wood: 25, textiles: 25 }, outputs: { luxuries: 50 } }),
  port: b({ type: 'port', name: 'Port', category: 'infrastructure', description: 'Opens two trade routes per level and harbours your ships.', cost: 25_000, buildDays: 180, upkeep: 300, workers: 5_000, inputs: {}, outputs: {}, requires: { coastal: true }, effects: { tradeRoutes: 2 }, maxLevel: 5 }),
  shipyard: b({ type: 'shipyard', name: 'Shipyard', category: 'military', description: 'Builds warships and transports (one at a time per level).', cost: 30_000, buildDays: 180, upkeep: 300, workers: 8_000, inputs: {}, outputs: {}, requires: { coastal: true }, effects: { shipBuilding: 1 }, maxLevel: 5 }),
  barracks: b({ type: 'barracks', name: 'Barracks', category: 'military', description: 'Raises your troop limit and refills troops faster.', cost: 12_000, buildDays: 90, upkeep: 200, workers: 3_000, inputs: {}, outputs: {}, effects: { troopRefillPct: 15, maxTroops: 2_000 } }),
  fort: b({ type: 'fort', name: 'Fort', category: 'military', description: 'Makes this state much harder to take.', cost: 15_000, buildDays: 120, upkeep: 150, workers: 1_000, inputs: {}, outputs: {}, effects: { defenseMult: 1.75 }, maxLevel: 3 }),
  university: b({ type: 'university', name: 'University', category: 'knowledge', description: 'Produces research and raises literacy.', cost: 40_000, buildDays: 240, upkeep: 500, workers: 4_000, inputs: {}, outputs: {}, effects: { researchPoints: 5 } }),
  railway: b({ type: 'railway', name: 'Railway', category: 'infrastructure', description: 'Burns coal to raise the output of every building in the state.', cost: 45_000, buildDays: 240, upkeep: 400, workers: 6_000, inputs: { coal: 15 }, outputs: {}, effects: { stateOutputPct: 20 }, maxLevel: 3 }),
  governmentOffice: b({ type: 'governmentOffice', name: 'Government Office', category: 'infrastructure', description: 'Collects more taxes from this state.', cost: 20_000, buildDays: 120, upkeep: 300, workers: 3_000, inputs: {}, outputs: {}, effects: { taxPct: 20 }, maxLevel: 5 }),
};

export const BUILDING_TYPES = Object.keys(BUILDINGS) as BuildingType[];
