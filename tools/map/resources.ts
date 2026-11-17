// Deposits, farmland, forests and population weights for each state.
import { Terrain, TERRAIN_MASK, type StateDef } from '../../src/map/format';
import { RESOURCE_OVERRIDES } from './resourceOverrides';

export interface City { tile: number; pop: number }

function hash(s: string, salt: number): number {
  let h = 2166136261 ^ salt;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  h = Math.imul(h ^ (h >>> 15), 2246822507);
  return ((h ^ (h >>> 13)) >>> 0) / 4294967296;
}

export function assignResources(defs: StateDef[], stateOf: Uint16Array, terrain: Uint8Array, _w: number, cities: City[]): void {
  const n = defs.length + 1;
  const plains = new Float64Array(n), hills = new Float64Array(n), mtn = new Float64Array(n), forest = new Float64Array(n), desert = new Float64Array(n), land = new Float64Array(n);
  for (let i = 0; i < stateOf.length; i++) {
    const s = stateOf[i];
    if (!s) continue;
    land[s]++;
    switch (terrain[i] & TERRAIN_MASK) {
      case Terrain.Plains: plains[s]++; break;
      case Terrain.Hills: hills[s]++; break;
      case Terrain.Mountains: mtn[s]++; break;
      case Terrain.Forest: forest[s]++; break;
      case Terrain.Desert: desert[s]++; break;
    }
  }
  const cityWeight = new Float64Array(n);
  for (const c of cities) { const s = stateOf[c.tile]; if (s) cityWeight[s] += Math.sqrt(c.pop) / 50; }
  for (const d of defs) {
    const s = d.id, L = Math.max(1, land[s]);
    const fert = (plains[s] + hills[s] * 0.5 + forest[s] * 0.25) / L;
    const rough = (hills[s] + mtn[s]) / L;
    d.resources.fertility = Math.round(fert * 1000) / 1000;
    d.resources.forest = Math.round((forest[s] / L) * 1000) / 1000;
    const o = RESOURCE_OVERRIDES.filter(r => r.modern === d.modern && r.match.test(d.name));
    d.resources.coal = o.some(r => r.coal) || hash(d.key, 1) < 0.05 + 0.2 * rough;
    d.resources.iron = o.some(r => r.iron) || hash(d.key, 2) < 0.04 + 0.25 * rough;
    d.popWeight = Math.round((land[s] * (0.1 + fert) * 0.1 + cityWeight[s]) * 100) / 100;
  }
}
