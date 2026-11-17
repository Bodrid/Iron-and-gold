import type { GameState } from './types';

/** FNV-1a fingerprint of the game, for determinism and save/load tests. */
export function hashState(state: GameState): number {
  let h = 0x811c9dc5;
  const mix = (v: number) => {
    const x = Math.round(v * 1000);
    const lo = x | 0, hi = Math.floor(x / 4294967296) | 0;
    h = Math.imul(h ^ lo, 0x01000193);
    h = Math.imul(h ^ hi, 0x01000193);
  };
  mix(state.tick); mix(state.rng); mix(state.nextId);
  for (let i = 0; i < state.owner.length; i++) { h = Math.imul(h ^ state.owner[i], 0x01000193); h = Math.imul(h ^ state.controller[i], 0x01000193); }
  for (const c of state.countries) {
    mix(c.alive ? 1 : 0); mix(c.troops); mix(c.maxTroops); mix(c.money); mix(c.tiles); mix(c.controlled); mix(c.population); mix(c.gdp); mix(c.sol);
    for (const k of Object.keys(c.stockpile).sort()) mix((c.stockpile as any)[k]);
  }
  for (const s of state.states) { mix(s.owner); mix(s.controller); mix(s.population); for (const b of s.buildings) { mix(b.level); mix(b.tile); } }
  for (const a of state.attacks) { mix(a.id); mix(a.attacker); mix(a.target); mix(a.troops); }
  for (const w of state.wars) { mix(w.id); mix(w.a); mix(w.b); mix(w.casualties[0]); mix(w.casualties[1]); }
  mix(state.constructions.length);
  return h >>> 0;
}
