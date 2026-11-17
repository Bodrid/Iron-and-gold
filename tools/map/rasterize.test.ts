import { it, expect } from 'vitest';
import { fillPolygon, drawPolyline } from './rasterize';
import { lonLatToTile, GRID, makeProjection } from './project';

it('projects the corners', () => {
  expect(GRID.height).toBe(907);
  expect(lonLatToTile(-180, 80)).toEqual([0, 0]);
  expect(lonLatToTile(179.99, -55.99)).toEqual([2399, 906]);
});

it('projects with a custom grid', () => {
  const p = makeProjection(36);
  expect(p.height).toBe(14);
  expect(p.toTile(0, 0)).toEqual([18, 8]);
});

it('fills a square polygon exactly', () => {
  const g = new Uint8Array(100);
  fillPolygon(g, 10, 10, [[[2, 2], [6, 2], [6, 6], [2, 6], [2, 2]]], 1);
  expect(g.reduce((a, b) => a + b, 0)).toBe(16);
  expect(g[2 * 10 + 2]).toBe(1);
  expect(g[6 * 10 + 6]).toBe(0);
});

it('respects holes (even-odd)', () => {
  const g = new Uint8Array(100);
  fillPolygon(g, 10, 10, [[[1, 1], [9, 1], [9, 9], [1, 9], [1, 1]], [[4, 4], [6, 4], [6, 6], [4, 6], [4, 4]]], 1);
  expect(g.reduce((a, b) => a + b, 0)).toBe(60);
});

it('clips polygons that leave the grid', () => {
  const g = new Uint8Array(100);
  fillPolygon(g, 10, 10, [[[-5, -5], [5, -5], [5, 5], [-5, 5], [-5, -5]]], 1);
  expect(g.reduce((a, b) => a + b, 0)).toBe(25);
});

it('draws polylines by OR-ing a bit', () => {
  const g = new Uint8Array(100);
  g[0] = 1;
  drawPolyline(g, 10, 10, [[0.5, 0.5], [9.5, 0.5]], 0x80);
  expect(g[0]).toBe(0x81);
  expect(g[9]).toBe(0x80);
});
