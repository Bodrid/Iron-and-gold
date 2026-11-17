import { it, expect } from 'vitest';
import { makeGame, occupy, runDays, stateId, stateTiles } from '../testing';
import { step } from '../step';
import { atWar, startWar, warScore } from '../war';
import { changeRelation, relation } from './relations';
import type { GameState } from '../types';

const world = (): GameState => {
  const g = makeGame({ rows: ['AAABBBEEECCCDDD', 'AAABBBEEECCCDDD'], owners: { A: 'XXX', B: 'YYY', E: 'YYY', C: 'ZZZ', D: 'QQQ' }, population: 2_000_000, money: 1e6 });
  for (const c of g.countries.slice(1)) { c.troops = 10_000; c.maxTroops = 20_000; }
  return g;
};
const ally = (g: GameState, a: number, b: number) => { changeRelation(g, a, b, 60 - relation(g, a, b)); step(g, [{ type: 'proposeTreaty', country: a, target: b, kind: 'alliance' }]); };

it('a country allied to both sides stays out', () => {
  const g = world();
  ally(g, 1, 3); ally(g, 3, 2);
  step(g, [{ type: 'startPlay', country: 1, target: 2, demands: [{ kind: 'reparations' }] }]);
  expect(g.plays[0].sideA).toEqual([1]);
  expect(g.plays[0].sideB).toEqual([2]);
});

it('holding all goal states gives about 100, dominating goes beyond', () => {
  const g = world();
  const w = startWar(g, [1], [2], [{ kind: 'state', state: stateId(g, 'T-B') }], []);
  expect(warScore(g, w, 1)).toBeLessThan(40);
  occupy(g, 1, stateTiles(g, 'T-B'));
  const goal = warScore(g, w, 1);
  expect(goal).toBeGreaterThan(80);
  occupy(g, 1, stateTiles(g, 'T-E'));
  w.casualties = [100, 5000];
  expect(warScore(g, w, 1)).toBeGreaterThan(120);
});

it('a minor member can make a separate peace and leave the war', () => {
  const g = world();
  const w = startWar(g, [1, 4], [2], [], []);
  occupy(g, 4, stateTiles(g, 'T-E').slice(0, 2));
  const r = step(g, [{ type: 'separatePeace', country: 4, warId: w.id }]);
  expect(r.events.filter(e => e.type === 'rejected')).toEqual([]);
  expect(atWar(g, 4, 2)).toBeUndefined();
  expect(atWar(g, 1, 2)).toBeDefined();
  expect(g.controller[stateTiles(g, 'T-E')[0]]).toBe(2);
  expect(step(g, [{ type: 'separatePeace', country: 1, warId: w.id }]).events[0]).toMatchObject({ type: 'rejected', reason: 'leader' });
  runDays(g, 1);
});
