// Small sea worlds for naval tests.
import { makeGame, stateId, stateTiles } from '../testing';
import type { GameState } from '../types';

/** XXX (state A, west) and YYY (state B, east) facing each other across 24 tiles of open sea, plus XXX's second port C in the north-east. */
export function seaWorld(opts: { ports?: boolean; shipyards?: boolean; seaLink?: boolean; ai?: boolean } = {}): GameState {
  const rows: string[] = [];
  for (let y = 0; y < 24; y++) {
    const mid = opts.seaLink === false ? '........AAAAAAAA........' : '.'.repeat(24);
    rows.push('A'.repeat(16) + mid + (y < 6 ? 'C'.repeat(16) : 'B'.repeat(16)));
  }
  const g = makeGame({ rows, owners: { A: 'XXX', B: 'YYY', C: 'XXX' }, population: 2_000_000, money: 1e6, ai: opts.ai });
  const add = (k: string, type: 'port' | 'shipyard') => g.states[stateId(g, k)].buildings.push({ type, level: 1, tile: stateTiles(g, k)[type === 'port' ? 0 : 1] });
  if (opts.ports !== false) for (const k of ['T-A', 'T-B', 'T-C']) add(k, 'port');
  if (opts.shipyards) for (const k of ['T-A', 'T-B']) add(k, 'shipyard');
  for (const c of g.countries.slice(1)) { c.stockpile.wood = 1e5; c.stockpile.iron = 1e5; c.stockpile.arms = 1e5; }
  return g;
}
