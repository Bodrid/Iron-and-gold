// Plain-data views of the game for the main thread.
import { BUILDINGS, BUILDING_TYPES } from '../content/buildings';
import { TICKS_PER_DAY } from '../sim/calendar';
import { buildCheck, stateSlots } from '../sim/economy';
import { warScore } from '../sim/war';
import type { Country, GameState } from '../sim/types';
import type { CountrySummary, FleetView, FrameMsg, StateDetail, TradeView } from './protocol';
import { SHIP_STRIDE } from './protocol';
import { cellCentre, getNavGrid } from '../sim/naval/nav';
import { routeCapacity, routesOf } from '../sim/naval/trade';

export function summarize(state: GameState, c: Country): CountrySummary {
  return {
    id: c.id, tag: c.tag, name: c.name, color: c.color, alive: c.alive, isPlayer: c.isPlayer, capitalState: c.capitalState,
    troops: Math.round(c.troops), maxTroops: c.maxTroops, money: c.money, income: c.income, gdp: c.gdp, population: c.population, sol: c.sol,
    literacy: c.literacy, tiles: c.tiles, researchPoints: c.researchPoints,
    atWarWith: state.wars.flatMap(w => (w.sideA.includes(c.id) ? w.sideB : w.sideB.includes(c.id) ? w.sideA : [])),
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

const KIND = { trade: 0, warship: 1, transport: 2 } as const;

export function packShips(state: GameState): Int32Array {
  const g = getNavGrid(state.map);
  const out = new Int32Array(state.ships.length * SHIP_STRIDE);
  state.ships.forEach((s, k) => {
    const [x, y] = cellCentre(s.cell, g);
    out.set([s.id, s.owner, KIND[s.kind], Math.round(x * 16), Math.round(y * 16)], k * SHIP_STRIDE);
  });
  return out;
}

export function tradeView(state: GameState, me: number): TradeView {
  const routes = routesOf(state, me);
  return {
    routes: routes.map(r => ({ id: r.id, exporter: r.exporter, importer: r.importer, good: r.good, amount: Math.round(r.amount) })),
    capacity: routeCapacity(state, me), used: routes.length, auto: !state.tradeOff.includes(me), income: state.countries[me].tradeIncome,
  };
}

const ORDER_TEXT: Record<string, string> = { idle: 'In port', patrol: 'Patrolling', raid: 'Raiding', escort: 'Escorting', invade: 'Invading', trade: 'Trading' };

export function fleetView(state: GameState, me: number): FleetView {
  return {
    ships: state.ships.filter(s => s.owner === me && s.kind !== 'trade').map(s => ({ id: s.id, kind: s.kind as 'warship' | 'transport', order: ORDER_TEXT[s.order.type], cell: s.cell, troops: Math.round(s.troops ?? 0) })),
    builds: state.shipBuilds.filter(b => b.country === me).map(b => ({ kind: b.kind, state: b.state, daysLeft: Math.max(0, Math.ceil((b.doneTick - state.tick) / TICKS_PER_DAY)) })),
  };
}
