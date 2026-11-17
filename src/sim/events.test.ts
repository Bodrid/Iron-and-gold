import { it, expect, afterEach } from 'vitest';
import { step } from './step';
import { makeGame, runDays, stateId, occupy } from './testing';
import { startWar } from './war';
import { getStateTiles } from '../map/stateTiles';
import { EVENTS } from '../content/events';
import { monthlyEvents, conditionHolds } from './events';
import { mods } from './mods';
import { relation } from './diplomacy/relations';
import type { EventDef } from '../content/events/types';
import type { GameState, SimEvent } from './types';

const added: EventDef[] = [];
const add = (e: EventDef) => { EVENTS.push(e); added.push(e); return e; };
afterEach(() => { for (const e of added) EVENTS.splice(EVENTS.indexOf(e), 1); added.length = 0; });

// XXX (player unless said otherwise) with two states, YYY and ZZZ AI.
const world = (player = 'XXX'): GameState => makeGame({ rows: ['AABBCCDD'], owners: { A: 'XXX', B: 'XXX', C: 'YYY', D: 'ZZZ' }, money: 1e6, player });

const gift = (over: Partial<EventDef> = {}): EventDef => ({
  id: 'test.gift', title: 'A gift', text: 'Someone sends gold.', countries: ['YYY'], mtthMonths: 0, conditions: [],
  options: [{ label: 'Take it', effects: [{ kind: 'money', amount: 1000 }], ai: 1 }, { label: 'Refuse', effects: [{ kind: 'relation', tag: 'ZZZ', delta: 20 }], ai: 0 }],
  ...over,
});

it('an AI country gets the event when its conditions hold, picks by weight, and only once', () => {
  const g = world();
  add(gift());
  const m = g.countries[2].money;
  const events: SimEvent[] = [];
  monthlyEvents(g, events);
  expect(g.countries[2].money).toBe(m + 1000);
  expect(events).toContainEqual(expect.objectContaining({ type: 'eventResolved', country: 2, event: 'test.gift', option: 0, skipped: 0 }));
  monthlyEvents(g, events);
  expect(g.countries[2].money).toBe(m + 1000);
});

it('date windows and conditions gate events', () => {
  const g = world();
  add(gift({ start: { y: 1840, m: 1, d: 1 } }));
  monthlyEvents(g, []);
  expect(g.eventLog).toHaveLength(0);
  const h = world();
  add(gift({ id: 'test.cond', conditions: [{ kind: 'law', law: 'serfdom' }] }));
  monthlyEvents(h, []);
  expect(h.eventLog.filter(e => e.event === 'test.cond')).toHaveLength(0);
  expect(conditionHolds(h, h.countries[2], { kind: 'ownsState', key: 'T-C' })).toBe(true);
  expect(conditionHolds(h, h.countries[2], { kind: 'ownsShare', prefixes: ['T-A', 'T-B', 'T-C'], share: 0.5 })).toBe(false);
  expect(conditionHolds(h, h.countries[1], { kind: 'ownsShare', prefixes: ['T-A', 'T-B', 'T-C'], share: 0.5 })).toBe(true);
});

it('a mean time to happen fires sooner or later, the same way for the same seed', () => {
  const run = () => {
    const g = world();
    const e = add(gift({ id: 'test.mtth', mtthMonths: 6 }));
    runDays(g, 3 * 365);
    EVENTS.splice(EVENTS.indexOf(e), 1); added.splice(added.indexOf(e), 1);
    return g.eventLog[0]?.tick;
  };
  const a = run(), b = run();
  expect(a).toBeDefined();
  expect(a).toBe(b);
});

it('the player gets a card, chooses, and an unanswered card defaults after 30 days', () => {
  const g = world();
  add(gift({ countries: ['XXX'] }));
  const events: SimEvent[] = [];
  monthlyEvents(g, events);
  expect(g.pendingEvents).toHaveLength(1);
  expect(events).toContainEqual(expect.objectContaining({ type: 'eventFired', country: 1, event: 'test.gift' }));
  const before = relation(g, 1, 3);
  step(g, [{ type: 'chooseEventOption', country: 1, pending: g.pendingEvents[0].id, option: 1 }]);
  expect(g.pendingEvents).toHaveLength(0);
  expect(relation(g, 1, 3)).toBe(before + 20);

  const h = world();
  add(gift({ id: 'test.timeout', countries: ['XXX'] }));
  monthlyEvents(h, []);
  const m = h.countries[1].money;
  runDays(h, 31);
  expect(h.pendingEvents).toHaveLength(0);
  expect(h.countries[1].money).toBeGreaterThanOrEqual(m + 1000 - 1000);   // option 0 applied (economy may move money too)
  expect(h.eventLog.find(e => e.event === 'test.timeout')?.option).toBe(0);
});

