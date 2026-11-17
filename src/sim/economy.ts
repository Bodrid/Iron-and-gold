// Buildings, construction, monthly production and consumption, prices, GDP, income and living standards.
import { getStateTiles } from '../map/stateTiles';
import { BUILDINGS, BUILDING_TYPES, type BuildingType } from '../content/buildings';
import { BASE_PRICE, GOODS } from '../content/goods';
import { BALANCE } from './balance';
import { TICKS_PER_DAY } from './calendar';
import { statesOwnedBy } from './control';
import { handlers, systems } from './registry';
import type { Building, Command, Country, CountryId, GameState, Good, SimEvent } from './types';

const E = BALANCE.economy;

export type BuildRejection = 'notYours' | 'occupied' | 'noSlots' | 'needsCoast' | 'needsCoal' | 'needsIron' | 'needsFarmland' | 'needsForest' | 'maxLevel' | 'cantAfford' | 'tooManyConstructions';
export type BuildCheck = { ok: true; cost: number } | { ok: false; reason: BuildRejection };

/** Multipliers on building cost (Grand Master AI uses this). */
export const buildCostHooks: ((state: GameState, c: Country) => number)[] = [];

export function buildCost(state: GameState, country: CountryId, type: BuildingType): number {
  let m = 1;
  for (const h of buildCostHooks) m *= h(state, state.countries[country]);
  return Math.round(BUILDINGS[type].cost * m);
}

export function levelOf(state: GameState, stateId: number, type: BuildingType): number {
  let n = 0;
  for (const b of state.states[stateId].buildings) if (b.type === type) n += b.level;
  return n;
}

export function stateSlots(state: GameState, stateId: number): { used: number; total: number } {
  const def = state.map.states[stateId];
  const total = Math.max(E.BASE_SLOTS, Math.min(E.MAX_SLOTS, E.BASE_SLOTS + Math.floor(def.tiles / E.TILES_PER_SLOT) + Math.floor(state.states[stateId].population / E.POP_PER_SLOT)));
  let used = 0;
  for (const b of state.states[stateId].buildings) used += b.level;
  for (const c of state.constructions) if (c.state === stateId) used++;
  return { used, total };
}

export function maxConstructions(state: GameState, country: CountryId): number {
  let owned = 0;
  for (const s of state.states) if (s.id && s.owner === country) owned++;
  return E.CONSTRUCTION_BASE + Math.floor(owned / E.CONSTRUCTION_PER_STATES);
}

export function buildCheck(state: GameState, country: CountryId, stateId: number, type: BuildingType): BuildCheck {
  const def = BUILDINGS[type];
  const st = state.states[stateId];
  const sd = state.map.states[stateId];
  if (!def || !st || !stateId || st.owner !== country) return { ok: false, reason: 'notYours' };
  if (st.controller !== country) return { ok: false, reason: 'occupied' };
  const r = def.requires ?? {};
  if (r.coastal && !sd.coastal) return { ok: false, reason: 'needsCoast' };
  if (r.coal && !sd.resources.coal) return { ok: false, reason: 'needsCoal' };
  if (r.iron && !sd.resources.iron) return { ok: false, reason: 'needsIron' };
  if (r.minFertility !== undefined && sd.resources.fertility < r.minFertility) return { ok: false, reason: 'needsFarmland' };
  if (r.minForest !== undefined && sd.resources.forest < r.minForest) return { ok: false, reason: 'needsForest' };
  const queued = state.constructions.filter(c => c.state === stateId && c.type === type).length;
  if (def.maxLevel !== undefined && levelOf(state, stateId, type) + queued >= def.maxLevel) return { ok: false, reason: 'maxLevel' };
  const slots = stateSlots(state, stateId);
  if (slots.used >= slots.total) return { ok: false, reason: 'noSlots' };
  if (state.constructions.filter(c => c.country === country).length >= maxConstructions(state, country)) return { ok: false, reason: 'tooManyConstructions' };
  const cost = buildCost(state, country, type);
  if (state.countries[country].money < cost) return { ok: false, reason: 'cantAfford' };
  return { ok: true, cost };
}

