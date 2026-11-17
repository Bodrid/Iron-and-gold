import { it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { decodeGrid, isLand, type StateDef } from '../../src/map/format';

const statesFile = 'public/data/states.json';
const has = existsSync(statesFile);

it.skipIf(!has)('real map: 600–1000 states, Silesia has coal, every land tile has a state', () => {
  const states = JSON.parse(readFileSync(statesFile, 'utf8')) as StateDef[];
  expect(states.length).toBeGreaterThanOrEqual(600);
  expect(states.length).toBeLessThanOrEqual(1000);
  const silesia = states.find(s => s.key.startsWith('POL-') && /Sil/.test(s.name))!;
  expect(silesia.resources.coal).toBe(true);
  expect(new Set(states.map(s => s.key)).size).toBe(states.length);
  const g = decodeGrid(gunzipSync(readFileSync('public/data/world.igz')));
  expect(g.width).toBe(2400);
  expect(g.height).toBe(907);
  for (let i = 0; i < g.terrain.length; i++) if (isLand(g.terrain[i]) !== (g.stateOf[i] !== 0)) throw new Error(`tile ${i} land/state mismatch`);
  expect(readFileSync('public/data/world.igz').length).toBeLessThan(3_000_000);
});
