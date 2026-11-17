// npm run map — builds public/data/world.igz and public/data/states.json from Natural Earth data.
import { mkdirSync, writeFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { encodeGrid } from '../../src/map/format';
import { fetchNE } from './download';
import { GRID } from './project';
import { assignResources } from './resources';
import { finalizeStates, groupAdmin1, mergeSmall, rasterizeStates, splitLarge } from './states';
import { buildTerrain } from './terrain';
import { STRAITS } from './straits';

const MIN_TILES = Number(process.env.MIN_TILES ?? 300);
const MIN_TILES_EUROPE = Number(process.env.MIN_TILES_EUROPE ?? 40);
/** Europe gets finer states: unification, partitions and most early wars happen there. */
const EUROPE = new Set(['DEU', 'POL', 'ITA', 'FRA', 'AUT', 'CZE', 'SVK', 'HUN', 'SVN', 'HRV', 'BIH', 'SRB', 'MNE', 'KOS', 'MKD', 'ALB', 'GRC', 'BGR', 'ROU', 'MDA',
  'GBR', 'IRL', 'BEL', 'NLD', 'LUX', 'CHE', 'DNK', 'ESP', 'PRT', 'SWE', 'NOR', 'FIN', 'EST', 'LVA', 'LTU', 'BLR', 'UKR']);
const MAX_TILES = Number(process.env.MAX_TILES ?? 5000);

const t0 = Date.now();
const terrain = buildTerrain({
  land: fetchNE('ne_50m_land'), lakes: fetchNE('ne_50m_lakes'),
  regions: fetchNE('ne_10m_geography_regions_polys'), rivers: fetchNE('ne_50m_rivers_lake_centerlines'),
}, GRID, STRAITS);
console.log('terrain', Date.now() - t0, 'ms');
const admin = fetchNE('ne_10m_admin_1_states_provinces').features.filter((f: any) => f.properties.adm0_a3 !== 'ATA');
const r = rasterizeStates(groupAdmin1(admin), terrain, GRID);
mergeSmall(r.stateOf, r.meta, terrain, GRID.width, m => (EUROPE.has(m) ? MIN_TILES_EUROPE : MIN_TILES));
splitLarge(r.stateOf, r.meta, GRID.width, MAX_TILES);
const { stateOf, defs } = finalizeStates(r.stateOf, r.meta, terrain, GRID.width);
const cities = fetchNE('ne_10m_populated_places_simple').features.map((f: any) => {
  const [x, y] = GRID.toTile(f.properties.longitude, f.properties.latitude);
  return { tile: y * GRID.width + x, pop: f.properties.pop_max ?? 0 };
});
assignResources(defs, stateOf, terrain, GRID.width, cities);
mkdirSync('public/data', { recursive: true });
const grid = gzipSync(encodeGrid({ width: GRID.width, height: GRID.height, terrain, stateOf }), { level: 9 });
writeFileSync('public/data/world.igz', grid);
writeFileSync('public/data/states.json', JSON.stringify(defs));
console.log(`states: ${defs.length}, grid: ${(grid.length / 1e6).toFixed(2)} MB, ${Date.now() - t0} ms`);
