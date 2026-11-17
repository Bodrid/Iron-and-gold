import { it, expect } from 'vitest';
import { step } from './step';
import { hashState } from './hash';
import { makeGame } from './testing';

it('same seed and commands give the same hash after 500 ticks', () => {
  const run = () => { const g = makeGame(); for (let i = 0; i < 500; i++) step(g, []); return hashState(g); };
  expect(run()).toBe(run());
});
it('different seeds give different rng state', () => {
  const a = makeGame({ seed: 1 }), b = makeGame({ seed: 2 });
  expect(a.rng).not.toBe(b.rng);
});
it('rejects commands for countries that do not exist', () => {
  const g = makeGame();
  const r = step(g, [{ type: 'declareWar', country: 99, target: 1 }]);
  expect(r.events[0]).toMatchObject({ type: 'rejected' });
});
it('advances the tick and flags new days and months', () => {
  const g = makeGame();
  const first = step(g, []);
  expect(first.newDay).toBe(true);
  expect(g.tick).toBe(1);
  expect(step(g, []).newDay).toBe(false);
  let months = 0;
  for (let i = 2; i < 4 * 62; i++) if (step(g, []).newMonth) months++;
  expect(months).toBe(2); // 1 Feb and 1 Mar
});
