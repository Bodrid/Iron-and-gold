import { it, expect } from 'vitest';
import { makeGame, runDays } from '../testing';
import { step } from '../step';
import { relation, level, diploCapacity } from './relations';

// Three countries in a row: XXX borders YYY, YYY borders ZZZ.
const trio = () => makeGame({ rows: ['AAABBBCCC', 'AAABBBCCC'], owners: { A: 'XXX', B: 'YYY', C: 'ZZZ' }, population: 2_000_000, money: 1e6 });

it('relations are symmetric, start from the baseline, and neighbours are cooler than strangers', () => {
  const g = trio();
  expect(relation(g, 1, 2)).toBe(relation(g, 2, 1));
  expect(relation(g, 1, 2)).toBeLessThan(relation(g, 1, 3));
  expect(level(-60)).toBe('hostile'); expect(level(-20)).toBe('cold'); expect(level(0)).toBe('neutral'); expect(level(20)).toBe('cordial'); expect(level(60)).toBe('friendly');
});

it('improving relations raises them month by month and costs money', () => {
  const g = trio(), control = trio();
  const before = relation(g, 1, 2);
  const r = step(g, [{ type: 'improveRelations', country: 1, target: 2 }]);
  step(control, []);
  expect(r.events.filter(e => e.type === 'rejected')).toEqual([]);
  runDays(g, 95); runDays(control, 95);
  expect(relation(g, 1, 2)).toBeGreaterThan(before + 6);
  expect(control.countries[1].money - g.countries[1].money).toBeCloseTo(3 * 500, 0);
});

it('worsening relations lowers them; stopping lets them drift back', () => {
  const g = trio();
  const base = relation(g, 1, 3);
  step(g, [{ type: 'worsenRelations', country: 1, target: 3 }]);
  runDays(g, 95);
  expect(relation(g, 1, 3)).toBeLessThan(base - 6);
  step(g, [{ type: 'stopDiploAction', country: 1, target: 3 }]);
  runDays(g, 400);
  expect(Math.abs(relation(g, 1, 3) - base)).toBeLessThanOrEqual(3);
});

it('capacity limits active actions', () => {
  const g = makeGame({ rows: ['ABCDEF'], owners: { A: 'XXX', B: 'YYY', C: 'ZZZ', D: 'QQQ', E: 'RRR', F: 'SSS' }, population: 1_000_000 });
  expect(diploCapacity(g, 1)).toBe(2);
  const r = step(g, [2, 3, 4].map(t => ({ type: 'improveRelations' as const, country: 1, target: t })));
  expect(r.events.filter(e => e.type === 'rejected').map(e => (e as any).reason)).toEqual(['noCapacity']);
  expect(step(g, [{ type: 'improveRelations', country: 1, target: 1 }]).events[0]).toMatchObject({ type: 'rejected' });
});
