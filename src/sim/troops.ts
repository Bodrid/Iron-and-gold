// The troop pool: max size from population and barracks, daily refill that consumes arms.
import { BALANCE } from './balance';
import { systems } from './registry';
import { mods, pctMult } from './mods';
import type { Country, GameState } from './types';

const T = BALANCE.troops;

function buildingLevels(state: GameState, c: Country, type: string): number {
  let n = 0;
  for (const s of state.states) if (s.owner === c.id && s.controller === c.id) for (const b of s.buildings) if (b.type === type) n += b.level;
  return n;
}

/** Hook for difficulty bonuses (Grand Master), filled in by the AI module. */
export const refillBonusHooks: ((state: GameState, c: Country) => number)[] = [];

export function recomputeMaxTroops(state: GameState, c: Country): void {
  c.maxTroops = Math.round((c.population * T.MANPOWER_SHARE + buildingLevels(state, c, 'barracks') * T.BARRACKS_TROOPS) * pctMult(mods(state, c).maxTroopsPct));
}

export function refillBonusPct(state: GameState, c: Country): number {
  let pct = Math.min(T.BARRACKS_REFILL_CAP_PCT, buildingLevels(state, c, 'barracks') * T.BARRACKS_REFILL_PCT) + buildingLevels(state, c, 'railway') * T.RAILWAY_REFILL_PCT;
  pct += mods(state, c).refillPct;
  for (const h of refillBonusHooks) pct += h(state, c);
  return pct;
}

export function dailyTroops(state: GameState, c: Country): void {
  recomputeMaxTroops(state, c);
  if (c.troops > c.maxTroops) { c.troops -= (c.troops - c.maxTroops) * T.EXCESS_DECAY; return; }
  const base = (c.maxTroops - c.troops) * T.REFILL_RATE * (1 + refillBonusPct(state, c) / 100);
  if (base <= 0) return;
  const needed = base / T.TROOPS_PER_ARMS;
  const r = Math.min(1, c.stockpile.arms / needed);
  c.stockpile.arms -= needed * r;
  c.troops = Math.min(c.maxTroops, c.troops + base * (r + (1 - r) * T.NO_ARMS_FACTOR));
}

systems.day.push(state => { for (const c of state.countries) if (c.alive) dailyTroops(state, c); });
