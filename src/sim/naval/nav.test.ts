import { it, expect } from 'vitest';
import { makeTestWorld } from '../../map/testWorld';
import { getNavGrid, portCell, seaPath, NAV_CELL, cellIndex, cellOfTile } from './nav';

// 48×24: land west (A) and east (B) with an ocean between, a landlocked state C, and an enclosed sea pocket D-side.
function world() {
  const rows: string[] = [];
  for (let y = 0; y < 24; y++) {
    let r = '';
    for (let x = 0; x < 48; x++) {
      if (x < 8) r += y < 12 ? 'A' : 'C';
      else if (x >= 40) r += 'B';
      else if (x >= 30 && x < 36 && y >= 16) r += 'E';
      else r += '.';
    }
    rows.push(r);
  }
  // C is landlocked: give it a land buffer column
  for (let y = 12; y < 24; y++) rows[y] = rows[y].slice(0, 8) + 'A' + rows[y].slice(9);
  return makeTestWorld(rows);
}

it('builds a coarse sea grid', () => {
  const m = world();
  const g = getNavGrid(m);
  expect(g.w).toBe(48 / NAV_CELL);
  expect(g.h).toBe(24 / NAV_CELL);
  expect(g.sea[0]).toBe(0);
  expect(g.sea[Math.floor(20 / NAV_CELL)]).toBe(1);
  expect(getNavGrid(m)).toBe(g);
});

it('finds a sea lane between two ports on the same sea', () => {
  const m = world();
  const a = portCell(m, m.states.find(s => s.key === 'T-A')!.id);
  const b = portCell(m, m.states.find(s => s.key === 'T-B')!.id);
  expect(a).toBeGreaterThanOrEqual(0);
  expect(b).toBeGreaterThanOrEqual(0);
  const p = seaPath(m, a, b)!;
  expect(p[0]).toBe(a);
  expect(p[p.length - 1]).toBe(b);
  const g = getNavGrid(m);
  for (let i = 1; i < p.length; i++) {
    const dx = Math.abs((p[i] % g.w) - (p[i - 1] % g.w)), dy = Math.abs(Math.floor(p[i] / g.w) - Math.floor(p[i - 1] / g.w));
    expect(Math.max(dx, dy)).toBe(1);
    expect(g.sea[p[i]]).toBe(1);
  }
  expect(seaPath(m, a, b)).toBe(p);
});

it('landlocked states have no port cell', () => {
  const m = world();
  expect(portCell(m, m.states.find(s => s.key === 'T-C')!.id)).toBe(-1);
});

it('returns null quickly between unconnected seas', () => {
  const rows = ['AA....BB....', 'AA....BB....', 'AA....BB....', 'AA....BB....', 'AA....BB....', 'AA....BB....', 'AA....BB....', 'AA....BB....'];
  const m = makeTestWorld(rows.map(r => r.replace(/B/g, 'A')));
  const g = getNavGrid(m);
  const left = g.sea.findIndex((v, i) => v === 1 && i % g.w === 1);
  const right = g.sea.findIndex((v, i) => v === 1 && i % g.w === 2);
  expect(g.region[left]).not.toBe(g.region[right]);
  expect(seaPath(m, left, right)).toBeNull();
});

import { existsSync, readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { assembleMap, decodeGrid, placeholderState } from '../../map/format';

it.skipIf(!existsSync('public/data/states.json'))('real map: grid plus 100 sea lanes in under 2 s, and the Caspian is not the ocean', () => {
  const states = JSON.parse(readFileSync('public/data/states.json', 'utf8'));
  const m = assembleMap(decodeGrid(gunzipSync(readFileSync('public/data/world.igz'))), [placeholderState(), ...states]);
  const t0 = performance.now();
  const g = getNavGrid(m);
  const coastal = m.states.filter(s => s.id && s.coastal).map(s => portCell(m, s.id)).filter(c => c >= 0);
  let found = 0;
  for (let i = 0; i < 100; i++) if (seaPath(m, coastal[(i * 37) % coastal.length], coastal[(i * 101 + 7) % coastal.length])) found++;
  expect(performance.now() - t0).toBeLessThan(2000);
  expect(found).toBeGreaterThan(50);
  const key = (k: string) => portCell(m, m.states.find(s => s.key === k)!.id);
  const london = key('GBR-South East'), newYork = key('USA-New York');
  expect(seaPath(m, london, newYork)).not.toBeNull();
  const caspian = m.states.find(s => s.key === 'KAZ-Atyrau')!;
  const cc = portCell(m, caspian.id);
  if (cc >= 0) expect(g.region[cc]).not.toBe(g.region[london]);
});

it('a port prefers the big sea over a small enclosed pocket next to it', () => {
  // State A's centroid is next to a 1-cell pocket, but it also has a long ocean coast.
  const rows: string[] = [];
  for (let y = 0; y < 32; y++) {
    let r = '';
    for (let x = 0; x < 64; x++) {
      if (x >= 24 && x < 32 && y >= 12 && y < 20) r += '.';      // pocket inside A
      else if (x < 40) r += 'A';
      else r += '.';
    }
    rows.push(r);
  }
  const m = makeTestWorld(rows);
  const g = getNavGrid(m);
  const pc = portCell(m, 1);
  const oceanCell = g.region.findIndex((v, i) => v !== 0 && i % g.w === g.w - 1);
  expect(g.region[pc]).toBe(g.region[oceanCell]);
});

it.skipIf(!existsSync('public/data/states.json'))('real map: the Black Sea reaches the ocean and Newfoundland ports on the ocean', () => {
  const states = JSON.parse(readFileSync('public/data/states.json', 'utf8'));
  const m = assembleMap(decodeGrid(gunzipSync(readFileSync('public/data/world.igz'))), [placeholderState(), ...states]);
  const g = getNavGrid(m);
  const cell = (k: string) => portCell(m, m.states.find(s => s.key === k)!.id);
  const london = cell('GBR-South East');
  expect(g.region[cell('UKR-Odessa')]).toBe(g.region[london]);
  expect(g.region[cell('RUS-Krasnodar')]).toBe(g.region[london]);
  expect(g.region[cell('CAN-Newfoundland and Labrador')]).toBe(g.region[london]);
  expect(g.region[cell('DNK-Midtjylland')]).toBe(g.region[london]);
});

it('cellIndex is plain arithmetic and matches cellOfTile', () => {
  const m = world();
  for (const t of [0, 47, 48 * 9 + 20, 48 * 23 + 47]) expect(cellIndex(t, m.width)).toBe(cellOfTile(t, m));
});
