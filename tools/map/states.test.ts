import { it, expect } from 'vitest';
import { groupAdmin1, rasterizeStates, mergeSmall, splitLarge, finalizeStates } from './states';
import { makeProjection } from './project';
import { Terrain } from '../../src/map/format';

const box = (w: number, s: number, e: number, n: number) => [[[w, s], [e, s], [e, n], [w, n], [w, s]]];
const adm = (adm0: string, name: string, region: string | null, coords: number[][][]) => ({ type: 'Feature', properties: { adm0_a3: adm0, name, region }, geometry: { type: 'Polygon', coordinates: coords } });

it('groups admin-1 units by region only for countries with many regions', () => {
  const feats: any[] = [];
  for (let i = 0; i < 30; i++) feats.push(adm('FRA', `Dept ${i}`, `Region ${i % 10}`, box(i, 0, i + 1, 1)));
  feats.push(adm('USA', 'Ohio', 'Midwest', box(0, 10, 1, 11)), adm('USA', 'Iowa', 'Midwest', box(1, 10, 2, 11)));
  const g = groupAdmin1(feats);
  expect([...g.keys()].filter(k => k.startsWith('FRA-'))).toHaveLength(10);
  expect(g.has('USA-Ohio')).toBe(true);
  expect(g.has('USA-Iowa')).toBe(true);
  expect(g.get('FRA-Region 3')!.polygons).toHaveLength(3);
});

function landGrid(p: ReturnType<typeof makeProjection>) { const t = new Uint8Array(p.width * p.height); t.fill(Terrain.Plains); return t; }

it('every land tile gets a state and sea tiles get none', () => {
  const p = makeProjection(360);
  const terrain = landGrid(p);
  for (let x = 0; x < p.width; x++) terrain[x] = Terrain.Sea;
  const groups = groupAdmin1([adm('AAA', 'West', null, box(-180, -56, 0, 80)), adm('BBB', 'East', null, box(0, -56, 170, 80))]);
  const { stateOf, meta } = rasterizeStates(groups, terrain, p);
  expect(meta).toHaveLength(2);
  for (let i = 0; i < stateOf.length; i++) expect(stateOf[i] === 0).toBe(terrain[i] === Terrain.Sea);
});

it('merges states smaller than the minimum into a same-country neighbour', () => {
  const p = makeProjection(360);
  const terrain = landGrid(p);
  const groups = groupAdmin1([adm('AAA', 'Big', null, box(-180, -56, -1, 80)), adm('AAA', 'Tiny', null, box(-1, 0, 0, 1)), adm('BBB', 'Rest', null, box(0, -56, 180, 80))]);
  const r = rasterizeStates(groups, terrain, p);
  const before = r.meta.length;
  mergeSmall(r.stateOf, r.meta, terrain, p.width, 40);
  const live = r.meta.filter(m => m.alive);
  expect(live.length).toBe(before - 1);
  expect(live.find(m => m.name === 'Tiny')).toBeUndefined();
});

it('splits oversized states deterministically', () => {
  const p = makeProjection(360);
  const terrain = landGrid(p);
  const groups = groupAdmin1([adm('AAA', 'Huge', null, box(-180, -56, 180, 80))]);
  const run = () => { const r = rasterizeStates(groups, terrain, p); splitLarge(r.stateOf, r.meta, p.width, 20_000); return r; };
  const a = run(), b = run();
  expect(a.meta.filter(m => m.alive).length).toBeGreaterThanOrEqual(3);
  expect(Array.from(a.stateOf)).toEqual(Array.from(b.stateOf));
  expect(new Set(a.meta.filter(m => m.alive).map(m => m.key)).size).toBe(a.meta.filter(m => m.alive).length);
});

it('finalizes ids, neighbours, coast and centroids', () => {
  const p = makeProjection(360);
  const terrain = landGrid(p);
  for (let y = 0; y < p.height; y++) terrain[y * p.width + 359] = Terrain.Sea;
  const groups = groupAdmin1([adm('AAA', 'West', null, box(-180, -56, 0, 80)), adm('BBB', 'East', null, box(0, -56, 180, 80))]);
  const r = rasterizeStates(groups, terrain, p);
  const { stateOf, defs } = finalizeStates(r.stateOf, r.meta, terrain, p.width);
  expect(defs.map(d => d.id)).toEqual([1, 2]);
  expect(defs[0].neighbors).toEqual([2]);
  expect(defs[1].coastal).toBe(true);
  expect(defs[0].coastal).toBe(false);
  expect(Math.max(...stateOf)).toBe(2);
});

it('accepts a per-country minimum size', () => {
  const p = makeProjection(360);
  const terrain = landGrid(p);
  const groups = groupAdmin1([adm('EUR', 'Big', null, box(-180, -56, -2, 80)), adm('EUR', 'Small', null, box(-2, 0, 0, 2)), adm('OTH', 'Big', null, box(0, -56, 178, 80)), adm('OTH', 'Small', null, box(178, 0, 180, 2))]);
  const r = rasterizeStates(groups, terrain, p);
  mergeSmall(r.stateOf, r.meta, terrain, p.width, m => (m === 'EUR' ? 2 : 40));
  const names = r.meta.filter(m => m.alive).map(m => m.key).sort();
  expect(names).toEqual(['EUR-Big', 'EUR-Small', 'OTH-Big']);
});
