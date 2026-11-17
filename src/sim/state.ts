import type { MapData } from '../map/format';
import { getStateTiles } from '../map/stateTiles';
import { BASE_PRICE, emptyGoods } from '../content/goods';
import { BALANCE } from './balance';
import { ticksUntil } from './calendar';
import { rebuildControl } from './control';
import { seedRng } from './rng';
import { systems } from './registry';
import { seedEconomy } from './economy';
import './systems';
import type { Country, CountryDef, GameSetup, GameState, StartDef } from './types';

function placeholderCountry(): Country {
  return makeCountry(0, { tag: '---', name: 'Unclaimed', color: 0x808080, capital: '', population: 0, money: 0 }, 0, false, 'normal');
}

function makeCountry(id: number, def: CountryDef, capitalState: number, isPlayer: boolean, difficulty: Country['difficulty']): Country {
  return {
    id, tag: def.tag, name: def.name, color: def.color, alive: id !== 0, isPlayer, capitalState, difficulty,
    personality: def.personality ?? 'default', troops: 0, maxTroops: 0, money: def.money,
    stockpile: emptyGoods(), prices: { ...BASE_PRICE }, produced: emptyGoods(), demanded: emptyGoods(),
    gdp: 0, income: 0, sol: 10, literacy: 0.1, researchPoints: 0, tradeIncome: 0, tiles: 0, controlled: 0, population: 0, history: [],
  };
}

export function createGame(map: MapData, start: StartDef, setup: GameSetup): GameState {
  const keyToState = new Map(map.states.slice(1).map(s => [s.key, s.id]));
  const stateId = (key: string) => {
    const id = keyToState.get(key);
    if (id === undefined) throw new Error(`Unknown state key "${key}" in start ${start.id}`);
    return id;
  };
  const tagToId = new Map(start.countries.map((c, i) => [c.tag, i + 1]));
  const countryId = (tag: string) => {
    const id = tagToId.get(tag);
    if (id === undefined) throw new Error(`Unknown country tag "${tag}" in start ${start.id}`);
    return id;
  };
  if (!tagToId.has(setup.playerTag)) throw new Error(`Player country "${setup.playerTag}" is not in start ${start.id}`);

  // Resolve ownership rules: later rules override earlier ones.
  const stateOwner = new Uint16Array(map.states.length);
  for (const rule of start.ownership) {
    if ('modern' in rule) {
      const id = countryId(rule.owner);
      for (const s of map.states) if (s.id && s.modern === rule.modern) stateOwner[s.id] = id;
    } else {
      const id = 'owner' in rule ? countryId(rule.owner) : 0;
      for (const key of rule.states) stateOwner[stateId(key)] = id;
    }
  }

  const n = map.width * map.height;
  const state: GameState = {
    version: 1, setup, startDate: start.startDate, tick: 0,
    endTick: ticksUntil(start.startDate, { y: start.endYear, m: 1, d: 1 }), rng: seedRng(setup.seed),
    map, owner: new Uint16Array(n), controller: new Uint16Array(n),
    countries: [placeholderCountry()],
    states: map.states.map(s => ({ id: s.id, owner: s.id ? stateOwner[s.id] : 0, controller: s.id ? stateOwner[s.id] : 0, population: 0, buildings: [] })),
    constructions: [], attacks: [], wars: [], peaceOffers: [], tradeRoutes: [], tradeOff: [], ships: [], shipBuilds: [], nextId: 1, outcome: null,
  };
  start.countries.forEach((def, i) => {
    state.countries.push(makeCountry(i + 1, def, stateId(def.capital), def.tag === setup.playerTag, setup.difficulty));
  });
  for (let s = 1; s < map.states.length; s++) {
    const o = stateOwner[s];
    if (!o) continue;
    for (const t of getStateTiles(map, s)) { state.owner[t] = o; state.controller[t] = o; }
  }

  // Population: fixed per-state figures and totals by modern territory where the start gives them (unclaimed land
  // weighs a tenth); a country's other states get its average density, or its own total if nothing else applies.
  const region = start.regionPopulation ?? {};
  const effW = (s: number) => map.states[s].popWeight * (stateOwner[s] ? 1 : 0.1);
  const pop = new Float64Array(map.states.length).fill(-1);
  const fixedIn = new Map<string, number>();
  for (let s = 1; s < map.states.length; s++) {
    const v = region[map.states[s].key];
    if (v !== undefined) { pop[s] = v; fixedIn.set(map.states[s].modern, (fixedIn.get(map.states[s].modern) ?? 0) + v); }
  }
  const regionW = new Map<string, number>();
  for (let s = 1; s < map.states.length; s++) {
    const m = map.states[s].modern;
    if (pop[s] < 0 && region[m] !== undefined) regionW.set(m, (regionW.get(m) ?? 0) + effW(s));
  }
  for (let s = 1; s < map.states.length; s++) {
    const m = map.states[s].modern;
    if (pop[s] < 0 && region[m] !== undefined) pop[s] = Math.max(0, region[m] - (fixedIn.get(m) ?? 0)) * (regionW.get(m)! > 0 ? effW(s) / regionW.get(m)! : 0);
  }
  const coveredPop = new Float64Array(state.countries.length), coveredW = new Float64Array(state.countries.length), restW = new Float64Array(state.countries.length);
  for (let s = 1; s < map.states.length; s++) {
    const o = stateOwner[s];
    if (!o) continue;
    if (pop[s] >= 0) { coveredPop[o] += pop[s]; coveredW[o] += map.states[s].popWeight; } else restW[o] += map.states[s].popWeight;
  }
  for (let s = 1; s < map.states.length; s++) {
    const o = stateOwner[s];
    const w = map.states[s].popWeight;
    if (pop[s] < 0) {
      if (!o) pop[s] = w * BALANCE.population.UNCLAIMED_POP_PER_WEIGHT;
      else if (coveredW[o] > 0) pop[s] = w * (coveredPop[o] / coveredW[o]);
      else pop[s] = restW[o] ? start.countries[o - 1].population * (w / restW[o]) : 0;
    }
    state.states[s].population = Math.round(pop[s]);
  }

  rebuildControl(state);
  for (const c of state.countries.slice(1)) {
    c.population = 0;
    for (let s = 1; s < map.states.length; s++) if (state.states[s].owner === c.id) c.population += state.states[s].population;
    c.maxTroops = Math.round(c.population * BALANCE.troops.MANPOWER_SHARE);
    c.troops = Math.round(c.maxTroops * BALANCE.troops.START_FRACTION);
    c.stockpile.grain = Math.round((c.population / 1000) * BALANCE.economy.START_STOCK_MONTHS);
    c.stockpile.textiles = Math.round((c.population / 4000) * BALANCE.economy.START_STOCK_MONTHS);
    if (!c.tiles) c.alive = false;
  }
  if (start.seedEconomy !== false) seedEconomy(state);
  for (const s of systems.init) s(state, [], []);
  return state;
}
