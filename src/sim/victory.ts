// How a game ends: early victory at half the world's land, defeat when the player falls, or the end date.
import { BALANCE } from './balance';
import { systems } from './registry';
import type { CountryId, GameState, SimEvent } from './types';

export const VICTORY_LAND_SHARE = 0.5;

export interface ScoreRow { country: CountryId; tag: string; name: string; score: number; gdp: number; population: number; sol: number; tiles: number; isPlayer: boolean }

export function computeScores(state: GameState): ScoreRow[] {
  const alive = state.countries.filter(c => c.alive && c.id);
  const max = (f: (c: (typeof alive)[number]) => number) => Math.max(1e-9, ...alive.map(f));
  const [mg, mp, ms, mt] = [max(c => c.gdp), max(c => c.population), max(c => c.sol), max(c => c.tiles)];
  const W = BALANCE.score;
  return alive
    .map(c => ({ country: c.id, tag: c.tag, name: c.name, isPlayer: c.isPlayer, gdp: c.gdp, population: c.population, sol: c.sol, tiles: c.tiles,
      score: W.GDP * (c.gdp / mg) + W.POPULATION * (c.population / mp) + W.SOL * (c.sol / ms) + W.LAND * (c.tiles / mt) }))
    .sort((a, b) => b.score - a.score || a.country - b.country);
}

export function checkOutcome(state: GameState, events: SimEvent[]): void {
  if (state.outcome) return;
  const player = state.countries.find(c => c.isPlayer);
  let kind: 'victory' | 'defeat' | 'endDate' | null = null;
  if (player && !player.alive) kind = 'defeat';
  else if (player && player.tiles >= state.map.landTiles * VICTORY_LAND_SHARE) kind = 'victory';
  else if (state.tick >= state.endTick) kind = 'endDate';
  if (!kind) return;
  state.outcome = { kind, tick: state.tick };
  events.push({ type: 'gameOver', kind });
}

systems.end.push((state, events) => checkOutcome(state, events));
