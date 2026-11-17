// The world map: a grid of tiles (terrain byte + state id per tile) plus a table of named states.

export const enum Terrain { Sea = 0, Lake = 1, Plains = 2, Forest = 3, Hills = 4, Mountains = 5, Desert = 6 }
export const TERRAIN_MASK = 0x0f;
export const RIVER_BIT = 0x80;
export const COAST_BIT = 0x40;

export interface StateResources { coal: boolean; iron: boolean; fertility: number; forest: number }

export interface StateDef {
  id: number;
  key: string;
  name: string;
  modern: string;
  tiles: number;
  coastal: boolean;
  centroid: [number, number];
  neighbors: number[];
  resources: StateResources;
  popWeight: number;
}

export interface MapGrid { width: number; height: number; terrain: Uint8Array; stateOf: Uint16Array }

export interface MapData extends MapGrid {
  states: StateDef[]; // index = id; [0] is a placeholder
  landTiles: number;
}

const MAGIC = [0x49, 0x47, 0x4d, 0x31]; // "IGM1"
const VERSION = 1;
const HEADER = 10;

export function isLand(terrainByte: number): boolean {
  const t = terrainByte & TERRAIN_MASK;
  return t !== Terrain.Sea && t !== Terrain.Lake;
}

export function encodeGrid(m: MapGrid): Uint8Array {
  const n = m.width * m.height;
  const out = new Uint8Array(HEADER + n * 3);
  const dv = new DataView(out.buffer);
  MAGIC.forEach((b, i) => (out[i] = b));
  dv.setUint16(4, VERSION, true);
  dv.setUint16(6, m.width, true);
  dv.setUint16(8, m.height, true);
  out.set(m.terrain, HEADER);
  for (let i = 0; i < n; i++) dv.setUint16(HEADER + n + i * 2, m.stateOf[i], true);
  return out;
}

export function decodeGrid(bytes: Uint8Array): MapGrid {
  if (bytes.length < HEADER || MAGIC.some((b, i) => bytes[i] !== b)) throw new Error('Not an IGM1 map file');
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const version = dv.getUint16(4, true);
  if (version !== VERSION) throw new Error(`Unsupported IGM1 version ${version}`);
  const width = dv.getUint16(6, true);
  const height = dv.getUint16(8, true);
  const n = width * height;
  if (bytes.length < HEADER + n * 3) throw new Error('Truncated IGM1 map file');
  const terrain = bytes.slice(HEADER, HEADER + n);
  const stateOf = new Uint16Array(n);
  for (let i = 0; i < n; i++) stateOf[i] = dv.getUint16(HEADER + n + i * 2, true);
  return { width, height, terrain, stateOf };
}

export function assembleMap(grid: MapGrid, states: StateDef[]): MapData {
  let landTiles = 0;
  for (let i = 0; i < grid.terrain.length; i++) if (isLand(grid.terrain[i])) landTiles++;
  return { ...grid, states, landTiles };
}

export async function loadMap(baseUrl: string): Promise<MapData> {
  const [gridRes, statesRes] = await Promise.all([fetch(`${baseUrl}data/world.igz`), fetch(`${baseUrl}data/states.json`)]);
  if (!gridRes.ok || !statesRes.ok) throw new Error('Could not download the world map');
  let bytes = new Uint8Array(await gridRes.arrayBuffer());
  // The file is gzip; some servers decompress it on the way, so check the magic bytes.
  if (bytes[0] === 0x1f && bytes[1] === 0x8b) {
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
    bytes = new Uint8Array(await new Response(stream).arrayBuffer());
  }
  const states = (await statesRes.json()) as StateDef[];
  return assembleMap(decodeGrid(bytes), [placeholderState(), ...states]);
}

export function placeholderState(): StateDef {
  return { id: 0, key: '', name: '', modern: '', tiles: 0, coastal: false, centroid: [0, 0], neighbors: [], resources: { coal: false, iron: false, fertility: 0, forest: 0 }, popWeight: 0 };
}
