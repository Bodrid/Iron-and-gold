import type { MapData } from '../map/format';
import { getStateTiles } from '../map/stateTiles';
import { BASE_PRICE, emptyGoods } from '../content/goods';
import { BALANCE } from './balance';
import { ticksUntil } from './calendar';
import { rebuildControl } from './control';
import { seedRng } from './rng';
import type { Country, CountryDef, GameSetup, GameState, StartDef } from './types';

function placeholderCountry(): Country {
  return makeCountry(0, { tag: '---', name: 'Unclaimed', color: 0x808080, capital: '', population: 0, money: 0 }, 0, false, 'normal');
}

function makeCountry(id: number, def: CountryDef, capitalState: number, isPlayer: boolean, difficulty: Country['difficulty']): Country {
  return {
    id, tag: def.tag, name: def.name, color: def.color, alive: id !== 0, isPlayer, capitalState, difficulty,
    personality: def.personality ?? 'default', troops: 0, maxTroops: 0, money: def.money,
    stockpile: emptyGoods(), prices: { ...BASE_PRICE }, produced: emptyGoods(), demanded: emptyGoods(),
    gdp: 0, income: 0, sol: 10, literacy: 0.1, researchPoints: 0, tiles: 0, controlled: 0, population: 0, history: [],
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
    constructions: [], attacks: [], wars: [], peaceOffers: [], nextId: 1, outcome: null,
  };
  start.countries.forEach((def, i) => {
    state.countries.push(makeCountry(i + 1, def, stateId(def.capital), def.tag === setup.playerTag, setup.difficulty));
  });
  for (let s = 1; s < map.states.length; s++) {
    const o = stateOwner[s];
    if (!o) continue;
    for (const t of getStateTiles(map, s)) { state.owner[t] = o; state.controller[t] = o; }
  }

  // Population: each country's total spread over its states by weight; unclaimed land gets a little.
  const weightSum = new Float64Array(state.countries.length);
  for (let s = 1; s < map.states.length; s++) weightSum[stateOwner[s]] += map.states[s].popWeight;
  for (let s = 1; s < map.states.length; s++) {
    const o = stateOwner[s];
    const w = map.states[s].popWeight;
    state.states[s].population = o
      ? Math.round(start.countries[o - 1].population * (weightSum[o] ? w / weightSum[o] : 0))
      : Math.round(w * BALANCE.population.UNCLAIMED_POP_PER_WEIGHT);
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
  return state;
}
