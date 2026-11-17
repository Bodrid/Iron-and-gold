// Saved games in IndexedDB (works on the main thread and in the worker).
import type { MapData } from '../map/format';
import { DIFFICULTIES } from '../sim/ai/difficulty';
import { dateAtTick, formatDate } from '../sim/calendar';
import { rebuildControl } from '../sim/control';
import { getNavGrid } from '../sim/naval/nav';
import type { GameState } from '../sim/types';

export type SaveSlot = 'auto' | 'background' | '1' | '2' | '3';
export const SAVE_VERSION = 1;
export const DB_NAME = 'iron-and-gold-saves';
const STORE = 'saves';

export interface SaveMeta { mapId: string; slot: SaveSlot; version: number; savedAt: number; countryTag: string; countryName: string; date: string; difficulty: string; difficultyLabel: string; startId: string }
export interface SavedGame { version: number; meta: SaveMeta; state: Omit<GameState, 'map'> }

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open(DB_NAME, 1);
    r.onupgradeneeded = () => { if (!r.result.objectStoreNames.contains(STORE)) r.result.createObjectStore(STORE); };
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}

function done(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => { tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error); });
}

/** Fingerprint of the world map a save's tile and state arrays belong to. */
export function mapId(map: MapData): string {
  let h = 0x811c9dc5;
  const mix = (str: string) => { for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 0x01000193); };
  mix(`${map.width}x${map.height}:${map.landTiles}:${map.states.length}`);
  for (const s of map.states) mix(s.key);
  return (h >>> 0).toString(36);
}

export function checkSave(saved: SavedGame, map: MapData): null | 'otherMap' {
  return saved.meta.mapId === mapId(map) ? null : 'otherMap';
}

export function serialize(state: GameState, slot: SaveSlot = '1'): SavedGame {
  const { map: _map, ...rest } = state;
  const p = state.countries.find(c => c.isPlayer)!;
  const meta: SaveMeta = {
    mapId: mapId(state.map), slot, version: SAVE_VERSION, savedAt: Date.now(), countryTag: p.tag, countryName: p.name, date: formatDate(dateAtTick(state.startDate, state.tick)),
    difficulty: state.setup.difficulty, difficultyLabel: DIFFICULTIES[state.setup.difficulty].label, startId: state.setup.startId,
  };
  return { version: SAVE_VERSION, meta, state: rest };
}

export function deserialize(saved: SavedGame, map: MapData): GameState {
  const state = { ...structuredClone(saved.state), map } as GameState;
  rebuildControl(state);
  getNavGrid(map);
  return state;
}

let persistAsked = false;

export async function saveGame(slot: SaveSlot, state: GameState): Promise<SaveMeta> {
  if (!persistAsked) { persistAsked = true; try { await navigator.storage?.persist?.(); } catch { /* not allowed */ } }
  const db = await open();
  try {
    const saved = serialize(state, slot);
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(saved, slot);
    await done(tx);
    return saved.meta;
  } finally { db.close(); }
}

export async function loadGame(slot: SaveSlot): Promise<SavedGame | { error: 'missing' | 'tooOld' | 'tooNew' }> {
  const db = await open();
  try {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).get(slot);
    const v = await new Promise<SavedGame | undefined>((resolve, reject) => { req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error); });
    if (!v) return { error: 'missing' };
    if (v.version < SAVE_VERSION) return { error: 'tooOld' };
    if (v.version > SAVE_VERSION) return { error: 'tooNew' };
    return v;
  } finally { db.close(); }
}

export async function listSaves(): Promise<SaveMeta[]> {
  if (typeof indexedDB === 'undefined') return [];
  const db = await open();
  try {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).getAll();
    const all = await new Promise<SavedGame[]>((resolve, reject) => { req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error); });
    return all.map(s => s.meta).sort((a, b) => b.savedAt - a.savedAt);
  } finally { db.close(); }
}

export const LOAD_ERROR_TEXT: Record<string, string> = {
  missing: 'That save could not be found.',
  tooOld: "This save is from an older version of the game and can't be loaded.",
  tooNew: 'This save is from a newer version of the game. Reload the page to update.',
  otherMap: "This save was made with a different version of the world map and can't be loaded.",
};
