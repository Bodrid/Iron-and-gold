import { it, expect } from 'vitest';
import { coalesceTiles } from './protocol';

it('coalesces 100k changes into one deduplicated message', () => {
  const owner = new Uint16Array(2400 * 907), ctrl = new Uint16Array(owner.length);
  const changed: number[] = [];
  for (let i = 0; i < 100_000; i++) changed.push(i % 50_000);
  owner[7] = 3; ctrl[7] = 5;
  const m = coalesceTiles(changed, owner, ctrl);
  expect(m.idx.length).toBe(50_000);
  expect(m.val.length).toBe(50_000);
  const k = Array.from(m.idx).indexOf(7);
  expect(m.val[k]).toBe(3 | (5 << 16));
  expect(coalesceTiles([], owner, ctrl).idx.length).toBe(0);
});
