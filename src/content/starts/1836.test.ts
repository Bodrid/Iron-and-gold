import { it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { assembleMap, decodeGrid, placeholderState, type MapData, type StateDef } from '../../map/format';
import { createGame } from '../../sim/state';
import { getStart } from './index';
import type { GameState } from '../../sim/types';

const REQUIRED = 'GBR FRA PRU AUS RUS TUR USA MEX SPA POR NET BEL SWE DEN SAR PAP SIC TUS BAV SAX HAN WUR SWI GRE EGY PER AFG KHI BUK KOK PUN CHI JAP KOR SIA BUR DAI NEP MOR TUN ETH BRZ ARG CHL PEU BOL COL VNZ ECU CAM TEX HAW'.split(' ');

let map: MapData, g: GameState;
const start = getStart('1836');
beforeAll(() => {
  const states = JSON.parse(readFileSync('public/data/states.json', 'utf8')) as StateDef[];
  map = assembleMap(decodeGrid(gunzipSync(readFileSync('public/data/world.igz'))), [placeholderState(), ...states]);
  g = createGame(map, start, { startId: '1836', playerTag: 'PRU', difficulty: 'normal', rivalsHarder: false, seed: 1 });
});
const ownerTag = (key: string) => { const s = map.states.find(x => x.key === key); if (!s) throw new Error(key); const o = g.states[s.id].owner; return o ? g.countries[o].tag : null; };
const modernPop = (codes: string[]) => g.states.filter(s => s.id && codes.includes(map.states[s.id].modern)).reduce((a, s) => a + s.population, 0);
const tag = (t: string) => g.countries.find(c => c.tag === t)!;

it('has the required countries', () => {
  for (const t of REQUIRED) expect(start.countries.find(c => c.tag === t), t).toBeTruthy();
  expect(start.countries.length).toBeGreaterThanOrEqual(70);
  expect(new Set(start.countries.map(c => c.tag)).size).toBe(start.countries.length);
});

it('every country is alive and owns its capital', () => {
  for (const c of g.countries.slice(1)) {
    expect(c.alive, c.tag).toBe(true);
    expect(g.states[c.capitalState].owner, c.tag).toBe(c.id);
  }
});

it('historic spot checks', () => {
  expect(ownerTag('POL-Lower Silesian')).toBe('PRU');
  expect(ownerTag('ITA-Lombardia')).toBe('AUS');
  expect(ownerTag('USA-California')).toBe('MEX');
  expect(ownerTag('IND-Maharashtra')).toBe('GBR');
  expect(ownerTag('COD-Kasaï-Occidental')).toBe(null);
  expect(ownerTag('USA-Texas')).toBe('TEX');
  expect(ownerTag('PAK-Punjab')).toBe('PUN');
  expect(ownerTag('POL-Masovian')).toBe('RUS');
});

it('populations are roughly historic', () => {
  const within = (v: number, m: number, label: string) => { expect(v / 1e6, label).toBeGreaterThan(m * 0.75); expect(v / 1e6, label).toBeLessThan(m * 1.25); };
  within(modernPop(['GBR', 'IRL']), 25, 'British Isles');
  within(modernPop(['ESP']), 13, 'Spain');
  for (const [t, m] of [['FRA', 33], ['PRU', 14], ['AUS', 36], ['RUS', 52], ['TUR', 25], ['USA', 15], ['CHI', 400], ['JAP', 31], ['MEX', 7], ['BRZ', 4]] as [string, number][]) within(tag(t).population, m, t);
});

it('neighbouring countries have distinct colours', () => {
  const dist = (a: number, b: number) => Math.hypot(((a >> 16) & 255) - ((b >> 16) & 255), ((a >> 8) & 255) - ((b >> 8) & 255), (a & 255) - (b & 255));
  const bad: string[] = [];
  const seen = new Set<string>();
  for (const s of g.states) {
    if (!s.id || !s.owner) continue;
    for (const n of map.states[s.id].neighbors) {
      const o = g.states[n].owner;
      if (!o || o === s.owner) continue;
      const k = [s.owner, o].sort().join('-');
      if (seen.has(k)) continue;
      seen.add(k);
      if (dist(g.countries[s.owner].color, g.countries[o].color) < 60) bad.push(`${g.countries[s.owner].tag}/${g.countries[o].tag}`);
    }
  }
  expect(bad).toEqual([]);
});

it('small or empty territories don’t balloon (Greenland, Iceland, Guyana…)', () => {
  expect(modernPop(['GRL'])).toBeLessThan(50_000);
  expect(modernPop(['ISL'])).toBeLessThan(150_000);
  expect(modernPop(['GUY', 'SUR', 'HKG', 'FLK'])).toBeLessThan(500_000);
  expect(tag('DEN').population / 1e6).toBeLessThan(3);
});
