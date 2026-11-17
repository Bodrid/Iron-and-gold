import { it, expect } from 'vitest';
import { makeTestWorld } from './testWorld';
import { COAST_BIT, TERRAIN_MASK, Terrain } from './format';

it('computes coast bits, neighbors and land count', () => {
  const w = makeTestWorld(['..AA', '.ABB', 'BBB.']);
  expect(w.landTiles).toBe(8);
  expect(w.states[1].key).toBe('T-A');
  expect(w.states[1].neighbors).toEqual([2]);
  expect(w.terrain[2] & COAST_BIT).toBeTruthy();
  expect(w.terrain[0] & TERRAIN_MASK).toBe(Terrain.Sea);
  expect(w.stateOf[0]).toBe(0);
});

it('makes one state per connected lowercase terrain region', () => {
  const w = makeTestWorld(['AAmm.pp', 'AAmm.pp']);
  expect(w.states.slice(1).map(s => s.key)).toEqual(['T-A', 'T-m1', 'T-p1']);
  expect(w.states[2].tiles).toBe(4);
  expect(w.terrain[2] & TERRAIN_MASK).toBe(Terrain.Mountains);
  expect(w.states[1].coastal).toBe(false);
  expect(w.states[2].coastal).toBe(true);
});

it('applies resource overrides', () => {
  const w = makeTestWorld(['AB'], { resources: { 'T-B': { iron: true } } });
  expect(w.states[2].resources.iron).toBe(true);
  expect(w.states[1].resources).toEqual({ coal: false, iron: false, fertility: 1, forest: 0 });
});
