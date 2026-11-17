// Turns Natural Earth admin-1 units into the game's named states: group, rasterize, merge tiny ones, split huge ones.
import { COAST_BIT, isLand, Terrain, TERRAIN_MASK, type StateDef } from '../../src/map/format';
import { fillPolygon, projectRings } from './rasterize';
import type { Projection } from './project';

export interface Group { name: string; modern: string; polygons: any[] }
export interface StateMeta { key: string; name: string; modern: string; alive: boolean }

/** Countries with at least this many regions (and more than 25 units) are grouped by region. */
const MIN_REGIONS = 8;

export function groupAdmin1(features: any[]): Map<string, Group> {
  const stats = new Map<string, { n: number; regions: Set<string> }>();
  for (const f of features) {
    const p = f.properties;
    const s = stats.get(p.adm0_a3) ?? { n: 0, regions: new Set<string>() };
    s.n++;
    if (p.region) s.regions.add(p.region);
    stats.set(p.adm0_a3, s);
  }
  const groups = new Map<string, Group>();
  for (const f of features) {
    const p = f.properties;
    const s = stats.get(p.adm0_a3)!;
    const byRegion = p.region && s.regions.size >= MIN_REGIONS && s.n > 25;
    const name = String(byRegion ? p.region : p.name ?? p.adm0_a3).trim();
    const key = `${p.adm0_a3}-${name}`;
    const g: Group = groups.get(key) ?? { name, modern: p.adm0_a3, polygons: [] };
    g.polygons.push(f.geometry);
    groups.set(key, g);
  }
  return groups;
}

function neighbors4(i: number, w: number, n: number, f: (j: number) => void) {
  const x = i % w;
  if (x > 0) f(i - 1);
  if (x < w - 1) f(i + 1);
  if (i >= w) f(i - w);
  if (i + w < n) f(i + w);
}

/** stateOf values are 1-based indexes into meta (meta[id-1]). */
export function rasterizeStates(groups: Map<string, Group>, terrain: Uint8Array, p: Projection): { stateOf: Uint16Array; meta: StateMeta[] } {
  const n = p.width * p.height;
  const stateOf = new Uint16Array(n);
  const meta: StateMeta[] = [];
  const keys = [...groups.keys()].sort();
  for (const key of keys) {
    const g = groups.get(key)!;
    meta.push({ key, name: g.name, modern: g.modern, alive: true });
    const id = meta.length;
    for (const geom of g.polygons) for (const rings of projectRings(geom, p.toTileF)) fillPolygon(stateOf, p.width, p.height, rings, id);
  }
  for (let i = 0; i < n; i++) if (!isLand(terrain[i])) stateOf[i] = 0;
  // Land with no admin polygon: nearest state, searching across sea as well.
  const queue = new Int32Array(n);
  const owner = stateOf.slice();
  let head = 0, tail = 0;
  for (let i = 0; i < n; i++) if (owner[i]) queue[tail++] = i;
  while (head < tail) {
    const i = queue[head++];
    neighbors4(i, p.width, n, j => { if (!owner[j]) { owner[j] = owner[i]; queue[tail++] = j; } });
  }
  for (let i = 0; i < n; i++) if (isLand(terrain[i]) && !stateOf[i]) stateOf[i] = owner[i];
  const seen = new Set<number>();
  for (let i = 0; i < n; i++) if (stateOf[i]) seen.add(stateOf[i]);
  meta.forEach((m, k) => { if (!seen.has(k + 1)) m.alive = false; });
  return { stateOf, meta };
}

function tileCounts(stateOf: Uint16Array, size: number): Int32Array {
  const c = new Int32Array(size + 1);
  for (let i = 0; i < stateOf.length; i++) c[stateOf[i]]++;
  return c;
}

