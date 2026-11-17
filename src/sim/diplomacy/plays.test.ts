import { it, expect } from 'vitest';
import { makeGame, runDays, stateId } from '../testing';
import { step } from '../step';
import { atWar } from '../war';
import { changeRelation, relation } from './relations';
import type { GameState } from '../types';

// XXX | YYY | ZZZ | QQQ in a row; YYY has two states (B, E).
const world = (): GameState => {
  const g = makeGame({ rows: ['AAABBBEEECCCDDD', 'AAABBBEEECCCDDD'], owners: { A: 'XXX', B: 'YYY', E: 'YYY', C: 'ZZZ', D: 'QQQ' }, population: 2_000_000, money: 1e6 });
  for (const c of g.countries.slice(1)) { c.troops = 10_000; c.maxTroops = 20_000; }
  return g;
};
const demandB = (g: GameState) => [{ kind: 'state' as const, state: stateId(g, 'T-B') }];
const sign = (g: GameState, a: number, b: number) => { changeRelation(g, a, b, 60 - relation(g, a, b)); step(g, [{ type: 'proposeTreaty', country: a, target: b, kind: 'alliance' }]); };

it('a play counts down, allies join their side, then war starts with those sides', () => {
  const g = world();
  sign(g, 2, 3);                                   // YYY–ZZZ alliance (AI accepts)
  const r = step(g, [{ type: 'startPlay', country: 1, target: 2, demands: demandB(g) }]);
  expect(r.events.filter(e => e.type === 'rejected')).toEqual([]);
  const play = g.plays[0];
  expect(play.sideB).toEqual([2, 3]);
  expect(atWar(g, 1, 2)).toBeUndefined();          // no surprise attack
  runDays(g, 61);
  expect(g.plays).toHaveLength(0);
  const w = atWar(g, 1, 2)!;
  expect(w.sideA).toEqual([1]);
  expect(w.sideB.sort()).toEqual([2, 3]);
  expect(atWar(g, 1, 3)).toBeDefined();
  expect(w.goals).toEqual(demandB(g));
  expect(g.countries[1].infamy).toBeGreaterThan(0);
});

it('a much weaker target backs down and the demands are granted without war', () => {
  const g = world();
  for (const k of ['T-B', 'T-E']) g.states[stateId(g, k)].population = 50_000;
  g.countries[2].population = 100_000; g.countries[2].troops = 500; g.countries[2].maxTroops = 1000;
  step(g, [{ type: 'startPlay', country: 1, target: 2, demands: demandB(g) }]);
  runDays(g, 61);
  expect(atWar(g, 1, 2)).toBeUndefined();
  expect(g.states[stateId(g, 'T-B')].owner).toBe(1);
});

it('the player can back down from a play against them', () => {
  const g = world();
  step(g, [{ type: 'startPlay', country: 2, target: 1, demands: [{ kind: 'state', state: stateId(g, 'T-A') }] }]);
  expect(g.plays).toHaveLength(1);
  step(g, [{ type: 'backDown', country: 1, playId: g.plays[0].id }]);
  expect(g.plays).toHaveLength(0);
  expect(g.states[stateId(g, 'T-A')].owner).toBe(2);
});

it('rules: state demands must belong to the target, one play per target, no joining both sides, no war declarations', () => {
  const g = world();
  expect(step(g, [{ type: 'startPlay', country: 1, target: 2, demands: [{ kind: 'state', state: stateId(g, 'T-C') }] }]).events[0]).toMatchObject({ type: 'rejected' });
  step(g, [{ type: 'startPlay', country: 1, target: 2, demands: demandB(g) }]);
  expect(step(g, [{ type: 'startPlay', country: 4, target: 2, demands: demandB(g) }]).events[0]).toMatchObject({ type: 'rejected' });
  const id = g.plays[0].id;
  step(g, [{ type: 'joinPlay', country: 4, playId: id, side: 'A' }]);
  expect(g.plays[0].sideA).toContain(4);
  expect(step(g, [{ type: 'joinPlay', country: 4, playId: id, side: 'B' }]).events[0]).toMatchObject({ type: 'rejected' });
  expect(step(g, [{ type: 'declareWar', country: 1, target: 3 } as any]).events[0]).toMatchObject({ type: 'rejected', reason: 'unknown command' });
});

it('a play whose target dies is cancelled', () => {
  const g = world();
  step(g, [{ type: 'startPlay', country: 1, target: 4, demands: [{ kind: 'reparations' }] }]);
  g.countries[4].alive = false;
  runDays(g, 2);
  expect(g.plays).toHaveLength(0);
  expect(atWar(g, 1, 4)).toBeUndefined();
});
