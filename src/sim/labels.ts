// Where to write each country's name: in the thickest part of its largest connected region.
import { getStateTiles } from '../map/stateTiles';
import { statesOwnedBy } from './control';
import type { BuildingIcon, GameState, Label } from './types';

export function computeLabels(state: GameState): Label[] {
  const { width: w } = state.map;
  const n = state.owner.length;
  const seen = new Uint8Array(n);
  const out: Label[] = [];
  const queue = new Int32Array(n);
  for (const c of state.countries) {
    if (!c.alive || !c.id) continue;
    let best: number[] | null = null;
    for (const s of statesOwnedBy(state, c.id)) {
      for (const start of getStateTiles(state.map, s)) {
        if (seen[start] || state.owner[start] !== c.id) continue;
        let head = 0, tail = 0;
        queue[tail++] = start; seen[start] = 1;
        const comp: number[] = [];
        while (head < tail) {
          const t = queue[head++];
          comp.push(t);
          const x = t % w;
          if (x > 0 && !seen[t - 1] && state.owner[t - 1] === c.id) { seen[t - 1] = 1; queue[tail++] = t - 1; }
          if (x < w - 1 && !seen[t + 1] && state.owner[t + 1] === c.id) { seen[t + 1] = 1; queue[tail++] = t + 1; }
          if (t >= w && !seen[t - w] && state.owner[t - w] === c.id) { seen[t - w] = 1; queue[tail++] = t - w; }
          if (t + w < n && !seen[t + w] && state.owner[t + w] === c.id) { seen[t + w] = 1; queue[tail++] = t + w; }
        }
        if (!best || comp.length > best.length) best = comp;
      }
    }
    if (!best) continue;
    out.push(placeLabel(best, w, c.id, c.name));
  }
  return out;
}

function placeLabel(comp: number[], w: number, country: number, text: string): Label {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const t of comp) { const x = t % w, y = Math.floor(t / w); if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  const bw = x1 - x0 + 3, bh = y1 - y0 + 3; // one-tile empty margin all round
  const INF = 1e9;
  const d = new Float32Array(bw * bh);
  for (const t of comp) d[(Math.floor(t / w) - y0 + 1) * bw + (t % w) - x0 + 1] = INF;
  for (let y = 1; y < bh - 1; y++) for (let x = 1; x < bw - 1; x++) { const i = y * bw + x; if (d[i]) d[i] = Math.min(d[i], d[i - 1] + 1, d[i - bw] + 1); }
  for (let y = bh - 2; y > 0; y--) for (let x = bw - 2; x > 0; x--) { const i = y * bw + x; if (d[i]) d[i] = Math.min(d[i], d[i + 1] + 1, d[i + bw] + 1); }
  let bi = 0, bd = -1;
  const cx = (bw - 1) / 2, cy = (bh - 1) / 2;
  for (let i = 0; i < d.length; i++) {
    // Prefer the deepest point; break ties towards the middle of the region.
    const v = d[i] - (Math.abs((i % bw) - cx) + Math.abs(Math.floor(i / bw) - cy)) * 1e-4;
    if (d[i] && v > bd) { bd = v; bi = i; }
  }
  const depth = d[bi];
  const fitWidth = ((x1 - x0 + 1) * 0.9) / Math.max(1, text.length * 0.6);
  const size = Math.max(1.5, Math.min(60, Math.sqrt(comp.length) * 0.35, depth * 1.8, fitWidth));
  return { country, x: (bi % bw) + x0 - 1 + 0.5, y: Math.floor(bi / bw) + y0 - 1 + 0.5, size, text };
}

export function buildingIcons(state: GameState): BuildingIcon[] {
  const out: BuildingIcon[] = [];
  for (const s of state.states) for (const b of s.buildings) out.push({ type: b.type, tile: b.tile, level: b.level, owner: s.owner });
  return out;
}