/** The state tile nearest its centroid that no other building icon uses. */
function iconTile(state: GameState, stateId: number): number {
  const sd = state.map.states[stateId];
  const used = new Set(state.states[stateId].buildings.map(b => b.tile));
  const w = state.map.width;
  let best = -1, bestD = Infinity;
  for (const t of getStateTiles(state.map, stateId)) {
    if (used.has(t)) continue;
    const dx = (t % w) - sd.centroid[0], dy = Math.floor(t / w) - sd.centroid[1];
    const d = dx * dx + dy * dy;
    if (d < bestD) { bestD = d; best = t; }
  }
  return best >= 0 ? best : getStateTiles(state.map, stateId)[0];
}

export function addLevel(state: GameState, stateId: number, type: BuildingType, n = 1): void {
  const list = state.states[stateId].buildings;
  const existing = list.find(b => b.type === type);
  if (existing) existing.level += n;
  else list.push({ type, level: n, tile: iconTile(state, stateId) } as Building);
}

export function constructionTick(state: GameState, events: SimEvent[]): void {
  const due = state.constructions.filter(c => c.doneTick <= state.tick);
  if (!due.length) return;
  state.constructions = state.constructions.filter(c => c.doneTick > state.tick);
  for (const c of due) {
    // The state may have changed hands while building; the building goes to whoever owns it now.
    addLevel(state, c.state, c.type);
    events.push({ type: 'built', country: c.country, state: c.state, building: c.type });
  }
}

// ---- monthly economy ----
function emptyRecord(): Record<Good, number> { return { grain: 0, wood: 0, coal: 0, iron: 0, textiles: 0, tools: 0, arms: 0, luxuries: 0 }; }

export function monthlyEconomy(state: GameState): void {
  for (const c of state.countries) if (c.alive) countryMonth(state, c);
}

function countryMonth(state: GameState, c: Country): void {
  const states = statesOwnedBy(state, c.id).filter(s => state.states[s].owner === c.id);
  const producing = states.filter(s => state.states[s].controller === c.id);

  // Worker ratio per state, and national input demand at full efficiency.
  const workerRatio = new Map<number, number>();
  const demand = emptyRecord();
  for (const s of producing) {
    const st = state.states[s];
    let need = 0;
    for (const b of st.buildings) {
      const def = BUILDINGS[b.type];
      need += def.workers * b.level;
      for (const g of GOODS) demand[g] += (def.inputs[g] ?? 0) * b.level;
    }
    workerRatio.set(s, need ? Math.min(1, (st.population * E.WORKFORCE_SHARE) / need) : 1);
  }
  const inputAvail = emptyRecord();
  for (const g of GOODS) inputAvail[g] = demand[g] > 0 ? Math.min(1, c.stockpile[g] / demand[g]) : 1;

  const produced = emptyRecord();
  const used = emptyRecord();
  let upkeep = 0, taxBonus = 0, taxBase = 0, research = 0;
  for (const s of states) for (const b of state.states[s].buildings) upkeep += BUILDINGS[b.type].upkeep * b.level;
  for (const s of producing) {
    const st = state.states[s];
    const sd = state.map.states[s];
    let outputPct = 0, stateTax = 0;
    for (const b of st.buildings) {
      const ef = BUILDINGS[b.type].effects;
      if (!ef) continue;
      if (ef.stateOutputPct) outputPct += ef.stateOutputPct * b.level * railwayFuel(b, inputAvail);
      if (ef.taxPct) stateTax += ef.taxPct * b.level;
      if (ef.researchPoints) research += BALANCE.growth.RESEARCH_PER_LEVEL * b.level * (0.5 + c.literacy);
    }
    let stateValue = 0;
    for (const b of st.buildings) {
      const def = BUILDINGS[b.type];
      let eff = workerRatio.get(s)!;
      for (const g of GOODS) if (def.inputs[g]) eff = Math.min(eff, inputAvail[g]);
      for (const g of GOODS) if (def.inputs[g]) used[g] += def.inputs[g]! * b.level * eff;
      const local = b.type === 'farm' ? sd.resources.fertility : b.type === 'loggingCamp' ? Math.max(0.3, sd.resources.forest) : 1;
      for (const g of GOODS) {
        const out = (def.outputs[g] ?? 0) * b.level * eff * local * (1 + outputPct / 100);
        produced[g] += out;
        stateValue += out * c.prices[g];
      }
    }
    taxBase += stateValue;
    taxBonus += stateValue * (stateTax / 100);
  }
  for (const g of GOODS) c.stockpile[g] = Math.max(0, c.stockpile[g] - used[g]) + produced[g];

  // People consume grain, textiles and luxuries.
  const k = c.population / 1000;
  const wants: [Good, number][] = [['grain', k * E.GRAIN_PER_K], ['textiles', k * E.TEXTILES_PER_K], ['luxuries', k * E.LUXURIES_PER_K]];
  const sat: Record<string, number> = {};
  for (const [g, want] of wants) {
    const take = Math.min(c.stockpile[g], want);
    c.stockpile[g] -= take;
    sat[g] = want > 0 ? take / want : 1;
    demand[g] += want;
  }
  c.sol = Math.max(0, Math.min(30, E.SOL_BASE + E.SOL_GRAIN * sat.grain + E.SOL_TEXTILES * sat.textiles + E.SOL_LUXURIES * sat.luxuries));

  // GDP at this month's prices, then new prices from supply and demand.
  let value = 0;
  for (const g of GOODS) value += produced[g] * c.prices[g];
  c.gdp = value * 12;
  for (const g of GOODS) {
    c.prices[g] = BASE_PRICE[g] * Math.max(E.PRICE_MIN, Math.min(E.PRICE_MAX, (demand[g] + 1) / (produced[g] + 1)));
  }
  c.produced = produced;
  c.demanded = demand;
  c.income = (taxBase + taxBonus) * E.TAX_RATE - upkeep - c.troops * E.ARMY_UPKEEP;
  c.money += c.income;
  c.researchPoints += research;
}

