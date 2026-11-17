// Seeded randomness. The generator state lives in GameState.rng so saves and replays are exact.

/** mulberry32: returns a float in [0, 1) and advances state.rng. */
export function nextRandom(state: { rng: number }): number {
  let t = (state.rng = (state.rng + 0x6d2b79f5) | 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function randomInt(state: { rng: number }, n: number): number {
  return Math.floor(nextRandom(state) * n);
}

/** Stateless 32-bit hash for deterministic tie-breaks. */
export function tileHash(tile: number, salt: number): number {
  let h = (tile ^ Math.imul(salt | 0, 0x9e3779b9)) | 0;
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return (h ^ (h >>> 16)) >>> 0;
}

export function seedRng(seed: number): number {
  return tileHash(seed, 0x51ed270b) | 0;
}
