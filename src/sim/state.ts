import type { MapData } from '../map/format';
import { getStateTiles } from '../map/stateTiles';
import { BALANCE } from './balance';
import { ticksUntil } from './calendar';
import { rebuildControl } from './control';
import { seedRng } from './rng';
import { systems } from './registry';
import { seedEconomy } from './economy';
import { eraOfYear } from './research';
import { TECHS, TECH_BY_ID } from '../content/techs';
import { LAW_BY_ID } from '../content/laws';
import { makeCountry, placeholderCountry } from './country';
import './systems';
import type { GameSetup, GameState, StartDef } from './types';

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
    constructions: [], attacks: [], wars: [], plays: [], reparations: [], peaceOffers: [], tradeRoutes: [], tradeBlocks: [], tradeOff: [], blocs: [], blocOffers: [], flags: [], pendingEvents: [], eventLog: [], ships: [], shipBuilds: [], relations: new Int16Array(0), diploActions: [], treaties: [], treatyOffers: [], coalitions: [], privateers: [], nextId: 1, outcome: null,
  };
  start.countries.forEach((def, i) => {
    state.countries.push(makeCountry(i + 1, def, stateId(def.capital), def.tag === setup.playerTag, setup.difficulty));
  });
  const knownEra = start.knownEra ?? eraOfYear(start.startDate.y) - 1;
  for (const c of state.countries.slice(1)) {
    c.techs = TECHS.filter(t => t.era <= knownEra).map(t => t.id);
    for (const t of start.extraTechs?.[c.tag] ?? []) {
      if (!TECH_BY_ID[t]) throw new Error(`Unknown tech "${t}" in start ${start.id}`);
      if (!c.techs.includes(t)) c.techs.push(t);
    }
    c.literacy = start.literacy?.[c.tag] ?? start.defaultLiteracy ?? c.literacy;
    for (const [area, law] of Object.entries(start.laws?.[c.tag] ?? {})) {
      if (LAW_BY_ID[law]?.area !== area) throw new Error(`Bad law "${law}" for ${area} in start ${start.id}`);
      c.laws[area as keyof typeof c.laws] = law;
    }
  }
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
      // Country density, but never more than a modest cap: big empty lands (Greenland) must not fill up.
      else if (coveredW[o] > 0) pop[s] = w * Math.min(coveredPop[o] / coveredW[o], BALANCE.population.UNCOVERED_MAX_PER_WEIGHT);
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
  // Treaties already in force (signed before relations are first set, so they count toward them).
  for (const t of start.treaties ?? []) {
    const a = tagToId.get(t.a), b = tagToId.get(t.b);
    if (!a || !b) throw new Error(`Unknown tag in starting treaty ${t.a}-${t.b} in start ${start.id}`);
    state.treaties.push({ id: state.nextId++, kind: t.kind, a, b, since: 0 });
  }
  for (const s of systems.init) s(state, [], []);
  return state;
}
