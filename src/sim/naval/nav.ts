// Coarse sea navigation: 4×4-tile cells, joined only where the water beneath is connected, plus cached A* sea lanes.
import { COAST_BIT, Terrain, TERRAIN_MASK, type MapData } from '../../map/format';
import { getStateTiles } from '../../map/stateTiles';
import { Heap } from '../heap';

export const NAV_CELL = 8;
const MIN_SEA_TILES = 4;

export interface NavGrid { w: number; h: number; sea: Uint8Array; region: Int32Array /* sea body id per cell, 0 = not navigable */ }

const grids = new WeakMap<MapData, NavGrid>();
const ports = new WeakMap<MapData, Map<number, number>>();
const paths = new WeakMap<MapData, Map<string, Int32Array | null>>();

const isSea = (b: number) => (b & TERRAIN_MASK) === Terrain.Sea;

export function getNavGrid(map: MapData): NavGrid {
  const cached = grids.get(map);
  if (cached) return cached;
  const { width: W, height: H } = map;
  // Sea bodies at tile level (4-connected).
  const body = new Int32Array(W * H);
  const queue = new Int32Array(W * H);
  let next = 0;
  for (let i = 0; i < W * H; i++) {
    if (body[i] || !isSea(map.terrain[i])) continue;
    next++;
    let head = 0, tail = 0;
    queue[tail++] = i; body[i] = next;
    while (head < tail) {
      const t = queue[head++], x = t % W;
      const visit = (n: number) => { if (!body[n] && isSea(map.terrain[n])) { body[n] = next; queue[tail++] = n; } };
      if (x > 0) visit(t - 1);
      if (x < W - 1) visit(t + 1);
      if (t >= W) visit(t - W);
      if (t + W < W * H) visit(t + W);
    }
  }
  const w = Math.ceil(W / NAV_CELL), h = Math.ceil(H / NAV_CELL);
  const sea = new Uint8Array(w * h), region = new Int32Array(w * h);
  const counts = new Map<number, number>();
  for (let cy = 0; cy < h; cy++) for (let cx = 0; cx < w; cx++) {
    counts.clear();
    for (let dy = 0; dy < NAV_CELL; dy++) for (let dx = 0; dx < NAV_CELL; dx++) {
      const x = cx * NAV_CELL + dx, y = cy * NAV_CELL + dy;
      if (x >= W || y >= H) continue;
      const b = body[y * W + x];
      if (b) counts.set(b, (counts.get(b) ?? 0) + 1);
    }
    let best = 0, bestN = 0;
    for (const [b, n] of counts) if (n > bestN || (n === bestN && b < best)) { best = b; bestN = n; }
    if (bestN >= MIN_SEA_TILES) { sea[cy * w + cx] = 1; region[cy * w + cx] = best; }
  }
  const g = { w, h, sea, region };
  grids.set(map, g);
  return g;
}

export function cellOfTile(tile: number, map: MapData): number {
  const g = getNavGrid(map);
  return Math.floor(Math.floor(tile / map.width) / NAV_CELL) * g.w + Math.floor((tile % map.width) / NAV_CELL);
}

export function cellCentre(cell: number, grid: NavGrid): [number, number] {
  return [(cell % grid.w) * NAV_CELL + NAV_CELL / 2, Math.floor(cell / grid.w) * NAV_CELL + NAV_CELL / 2];
}

/** The navigable cell a state's ships use: next to its coast tile nearest the centroid. -1 if it has no sea coast. */
export function portCell(map: MapData, stateId: number): number {
  let cache = ports.get(map);
  if (!cache) { cache = new Map(); ports.set(map, cache); }
  const hit = cache.get(stateId);
  if (hit !== undefined) return hit;
  const g = getNavGrid(map);
  const sd = map.states[stateId];
  const W = map.width;
  let best = -1, bestD = Infinity;
  for (const t of getStateTiles(map, stateId)) {
    if (!(map.terrain[t] & COAST_BIT)) continue;
    const x = t % W, y = Math.floor(t / W);
    for (const n of [t - 1, t + 1, t - W, t + W]) {
      if (n < 0 || n >= map.terrain.length || !isSea(map.terrain[n])) continue;
      const nx = n % W, ny = Math.floor(n / W);
      if (Math.abs(nx - x) > 1) continue;
      // Find a navigable cell at or right next to this sea tile.
      const c0x = Math.floor(nx / NAV_CELL), c0y = Math.floor(ny / NAV_CELL);
      for (let r = 0; r <= 1; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
        const cx = c0x + dx, cy = c0y + dy;
        if (cx < 0 || cy < 0 || cx >= g.w || cy >= g.h) continue;
        const c = cy * g.w + cx;
        if (!g.sea[c]) continue;
        const ddx = x - sd.centroid[0], ddy = y - sd.centroid[1];
        const d = ddx * ddx + ddy * ddy + r * 0.5;
        if (d < bestD || (d === bestD && c < best)) { bestD = d; best = c; }
      }
    }
  }
  cache.set(stateId, best);
  return best;
}

/** True if this lane is already known (no search needed). */
export function seaPathKnown(map: MapData, from: number, to: number): boolean {
  return paths.get(map)?.has(`${from},${to}`) ?? false;
}

/** Shortest sea lane between two navigable cells (8 directions), or null if they are on different seas. Cached. */
export function seaPath(map: MapData, from: number, to: number): Int32Array | null {
  const g = getNavGrid(map);
  if (from < 0 || to < 0 || !g.sea[from] || !g.sea[to] || g.region[from] !== g.region[to]) return null;
  let cache = paths.get(map);
  if (!cache) { cache = new Map(); paths.set(map, cache); }
  const key = `${from},${to}`;
  if (cache.has(key)) return cache.get(key)!;
  const n = g.w * g.h;
  const cost = new Int32Array(n).fill(-1);
  const prev = new Int32Array(n).fill(-1);
  const tx = to % g.w, ty = Math.floor(to / g.w);
  const hdist = (c: number) => { const dx = Math.abs((c % g.w) - tx), dy = Math.abs(Math.floor(c / g.w) - ty); return 10 * Math.max(dx, dy) + 4 * Math.min(dx, dy); };
  const open = new Heap();
  cost[from] = 0;
  // A slightly greedy heuristic (×1.5) explores far fewer cells; lanes stay within a few percent of shortest.
  open.push(hdist(from) * 1.5, from);
  const reg = g.region[from];
  let found = false;
  while (open.size) {
    const c = open.pop();
    if (c === to) { found = true; break; }
    const cx = c % g.w, cy = Math.floor(c / g.w);
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue;
      const nx = cx + dx, ny = cy + dy;
      if (nx < 0 || ny < 0 || nx >= g.w || ny >= g.h) continue;
      const nc = ny * g.w + nx;
      if (!g.sea[nc] || g.region[nc] !== reg) continue;
      if (dx && dy && (g.region[cy * g.w + nx] !== reg || g.region[ny * g.w + cx] !== reg)) continue; // no corner cutting
      const nd = cost[c] + (dx && dy ? 14 : 10);
      if (cost[nc] >= 0 && cost[nc] <= nd) continue;
      cost[nc] = nd;
      prev[nc] = c;
      open.push(nd + hdist(nc) * 1.5, nc);
    }
  }
  let out: Int32Array | null = null;
  if (found) {
    const rev: number[] = [];
    for (let c = to; c >= 0; c = prev[c]) { rev.push(c); if (c === from) break; }
    out = Int32Array.from(rev.reverse());
  }
  cache.set(key, out);
  return out;
}
