import { it, expect } from 'vitest';
import { GameHost } from './host';
import { createWorkerHandler } from './handler';
import { makeTestWorld } from '../map/testWorld';
import type { FromWorker, ToWorker } from './protocol';
import type { StartDef } from '../sim/types';
import { systems } from '../sim/registry';

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

it('autosaves on 1 January', async () => {
  let t = 0;
  const saves: string[] = [];
  const fake: any = { onmessage: null, terminate() {} };
  const handler = createWorkerHandler({
    post: msg => fake.onmessage?.({ data: msg }), loadMap: async () => makeTestWorld(['ABBB', 'ABBB']), getStart: () => start, now: () => t,
    hooks: { save: async (slot: string) => { saves.push(slot); } },
  });
  fake.postMessage = (m: any) => handler.onMessage(m);
  const host = new GameHost(fake);
  await host.newGame({ startId: 'test', playerTag: 'XXX', difficulty: 'normal', rivalsHarder: false, seed: 1 }, '/');
  host.setSpeed(3);
  for (let i = 0; i < 400 * 4 / 8 + 10; i++) { t += 1000 / 3; handler.pump(); }
  expect(saves).toContain('auto');
});

it('finishing a building refreshes icons but not country labels', async () => {
  let t = 0;
  let labelCalls = 0, iconCalls = 0;
  const rich: StartDef = { ...start, countries: start.countries.map(c => ({ ...c, money: 1e6 })) };
  const fake: any = { onmessage: null, terminate() {} };
  const handler = createWorkerHandler({
    post: msg => fake.onmessage?.({ data: msg }), loadMap: async () => makeTestWorld(['ABBB', 'ABBB']), getStart: () => rich, now: () => t,
    hooks: { labels: () => { labelCalls++; return []; }, buildings: () => { iconCalls++; return []; } },
  });
  fake.postMessage = (m: any) => handler.onMessage(m);
  const host = new GameHost(fake);
  await host.newGame({ startId: 'test', playerTag: 'XXX', difficulty: 'normal', rivalsHarder: false, seed: 1 }, '/');
  host.setSpeed(3);
  for (let i = 0; i < 2; i++) { t += 1000 / 3; handler.pump(); }   // day 4: the barracks will finish between label refreshes
  host.send({ type: 'build', country: 1, state: 1, building: 'barracks' });
  let atBuilt = -1, iconsAtBuilt = -1;
  host.onEvents(evs => { if (evs.some(e => e.type === 'built')) { atBuilt = labelCalls; iconsAtBuilt = iconCalls; } });
  for (let i = 0; i < 60 && atBuilt < 0; i++) { t += 1000 / 3; handler.pump(); }
  expect(atBuilt).toBeGreaterThanOrEqual(0);
  expect(iconCalls).toBeGreaterThan(iconsAtBuilt);
  expect(labelCalls).toBe(atBuilt);
});

it('a crash inside the simulation pauses the game and reports an error instead of freezing silently', async () => {
  const { fake, handler, advance } = shim();
  const host = new GameHost(fake);
  await host.newGame({ startId: 'test', playerTag: 'XXX', difficulty: 'normal', rivalsHarder: false, seed: 1 }, '/');
  const errors: string[] = [];
  host.onMessage(m => { if (m.type === 'error') errors.push(m.message); });
  const boom = () => { throw new Error('boom'); };
  systems.tick.push(boom);
  host.setSpeed(2);
  expect(() => advance(200)).not.toThrow();
  systems.tick.splice(systems.tick.indexOf(boom), 1);
  expect(errors.some(e => e.includes('boom'))).toBe(true);
  const ticks = handler.getState()!.tick;
  advance(500);
  expect(handler.getState()!.tick).toBe(ticks);   // paused
});

it('saves resolve by slot and reject when the write fails', async () => {
  const msgs: any[] = [];
  const fake: any = { onmessage: null, terminate() {}, postMessage: (m: any) => msgs.push(m) };
  const host = new GameHost(fake);
  let one = 'pending', two = 'pending';
  host.save('1').then(() => (one = 'ok'), () => (one = 'failed'));
  host.save('2').then(() => (two = 'ok'), () => (two = 'failed'));
  fake.onmessage({ data: { type: 'saved', slot: 'auto' } });
  await Promise.resolve();
  expect([one, two]).toEqual(['pending', 'pending']);
  fake.onmessage({ data: { type: 'saved', slot: '2' } });
  fake.onmessage({ data: { type: 'saveFailed', slot: '1', message: 'quota' } });
  await new Promise(r => setTimeout(r, 0));
  expect([one, two]).toEqual(['failed', 'ok']);
});

it('a worker that fails to load rejects the pending game start', async () => {
  const fake: any = { onmessage: null, onerror: null, terminate() {}, postMessage() {} };
  const host = new GameHost(fake);
  const p = host.newGame({ startId: 'test', playerTag: 'XXX', difficulty: 'normal', rivalsHarder: false, seed: 1 }, '/');
  fake.onerror({ message: '404' });
  await expect(p).rejects.toThrow(/reload/i);
});