function railwayFuel(b: Building, avail: Record<Good, number>): number {
  return b.type === 'railway' ? avail.coal : 1;
}

// ---- starting economy ----
export function seedEconomy(state: GameState): void {
  for (const c of state.countries) {
    if (!c.alive) continue;
    for (const s of statesOwnedBy(state, c.id)) {
      const st = state.states[s];
      if (st.owner !== c.id) continue;
      const sd = state.map.states[s];
      const workforce = st.population * E.WORKFORCE_SHARE;
      const { total } = stateSlots(state, s);
      let free = total;
      const put = (type: BuildingType, n: number) => { n = Math.min(n, free); if (n > 0) { addLevel(state, s, type, n); free -= n; } };
      if (sd.resources.fertility >= 0.2) put('farm', Math.round((workforce * E.START_FARM_SHARE) / BUILDINGS.farm.workers));
      if (sd.resources.forest >= 0.15) put('loggingCamp', Math.round((workforce * E.START_LOGGING_SHARE) / BUILDINGS.loggingCamp.workers));
      if (st.population >= E.START_MINE_MIN_POP && sd.resources.coal) put('coalMine', 1);
      if (st.population >= E.START_MINE_MIN_POP && sd.resources.iron) put('ironMine', 1);
    }
    const cap = c.capitalState;
    if (state.states[cap]?.owner === c.id) {
      addLevel(state, cap, 'barracks', 1);
      if (c.population >= E.START_UNIVERSITY_MIN_POP) addLevel(state, cap, 'university', 1);
      if (c.population >= E.START_UNIVERSITY_MIN_POP) addLevel(state, cap, 'governmentOffice', 1);
    }
  }
}

// ---- wiring ----
handlers.build = (state, cmd: Extract<Command, { type: 'build' }>) => {
  if (!BUILDING_TYPES.includes(cmd.building)) return 'unknown building';
  const check = buildCheck(state, cmd.country, cmd.state, cmd.building);
  if (!check.ok) return check.reason;
  state.countries[cmd.country].money -= check.cost;
  state.constructions.push({ id: state.nextId++, country: cmd.country, state: cmd.state, type: cmd.building, doneTick: state.tick + BUILDINGS[cmd.building].buildDays * TICKS_PER_DAY });
  return null;
};
systems.init.push(state => seedEconomy(state));
systems.day.push((state, events) => constructionTick(state, events));
systems.month.push(state => monthlyEconomy(state));
