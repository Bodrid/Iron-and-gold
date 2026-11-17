import { it, expect } from 'vitest';
import { runDays, stateId, stateTiles, occupy } from '../testing';
import { step } from '../step';
import { declareWarRaw } from '../war';
import { setTile } from '../control';
import { SHIPS } from '../../content/ships';
import { seaWorld } from './testWorlds';
import { portCell } from './nav';

it('a trade route spawns a trade ship that sails the lane and back', () => {
  const g = seaWorld();
  g.countries[1].stockpile.grain = 1e6; g.countries[2].stockpile.grain = 0;
  runDays(g, 32);
  expect(g.tradeRoutes).toHaveLength(1);
  const ship = g.ships.find(s => s.kind === 'trade')!;
  expect(ship.routeId).toBe(g.tradeRoutes[0].id);
  const cells = new Set<number>();
  for (let d = 0; d < 40; d++) { runDays(g, 1); cells.add(ship.cell); }
  expect(cells.size).toBeGreaterThan(2);
  expect(cells.has(portCell(g.map, stateId(g, 'T-A')))).toBe(true);
  expect(cells.has(portCell(g.map, stateId(g, 'T-B')))).toBe(true);
});

it('building a warship needs a shipyard and money, and finishes after its build time', () => {
  const none = seaWorld();
  const r = step(none, [{ type: 'buildShip', country: 1, state: stateId(none, 'T-A'), kind: 'warship' }]);
  expect(r.events[0]).toMatchObject({ type: 'rejected' });
  const g = seaWorld({ shipyards: true });
  const money = g.countries[1].money;
  step(g, [{ type: 'buildShip', country: 1, state: stateId(g, 'T-A'), kind: 'warship' }]);
  expect(g.countries[1].money).toBe(money - SHIPS.warship.cost);
  runDays(g, SHIPS.warship.buildDays - 2);
  expect(g.ships.filter(s => s.kind === 'warship')).toHaveLength(0);
  runDays(g, 3);
  const w = g.ships.find(s => s.kind === 'warship')!;
  expect(w.owner).toBe(1);
  expect(w.order).toEqual({ type: 'idle', port: stateId(g, 'T-A') });
  const poor = seaWorld({ shipyards: true });
  poor.countries[1].money = 10;
  expect(step(poor, [{ type: 'buildShip', country: 1, state: stateId(poor, 'T-A'), kind: 'warship' }]).events[0]).toMatchObject({ type: 'rejected' });
});

it('a warship ordered to patrol sails to the spot', () => {
  const g = seaWorld({ shipyards: true });
  step(g, [{ type: 'buildShip', country: 1, state: stateId(g, 'T-A'), kind: 'warship' }]);
  runDays(g, SHIPS.warship.buildDays + 1);
  const w = g.ships.find(s => s.kind === 'warship')!;
  const target = portCell(g.map, stateId(g, 'T-B'));
  const r = step(g, [{ type: 'orderShip', country: 1, shipId: w.id, order: { type: 'patrol', cell: target } }]);
  expect(r.events.filter(e => e.type === 'rejected')).toEqual([]);
  runDays(g, 40);
  expect(w.cell).toBe(target);
});

it('ships whose home port is lost move to another port, or are lost if there is none', () => {
  const g = seaWorld({ shipyards: true });
  step(g, [{ type: 'buildShip', country: 1, state: stateId(g, 'T-A'), kind: 'warship' }]);
  runDays(g, SHIPS.warship.buildDays + 1);
  const w = g.ships.find(s => s.kind === 'warship')!;
  declareWarRaw(g, 1, 2);
  occupy(g, 2, stateTiles(g, 'T-A'));
  runDays(g, 2);
  expect(w.order).toEqual({ type: 'idle', port: stateId(g, 'T-C') });
  occupy(g, 2, stateTiles(g, 'T-C'));
  const events = runDays(g, 2);
  expect(g.ships.some(s => s.id === w.id)).toBe(false);
  expect(events).toContainEqual(expect.objectContaining({ type: 'shipLost', ship: w.id }));
  void setTile;
});
