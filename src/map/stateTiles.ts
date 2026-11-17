import type { MapData } from './format';

const cache = new WeakMap<MapData, { offsets: Uint32Array; tiles: Uint32Array }>();

function build(map: MapData) {
  const n = map.states.length;
  const counts = new Uint32Array(n + 1);
  for (let i = 0; i < map.stateOf.length; i++) counts[map.stateOf[i] + 1]++;
  const offsets = new Uint32Array(n + 1);
  for (let s = 1; s <= n; s++) offsets[s] = offsets[s - 1] + counts[s];
  const fill = offsets.slice();
  const tiles = new Uint32Array(map.stateOf.length);
  for (let i = 0; i < map.stateOf.length; i++) tiles[fill[map.stateOf[i]]++] = i;
  const v = { offsets, tiles };
  cache.set(map, v);
  return v;
}

/** Tile indices of a state, in ascending order. State 0 is every sea/lake tile. */
export function getStateTiles(map: MapData, stateId: number): Uint32Array {
  const v = cache.get(map) ?? build(map);
  return v.tiles.subarray(v.offsets[stateId], v.offsets[stateId + 1]);
}
