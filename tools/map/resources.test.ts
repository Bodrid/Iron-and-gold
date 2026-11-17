import { it, expect } from 'vitest';
import { assignResources } from './resources';
import { Terrain } from '../../src/map/format';
import type { StateDef } from '../../src/map/format';

const def = (id: number, key: string, modern: string, tiles: number): StateDef => ({ id, key, name: key.slice(4), modern, tiles, coastal: false, centroid: [0, 0], neighbors: [], resources: { coal: false, iron: false, fertility: 0, forest: 0 }, popWeight: 0 });

it('sets fertility and forest from terrain, and applies overrides', () => {
  const w = 4;
  const stateOf = new Uint16Array([1, 1, 2, 2, 1, 1, 2, 2]);
  const terrain = new Uint8Array([Terrain.Plains, Terrain.Plains, Terrain.Forest, Terrain.Mountains, Terrain.Plains, Terrain.Hills, Terrain.Forest, Terrain.Desert]);
  const defs = [def(1, 'DEU-Nordrhein-Westfalen', 'DEU', 4), def(2, 'XXX-Somewhere', 'XXX', 4)];
  assignResources(defs, stateOf, terrain, w, []);
  expect(defs[0].resources.fertility).toBeCloseTo(0.875);
  expect(defs[1].resources.forest).toBeCloseTo(0.5);
  expect(defs[0].resources.coal).toBe(true);
  expect(defs[0].resources.iron).toBe(true);
  expect(defs[0].popWeight).toBeGreaterThan(defs[1].popWeight);
});

it('cities add population weight', () => {
  const stateOf = new Uint16Array([1, 2]);
  const terrain = new Uint8Array([Terrain.Plains, Terrain.Plains]);
  const defs = [def(1, 'AAA-A', 'AAA', 1), def(2, 'AAA-B', 'AAA', 1)];
  assignResources(defs, stateOf, terrain, 2, [{ tile: 1, pop: 4_000_000 }]);
  expect(defs[1].popWeight).toBeGreaterThan(defs[0].popWeight);
});
