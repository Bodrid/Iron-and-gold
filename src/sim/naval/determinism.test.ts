import { it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { assembleMap, decodeGrid, placeholderState, type MapData } from '../../map/format';
import { createGame } from '../state';
import { step } from '../step';
import { hashState } from '../hash';
import { getStart } from '../../content/starts';

const has = existsSync('public/data/states.json');
const load = (): MapData => assembleMap(decodeGrid(gunzipSync(readFileSync('public/data/world.igz'))), [placeholderState(), ...JSON.parse(readFileSync('public/data/states.json', 'utf8'))]);
const play = (map: MapData, days: number) => {
  const g = createGame(map, getStart('1836'), { startId: '1836', playerTag: 'PRU', difficulty: 'normal', rivalsHarder: false, seed: 11 });
  for (let i = 0; i < days * 4; i++) step(g, []);
  return g;
};

it.skipIf(!has)('a second game on the same map plays out exactly like the first (caches never change results)', () => {
  const map = load();
  const a = hashState(play(map, 300));
  const b = hashState(play(map, 300));
  const c = hashState(play(load(), 300));
  expect(b).toBe(a);
  expect(c).toBe(a);
}, 120_000);
