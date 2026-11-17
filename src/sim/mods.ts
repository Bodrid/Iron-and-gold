// A country's combined modifiers from techs (and other sources such as laws), so each system only asks
// "what's my multiplier" without knowing where it comes from.
import { BUILDING_TYPES, type BuildingType } from '../content/buildings';
import { EFFECT_KEYS, type Effects, type ScalarEffect } from '../content/effects';
import { TECHS, TECH_BY_ID } from '../content/techs';
import type { Country, GameState } from './types';

export type Mods = Record<ScalarEffect, number> & {
  /** Extra output percent per building type ('all' already included). */
  output: Record<BuildingType, number>;
};

/** Other sources of effects (laws register here). `sig` must change whenever `effects` would. */
export const effectSources: { sig: (state: GameState, c: Country) => string; effects: (state: GameState, c: Country) => Effects[] }[] = [];

/** Buildings some tech unlocks: they can't be built until that tech is known. */
export const TECH_GATED: Map<BuildingType, string> = new Map();
for (const t of TECHS) for (const b of t.effects.unlocks ?? []) TECH_GATED.set(b, t.id);

export function buildingUnlocked(c: Country, type: BuildingType): boolean {
  const tech = TECH_GATED.get(type);
  return !tech || c.techs.includes(tech);
}

const cache = new WeakMap<Country, { sig: string; mods: Mods }>();

function signature(state: GameState, c: Country): string {
  let s = `${c.techs.length}`;
  for (const src of effectSources) s += `|${src.sig(state, c)}`;
  return s;
}

/** Pure function of the country's techs and the registered sources; cached while those don't change. */
export function mods(state: GameState, c: Country): Mods {
  const sig = signature(state, c);
  const hit = cache.get(c);
  if (hit && hit.sig === sig) return hit.mods;
  const m = compute(state, c);
  cache.set(c, { sig, mods: m });
  return m;
}

function compute(state: GameState, c: Country): Mods {
  const m = { output: {} as Record<BuildingType, number> } as Mods;
  for (const k of EFFECT_KEYS) m[k] = 0;
  for (const b of BUILDING_TYPES) m.output[b] = 0;
  const all: Effects[] = [];
  for (const id of c.techs) { const t = TECH_BY_ID[id]; if (t) all.push(t.effects); }
  for (const src of effectSources) for (const e of src.effects(state, c)) all.push(e);
  for (const e of all) {
    for (const k of EFFECT_KEYS) m[k] += e[k] ?? 0;
    for (const [b, v] of Object.entries(e.outputPct ?? {}) as [BuildingType | 'all', number][]) {
      if (b === 'all') for (const t of BUILDING_TYPES) m.output[t] += v;
      else m.output[b] += v;
    }
  }
  return m;
}

/** 1 + pct/100, never below 0.1. */
export const pctMult = (pct: number) => Math.max(0.1, 1 + pct / 100);
