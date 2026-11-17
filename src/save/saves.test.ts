import 'fake-indexeddb/auto';
import { it, expect, beforeEach } from 'vitest';
import { saveGame, loadGame, listSaves, deserialize, checkSave, LOAD_ERROR_TEXT, SAVE_VERSION, DB_NAME, type SavedGame } from './saves';
import { makeSmallWorldGame, runYears } from '../sim/testing';
import { hashState } from '../sim/hash';

beforeEach(async () => {
  await new Promise<void>(res => { const r = indexedDB.deleteDatabase(DB_NAME); r.onsuccess = () => res(); r.onerror = () => res(); r.onblocked = () => res(); });
});

it('save then load continues identically', async () => {
  const g = makeSmallWorldGame({ seed: 3 });
  runYears(g, 2);
  await saveGame('1', g);
  const saved = await loadGame('1');
  expect('error' in saved).toBe(false);
  const loaded = deserialize(saved as SavedGame, g.map);
  expect(hashState(loaded)).toBe(hashState(g));
  runYears(g, 1);
  runYears(loaded, 1);
  expect(hashState(loaded)).toBe(hashState(g));
}, 60_000);

it('refuses saves from another version with a clear error', async () => {
  const g = makeSmallWorldGame({ seed: 4 });
  await saveGame('2', g);
  const db: IDBDatabase = await new Promise(res => { const r = indexedDB.open(DB_NAME); r.onsuccess = () => res(r.result); });
  await new Promise<void>(res => {
    const tx = db.transaction('saves', 'readwrite');
    const store = tx.objectStore('saves');
    const get = store.get('2');
    get.onsuccess = () => { const v = get.result; v.version = SAVE_VERSION - 1; v.meta.version = SAVE_VERSION - 1; store.put(v, '2'); };
    tx.oncomplete = () => res();
  });
  db.close();
  expect(await loadGame('2')).toEqual({ error: 'tooOld' });
  expect(await loadGame('3')).toEqual({ error: 'missing' });
});

it('lists saves newest first with readable metadata', async () => {
  const g = makeSmallWorldGame({ seed: 5 });
  await saveGame('1', g);
  await new Promise(r => setTimeout(r, 5));
  await saveGame('auto', g);
  const list = await listSaves();
  expect(list.map(s => s.slot)).toEqual(['auto', '1']);
  expect(list[0].countryName).toBe('Country PLR');
  expect(list[0].date).toBe('1 Jan 1836');
});

it('refuses a save made with a different world map', async () => {
  const g = makeSmallWorldGame({ seed: 6 });
  await saveGame('3', g);
  const saved = (await loadGame('3')) as SavedGame;
  expect(checkSave(saved, g.map)).toBeNull();
  const other = makeSmallWorldGame({ seed: 6, countries: 4 }).map;
  other.states[1].key = 'T-renamed';
  expect(checkSave(saved, other)).toBe('otherMap');
  expect(LOAD_ERROR_TEXT.otherMap).toMatch(/different version of the world map/);
});

it('save and load mid-voyage replays identically (ships, routes, invasions)', async () => {
  const { seaWorld } = await import('../sim/naval/testWorlds');
  const g = seaWorld({ shipyards: true, ai: true });
  g.countries[1].stockpile.grain = 1e7; g.countries[2].stockpile.grain = 0;
  runYears(g, 1);
  expect(g.ships.length).toBeGreaterThan(0);
  await saveGame('1', g);
  const loaded = deserialize((await loadGame('1')) as SavedGame, g.map);
  runYears(g, 1); runYears(loaded, 1);
  expect(hashState(loaded)).toBe(hashState(g));
}, 60_000);

it('the save format is version 5', () => { expect(SAVE_VERSION).toBe(5); });

it('save and load in the middle of a diplomatic play replays identically', async () => {
  const { makeGame } = await import('../sim/testing');
  const { step } = await import('../sim/step');
  const g = makeGame({ rows: ['AAABBBCCC', 'AAABBBCCC'], owners: { A: 'XXX', B: 'YYY', C: 'ZZZ' }, population: 2_000_000, ai: true, seedEconomy: true });
  step(g, [{ type: 'startPlay', country: 1, target: 2, demands: [{ kind: 'reparations' }] }]);
  runYears(g, 0.1);
  expect(g.plays.length + g.wars.length).toBeGreaterThan(0);
  await saveGame('2', g);
  const loaded = deserialize((await loadGame('2')) as SavedGame, g.map);
  runYears(g, 1); runYears(loaded, 1);
  expect(hashState(loaded)).toBe(hashState(g));
}, 60_000);

it('save and load during research, a law being passed and a revolt replays identically', async () => {
  const g = makeSmallWorldGame({ seed: 9 });
  runYears(g, 1);
  const c = g.countries.find(x => x.alive && x.id && !x.isPlayer && g.states.filter(s => s.owner === x.id).length >= 3)!;
  c.laws = { ...c.laws, labour: 'serfdom' };
  c.groups.workers.clout = 0.3; c.groups.workers.radicalism = 100;
  runYears(g, 0.1);
  expect(g.countries.some(x => x.rebel)).toBe(true);
  await saveGame('1', g);
  const loaded = deserialize((await loadGame('1')) as SavedGame, g.map);
  expect(hashState(loaded)).toBe(hashState(g));
  runYears(g, 1);
  runYears(loaded, 1);
  expect(hashState(loaded)).toBe(hashState(g));
}, 60_000);

it('save and load with power blocs and companies replays identically', async () => {
  const g = makeSmallWorldGame({ seed: 11 });
  runYears(g, 1);
  const [a, b] = g.countries.filter(x => x.alive && x.id && !x.isPlayer);
  g.blocs.push({ id: g.nextId++, leader: a.id, type: 'empire', principles: ['imperialTribute', 'militaryDrill'], members: [b.id], founded: g.tick, principlesSet: g.tick });
  a.companies.push({ id: 'agriculturalSociety', founded: g.tick, charter: 'monopoly', bonus: 0 });
  runYears(g, 0.2);
  await saveGame('1', g);
  const loaded = deserialize((await loadGame('1')) as SavedGame, g.map);
  expect(hashState(loaded)).toBe(hashState(g));
  runYears(g, 1);
  runYears(loaded, 1);
  expect(hashState(loaded)).toBe(hashState(g));
}, 60_000);
