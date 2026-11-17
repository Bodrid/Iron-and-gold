// Builds the terrain byte for every tile: sea/lake/land type plus river and coast bits.
import { COAST_BIT, RIVER_BIT, Terrain, TERRAIN_MASK } from '../../src/map/format';
import { drawPolyline, fillPolygon, projectLines, projectRings } from './rasterize';
import { GRID, type Projection } from './project';

export interface TerrainSources { land: any; lakes: any; regions: any; rivers: any }

function hash2(x: number, y: number): number {
  let h = (x * 374761393 + y * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Smooth deterministic noise in [0,1). */
function valueNoise(x: number, y: number, scale: number): number {
  const fx = x / scale, fy = y / scale;
  const ix = Math.floor(fx), iy = Math.floor(fy);
  const tx = fx - ix, ty = fy - iy;
  const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
  const a = hash2(ix, iy), b = hash2(ix + 1, iy), c = hash2(ix, iy + 1), d = hash2(ix + 1, iy + 1);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}

export function buildTerrain(src: TerrainSources, p: Projection = GRID): Uint8Array {
  const { width: w, height: h } = p;
  const t = new Uint8Array(w * h); // Sea = 0
  const mask = new Uint8Array(w * h);
  for (const f of src.land.features) for (const rings of projectRings(f.geometry, p.toTileF)) fillPolygon(mask, w, h, rings, 1);

  // Base land: plains, with forest by latitude band and noise.
  const degPerRow = (p.latTop - p.latBottom) / h;
  const noiseScale = Math.max(2, w / 120);
  for (let y = 0; y < h; y++) {
    const lat = Math.abs(p.latTop - (y + 0.5) * degPerRow);
    const forestChance = lat >= 50 && lat <= 65 ? 0.7 : lat <= 12 ? 0.65 : lat > 65 ? 0.15 : 0.3;
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (!mask[i]) continue;
      t[i] = valueNoise(x, y, noiseScale) < forestChance ? Terrain.Forest : Terrain.Plains;
    }
  }

  // Named regions: mountains, foothills/plateaus, deserts.
  const region = new Uint8Array(w * h);
  for (const f of src.regions.features) {
    const cla = String(f.properties?.featurecla ?? '');
    const v = cla === 'Range/mtn' ? Terrain.Mountains : cla === 'Desert' ? Terrain.Desert : cla === 'Plateau' || cla === 'Foothills' ? Terrain.Hills : 0;
    if (!v) continue;
    for (const rings of projectRings(f.geometry, p.toTileF)) fillPolygon(region, w, h, rings, v);
  }
  for (let i = 0; i < t.length; i++) if (mask[i] && region[i]) t[i] = region[i];

  // Hills in a 2-tile ring around mountains.
  const isMtn = (i: number) => mask[i] && region[i] === Terrain.Mountains;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x;
    if (!mask[i] || region[i] === Terrain.Mountains || region[i] === Terrain.Desert) continue;
    let near = false;
    for (let dy = -2; dy <= 2 && !near; dy++) for (let dx = -2; dx <= 2 && !near; dx++) {
      const nx = x + dx, ny = y + dy;
      if (nx >= 0 && ny >= 0 && nx < w && ny < h && isMtn(ny * w + nx)) near = true;
    }
    if (near) t[i] = Terrain.Hills;
  }

  // Lakes.
  const lake = new Uint8Array(w * h);
  for (const f of src.lakes.features) for (const rings of projectRings(f.geometry, p.toTileF)) fillPolygon(lake, w, h, rings, 1);
  for (let i = 0; i < t.length; i++) if (mask[i] && lake[i]) t[i] = Terrain.Lake;

  // Rivers (major ones only), on land.
  const river = new Uint8Array(w * h);
  for (const f of src.rivers.features) {
    if ((f.properties?.scalerank ?? 99) > 6) continue;
    for (const line of projectLines(f.geometry, p.toTileF)) drawPolyline(river, w, h, line, 1);
  }
  for (let i = 0; i < t.length; i++) {
    const k = t[i] & TERRAIN_MASK;
    if (river[i] && k !== Terrain.Sea && k !== Terrain.Lake) t[i] |= RIVER_BIT;
  }

  // Coast: land next to sea.
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x;
    const k = t[i] & TERRAIN_MASK;
    if (k === Terrain.Sea || k === Terrain.Lake) continue;
    const sea = (nx: number, ny: number) => nx >= 0 && ny >= 0 && nx < w && ny < h && (t[ny * w + nx] & TERRAIN_MASK) === Terrain.Sea;
    if (sea(x - 1, y) || sea(x + 1, y) || sea(x, y - 1) || sea(x, y + 1)) t[i] |= COAST_BIT;
  }
  return t;
}
