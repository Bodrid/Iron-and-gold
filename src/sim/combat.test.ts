import { it, expect } from 'vitest';
import { step } from './step';
import { makeGame, runTicks, tagId } from './testing';
import { declareWarRaw } from './war';
import type { GameState } from './types';

const strip = (c: string, w = 30) => ['AA' + c.repeat(w - 2), 'AA' + c.repeat(w - 2), 'AA' + c.repeat(w - 2)];
const colonyGame = (rows: string[]) => makeGame({ rows, owners: { A: 'XXX' }, unclaimed: ['p', 'm', 'f', 'h', 'd'] });

function tilesTakenAfter(c: string, ticks: number): number {
  const g = colonyGame(strip(c));
  g.countries[1].troops = 1500;   // few enough that mountains use them up first
  runTicks(g, ticks, [{ type: 'attack', country: 1, target: 0, ratio: 0.5 }]);
  return g.countries[1].tiles - 6;
}

function firstTileControlledBy(g: GameState, controller: number, owner: number): number {
  for (let t = 0; t < g.owner.length; t++) if (g.controller[t] === controller && g.owner[t] === owner) return t;
  return -1;
}

it('expanding into unclaimed land takes tiles and spends troops', () => {
  const g = colonyGame(['AAppppp']);
  g.countries[1].troops = 10_000;
  runTicks(g, 40, [{ type: 'attack', country: 1, target: 0, ratio: 0.5 }]);
  expect(g.countries[1].tiles).toBe(7);
  expect(g.countries[1].troops).toBeLessThan(10_000);
  expect(g.attacks).toHaveLength(0);
});

it('mountains are slower than plains', () => {
  expect(tilesTakenAfter('p', 20)).toBeGreaterThan(tilesTakenAfter('m', 20));
});

it('cannot attack another country without a war', () => {
  const g = makeGame();
  const r = step(g, [{ type: 'attack', country: 1, target: 2, ratio: 0.5 }]);
  expect(r.events).toContainEqual(expect.objectContaining({ type: 'rejected' }));
});

it('captured enemy tiles are occupied, not owned', () => {
  const g = makeGame({ rows: ['AAAAABBBBB', 'AAAAABBBBB'] , owners: { A: 'XXX', B: 'YYY' } });
  declareWarRaw(g, 1, 2);
  g.countries[1].troops = 50_000; g.countries[2].troops = 100;
  runTicks(g, 30, [{ type: 'attack', country: 1, target: 2, ratio: 1 }]);
  expect(firstTileControlledBy(g, 1, 2)).toBeGreaterThanOrEqual(0);
  expect(g.countries[2].tiles).toBe(10);
  expect(g.countries[1].tiles).toBe(10);
});

it('defenders lose troops and the war records casualties', () => {
  const g = makeGame({ rows: ['AAAAABBBBB', 'AAAAABBBBB'], owners: { A: 'XXX', B: 'YYY' } });
  declareWarRaw(g, 1, 2);
  g.countries[1].troops = 50_000; g.countries[2].troops = 5_000;
  runTicks(g, 10, [{ type: 'attack', country: 1, target: 2, ratio: 1 }]);
  expect(g.countries[2].troops).toBeLessThan(5_000);
  expect(g.wars[0].casualties[0]).toBeGreaterThan(0);
  expect(g.wars[0].casualties[1]).toBeGreaterThan(0);
});

it('rapid duplicate attacks never spend more troops than the pool', () => {
  const g = colonyGame(['AAppppp']);
  g.countries[1].troops = 1000;
  step(g, Array(10).fill({ type: 'attack', country: 1, target: 0, ratio: 1 }));
  expect(g.countries[1].troops).toBeGreaterThanOrEqual(0);
  expect(g.attacks.filter(a => a.attacker === 1).length).toBeLessThanOrEqual(1);
  const inField = g.attacks.reduce((s, a) => s + a.troops, 0);
  expect(inField + g.countries[1].troops).toBeLessThanOrEqual(1000);
});

it('leftover troops return when an attack runs out of frontier', () => {
  const g = makeGame({ rows: ['AAppp'], owners: { A: 'XXX' }, unclaimed: ['p'], population: 50_000_000 });
  g.countries[1].troops = 100_000;
  runTicks(g, 10, [{ type: 'attack', country: 1, target: 0, ratio: 1 }]);
  expect(g.attacks).toHaveLength(0);
  expect(g.countries[1].troops).toBeGreaterThan(90_000);
});

it('rejects bad ratios and attacks without a border', () => {
  const g = colonyGame(['AA.ppp']);
  g.countries[1].troops = 10_000;
  const r = step(g, [{ type: 'attack', country: 1, target: 0, ratio: 0.5 }, { type: 'attack', country: 1, target: 0, ratio: 5 }]);
  expect(r.events.filter(e => e.type === 'rejected')).toHaveLength(2);
  expect(tagId(g, 'XXX')).toBe(1);
});

it('cancelling an attack returns its troops', () => {
  const g = colonyGame(strip('m', 60));
  g.countries[1].troops = 10_000;
  step(g, [{ type: 'attack', country: 1, target: 0, ratio: 0.5 }]);
  const id = g.attacks[0].id;
  step(g, [{ type: 'cancelAttack', country: 1, attackId: id }]);
  expect(g.attacks).toHaveLength(0);
  expect(g.countries[1].troops).toBeGreaterThan(9_000);
});
