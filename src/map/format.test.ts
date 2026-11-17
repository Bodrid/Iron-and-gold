import { it, expect } from 'vitest';
import { encodeGrid, decodeGrid, COAST_BIT, RIVER_BIT, TERRAIN_MASK, Terrain } from './format';
import { makeTestWorld } from './testWorld';

it('round-trips a grid through encode/decode', () => {
  const w = makeTestWorld(['..AA', '.ABB', 'BBB.']);
  const back = decodeGrid(encodeGrid(w));
  expect(back.width).toBe(4);
  expect(back.height).toBe(3);
  expect(Array.from(back.stateOf)).toEqual(Array.from(w.stateOf));
  expect(Array.from(back.terrain)).toEqual(Array.from(w.terrain));
});

it('rejects bad magic', () => {
  expect(() => decodeGrid(new Uint8Array(16))).toThrow(/IGM1/);
});

it('keeps the river bit separate from the terrain type', () => {
  const w = makeTestWorld(['AA']);
  w.terrain[0] |= RIVER_BIT;
  const back = decodeGrid(encodeGrid(w));
  expect(back.terrain[0] & TERRAIN_MASK).toBe(Terrain.Plains);
  expect(back.terrain[0] & RIVER_BIT).toBeTruthy();
  expect(COAST_BIT).toBe(0x40);
});
