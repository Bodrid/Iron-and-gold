import { it, expect } from 'vitest';
import { nextRandom, randomInt, tileHash } from './rng';

it('rng is reproducible', () => {
  const a = { rng: 42 }, b = { rng: 42 };
  expect([1, 2, 3].map(() => nextRandom(a))).toEqual([1, 2, 3].map(() => nextRandom(b)));
});
it('rng stays in [0,1) and randomInt in range', () => {
  const s = { rng: 7 };
  for (let i = 0; i < 1000; i++) {
    const r = nextRandom(s); expect(r).toBeGreaterThanOrEqual(0); expect(r).toBeLessThan(1);
    const k = randomInt(s, 5); expect(k).toBeGreaterThanOrEqual(0); expect(k).toBeLessThan(5);
  }
});
it('tileHash is stable and spreads', () => {
  expect(tileHash(10, 3)).toBe(tileHash(10, 3));
  expect(tileHash(10, 3)).not.toBe(tileHash(11, 3));
});