it('effects that no longer make sense are skipped and counted', () => {
  const g = world();
  add(gift({ countries: ['XXX'], options: [{ label: 'Take C', effects: [{ kind: 'transferStates', keys: ['T-C'], to: 'self', from: 'YYY' }, { kind: 'relation', tag: 'QQQ', delta: 10 }], ai: 1 }] }));
  monthlyEvents(g, []);
  g.countries[2].alive = false;                                   // YYY disappears while the player decides
  for (let t = 0; t < g.owner.length; t++) if (g.owner[t] === 2) { g.owner[t] = 3; g.controller[t] = 3; }
  g.states[stateId(g, 'T-C')].owner = 3;
  const r = step(g, [{ type: 'chooseEventOption', country: 1, pending: g.pendingEvents[0].id, option: 0 }]);
  expect(r.events).toContainEqual(expect.objectContaining({ type: 'eventResolved', skipped: 2 }));
  expect(g.states[stateId(g, 'T-C')].owner).toBe(3);
});

it('temporary modifiers apply and expire', () => {
  const g = world('ZZZ');
  add(gift({ options: [{ label: 'Drill', effects: [{ kind: 'modifier', name: 'Drill', effects: { refillPct: 20 }, months: 2 }], ai: 1 }] }));
  const base = mods(g, g.countries[2]).refillPct;
  monthlyEvents(g, []);
  expect(mods(g, g.countries[2]).refillPct).toBe(base + 20);
  runDays(g, 100);
  expect(mods(g, g.countries[2]).refillPct).toBe(base);
});

it('the player never has more than two cards open; the rest wait', () => {
  const g = world();
  for (let i = 0; i < 4; i++) add(gift({ id: `test.many${i}`, countries: ['XXX'] }));
  monthlyEvents(g, []);
  expect(g.pendingEvents).toHaveLength(2);
  step(g, [{ type: 'chooseEventOption', country: 1, pending: g.pendingEvents[0].id, option: 0 }]);
  monthlyEvents(g, []);
  expect(g.pendingEvents).toHaveLength(2);
  expect(g.eventLog).toHaveLength(1);
});

// ---- stage 6 review fixes ----
it('map changes from AI events reach changedTiles', () => {
  const g = world('ZZZ');
  add(gift({ countries: ['YYY'], options: [{ label: 'Take B', effects: [{ kind: 'transferStates', keys: ['T-B'], to: 'self', from: 'XXX' }], ai: 1 }] }));
  g.countries[1].capitalState = stateId(g, 'T-A');
  let changed: number[] = [];
  for (let i = 0; i < 35 * 4 && !g.eventLog.length; i++) changed = changed.concat(step(g, []).changedTiles);
  const bTiles = g.map.states[stateId(g, 'T-B')].tiles;
  expect(g.states[stateId(g, 'T-B')].owner).toBe(2);
  expect(new Set(changed.filter(t => g.map.stateOf[t] === stateId(g, 'T-B'))).size).toBe(bTiles);
});

it('an AI event never takes the player’s land without a war: it makes demands instead; capitals never move', () => {
  const g = world('XXX');
  add(gift({ countries: ['YYY'], options: [{ label: 'Take the player’s land', effects: [{ kind: 'transferStates', keys: ['T-A', 'T-B'], to: 'self', from: 'XXX' }], ai: 1 }] }));
  g.countries[1].capitalState = stateId(g, 'T-A');
  const events: import('./types').SimEvent[] = [];
  monthlyEvents(g, events);
  expect(g.states[stateId(g, 'T-A')].owner).toBe(1);
  expect(g.states[stateId(g, 'T-B')].owner).toBe(1);
  expect(g.plays).toContainEqual(expect.objectContaining({ initiator: 2, target: 1, demands: [{ kind: 'state', state: stateId(g, 'T-B') }] }));
  // Between AI countries the capital is never taken either.
  const h = world('ZZZ');
  add(gift({ id: 'test.cap', countries: ['YYY'], options: [{ label: 'Take', effects: [{ kind: 'transferStates', keys: ['T-A', 'T-B'], to: 'self', from: 'XXX' }], ai: 1 }] }));
  h.countries[1].capitalState = stateId(h, 'T-A');
  monthlyEvents(h, []);
  expect(h.states[stateId(h, 'T-A')].owner).toBe(1);
  expect(h.states[stateId(h, 'T-B')].owner).toBe(2);
});

it('transfers skip states occupied by a third country', () => {
  const g = world('ZZZ');
  add(gift({ countries: ['YYY'], options: [{ label: 'Take B', effects: [{ kind: 'transferStates', keys: ['T-B'], to: 'self', from: 'XXX' }], ai: 1 }] }));
  g.countries[1].capitalState = stateId(g, 'T-A');
  startWar(g, [3], [1], [], []);
  occupy(g, 3, Array.from(getStateTiles(g.map, stateId(g, 'T-B'))));
  monthlyEvents(g, []);
  expect(g.states[stateId(g, 'T-B')].owner).toBe(1);
});

it('a player card whose conditions no longer hold applies nothing', () => {
  const g = world();
  add(gift({ countries: ['XXX'], conditions: [{ kind: 'atPeace' }] }));
  monthlyEvents(g, []);
  startWar(g, [1], [2], [], []);
  const m = g.countries[1].money;
  const r = step(g, [{ type: 'chooseEventOption', country: 1, pending: g.pendingEvents[0].id, option: 0 }]);
  expect(g.countries[1].money).toBe(m);
  expect(r.events).toContainEqual(expect.objectContaining({ type: 'eventResolved', skipped: 1 }));
});
