// Read-only helpers the AI uses to judge its options.
import { BUILDINGS, BUILDING_TYPES, type BuildingType } from '../../content/buildings';
import { GOODS } from '../../content/goods';
import { BALANCE } from '../balance';
import { controllersOf, statesControlledBy } from '../control';
import { buildCost, levelOf, maxConstructions, stateSlots } from '../economy';
import type { Country, CountryId, GameState } from '../types';
import type { Personality } from './personality';

/** Countries next to `c` at state level (0 = unclaimed land), excluding `c`. */
export function neighborCountries(state: GameState, c: Country): Set<CountryId> {
  const out = new Set<CountryId>();
  for (const s of statesControlledBy(state, c.id)) {
    for (const k of controllersOf(state, s)) out.add(k);
    for (const n of state.map.states[s].neighbors) for (const k of controllersOf(state, n)) out.add(k);
  }
  out.delete(c.id);
  return out;
}

export interface BuildOption { state: number; type: BuildingType; cost: number; score: number }

function stateValue(state: GameState, c: Country, s: number): number {
  let v = 0;
  for (const b of state.states[s].buildings) for (const g of GOODS) v += (BUILDINGS[b.type].outputs[g] ?? 0) * b.level * c.prices[g];
  return v;
}

/** Every affordable building the country could order now, scored in treasury pounds per month per pound spent. */
export function buildOptions(state: GameState, c: Country, pers: Personality, atWar: boolean, threatened: boolean): BuildOption[] {
  const out: BuildOption[] = [];
  const E = BALANCE.economy;
  if (state.constructions.filter(x => x.country === c.id).length >= maxConstructions(state, c.id)) return out;
  const short = (g: (typeof GOODS)[number]) => c.demanded[g] > c.produced[g] + c.stockpile[g] * 0.25;
  for (const st of state.states) {
    if (!st.id || st.owner !== c.id || st.controller !== c.id) continue;
    const sd = state.map.states[st.id];
    const slots = stateSlots(state, st.id);
    if (slots.used >= slots.total) continue;
    let employed = 0;
    for (const b of st.buildings) employed += BUILDINGS[b.type].workers * b.level;
    for (const q of state.constructions) if (q.state === st.id) employed += BUILDINGS[q.type].workers;
    const freeWorkers = st.population * E.WORKFORCE_SHARE - employed;
    const value = stateValue(state, c, st.id);
    for (const type of BUILDING_TYPES) {
      const def = BUILDINGS[type];
      const r = def.requires ?? {};
      if ((r.coastal && !sd.coastal) || (r.coal && !sd.resources.coal) || (r.iron && !sd.resources.iron)) continue;
      if (r.minFertility !== undefined && sd.resources.fertility < r.minFertility) continue;
      if (r.minForest !== undefined && sd.resources.forest < r.minForest) continue;
      const queued = state.constructions.filter(q => q.state === st.id && q.type === type).length;
      if (def.maxLevel !== undefined && levelOf(state, st.id, type) + queued >= def.maxLevel) continue;
      const cost = buildCost(state, c.id, type);
      if (cost > c.money) continue;
      let monthly = 0;
      const local = type === 'farm' ? sd.resources.fertility : type === 'loggingCamp' ? Math.max(0.3, sd.resources.forest) : 1;
      for (const g of GOODS) {
        const o = (def.outputs[g] ?? 0) * local * c.prices[g];
        monthly += short(g) ? o * 2 : o;
        monthly -= (def.inputs[g] ?? 0) * c.prices[g];
      }
      let score = (monthly * E.TAX_RATE - def.upkeep) / cost;
      if (Object.keys(def.outputs).length && freeWorkers < def.workers) continue;
      const ef = def.effects ?? {};
      if (ef.stateOutputPct) score = (value * (ef.stateOutputPct / 100) * E.TAX_RATE - def.upkeep) / cost;
      if (ef.taxPct) score = (value * (ef.taxPct / 100) * E.TAX_RATE - def.upkeep) / cost;
      if (ef.troopRefillPct) score = (atWar ? 0.06 : 0.02) * (0.5 + pers.aggression);
      if (ef.defenseMult) score = threatened ? 0.05 : 0.002;
      if (ef.researchPoints) score = 0.03;
      if (ef.tradeRoutes || ef.shipBuilding) score = 0.003;
      score *= pers.buildWeights[type] ?? 1;
      if (score > 0) out.push({ state: st.id, type, cost, score });
    }
  }
  return out;
}
