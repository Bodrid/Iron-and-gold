// Buildings, construction, monthly production and consumption, prices, GDP, income and living standards.
import { getStateTiles } from '../map/stateTiles';
import { BUILDINGS, BUILDING_TYPES, type BuildingType } from '../content/buildings';
import { BASE_PRICE, GOODS } from '../content/goods';
import { BALANCE } from './balance';
import { TICKS_PER_DAY } from './calendar';
import { statesOwnedBy } from './control';
import { buildingUnlocked, mods, pctMult } from './mods';
import { handlers, systems } from './registry';
import type { Building, Command, Country, CountryId, GameState, Good, SimEvent } from './types';

const E = BALANCE.economy;

export type BuildRejection = 'needsTech' | 'notYours' | 'occupied' | 'noSlots' | 'needsCoast' | 'needsCoal' | 'needsIron' | 'needsFarmland' | 'needsForest' | 'maxLevel' | 'cantAfford' | 'tooManyConstructions';
export type BuildCheck = { ok: true; cost: number } | { ok: false; reason: BuildRejection };

/** Multipliers on building cost (Grand Master AI uses this). */
export const buildCostHooks: ((state: GameState, c: Country) => number)[] = [];
/** Multipliers on research (Grand Master AI uses this). */
export const researchHooks: ((state: GameState, c: Country) => number)[] = [];

/** Multiplier on building costs for a country (techs, laws, Grand Master bonus). */
export function buildCostMult(state: GameState, country: CountryId): number {
  const c = state.countries[country];
  let m = pctMult(mods(state, c).buildCostPct);
  for (const h of buildCostHooks) m *= h(state, c);
  return m;
}

export function buildCost(state: GameState, country: CountryId, type: BuildingType, mult = buildCostMult(state, country)): number {
  return Math.round(BUILDINGS[type].cost * mult);
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
  if (!buildingUnlocked(state.countries[country], type)) return { ok: false, reason: 'needsTech' };
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

/** "Build anywhere" placement; the AI's ranking fills it in from ai/evaluate (kept out of here to avoid an import cycle). */
export const placementHooks: { bestState: (state: GameState, country: CountryId, type: BuildingType) => number | string } = { bestState: () => 'noPlace' };

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
  const md = mods(state, c);
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
  let upkeep = 0, taxBonus = 0, taxBase = 0, uniLevels = 0;
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
      if (ef.researchPoints) uniLevels += b.level;
    }
    let stateValue = 0;
    for (const b of st.buildings) {
      const def = BUILDINGS[b.type];
      let eff = workerRatio.get(s)!;
      for (const g of GOODS) if (def.inputs[g]) eff = Math.min(eff, inputAvail[g]);
      for (const g of GOODS) if (def.inputs[g]) used[g] += def.inputs[g]! * b.level * eff;
      const local = b.type === 'farm' ? sd.resources.fertility : b.type === 'loggingCamp' ? Math.max(0.3, sd.resources.forest) : 1;
      const techPct = md.output[b.type] + (def.category === 'industry' ? md.industryPct : 0);
      for (const g of GOODS) {
        const out = (def.outputs[g] ?? 0) * b.level * eff * local * (1 + (outputPct + techPct) / 100) * (1 + c.literacy * BALANCE.growth.LITERACY_OUTPUT);
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
  c.sol = Math.max(0, Math.min(30, E.SOL_BASE + E.SOL_GRAIN * sat.grain + E.SOL_TEXTILES * sat.textiles + E.SOL_LUXURIES * sat.luxuries + md.sol));

  // GDP at this month's prices, then new prices from supply and demand.
  let value = 0;
  for (const g of GOODS) value += produced[g] * c.prices[g];
  c.gdp = value * 12;
  for (const g of GOODS) {
    c.prices[g] = BASE_PRICE[g] * Math.max(E.PRICE_MIN, Math.min(E.PRICE_MAX, (demand[g] + 1) / (produced[g] + 1)));
  }
  c.produced = produced;
  c.demanded = demand;
  c.income = (taxBase + taxBonus) * E.TAX_RATE * pctMult(md.taxPct) - upkeep - c.troops * E.ARMY_UPKEEP * pctMult(md.armyUpkeepPct);
  c.money += c.income;
  let rm = pctMult(md.researchPct);
  for (const h of researchHooks) rm *= h(state, c);
  const R = BALANCE.research;
  // Universities give less each: the tenth adds far less than the first.
  const research = BALANCE.growth.RESEARCH_PER_LEVEL * (uniLevels / (1 + uniLevels / R.UNIVERSITY_SOFT_CAP)) * (0.5 + c.literacy);
  c.researchRate = (R.BASE + R.POP * Math.sqrt(c.population / 1e6) * (R.LITERACY_BASE + R.LITERACY_MULT * c.literacy) + research) * rm;
  c.researchPoints += c.researchRate;
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
    // A port in the most populous coastal state: every coastal country traded by sea in 1836.
    let portState = 0;
    for (const s of statesOwnedBy(state, c.id)) {
      if (state.states[s].owner !== c.id || !state.map.states[s].coastal) continue;
      if (!portState || state.states[s].population > state.states[portState].population) portState = s;
    }
    if (portState) addLevel(state, portState, 'port', c.population >= E.START_BIG_PORT_POP ? 2 : 1);
    const cap = c.capitalState;
    if (state.states[cap]?.owner === c.id) {
      addLevel(state, cap, 'barracks', 1);
      if (c.population >= E.START_UNIVERSITY_MIN_POP) addLevel(state, cap, 'university', 1);
      if (c.population >= E.START_UNIVERSITY_MIN_POP) addLevel(state, cap, 'governmentOffice', 1);
    }
  }
}

/** Fills in GDP, income, prices and production for display at game start, without spending anything. */
export function primeEconomy(state: GameState): void {
  for (const c of state.countries) {
    if (!c.alive) continue;
    const money = c.money, stock = { ...c.stockpile }, rp = c.researchPoints;
    countryMonth(state, c);
    c.money = money; c.stockpile = stock; c.researchPoints = rp;
  }
}

// ---- wiring ----
handlers.build = (state, cmd: Extract<Command, { type: 'build' }>, events) => {
  if (!BUILDING_TYPES.includes(cmd.building)) return 'unknown building';
  const where = cmd.state ?? placementHooks.bestState(state, cmd.country, cmd.building);
  if (typeof where === 'string') return where;
  const check = buildCheck(state, cmd.country, where, cmd.building);
  if (!check.ok) return check.reason;
  state.countries[cmd.country].money -= check.cost;
  state.constructions.push({ id: state.nextId++, country: cmd.country, state: where, type: cmd.building, doneTick: state.tick + BUILDINGS[cmd.building].buildDays * TICKS_PER_DAY });
  if (cmd.state === undefined) events.push({ type: 'buildOrdered', country: cmd.country, state: where, building: cmd.building });
  return null;
};
systems.init.push(state => primeEconomy(state));
systems.day.push((state, events) => constructionTick(state, events));
systems.month.push(state => monthlyEconomy(state));
