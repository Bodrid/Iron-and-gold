// Wars between countries (stage-1 placeholder for Victoria-style diplomatic plays).
import type { CountryId, GameState, War } from './types';

export function atWar(state: GameState, a: CountryId, b: CountryId): War | undefined {
  return state.wars.find(w => (w.a === a && w.b === b) || (w.a === b && w.b === a));
}

/** Starts a war with no checks (tests and internal use). */
export function declareWarRaw(state: GameState, a: CountryId, b: CountryId): War {
  const w: War = { id: state.nextId++, a, b, startTick: state.tick, casualties: [0, 0] };
  state.wars.push(w);
  return w;
}

export function addCasualties(state: GameState, country: CountryId, enemy: CountryId, n: number): void {
  const w = atWar(state, country, enemy);
  if (w) w.casualties[w.a === country ? 0 : 1] += n;
}
