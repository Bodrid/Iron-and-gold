import { it, expect } from 'vitest';
import { makeGame, occupy, stateId, stateTiles } from '../testing';
import { step } from '../step';
import { atWar, startWar } from '../war';
import { peacePoints, termsCost } from './peace';
import type { GameState } from '../types';

// XXX (A) vs YYY (B, E, F): the war goal is B.
const world = (): GameState => {
  const g = makeGame({ rows: ['AAABBBEEEFFF', 'AAABBBEEEFFF'], owners: { A: 'XXX', B: 'YYY', E: 'YYY', F: 'YYY' }, population: 2_000_000, money: 1e6 });
  for (const c of g.countries.slice(1)) { c.troops = 10_000; c.maxTroops = 20_000; }
  return g;
};
const goalWar = (g: GameState) => startWar(g, [1], [2], [{ kind: 'state', state: stateId(g, 'T-B') }], []);
const st = (g: GameState, k: string) => ({ kind: 'state' as const, state: stateId(g, k) });

it('a dominating winner can take more than the war goal', () => {
  const g = world();
  const w = goalWar(g);
  occupy(g, 1, [...stateTiles(g, 'T-B'), ...stateTiles(g, 'T-E')]);
  w.casualties = [500, 8000];
  const pts = peacePoints(g, w, 1);
  expect(pts.score).toBeGreaterThan(100);
  expect(pts.available).toBeGreaterThan(termsCost(g, w, 1, [st(g, 'T-B')]));
  const r = step(g, [{ type: 'proposePeace', country: 1, warId: w.id, terms: { demands: [st(g, 'T-B'), st(g, 'T-E')] } }]);
  expect(r.events.filter(e => e.type === 'rejected')).toEqual([]);
  expect(atWar(g, 1, 2)).toBeUndefined();
  expect(g.states[stateId(g, 'T-B')].owner).toBe(1);
  expect(g.states[stateId(g, 'T-E')].owner).toBe(1);
});

it('heavy losses of your own add peace points', () => {
  const g = world();
  const w = goalWar(g);
  occupy(g, 1, stateTiles(g, 'T-B'));
  w.casualties = [0, 0];
  const light = peacePoints(g, w, 1).available;
  w.casualties = [15_000, 15_000];
  expect(peacePoints(g, w, 1).available).toBeGreaterThan(light);
});

it('the AI refuses terms the war does not justify', () => {
  const g = world();
  const w = goalWar(g);
  const r = step(g, [{ type: 'proposePeace', country: 1, warId: w.id, terms: { demands: [st(g, 'T-B'), st(g, 'T-E'), st(g, 'T-F')] } }]);
  expect(r.events).toContainEqual(expect.objectContaining({ type: 'peaceRefused', from: 1, to: 2 }));
  expect(atWar(g, 1, 2)).toBeDefined();
});

it('the AI takes a white peace when the war is even, and the player can accept a concession', () => {
  const g = world();
  const w = goalWar(g);
  step(g, [{ type: 'proposePeace', country: 1, warId: w.id, terms: { demands: [], white: true } }]);
  expect(atWar(g, 1, 2)).toBeUndefined();

  const h = world();
  const w2 = startWar(h, [2], [1], [st(h, 'T-A')], []);
  const r = step(h, [{ type: 'proposePeace', country: 2, warId: w2.id, terms: { demands: [{ kind: 'reparations' }], give: true } }]);
  expect(r.events).toContainEqual(expect.objectContaining({ type: 'peaceOffered', from: 2, to: 1 }));
  step(h, [{ type: 'respondPeace', country: 1, from: 2, accept: true }]);
  expect(atWar(h, 1, 2)).toBeUndefined();
  expect(h.reparations).toContainEqual(expect.objectContaining({ from: 2, to: 1 }));
});

it('terms that no longer make sense are skipped and the rest applied', () => {
  const g = world();
  const w = goalWar(g);
  occupy(g, 1, [...stateTiles(g, 'T-B'), ...stateTiles(g, 'T-E'), ...stateTiles(g, 'T-F')]);
  w.casualties = [100, 9000];
  // E changes hands to someone else before the deal lands.
  for (const t of stateTiles(g, 'T-E')) { g.owner[t] = 1; g.controller[t] = 1; }
  const { rebuildControl } = { rebuildControl: (s: GameState) => s };
  void rebuildControl;
  const r = step(g, [{ type: 'proposePeace', country: 1, warId: w.id, terms: { demands: [st(g, 'T-B'), { kind: 'reparations' }] } }]);
  expect(r.events.filter(e => e.type === 'rejected')).toEqual([]);
  expect(g.states[stateId(g, 'T-B')].owner).toBe(1);
  expect(g.reparations).toHaveLength(1);
});

// ---- review fixes: who is winning matters ----
it('a losing side cannot make the winning AI pay', () => {
  const g = world();
  const w = goalWar(g);
  occupy(g, 2, stateTiles(g, 'T-A').slice(0, 3));           // the AI defender is ahead
  w.casualties = [9000, 500];                                  // and the attacker bled
  const r = step(g, [{ type: 'proposePeace', country: 1, warId: w.id, terms: { demands: [{ kind: 'reparations' }] } }]);
  expect(r.events).toContainEqual(expect.objectContaining({ type: 'peaceRefused', from: 1, to: 2 }));
  expect(atWar(g, 1, 2)).toBeDefined();
});

it('nothing is won on day 0: no free open market and no free escape from an AI play', () => {
  const g = world();
  const w = startWar(g, [1], [2], [{ kind: 'openMarket' }], []);
  const r = step(g, [{ type: 'proposePeace', country: 1, warId: w.id, terms: { demands: [{ kind: 'openMarket' }] } }]);
  expect(r.events).toContainEqual(expect.objectContaining({ type: 'peaceRefused' }));

  // The AI (2) started a play against the player (1) that became a war: white peace on day 0 is refused.
  const h = world();
  const w2 = startWar(h, [2], [1], [st(h, 'T-A')], []);
  const r2 = step(h, [{ type: 'proposePeace', country: 1, warId: w2.id, terms: { demands: [], white: true } }]);
  expect(r2.events).toContainEqual(expect.objectContaining({ type: 'peaceRefused', from: 1, to: 2 }));
  expect(atWar(h, 1, 2)).toBeDefined();
});

it('war goals are priced so that holding them leaves points for more', () => {
  const g = world();
  const w = startWar(g, [1], [2], [st(g, 'T-B'), { kind: 'puppet' }, { kind: 'reparations' }], []);
  occupy(g, 1, [...stateTiles(g, 'T-B'), ...stateTiles(g, 'T-E'), ...stateTiles(g, 'T-F')]);
  w.casualties = [0, 0];
  expect(peacePoints(g, w, 1).available).toBeGreaterThan(termsCost(g, w, 1, w.goals));
});
