import { it, expect } from 'vitest';
import { step } from './step';
import { makeGame, giveTiles, runDays } from './testing';
import { computeScores } from './victory';
import { setTile } from './control';

it('wins at 50% of land', () => {
  const g = makeGame({ rows: ['AABBBBBB', 'AABBBBBB'], owners: { A: 'XXX' } });
  giveTiles(g, 1, Math.ceil(g.map.landTiles / 2));
  const r = step(g, []);
  expect(r.events).toContainEqual({ type: 'gameOver', kind: 'victory' });
  expect(g.outcome?.kind).toBe('victory');
});

it('ends at the end date', () => {
  const g = makeGame({ rows: ['ABBB'], owners: { A: 'XXX', B: 'YYY' } });
  g.tick = g.endTick;
  expect(step(g, []).events).toContainEqual({ type: 'gameOver', kind: 'endDate' });
});

it('defeat when the player is eliminated', () => {
  const g = makeGame();
  for (let t = 0; t < g.owner.length; t++) if (g.owner[t] === 1) setTile(g, t, 2, 2, []);
  const events = runDays(g, 1);
  expect(events).toContainEqual({ type: 'gameOver', kind: 'defeat' });
});

it('scores rank a stronger country first', () => {
  const g = makeGame();
  g.countries[1].gdp = 100; g.countries[2].gdp = 50; g.countries[1].sol = 10; g.countries[2].sol = 10;
  g.countries[1].population = 2e6; g.countries[2].population = 1e6;
  const rows = computeScores(g);
  expect(rows[0].tag).toBe('XXX');
  expect(rows[0].score).toBeGreaterThan(rows[1].score);
  expect(rows[0].score).toBeLessThanOrEqual(100);
});

it('emits gameOver only once', () => {
  const g = makeGame({ rows: ['ABBB'], owners: { A: 'XXX', B: 'YYY' } });
  g.tick = g.endTick;
  const a = step(g, []).events.filter(e => e.type === 'gameOver');
  const b = step(g, []).events.filter(e => e.type === 'gameOver');
  expect(a).toHaveLength(1);
  expect(b).toHaveLength(0);
});
