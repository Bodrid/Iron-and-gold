import { it, expect } from 'vitest';
import { runDays } from '../testing';
import { declareWarRaw } from '../war';
import { seaWorld } from './testWorlds';
import { navalEncounters } from './ships';
import type { GameState, Ship } from '../types';

function withRoute(): GameState {
  const g = seaWorld();
  g.countries[1].stockpile.grain = 1e6; g.countries[2].stockpile.grain = 0;
  runDays(g, 32);
  expect(g.tradeRoutes).toHaveLength(1);
  return g;
}
function warship(g: GameState, owner: number, cell: number, order: Ship['order']): Ship {
  const s: Ship = { id: g.nextId++, owner, kind: 'warship', cell, fromCell: cell, toCell: cell, pathPos: 0, dir: 1, order, hp: 1 };
  g.ships.push(s);
  return s;
}
const tradeShip = (g: GameState) => g.ships.find(s => s.kind === 'trade')!;

it('a raiding warship captures an enemy trade ship and takes its cargo; the importer gets nothing that month', () => {
  const g = withRoute();
  const zzz = g.countries[3];
  declareWarRaw(g, 3, 1);
  const t = tradeShip(g);
  warship(g, 3, t.cell, { type: 'raid', cell: t.cell });
  const before = zzz.money;
  const events: any[] = [];
  navalEncounters(g, events);
  expect(events).toContainEqual(expect.objectContaining({ type: 'shipCaptured', ship: t.id, by: 3 }));
  expect(zzz.money).toBeGreaterThan(before);
  expect(g.tradeRoutes[0].captured).toBe(true);
  const grain = g.countries[2].stockpile.grain;
  navalEncounters(g, []);                       // a second capture the same month earns nothing more
  expect(zzz.money).toBe(events.find(e => e.type === 'shipCaptured').value + before);
  g.tradeRoutes[0].captured = true;
  runDays(g, 31);
  expect(g.countries[2].stockpile.grain).toBeLessThanOrEqual(grain + 1e-6 + g.countries[2].produced.grain);
});

it('no capture without a war', () => {
  const g = withRoute();
  const t = tradeShip(g);
  warship(g, 3, t.cell, { type: 'raid', cell: t.cell });
  const events: any[] = [];
  navalEncounters(g, events);
  expect(events.filter(e => e.type === 'shipCaptured')).toEqual([]);
});

it('escorts turn a raid into a battle, which the stronger side wins', () => {
  const g = withRoute();
  declareWarRaw(g, 3, 1);
  const t = tradeShip(g);
  const r = g.tradeRoutes[0];
  const e1 = warship(g, 1, t.cell, { type: 'escort', routeId: r.id });
  const e2 = warship(g, 1, t.cell, { type: 'escort', routeId: r.id });
  const raider = warship(g, 3, t.cell, { type: 'raid', cell: t.cell });
  const events: any[] = [];
  navalEncounters(g, events);
  expect(events).toContainEqual(expect.objectContaining({ type: 'navalBattle', winner: 1 }));
  expect(g.ships.includes(raider)).toBe(false);
  expect(g.ships.includes(e1) || g.ships.includes(e2)).toBe(true);
  expect(events.filter(e => e.type === 'shipCaptured')).toEqual([]);
});

it('warships sink unescorted enemy transports', () => {
  const g = withRoute();
  declareWarRaw(g, 3, 1);
  const t = tradeShip(g);
  const tr: Ship = { id: g.nextId++, owner: 1, kind: 'transport', cell: t.cell, fromCell: t.cell, toCell: t.cell, pathPos: 0, dir: 1, order: { type: 'patrol', cell: t.cell }, hp: 1, troops: 5000 };
  g.ships.push(tr);
  warship(g, 3, t.cell, { type: 'patrol', cell: t.cell });
  const events: any[] = [];
  navalEncounters(g, events);
  expect(g.ships.includes(tr)).toBe(false);
  expect(events).toContainEqual(expect.objectContaining({ type: 'shipLost', ship: tr.id }));
});

it('500 ships resolve a day quickly', () => {
  const g = seaWorld();
  declareWarRaw(g, 1, 3);
  for (let i = 0; i < 500; i++) warship(g, i % 2 ? 1 : 3, 2 + (i % 3) * 7, { type: 'patrol', cell: 2 });
  const t0 = performance.now();
  navalEncounters(g, []);
  expect(performance.now() - t0).toBeLessThan(15);
});
