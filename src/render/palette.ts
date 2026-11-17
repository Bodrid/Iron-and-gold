export const PALETTE_SIZE = 4096;

/** RGBA per country id (id 0 = unclaimed, transparent). */
export function buildPalette(countries: { id: number; color: number }[]): Uint8Array {
  const p = new Uint8Array(PALETTE_SIZE * 4);
  for (const c of countries) {
    if (c.id <= 0 || c.id >= PALETTE_SIZE) continue;
    p[c.id * 4] = (c.color >> 16) & 255;
    p[c.id * 4 + 1] = (c.color >> 8) & 255;
    p[c.id * 4 + 2] = c.color & 255;
    p[c.id * 4 + 3] = 255;
  }
  return p;
}
