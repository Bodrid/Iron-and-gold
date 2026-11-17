import { it, expect } from 'vitest';
import { makeGame, runDays } from '../testing';
import { relation, changeRelation } from './relations';
import { addInfamy, coalitionAgainst, coalitionDefenders } from './infamy';

const four = () => makeGame({ rows: ['AAABBBCCCDDD'], owners: { A: 'XXX', B: 'YYY', C: 'ZZZ', D: 'QQQ' }, population: 2_000_000, ai: false });

it('infamy decays each month', () => {
  const g = four();
  addInfamy(g, 1, 10);
  runDays(g, 62);
  expect(g.countries[1].infamy).toBeCloseTo(9, 5);
});

it('above 25 infamy everyone cools towards you', () => {
  const g = four(), h = four();
  addInfamy(g, 1, 40);
  runDays(g, 200); runDays(h, 200);
  expect(relation(g, 1, 4)).toBeLessThan(relation(h, 1, 4));
});

it('above 50, countries that dislike you form a coalition that defends its members, and it dissolves later', () => {
  const g = four();
  changeRelation(g, 3, 1, -40 - relation(g, 1, 3));
  changeRelation(g, 4, 1, -40 - relation(g, 1, 4));
  addInfamy(g, 1, 60);
  runDays(g, 32);
  const c = coalitionAgainst(g, 1)!;
  expect(c.members.sort()).toEqual([3, 4]);
  expect(coalitionDefenders(g, 1, 3)).toEqual([4]);
  expect(coalitionDefenders(g, 2, 3)).toEqual([]);
  g.countries[1].infamy = 10;
  runDays(g, 31);
  expect(coalitionAgainst(g, 1)).toBeUndefined();
});