function centroids(stateOf: Uint16Array, w: number, size: number): Float64Array {
  const sx = new Float64Array(size + 1), sy = new Float64Array(size + 1), c = new Float64Array(size + 1);
  for (let i = 0; i < stateOf.length; i++) { const s = stateOf[i]; if (!s) continue; sx[s] += i % w; sy[s] += Math.floor(i / w); c[s]++; }
  const out = new Float64Array((size + 1) * 2);
  for (let s = 1; s <= size; s++) if (c[s]) { out[s * 2] = sx[s] / c[s]; out[s * 2 + 1] = sy[s] / c[s]; }
  return out;
}

export function mergeSmall(stateOf: Uint16Array, meta: StateMeta[], _terrain: Uint8Array, w: number, minTiles: number | ((modern: string) => number)): void {
  const n = stateOf.length;
  const minFor = typeof minTiles === 'number' ? () => minTiles : minTiles;
  for (let pass = 0; pass < 6; pass++) {
    const counts = tileCounts(stateOf, meta.length);
    const order = meta.map((_, k) => k + 1).filter(s => meta[s - 1].alive && counts[s] < minFor(meta[s - 1].modern)).sort((a, b) => counts[a] - counts[b] || a - b);
    if (!order.length) return;
    const cent = centroids(stateOf, w, meta.length);
    const target = new Map<number, number>();
    for (const s of order) {
      // Longest shared border with a same-country state.
      const border = new Map<number, number>();
      for (let i = 0; i < n; i++) {
        if (stateOf[i] !== s) continue;
        neighbors4(i, w, n, j => { const t = stateOf[j]; if (t && t !== s && meta[t - 1].modern === meta[s - 1].modern) border.set(t, (border.get(t) ?? 0) + 1); });
      }
      let best = 0, bestN = 0;
      for (const [t, k] of border) if (k > bestN || (k === bestN && t < best)) { best = t; bestN = k; }
      if (!best) {
        // An island: join the nearest same-country state within 40 tiles.
        let bd = 40 * 40;
        for (let t = 1; t <= meta.length; t++) {
          if (t === s || !meta[t - 1].alive || meta[t - 1].modern !== meta[s - 1].modern || target.has(t)) continue;
          const dx = cent[t * 2] - cent[s * 2], dy = cent[t * 2 + 1] - cent[s * 2 + 1];
          if (dx * dx + dy * dy < bd) { bd = dx * dx + dy * dy; best = t; }
        }
      }
      if (best && !target.has(best)) target.set(s, best);
    }
    if (!target.size) return;
    for (let i = 0; i < n; i++) { const t = target.get(stateOf[i]); if (t) stateOf[i] = t; }
    for (const s of target.keys()) meta[s - 1].alive = false;
  }
}

const DIRS = ['East', 'North-East', 'North', 'North-West', 'West', 'South-West', 'South', 'South-East'];

