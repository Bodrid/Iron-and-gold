// Probe (dev tool): which history events fire in an AI-only game, for whom, when, and which option.
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { assembleMap, decodeGrid, placeholderState } from '../src/map/format';
import { createGame } from '../src/sim/state';
import { step } from '../src/sim/step';
import { getStart } from '../src/content/starts';
import { dateAtTick, formatDate } from '../src/sim/calendar';
import { FORMABLES } from '../src/content/formables';

const states = JSON.parse(readFileSync('public/data/states.json', 'utf8'));
const map = assembleMap(decodeGrid(gunzipSync(readFileSync('public/data/world.igz'))), [placeholderState(), ...states]);
const start = process.argv[3] ?? '1836';
const g = createGame(map, getStart(start), { startId: start, playerTag: process.argv[4] ?? 'SWI', difficulty: 'normal', rivalsHarder: false, seed: Number(process.argv[5] ?? 1) });
const years = Number(process.argv[2] ?? 30);
const t0 = Date.now();
let worstStep = 0;
for (let i = 0; i < years * 365 * 4; i++) { const a = Date.now(); step(g, []); worstStep = Math.max(worstStep, Date.now() - a); }
for (const l of g.eventLog) console.log(formatDate(dateAtTick(g.startDate, l.tick)).padEnd(12), g.countries[l.country].tag.padEnd(4), g.countries[l.country].name.padEnd(22), l.event, 'option', l.option);
console.log('alive', g.countries.filter(c => c.alive && c.id).length, 'formed', g.countries.filter(c => c.alive && FORMABLES.some(f => f.tag === c.tag)).map(c => c.name).join(','), `wars ${g.wars.length}`, `${((Date.now() - t0) / 1000).toFixed(0)}s, worst step ${worstStep}ms`);
