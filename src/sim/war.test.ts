import { it, expect } from 'vitest';
import { step } from './step';
import { makeGame, occupy, runTicks, runDays, stateTiles, stateId } from './testing';
import { declareWarRaw, warScore } from './war';
import { TICKS_PER_DAY } from './calendar';
import type { SimEvent } from './types';
import { rebuildControl } from './control';

const threeStates = () => makeGame({ rows: ['AABBCC'], owners: { A: 'XXX', B: 'YYY', C: 'YYY' } });

it('declaring war emits an event and allows attacks', () => {
  const g = makeGame();
  const r = step(g, [{ type: 'declareWar', country: 1, target: 2 }]);
  expect(r.events).toContainEqual({ type: 'warDeclared', a: 1, b: 2 });
  expect(g.wars).toHaveLength(1);
});

it('rejects war on self, on the dead, and duplicate wars', () => {
  const g = makeGame();
  g.countries[2].alive = false;
  const r = step(g, [{ type: 'declareWar', country: 1, target: 1 }, { type: 'declareWar', country: 1, target: 2 }]);
  expect(r.events.filter(e => e.type === 'rejected')).toHaveLength(2);
  const h = makeGame();
  const r2 = step(h, [{ type: 'declareWar', country: 1, target: 2 }, { type: 'declareWar', country: 2, target: 1 }]);
  expect(r2.events.filter(e => e.type === 'rejected')).toHaveLength(1);
});

it('war score rises with occupation', () => {
  const g = threeStates();
  const w = declareWarRaw(g, 1, 2);
  const before = warScore(g, w, 1);
  occupy(g, 1, stateTiles(g, 'T-B'));
  expect(warScore(g, w, 1)).toBeGreaterThan(before);
  expect(warScore(g, w, 1)).toBeLessThanOrEqual(100);
});

it('peace transfers majority-occupied states and returns the rest', () => {
  const g = threeStates();
  declareWarRaw(g, 1, 2);
  occupy(g, 1, stateTiles(g, 'T-B'));
  occupy(g, 1, stateTiles(g, 'T-C').slice(0, 1));
  const r = step(g, [{ type: 'offerPeace', country: 1, target: 2 }]);
  expect(r.events).toContainEqual(expect.objectContaining({ type: 'peace', transferred: [stateId(g, 'T-B')] }));
  expect(g.states[stateId(g, 'T-B')].owner).toBe(1);
  expect(g.controller[stateTiles(g, 'T-C')[0]]).toBe(2);
  expect(g.wars).toHaveLength(0);
});

it('a country that loses all land is eliminated cleanly', () => {
  const g = makeGame({ rows: ['AAAAABBBBB', 'AAAAABBBBB'], owners: { A: 'XXX', B: 'YYY' }, population: 20_000_000 });
  declareWarRaw(g, 1, 2);
  g.countries[1].troops = 1e6; g.countries[2].troops = 0;
  runTicks(g, 100, [{ type: 'attack', country: 1, target: 2, ratio: 1 }]);
  let events: SimEvent[] = step(g, [{ type: 'offerPeace', country: 1, target: 2 }]).events;
  events = events.concat(runTicks(g, TICKS_PER_DAY));
  expect(g.countries[2].alive).toBe(false);
  expect(events).toContainEqual({ type: 'eliminated', country: 2 });
  expect(g.wars).toHaveLength(0);
  expect(g.attacks.some(a => a.attacker === 2 || a.target === 2)).toBe(false);
  expect(() => runDays(g, 5)).not.toThrow();
});

it('eliminating a country mid-war ends its wars and attacks', () => {
  const g = makeGame({ rows: ['AAAABBBBCCCC'], owners: { A: 'XXX', B: 'YYY', C: 'ZZZ' } });
  declareWarRaw(g, 2, 3);
  g.countries[2].troops = 5000;
  step(g, [{ type: 'attack', country: 2, target: 3, ratio: 0.5 }]);
  for (const t of stateTiles(g, 'T-B')) { g.owner[t] = 1; g.controller[t] = 1; }
  // simulate land loss through the normal path
  rebuildControl(g);
  runDays(g, 1);
  expect(g.countries[2].alive).toBe(false);
  expect(g.wars).toHaveLength(0);
  expect(g.attacks).toHaveLength(0);
});

it('player receives peace offers as events and can refuse', () => {
  const g = makeGame();
  declareWarRaw(g, 1, 2);
  const r = step(g, [{ type: 'offerPeace', country: 2, target: 1 }]);
  expect(r.events).toContainEqual({ type: 'peaceOffered', from: 2, to: 1 });
  const r2 = step(g, [{ type: 'respondPeace', country: 1, from: 2, accept: false }]);
  expect(r2.events).toContainEqual({ type: 'peaceRefused', from: 2, to: 1 });
  expect(g.wars).toHaveLength(1);
  expect(g.peaceOffers).toHaveLength(0);
});

it('player can accept a peace offer', () => {
  const g = makeGame();
  declareWarRaw(g, 1, 2);
  step(g, [{ type: 'offerPeace', country: 2, target: 1 }]);
  const r = step(g, [{ type: 'respondPeace', country: 1, from: 2, accept: true }]);
  expect(r.events.some(e => e.type === 'peace')).toBe(true);
  expect(g.wars).toHaveLength(0);
});

it('peace offers expire after 30 days', () => {
  const g = makeGame();
  declareWarRaw(g, 1, 2);
  step(g, [{ type: 'offerPeace', country: 2, target: 1 }]);
  runDays(g, 31);
  expect(g.peaceOffers).toHaveLength(0);
});
