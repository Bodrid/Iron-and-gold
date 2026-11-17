import { it, expect } from 'vitest';
import { Camera, MAX_ZOOM, dirtyRowBand } from './camera';
import { buildPalette } from './palette';

it('screenToTile inverts tileToScreen', () => {
  const c = new Camera(2400, 907, 874, 402);
  c.zoomAt(400, 200, 3);
  const [x, y] = c.tileToScreen(1000, 300);
  expect(c.screenToTile(x, y).map(v => Math.round(v))).toEqual([1000, 300]);
});

it('zoomAt keeps the point under the finger fixed', () => {
  const c = new Camera(2400, 907, 874, 402);
  c.zoomAt(400, 200, 4);
  const before = c.screenToTile(300, 150);
  c.zoomAt(300, 150, 1.7);
  const after = c.screenToTile(300, 150);
  expect(after[0]).toBeCloseTo(before[0], 4);
  expect(after[1]).toBeCloseTo(before[1], 4);
});

it('clamps zoom and position', () => {
  const c = new Camera(2400, 907, 874, 402);
  c.zoomAt(0, 0, 0.0001);
  expect(c.zoom).toBeCloseTo(402 / 907, 5);
  c.zoomAt(0, 0, 1e6);
  expect(c.zoom).toBe(MAX_ZOOM);
  c.pan(-1e9, -1e9);
  const [x0, y0] = c.screenToTile(874, 402);
  expect(x0).toBeLessThanOrEqual(2400 + 1e-6);
  expect(y0).toBeLessThanOrEqual(907 + 1e-6);
});

it('keeps the centre tile when the view resizes', () => {
  const c = new Camera(2400, 907, 874, 402);
  c.zoomAt(437, 201, 5);
  const centre = c.screenToTile(437, 201);
  c.resize(1180, 820);
  const after = c.screenToTile(590, 410);
  expect(after[0]).toBeCloseTo(centre[0], 3);
  expect(after[1]).toBeCloseTo(centre[1], 3);
});

it('dirtyRowBand finds the touched rows', () => {
  expect(dirtyRowBand(new Uint32Array([2400 * 5 + 3, 2400 * 9]), 2400)).toEqual([5, 9]);
  expect(dirtyRowBand(new Uint32Array([]), 2400)).toBeNull();
});

it('builds a palette indexed by country id', () => {
  const p = buildPalette([{ id: 3, color: 0x112233 }]);
  expect(p.length).toBe(4096 * 4);
  expect(Array.from(p.slice(12, 16))).toEqual([0x11, 0x22, 0x33, 255]);
  expect(p[3]).toBe(0);
});
