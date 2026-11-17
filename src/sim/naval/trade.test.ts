import { it, expect } from 'vitest';
import { makeGame, runDays, stateId, stateTiles } from '../testing';
import { step } from '../step';
import { declareWarRaw } from '../war';
import { routeCapacity } from './trade';
import type { GameState } from '../types';

// Two coastal countries facing each other across 24 tiles of sea, each with one state.
function tradeWorld(opts: { ports?: boolean; seaLink?: boolean } = {}): GameState {
  const rows: string[] = [];
  for (let y = 0; y < 16; y++) rows.push('A'.repeat(8) + (opts.seaLink === false && y >= 0 ? '....AAAA....' : '.'.repeat(12)).padEnd(24, '.') + 'B'.repeat(8));
  const g = makeGame({ rows, owners: { A: 'XXX', B: 'YYY' }, population: 2_000_000, money: 1e6 });
  if (opts.ports !== false) for (const k of ['T-A', 'T-B']) g.states[stateId(g, k)].buildings.push({ type: 'port', level: 1, tile: stateTiles(g, k)[0] });
  return g;
}

function setUpSurplus(g: GameState) {
  g.countries[1].stockpile.grain = 1e6;          // XXX has far more grain than it needs
  g.countries[2].stockpile.grain = 0;            // YYY is starving
}

it('opens a route from surplus to shortage and moves goods; both sides earn', () => {
  const g = tradeWorld();
  setUpSurplus(g);
  runDays(g, 62);
  expect(g.tradeRoutes).toHaveLength(1);
  const r = g.tradeRoutes[0];
  expect([r.exporter, r.importer, r.good]).toEqual([1, 2, 'grain']);
  expect(g.countries[1].tradeIncome).toBeGreaterThan(0);
  expect(g.countries[2].tradeIncome).toBeGreaterThan(0);
  expect(g.countries[2].produced.grain + g.countries[2].stockpile.grain).toBeGreaterThan(0);
});

it('no route without ports, when at war, or with no sea path', () => {
  const a = tradeWorld({ ports: false }); setUpSurplus(a); runDays(a, 62); expect(a.tradeRoutes).toHaveLength(0);
  const b = tradeWorld(); setUpSurplus(b); declareWarRaw(b, 1, 2); runDays(b, 62); expect(b.tradeRoutes).toHaveLength(0);
  const c = tradeWorld({ seaLink: false }); setUpSurplus(c); runDays(c, 62); expect(c.tradeRoutes).toHaveLength(0);
});

it('war ends an existing route', () => {
  const g = tradeWorld(); setUpSurplus(g); runDays(g, 62);
  expect(g.tradeRoutes).toHaveLength(1);
  declareWarRaw(g, 1, 2);
  runDays(g, 31);
  expect(g.tradeRoutes).toHaveLength(0);
});

it('cancelling a route ends it; turning auto-trade off stops new ones', () => {
  const g = tradeWorld(); setUpSurplus(g); runDays(g, 62);
  const id = g.tradeRoutes[0].id;
  step(g, [{ type: 'cancelTradeRoute', country: 1, routeId: id }, { type: 'setTradeAuto', country: 1, on: false }]);
  expect(g.tradeRoutes).toHaveLength(0);
  runDays(g, 62);
  expect(g.tradeRoutes).toHaveLength(0);
  const r = step(g, [{ type: 'cancelTradeRoute', country: 1, routeId: 999 }]);
  expect(r.events[0]).toMatchObject({ type: 'rejected' });
});

it('capacity comes from port levels', () => {
  const g = tradeWorld();
  expect(routeCapacity(g, 1)).toBe(2);
  g.states[stateId(g, 'T-A')].buildings.find(b => b.type === 'port')!.level = 3;
  expect(routeCapacity(g, 1)).toBe(6);
});

it('countries with a coast start with a port in their biggest coastal state', () => {
  const rows: string[] = [];
  for (let y = 0; y < 8; y++) rows.push('CCCC' + 'AAAA' + '.'.repeat(8));
  const g = makeGame({ rows, owners: { A: 'XXX', C: 'XXX' }, population: 1_000_000, seedEconomy: true });
  expect(g.states[stateId(g, 'T-A')].buildings.some(b => b.type === 'port')).toBe(true);
  expect(g.states[stateId(g, 'T-C')].buildings.some(b => b.type === 'port')).toBe(false);
});
