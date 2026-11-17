import { it, expect } from 'vitest';
import { makeGame, runDays } from '../testing';
import { step } from '../step';
import { changeRelation, relation } from './relations';
import { hasTreaty } from './treaties';
import { seaWorld } from '../naval/testWorlds';

const trio = () => makeGame({ rows: ['AAABBBCCC', 'AAABBBCCC'], owners: { A: 'XXX', B: 'YYY', C: 'ZZZ' }, population: 2_000_000, money: 1e6 });

it('an alliance needs Cordial relations; the AI accepts once they are good', () => {
  const g = trio();
  const r = step(g, [{ type: 'proposeTreaty', country: 1, target: 3, kind: 'alliance' }]);
  expect(r.events[0]).toMatchObject({ type: 'rejected', reason: 'needsCordial' });
  changeRelation(g, 1, 3, 60 - relation(g, 1, 3));
  const r2 = step(g, [{ type: 'proposeTreaty', country: 1, target: 3, kind: 'alliance' }]);
  expect(r2.events.filter(e => e.type === 'rejected')).toEqual([]);
  expect(hasTreaty(g, 1, 3, 'alliance')).toBe(true);
});

it('offers to the player wait for an answer', () => {
  const g = trio();
  changeRelation(g, 3, 1, 60 - relation(g, 1, 3));
  const r = step(g, [{ type: 'proposeTreaty', country: 3, target: 1, kind: 'defensivePact' }]);
  expect(r.events).toContainEqual({ type: 'treatyOffered', from: 3, to: 1, kind: 'defensivePact' });
  expect(hasTreaty(g, 1, 3, 'defensivePact')).toBe(false);
  step(g, [{ type: 'respondTreaty', country: 1, from: 3, kind: 'defensivePact', accept: true }]);
  expect(hasTreaty(g, 1, 3, 'defensivePact')).toBe(true);
});

it('a guarantee needs the guarantor to be stronger', () => {
  const g = trio();
  changeRelation(g, 1, 3, 30 - relation(g, 1, 3));
  g.countries[1].troops = 100; g.countries[3].troops = 10_000;
  expect(step(g, [{ type: 'proposeTreaty', country: 1, target: 3, kind: 'guarantee' }]).events[0]).toMatchObject({ reason: 'notStronger' });
  g.countries[1].troops = 100_000;
  step(g, [{ type: 'proposeTreaty', country: 1, target: 3, kind: 'guarantee' }]);
  expect(hasTreaty(g, 1, 3, 'guarantee')).toBe(true);
});

it('an embargo ends trade routes and blocks new ones; a trade agreement raises earnings', () => {
  const g = seaWorld();
  g.countries[1].stockpile.grain = 1e7; g.countries[2].stockpile.grain = 0;
  runDays(g, 32);
  expect(g.tradeRoutes).toHaveLength(1);
  step(g, [{ type: 'proposeTreaty', country: 2, target: 1, kind: 'embargo' }]);
  runDays(g, 62);
  expect(g.tradeRoutes.filter(r => [r.exporter, r.importer].sort().join() === '1,2')).toHaveLength(0);

  const a = seaWorld(), b = seaWorld();
  for (const g2 of [a, b]) { g2.countries[1].stockpile.grain = 1e7; g2.countries[2].stockpile.grain = 0; }
  changeRelation(a, 1, 2, 30 - relation(a, 1, 2));
  step(a, [{ type: 'proposeTreaty', country: 1, target: 2, kind: 'tradeAgreement' }]);
  expect(hasTreaty(a, 1, 2, 'tradeAgreement')).toBe(true);
  runDays(a, 62); runDays(b, 62);
  expect(a.countries[1].tradeIncome).toBeGreaterThan(b.countries[1].tradeIncome * 1.2);
});

it('cancelling an alliance hurts relations', () => {
  const g = trio();
  changeRelation(g, 1, 3, 60 - relation(g, 1, 3));
  step(g, [{ type: 'proposeTreaty', country: 1, target: 3, kind: 'alliance' }]);
  const id = g.treaties[0].id, before = relation(g, 1, 3);
  step(g, [{ type: 'cancelTreaty', country: 1, treatyId: id }]);
  expect(g.treaties).toHaveLength(0);
  expect(relation(g, 1, 3)).toBeLessThanOrEqual(before - 20);
});

it('a trade agreement between AI countries lapses once no route links them', () => {
  const g = makeGame({ rows: ['AABBCC'], owners: { A: 'XXX', B: 'YYY', C: 'ZZZ' } });
  g.treaties.push({ id: g.nextId++, kind: 'tradeAgreement', a: 2, b: 3, since: 0 }, { id: g.nextId++, kind: 'tradeAgreement', a: 1, b: 2, since: 0 });
  runDays(g, 35);
  expect(g.treaties.some(t => t.a === 2 && t.b === 3)).toBe(false);
  expect(g.treaties.some(t => t.a === 1 && t.b === 2)).toBe(true);   // the player's stays
});
