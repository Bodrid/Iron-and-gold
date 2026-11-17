// Probe: how happy are interest groups across the 1836 world over time? (dev tool)
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { assembleMap, decodeGrid, placeholderState } from '../src/map/format';
import { createGame } from '../src/sim/state';
import { step } from '../src/sim/step';
import { getStart } from '../src/content/starts';
import { GROUP_IDS } from '../src/content/groups';

const states = JSON.parse(readFileSync('public/data/states.json', 'utf8'));
const map = assembleMap(decodeGrid(gunzipSync(readFileSync('public/data/world.igz'))), [placeholderState(), ...states]);
const g = createGame(map, getStart('1836'), { startId: '1836', playerTag: 'PRU', difficulty: 'hard', rivalsHarder: false, seed: 1 });
const years = Number(process.argv[2] ?? 3);
const counts: Record<string, number> = {};
const laws: Record<string, number> = {};
for (let y = 0; y <= years; y++) {
  if (y) for (let i = 0; i < 365 * 4; i++) for (const e of step(g, []).events) { if (e.type !== 'rejected') counts[e.type] = (counts[e.type] ?? 0) + 1; if (e.type === 'lawPassed') laws[e.law] = (laws[e.law] ?? 0) + 1; }
  let angry = 0, radical = 0;
  const worst: string[] = [];
  for (const c of g.countries) {
    if (!c.alive || !c.id) continue;
    for (const gid of GROUP_IDS) {
      const s = c.groups[gid];
      if (s.approval <= -5) angry++;
      if (s.radicalism >= 50) { radical++; worst.push(`${c.tag}:${gid}(${s.radicalism.toFixed(0)},${(s.clout * 100).toFixed(0)}%)`); }
    }
  }
  console.log(`year ${y}: angry groups ${angry}, radical ${radical} ${worst.slice(0, 12).join(' ')}`);
}
for (const t of ['GBR', 'RUS', 'USA', 'PRU', 'CHI']) {
  const c = g.countries.find(x => x.tag === t)!;
  console.log(t, `sol ${c.sol.toFixed(1)} techs ${c.techs.length} rp/mo ${c.researchRate.toFixed(1)} researching ${c.researching}`, GROUP_IDS.map(x => `${x.slice(0, 4)} ${(c.groups[x].clout * 100).toFixed(0)}%/${c.groups[x].approval.toFixed(1)}`).join(' '));
}
console.log(counts);
console.log(laws);
for (const t of ['GBR', 'CHI', 'RUS', 'USA']) {
  const c = g.countries.find(x => x.tag === t)!;
  let uni = 0; for (const s of g.states) if (s.owner === c.id) for (const b of s.buildings) if (b.type === 'university') uni += b.level;
  console.log(t, 'literacy', c.literacy.toFixed(2), 'universities', uni, 'pop', (c.population / 1e6).toFixed(0));
}
