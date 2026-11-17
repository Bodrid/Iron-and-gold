import { it, expect } from 'vitest';
import { GameHost } from './host';
import { createWorkerHandler } from './handler';
import { makeTestWorld } from '../map/testWorld';
import type { FromWorker, ToWorker } from './protocol';
import type { StartDef } from '../sim/types';

const start: StartDef = { id: 'test', name: 'Test', startDate: { y: 1836, m: 1, d: 1 }, endYear: 1936, seedEconomy: false,
  countries: [{ tag: 'XXX', name: 'X', color: 0xff0000, capital: 'T-A', population: 100_000, money: 100_000 }, { tag: 'YYY', name: 'Y', color: 0x0000ff, capital: 'T-B', population: 100_000, money: 1000 }],
  ownership: [{ states: ['T-A'], owner: 'XXX' }, { states: ['T-B'], owner: 'YYY' }] };

function shim() {
  let t = 0;
  const fake: any = { onmessage: null as null | ((e: { data: FromWorker }) => void), terminate() {} };
  const handler = createWorkerHandler({
    post: (msg) => fake.onmessage?.({ data: msg }),
    loadMap: async () => makeTestWorld(['AABB', 'AABB']),
    getStart: () => start,
    now: () => t,
  });
  fake.postMessage = (msg: ToWorker) => handler.onMessage(msg);
  return { fake, handler, advance: (ms: number) => { t += ms; handler.pump(); } };
}

it('starts a game and reports the player and ownership', async () => {
  const { fake } = shim();
  const host = new GameHost(fake);
  const ready = await host.newGame({ startId: 'test', playerTag: 'XXX', difficulty: 'normal', rivalsHarder: false, seed: 1 }, '/');
  expect(ready.player).toBe(1);
  expect(ready.countries.map(c => c.tag)).toEqual(['XXX', 'YYY']);
  expect(ready.owner.length).toBe(8);
});

it('round-trips commands and events', async () => {
  const { fake, advance } = shim();
  const host = new GameHost(fake);
  await host.newGame({ startId: 'test', playerTag: 'XXX', difficulty: 'normal', rivalsHarder: false, seed: 1 }, '/');
  const events: any[] = [];
  host.onEvents(e => events.push(...e));
  host.send({ type: 'declareWar', country: 1, target: 2 });
  host.setSpeed(1);
  advance(200);
  expect(events).toContainEqual({ type: 'warDeclared', a: 1, b: 2 });
});

it('sends frames with the date and country summaries', async () => {
  const { fake, advance } = shim();
  const host = new GameHost(fake);
  await host.newGame({ startId: 'test', playerTag: 'XXX', difficulty: 'normal', rivalsHarder: false, seed: 1 }, '/');
  const frames: any[] = [];
  host.onFrame(f => frames.push(f));
  host.setSpeed(3);
  for (let i = 0; i < 10; i++) advance(100);
  expect(frames.length).toBeGreaterThan(0);
  expect(frames.at(-1).date).toMatch(/1836/);
  expect(frames.some(f => f.countries?.length === 2)).toBe(true);
});

it('reports the selected state in detail', async () => {
  const { fake, advance } = shim();
  const host = new GameHost(fake);
  await host.newGame({ startId: 'test', playerTag: 'XXX', difficulty: 'normal', rivalsHarder: false, seed: 1 }, '/');
  const frames: any[] = [];
  host.onFrame(f => frames.push(f));
  host.select(1);
  advance(60);
  const sel = frames.find(f => f.selection)?.selection;
  expect(sel?.name).toBe('A');
  expect(sel?.buildOptions.length).toBe(15);
});

it('refreshes the selected state right after a command while paused', async () => {
  const { fake, advance } = shim();
  const host = new GameHost(fake);
  await host.newGame({ startId: 'test', playerTag: 'XXX', difficulty: 'normal', rivalsHarder: false, seed: 1 }, '/');
  const frames: any[] = [];
  host.onFrame(f => frames.push(f));
  host.select(1);
  advance(60);
  frames.length = 0;
  host.send({ type: 'build', country: 1, state: 1, building: 'barracks' });
  advance(20);
  const sel = frames.find(f => f.selection)?.selection;
  expect(sel?.constructions).toHaveLength(1);
});
