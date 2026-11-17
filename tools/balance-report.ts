// Dev tool: npx tsx tools/balance-report.ts [start=1836] [years=100] [seeds=1]
// AI-only games of the real world; prints each decade's top 10 and a summary of what happened.
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { assembleMap, decodeGrid, placeholderState } from '../src/map/format';
import { createGame } from '../src/sim/state';
import { step } from '../src/sim/step';
import { getStart } from '../src/content/starts';
import { computeScores } from '../src/sim/victory';
import { dateAtTick } from '../src/sim/calendar';
import type { SimEvent } from '../src/sim/types';

const startId = process.argv[2] ?? '1836';
const years = Number(process.argv[3] ?? 100);
const seeds = Number(process.argv[4] ?? 1);
const states = JSON.parse(readFileSync('public/data/states.json', 'utf8'));
const map = assembleMap(decodeGrid(gunzipSync(readFileSync('public/data/world.igz'))), [placeholderState(), ...states]);
const start = getStart(startId);
const fmt = (n: number) => (n >= 1e9 ? `${(n / 1e9).toFixed(1)}B` : n >= 1e6 ? `${(n / 1e6).toFixed(0)}M` : `${(n / 1e3).toFixed(0)}k`);

for (let seed = 1; seed <= seeds; seed++) {
  // The player is a small, far-away country so it barely affects the world; the AI is off for it.
  const g = createGame(map, start, { startId, playerTag: startId === '1776' ? 'BHU' : 'BHU', difficulty: 'normal', rivalsHarder: false, seed });
  const owner0 = g.states.map(s => s.owner);
  const counts: Record<string, number> = {};
  const tally = (e: SimEvent) => {
    const k = e.type === 'revoltEnded' ? (e.independence ? 'independenceWon' : e.won ? 'revoltWon' : 'revoltLost') : e.type;
    counts[k] = (counts[k] ?? 0) + 1;
  };
  let worstMonth = 0;
  console.log(`\n=== ${startId} seed ${seed} ===`);
  for (let y = 0; y < years; y++) {
    for (let i = 0; i < 365 * 4 + (y % 4 === 0 ? 4 : 0); i++) {
      const t = Date.now();
      const r = step(g, []);
      if (r.newMonth) worstMonth = Math.max(worstMonth, Date.now() - t);
      for (const e of r.events) if (e.type !== 'rejected' && e.type !== 'built' && e.type !== 'techResearched') tally(e); else if (e.type === 'rejected') counts.rejected = (counts.rejected ?? 0) + 1;
    }
    if ((y + 1) % 10 === 0 || y === years - 1) {
      const year = dateAtTick(g.startDate, g.tick).y;
      const top = computeScores(g).slice(0, 10).map(r => {
        const c = g.countries[r.country];
        return `${c.tag} gdp ${fmt(c.gdp)} sol ${c.sol.toFixed(1)} tech ${c.techs.length} pop ${fmt(c.population)}`;
      });
      console.log(`${year}: ${top.join(' | ')}`);
    }
  }
  const changed = g.states.filter((s, i) => s.id && s.owner !== owner0[i]).length;
  const alive = g.countries.filter(c => c.alive && c.id);
  console.log(`changed hands: ${changed} states; alive ${alive.length}; formed: ${alive.filter(c => ['GER', 'ITA'].includes(c.tag)).map(c => c.name).join(', ') || 'none'}`);
  console.log(`blocs ${g.blocs.length}; companies ${alive.reduce((n, c) => n + c.companies.length, 0)}; worst month ${worstMonth} ms`);
  console.log(Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(', '));
}
