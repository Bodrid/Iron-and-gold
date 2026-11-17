// Downloads Natural Earth GeoJSON (public domain) once and caches it in tools/map/cache/.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const CACHE = join(dirname(fileURLToPath(import.meta.url)), 'cache');
const BASE = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson';

export function fetchNE(name: string): any {
  mkdirSync(CACHE, { recursive: true });
  const file = join(CACHE, `${name}.geojson`);
  if (!existsSync(file)) {
    console.log(`downloading ${name}…`);
    execFileSync('curl', ['-sSfL', '--retry', '3', '-o', file, `${BASE}/${name}.geojson`], { stdio: 'inherit' });
  }
  return JSON.parse(readFileSync(file, 'utf8'));
}
