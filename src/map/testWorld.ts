// Small hand-drawn maps for tests.
import { COAST_BIT, Terrain, TERRAIN_MASK, assembleMap, isLand, placeholderState, type MapData, type StateDef, type StateResources } from './format';

const TERRAIN_CHARS: Record<string, Terrain> = { '.': Terrain.Sea, '~': Terrain.Lake, p: Terrain.Plains, f: Terrain.Forest, h: Terrain.Hills, m: Terrain.Mountains, d: Terrain.Desert };

export interface TestWorldOptions { resources?: Record<string, Partial<StateResources>>; popWeight?: Record<string, number> }

export function makeTestWorld(rows: string[], opts: TestWorldOptions = {}): MapData {
  const height = rows.length;
  const width = Math.max(...rows.map(r => r.length));
  const n = width * height;
  const terrain = new Uint8Array(n);
  const stateOf = new Uint16Array(n);
  const ch = (x: number, y: number) => rows[y][x] ?? '.';
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const c = ch(x, y);
    terrain[y * width + x] = c >= 'A' && c <= 'Z' ? Terrain.Plains : (TERRAIN_CHARS[c] ?? Terrain.Sea);
  }

  const keyToId = new Map<string, number>();
  const states: StateDef[] = [placeholderState()];
  const counters: Record<string, number> = {};
  const newState = (key: string) => {
    const id = states.length;
    keyToId.set(key, id);
    states.push({ id, key, name: key.slice(2), modern: 'TST', tiles: 0, coastal: false, centroid: [0, 0], neighbors: [],
      resources: { coal: false, iron: false, fertility: 1, forest: 0, ...(opts.resources?.[key] ?? {}) }, popWeight: opts.popWeight?.[key] ?? 1 });
    return id;
  };
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const i = y * width + x;
    if (!isLand(terrain[i]) || stateOf[i]) continue;
    const c = ch(x, y);
    if (c >= 'A' && c <= 'Z') {
      const key = `T-${c}`;
      stateOf[i] = keyToId.get(key) ?? newState(key);
      continue;
    }
    counters[c] = (counters[c] ?? 0) + 1;
    const id = newState(`T-${c}${counters[c]}`);
    const stack = [i];
    stateOf[i] = id;
    while (stack.length) {
      const t = stack.pop()!;
      const tx = t % width, ty = (t / width) | 0;
      for (const [nx, ny] of [[tx - 1, ty], [tx + 1, ty], [tx, ty - 1], [tx, ty + 1]]) {
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
        const ni = ny * width + nx;
        if (!stateOf[ni] && ch(nx, ny) === c) { stateOf[ni] = id; stack.push(ni); }
      }
    }
  }

  const sums = states.map(() => [0, 0]);
  const nb = states.map(() => new Set<number>());
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const i = y * width + x;
    const s = stateOf[i];
    if (!s) continue;
    const st = states[s];
    st.tiles++; sums[s][0] += x; sums[s][1] += y;
    for (const [nx, ny] of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]]) {
      const outside = nx < 0 || ny < 0 || nx >= width || ny >= height;
      const ni = ny * width + nx;
      if (!outside && (terrain[ni] & TERRAIN_MASK) === Terrain.Sea) { terrain[i] |= COAST_BIT; st.coastal = true; }
      if (!outside && stateOf[ni] && stateOf[ni] !== s) nb[s].add(stateOf[ni]);
    }
  }
  for (const st of states.slice(1)) {
    st.centroid = [sums[st.id][0] / st.tiles, sums[st.id][1] / st.tiles];
    st.neighbors = [...nb[st.id]].sort((a, b) => a - b);
  }
  return assembleMap({ width, height, terrain, stateOf }, states);
}
