import { it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { assembleMap, decodeGrid, placeholderState } from '../../map/format';
import { createGame } from '../state';
import { step } from '../step';
import { getStart } from '../../content/starts';
import type { SimEvent } from '../types';

it.skipIf(!existsSync('public/data/states.json'))('over 12 years of 1836 the AI uses diplomacy: treaties, climb-downs, wars and peace — and never issues a rejected command', () => {
  const states = JSON.parse(readFileSync('public/data/states.json', 'utf8'));
  const map = assembleMap(decodeGrid(gunzipSync(readFileSync('public/data/world.igz'))), [placeholderState(), ...states]);
  const g = createGame(map, getStart('1836'), { startId: '1836', playerTag: 'HAW', difficulty: 'hard', rivalsHarder: false, seed: 9 });
  const events: SimEvent[] = [];
  for (let i = 0; i < 12 * 365 * 4; i++) events.push(...step(g, []).events.filter(e => e.type !== 'built'));
  const counts: Record<string, number> = {};
  for (const e of events) counts[e.type] = (counts[e.type] ?? 0) + 1;
  expect(events.filter(e => e.type === 'rejected')).toEqual([]);
  expect(counts.treatySigned ?? 0).toBeGreaterThan(0);
  expect(counts.playStarted ?? 0).toBeGreaterThan(2);
  expect((counts.playYielded ?? 0) + (counts.playCancelled ?? 0)).toBeGreaterThan(0);
  expect(counts.warDeclared ?? 0).toBeGreaterThan(0);
  expect(counts.peace ?? 0).toBeGreaterThan(0);
}, 300_000);
