import { it, expect } from 'vitest';
import { buildTerrain } from './terrain';
import { makeProjection } from './project';
import { COAST_BIT, RIVER_BIT, TERRAIN_MASK, Terrain } from '../../src/map/format';

const poly = (coords: number[][], props: Record<string, unknown> = {}) => ({ type: 'Feature' as const, properties: props, geometry: { type: 'Polygon' as const, coordinates: [coords] } });
const fc = (features: any[]) => ({ type: 'FeatureCollection' as const, features });
const box = (w: number, s: number, e: number, n: number) => [[w, s], [e, s], [e, n], [w, n], [w, s]];

it('marks land, lakes, mountains, coast and rivers', () => {
  const p = makeProjection(36); // 10° tiles
  const t = buildTerrain({
    land: fc([poly(box(-60, -40, 60, 40))]),
    lakes: fc([poly(box(-10, -10, 10, 10))]),
    regions: fc([poly(box(30, 10, 50, 30), { featurecla: 'Range/mtn' }), poly(box(-50, -30, -30, -10), { featurecla: 'Desert' })]),
    rivers: fc([{ type: 'Feature', properties: { scalerank: 3 }, geometry: { type: 'LineString', coordinates: [[-55, 25], [-25, 25]] } }]),
  }, p);
  const at = (lon: number, lat: number) => { const [x, y] = p.toTile(lon, lat); return t[y * p.width + x]; };
  expect(at(150, 0) & TERRAIN_MASK).toBe(Terrain.Sea);
  expect(at(0, 0) & TERRAIN_MASK).toBe(Terrain.Lake);
  expect(at(40, 20) & TERRAIN_MASK).toBe(Terrain.Mountains);
  expect(at(-40, -20) & TERRAIN_MASK).toBe(Terrain.Desert);
  expect(at(-55, 25) & COAST_BIT).toBeTruthy();
  expect(at(-45, 25) & RIVER_BIT).toBeTruthy();
  expect(at(150, 0) & RIVER_BIT).toBeFalsy();
});

it('puts hills around mountains', () => {
  const p = makeProjection(360); // 1° tiles
  const t = buildTerrain({ land: fc([poly(box(-60, -40, 60, 40))]), lakes: fc([]), regions: fc([poly(box(0, 0, 10, 10), { featurecla: 'Range/mtn' })]), rivers: fc([]) }, p);
  const [x, y] = p.toTile(-0.5, 5);
  expect(t[y * p.width + x] & TERRAIN_MASK).toBe(Terrain.Hills);
});

it('is deterministic', () => {
  const p = makeProjection(72);
  const src = { land: fc([poly(box(-60, -40, 60, 40))]), lakes: fc([]), regions: fc([]), rivers: fc([]) };
  expect(Array.from(buildTerrain(src, p))).toEqual(Array.from(buildTerrain(src, p)));
});

it('reads the region class from the uppercase FEATURECLA field used by Natural Earth 10m', () => {
  const p = makeProjection(36);
  const t = buildTerrain({ land: fc([poly(box(-60, -40, 60, 40))]), lakes: fc([]), regions: fc([poly(box(30, 10, 50, 30), { FEATURECLA: 'Range/mtn' })]), rivers: fc([]) }, p);
  const [x, y] = p.toTile(40, 20);
  expect(t[y * p.width + x] & TERRAIN_MASK).toBe(Terrain.Mountains);
});

it('cuts listed straits open as sea', () => {
  const p = makeProjection(360);
  const t = buildTerrain({ land: fc([poly(box(-60, -40, 60, 40))]), lakes: fc([]), regions: fc([]), rivers: fc([]) }, p, [{ name: 'Test', path: [[0, -45], [0, 45]] }]);
  const [x, y] = p.toTile(0, 0);
  expect(t[y * p.width + x] & TERRAIN_MASK).toBe(Terrain.Sea);
  expect(t[y * p.width + x - 1] & COAST_BIT).toBeTruthy();
});
