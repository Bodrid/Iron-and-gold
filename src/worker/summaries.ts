// Plain-data views of the game for the main thread.
import { BUILDINGS, BUILDING_TYPES } from '../content/buildings';
import { TICKS_PER_DAY } from '../sim/calendar';
import { buildCheck, stateSlots } from '../sim/economy';
import { warScore } from '../sim/war';
import type { Country, GameState } from '../sim/types';
import type { CountrySummary, FrameMsg, StateDetail } from './protocol';

export function summarize(state: GameState, c: Country): CountrySummary {
  return {
    id: c.id, tag: c.tag, name: c.name, color: c.color, alive: c.alive, isPlayer: c.isPlayer, capitalState: c.capitalState,
    troops: Math.round(c.troops), maxTroops: c.maxTroops, money: c.money, income: c.income, gdp: c.gdp, population: c.population, sol: c.sol,
    literacy: c.literacy, tiles: c.tiles, researchPoints: c.researchPoints,
    atWarWith: state.wars.filter(w => w.a === c.id || w.b === c.id).map(w => (w.a === c.id ? w.b : w.a)),
    stockpile: { ...c.stockpile }, prices: { ...c.prices }, produced: { ...c.produced }, demanded: { ...c.demanded },
    history: c.isPlayer ? c.history.map(h => ({ tick: h.tick, gdp: h.gdp, population: h.population, sol: h.sol })) : [],
  };
}

export function allSummaries(state: GameState): CountrySummary[] {
  return state.countries.slice(1).map(c => summarize(state, c));
}

export function stateDetail(state: GameState, stateId: number, player: number): StateDetail | null {
  const st = state.states[stateId];
  const sd = state.map.states[stateId];
  if (!st || !stateId) return null;
  return {
    id: stateId, name: sd.name, owner: st.owner, controller: st.controller, population: Math.round(st.population),
    slots: stateSlots(state, stateId), buildings: st.buildings.map(b => ({ ...b })),
    constructions: state.constructions.filter(c => c.state === stateId).map(c => ({ ...c, daysLeft: Math.max(0, Math.ceil((c.doneTick - state.tick) / TICKS_PER_DAY)) })),
    buildOptions: BUILDING_TYPES.map(type => ({ type, check: buildCheck(state, player, stateId, type) })),
    resources: { ...sd.resources }, coastal: sd.coastal,
  };
}

export function militaryView(state: GameState): Pick<FrameMsg, 'attacks' | 'wars' | 'peaceOffers'> {
  return {
    attacks: state.attacks.map(a => ({ id: a.id, attacker: a.attacker, target: a.target, troops: Math.round(a.troops) })),
    wars: state.wars.map(w => ({ id: w.id, a: w.a, b: w.b, scoreA: warScore(state, w, w.a), scoreB: warScore(state, w, w.b), startTick: w.startTick })),
    peaceOffers: state.peaceOffers.map(o => ({ from: o.from, to: o.to })),
  };
}

export const BUILDING_NAMES = Object.fromEntries(BUILDING_TYPES.map(t => [t, BUILDINGS[t].name]));
