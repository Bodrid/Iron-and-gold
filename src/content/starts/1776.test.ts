import { it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { assembleMap, decodeGrid, placeholderState, type MapData, type StateDef } from '../../map/format';
import { createGame } from '../../sim/state';
import { step } from '../../sim/step';
import { hashState } from '../../sim/hash';
import { invariantProblems } from '../../sim/testing';
import { getStart } from './index';
import type { GameState, SimEvent } from '../../sim/types';

let map: MapData;
const start = getStart('1776');
beforeAll(() => {
  const states = JSON.parse(readFileSync('public/data/states.json', 'utf8')) as StateDef[];
  map = assembleMap(decodeGrid(gunzipSync(readFileSync('public/data/world.igz'))), [placeholderState(), ...states]);
});
const make = (player = 'SWI', ai = false) => createGame(map, start, { startId: '1776', playerTag: player, difficulty: 'normal', rivalsHarder: false, seed: 3, aiDisabled: !ai });
const tag = (g: GameState, t: string) => g.countries.find(c => c.tag === t)!;

it('builds a 1776 world with valid capitals and plausible populations', () => {
  const g = make();
  expect(start.countries.length).toBeGreaterThanOrEqual(55);
  for (const c of g.countries.slice(1)) {
    expect(g.states[c.capitalState].owner, `${c.tag} capital`).toBe(c.id);
    expect(c.population, `${c.tag} population`).toBeLessThan(320e6);
  }
  const world = g.countries.reduce((n, c) => n + c.population, 0);
  expect(world).toBeGreaterThan(650e6);
  expect(world).toBeLessThan(950e6);
  expect(tag(g, 'GBR').population).toBeGreaterThan(30e6);   // Britain, Ireland, Bengal and the colonies
  expect(tag(g, 'PRU').population).toBeLessThan(10e6);
  expect(tag(g, 'SWI').population).toBeLessThan(3e6);
  expect(tag(g, 'GBR').techs).toContain('waterFrame');
  expect(tag(g, 'RUS').laws.labour).toBe('serfdom');
  const ny = map.states.find(s => s.key === 'USA-New York')!.id;
  expect(g.states[ny].owner).toBe(tag(g, 'GBR').id);       // the thirteen colonies are British
  expect(g.countries.some(c => c.tag === 'USA')).toBe(false);
});

it('runs AI years with no rejected AI commands, the American Revolution fires, and save/load replays', () => {
  const g = make('SWI', true);
  const events: SimEvent[] = [];
  for (let i = 0; i < 365 * 4; i++) for (const e of step(g, []).events) events.push(e);
  expect(events.filter(e => e.type === 'rejected')).toEqual([]);
  expect(invariantProblems(g)).toEqual([]);
  expect(g.eventLog.some(l => l.event === 'ar.independence')).toBe(true);
  expect(g.countries.some(c => c.tag === 'USA' && c.alive)).toBe(true);
  const copy = structuredClone(g);
  for (let i = 0; i < 120 * 4; i++) { step(g, []); step(copy, []); }
  expect(hashState(copy)).toBe(hashState(g));
}, 120_000);
