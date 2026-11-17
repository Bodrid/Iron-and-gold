import 'fake-indexeddb/auto';
import { it, expect, beforeEach } from 'vitest';
import { saveGame, loadGame, listSaves, deserialize, SAVE_VERSION, DB_NAME, type SavedGame } from './saves';
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