export function splitLarge(stateOf: Uint16Array, meta: StateMeta[], w: number, maxTiles: number): void {
  const counts = tileCounts(stateOf, meta.length);
  const original = meta.length;
  for (let s = 1; s <= original; s++) {
    if (!meta[s - 1].alive || counts[s] <= maxTiles) continue;
    const k = Math.ceil(counts[s] / maxTiles);
    const tiles: number[] = [];
    for (let i = 0; i < stateOf.length; i++) if (stateOf[i] === s) tiles.push(i);
    const xs = tiles.map(i => i % w), ys = tiles.map(i => Math.floor(i / w));
    // Seeds at quantiles of x+y order, then a few rounds of k-means.
    const order = tiles.map((_, j) => j).sort((a, b) => xs[a] + ys[a] - (xs[b] + ys[b]) || a - b);
    const cx: number[] = [], cy: number[] = [];
    for (let c = 0; c < k; c++) { const j = order[Math.floor(((c + 0.5) / k) * order.length)]; cx.push(xs[j]); cy.push(ys[j]); }
    const assign = new Int32Array(tiles.length);
    for (let it = 0; it < 10; it++) {
      for (let j = 0; j < tiles.length; j++) {
        let best = 0, bd = Infinity;
        for (let c = 0; c < k; c++) { const dx = xs[j] - cx[c], dy = ys[j] - cy[c], d = dx * dx + dy * dy; if (d < bd) { bd = d; best = c; } }
        assign[j] = best;
      }
      const sx = new Array(k).fill(0), sy = new Array(k).fill(0), sn = new Array(k).fill(0);
      for (let j = 0; j < tiles.length; j++) { sx[assign[j]] += xs[j]; sy[assign[j]] += ys[j]; sn[assign[j]]++; }
      for (let c = 0; c < k; c++) if (sn[c]) { cx[c] = sx[c] / sn[c]; cy[c] = sy[c] / sn[c]; }
    }
    const mx = xs.reduce((a, b) => a + b, 0) / xs.length, my = ys.reduce((a, b) => a + b, 0) / ys.length;
    const used = new Map<string, number>();
    const ids: number[] = [];
    for (let c = 0; c < k; c++) {
      const angle = Math.atan2(my - cy[c], cx[c] - mx);
      let dir = DIRS[((Math.round(angle / (Math.PI / 4)) % 8) + 8) % 8];
      const seen = used.get(dir) ?? 0;
      used.set(dir, seen + 1);
      if (seen) dir = `${dir} ${seen + 1}`;
      const base = meta[s - 1];
      if (c === 0) { ids.push(s); base.name = `${base.name} (${dir})`; base.key = `${base.key} (${dir})`; continue; }
      meta.push({ key: `${base.key.replace(/ \([^)]*\)$/, '')} (${dir})`, name: `${base.name.replace(/ \([^)]*\)$/, '')} (${dir})`, modern: base.modern, alive: true });
      ids.push(meta.length);
    }
    for (let j = 0; j < tiles.length; j++) stateOf[tiles[j]] = ids[assign[j]];
  }
}

/** Renumbers live states 1..n (sorted by key) and computes their definitions (resources filled in later). */
export function finalizeStates(stateOf: Uint16Array, meta: StateMeta[], terrain: Uint8Array, w: number): { stateOf: Uint16Array; defs: StateDef[] } {
  const live = meta.map((m, k) => ({ m, old: k + 1 })).filter(x => x.m.alive).sort((a, b) => (a.m.key < b.m.key ? -1 : a.m.key > b.m.key ? 1 : 0));
  const remap = new Uint16Array(meta.length + 1);
  live.forEach((x, k) => (remap[x.old] = k + 1));
  const out = new Uint16Array(stateOf.length);
  for (let i = 0; i < stateOf.length; i++) out[i] = remap[stateOf[i]];
  const defs: StateDef[] = live.map((x, k) => ({ id: k + 1, key: x.m.key, name: x.m.name, modern: x.m.modern, tiles: 0, coastal: false, centroid: [0, 0] as [number, number], neighbors: [],
    resources: { coal: false, iron: false, fertility: 0, forest: 0 }, popWeight: 0 }));
  const n = out.length;
  const sx = new Float64Array(defs.length + 1), sy = new Float64Array(defs.length + 1);
  const nb = defs.map(() => new Set<number>());
  for (let i = 0; i < n; i++) {
    const s = out[i];
    if (!s) continue;
    const d = defs[s - 1];
    d.tiles++; sx[s] += i % w; sy[s] += Math.floor(i / w);
    if (terrain[i] & COAST_BIT) d.coastal = true;
    neighbors4(i, w, n, j => { const t = out[j]; if (t && t !== s) nb[s - 1].add(t); if ((terrain[j] & TERRAIN_MASK) === Terrain.Sea) d.coastal = true; });
  }
  defs.forEach((d, k) => {
    d.centroid = [Math.round((sx[k + 1] / d.tiles) * 10) / 10, Math.round((sy[k + 1] / d.tiles) * 10) / 10];
    d.neighbors = [...nb[k]].sort((a, b) => a - b);
  });
  return { stateOf: out, defs };
}
