// Helpers for simulation tests.
import { makeTestWorld, type TestWorldOptions } from '../map/testWorld';
import { getStateTiles } from '../map/stateTiles';
import { TICKS_PER_DAY } from './calendar';
import { setTile } from './control';
import { createGame } from './state';
import { step } from './step';
import type { Command, CountryId, Difficulty, GameState, SimEvent, StartDef } from './types';

export interface MakeGameOptions extends TestWorldOptions {
  rows?: string[]; owners?: Record<string, string>; unclaimed?: string[]; player?: string; seed?: number;
  difficulty?: Difficulty; population?: number; money?: number; seedEconomy?: boolean;
}

export function makeGame(opts: MakeGameOptions = {}): GameState {
  const rows = opts.rows ?? ['AABB', 'AABB'];
  const owners = opts.owners ?? (opts.rows ? { A: 'XXX' } : { A: 'XXX', B: 'YYY' });
  const map = makeTestWorld(rows, opts);
  const tags: string[] = [];
  const byTag = new Map<string, string[]>();
  for (const s of map.states.slice(1)) {
    const code = s.key.slice(2);
    const tag = owners[code] ?? owners[code.replace(/\d+$/, '')];
    const unclaimed = (opts.unclaimed ?? []).some(p => code.startsWith(p));
    if (!tag || unclaimed) continue;
    if (!byTag.has(tag)) { byTag.set(tag, []); tags.push(tag); }
    byTag.get(tag)!.push(s.key);
  }
  const start: StartDef = {
    id: 'test', name: 'Test', startDate: { y: 1836, m: 1, d: 1 }, endYear: 1936,
    countries: tags.map((tag, i) => ({ tag, name: `Country ${tag}`, color: [0xc94a4a, 0x4a6fd1, 0x4f9a63, 0xd9b44a, 0x8a7bd1, 0x3fa3a0, 0xe08a3c, 0x5b6478][i % 8],
      capital: byTag.get(tag)![0], population: (opts.population ?? 200_000) * byTag.get(tag)!.length, money: opts.money ?? 10_000 })),
    ownership: tags.map(tag => ({ states: byTag.get(tag)!, owner: tag })),
    seedEconomy: opts.seedEconomy ?? false,
  };
  return createGame(map, start, { startId: 'test', playerTag: opts.player ?? tags[0], difficulty: opts.difficulty ?? 'normal', rivalsHarder: false, seed: opts.seed ?? 1 });
}

export const makeTwoCountryGame = (opts: MakeGameOptions = {}) => makeGame(opts);

export function runTicks(g: GameState, n: number, firstCommands: Command[] = []): SimEvent[] {
  let events: SimEvent[] = [];
  for (let i = 0; i < n; i++) events = events.concat(step(g, i === 0 ? firstCommands : []).events);
  return events;
}
export const runDays = (g: GameState, days: number, first: Command[] = []) => runTicks(g, days * TICKS_PER_DAY, first);
export const runYears = (g: GameState, years: number) => runDays(g, Math.round(years * 365.25));
export const runYearsCollect = runYears;

export function stateId(g: GameState, key: string): number {
  const s = g.map.states.find(st => st.key === key);
  if (!s) throw new Error(`no state ${key}`);
  return s.id;
}
export function stateTiles(g: GameState, key: string): number[] { return Array.from(getStateTiles(g.map, stateId(g, key))); }
export function occupy(g: GameState, by: CountryId, tiles: number[]): void { for (const t of tiles) setTile(g, t, g.owner[t], by, []); }
export function giveTiles(g: GameState, to: CountryId, count: number): void {
  let given = 0;
  for (let t = 0; t < g.owner.length && given < count; t++) {
    if (!g.map.stateOf[t]) continue;
    if (g.owner[t] !== to) setTile(g, t, to, to, []);
    given++;
  }
}
export function tagId(g: GameState, tag: string): CountryId { return g.countries.findIndex(c => c.tag === tag); }
