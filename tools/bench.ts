// npm run bench — 2 game years of the real 1836 world, every AI on Hard, headless.
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { assembleMap, decodeGrid, placeholderState } from '../src/map/format';
import { createGame } from '../src/sim/state';
import { step } from '../src/sim/step';
import { getStart } from '../src/content/starts';
import { computeLabels } from '../src/sim/labels';

const BUDGET = { avg: 6, p95: 20, worstMonth: 60 };
const states = JSON.parse(readFileSync('public/data/states.json', 'utf8'));
const map = assembleMap(decodeGrid(gunzipSync(readFileSync('public/data/world.igz'))), [placeholderState(), ...states]);
const t0 = performance.now();
const g = createGame(map, getStart('1836'), { startId: '1836', playerTag: 'PRU', difficulty: 'hard', rivalsHarder: false, seed: 1 });
const years = Number(process.argv[2] ?? 2);
console.log(`created in ${(performance.now() - t0).toFixed(0)} ms (includes sea grid)`);
const times: number[] = [];
let worstMonth = 0;
const ticks = Math.round(years * 365.25 * 4);
for (let i = 0; i < ticks; i++) {
  const t = performance.now();
  const r = step(g, []);
  const d = performance.now() - t;
  times.push(d);
  if (r.newMonth) worstMonth = Math.max(worstMonth, d);
}
const lt = performance.now();
computeLabels(g);
const labelMs = performance.now() - lt;
times.sort((a, b) => a - b);
const avg = times.reduce((a, b) => a + b, 0) / times.length, p95 = times[Math.floor(times.length * 0.95)];
console.log(`ticks ${ticks}: avg ${avg.toFixed(2)} ms, p95 ${p95.toFixed(2)} ms, worst month ${worstMonth.toFixed(1)} ms, labels ${labelMs.toFixed(0)} ms`);
console.log(`world: ${g.wars.length} wars, ${g.attacks.length} attacks, ${g.countries.filter(c => c.alive).length} countries alive`);
const ok = avg <= BUDGET.avg && p95 <= BUDGET.p95 && worstMonth <= BUDGET.worstMonth;
console.log(ok ? 'within budget' : `OVER BUDGET (avg ≤ ${BUDGET.avg}, p95 ≤ ${BUDGET.p95}, month ≤ ${BUDGET.worstMonth})`);
process.exit(ok ? 0 : 1);
