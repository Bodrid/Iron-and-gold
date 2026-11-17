import { it, expect } from 'vitest';
import { makeGame, runDays } from './testing';

it('troops refill toward max', () => {
  const g = makeGame();
  const c = g.countries[1];
  c.troops = 0; c.stockpile.arms = 1e9;
  runDays(g, 30);
  expect(c.troops).toBeGreaterThan(0);
  expect(c.troops).toBeLessThanOrEqual(c.maxTroops);
});

it('refill is slower without arms', () => {
  const g = makeGame();
  const [a, b] = [g.countries[1], g.countries[2]];
  a.troops = 0; b.troops = 0; a.stockpile.arms = 1e9; b.stockpile.arms = 0;
  runDays(g, 30);
  expect(b.troops).toBeLessThan(a.troops);
  expect(a.stockpile.arms).toBeLessThan(1e9);
});

it('max troops are recomputed daily from population', () => {
  const g = makeGame();
  const before = g.countries[1].maxTroops;
  g.states[1].population *= 10; g.countries[1].population += g.states[1].population * 0.9;
  runDays(g, 1);
  expect(g.countries[1].maxTroops).toBeGreaterThan(before * 5);
});
