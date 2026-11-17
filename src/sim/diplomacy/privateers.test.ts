import { it, expect } from 'vitest';
import { runDays } from '../testing';
import { step } from '../step';
import { seaWorld } from '../naval/testWorlds';
import { navalEncounters } from '../naval/ships';
import { changeRelation, relation } from './relations';
import type { GameState, Ship } from '../types';

function withRoute(): GameState {
  const g = seaWorld();
  g.countries[1].stockpile.grain = 1e7; g.countries[2].stockpile.grain = 0;
  runDays(g, 32);
  return g;
}
const raider = (g: GameState) => {
  const t = g.ships.find(s => s.kind === 'trade')!;
  const w: Ship = { id: g.nextId++, owner: 3, kind: 'warship', cell: t.cell, fromCell: t.cell, toCell: t.cell, pathPos: 0, dir: 1, order: { type: 'raid', cell: t.cell }, hp: 1 };
  g.ships.push(w);
  return t;
};

it('licensed privateers capture a Hostile country’s trade without a war', () => {
  const g = withRoute();
  changeRelation(g, 3, 1, -70 - relation(g, 1, 3));
  const r = step(g, [{ type: 'setPrivateers', country: 3, target: 1, on: true }]);
  expect(r.events.filter(e => e.type === 'rejected')).toEqual([]);
  expect(g.countries[3].infamy).toBeGreaterThan(0);
  const t = raider(g);
  const events: any[] = [];
  navalEncounters(g, events);
  expect(events).toContainEqual(expect.objectContaining({ type: 'shipCaptured', ship: t.id, by: 3 }));
});

it('a licence needs Hostile relations and lapses when they warm to Cold', () => {
  const g = withRoute();
  changeRelation(g, 3, 1, -30 - relation(g, 1, 3));
  expect(step(g, [{ type: 'setPrivateers', country: 3, target: 1, on: true }]).events[0]).toMatchObject({ reason: 'needsHostile' });
  changeRelation(g, 3, 1, -70 - relation(g, 1, 3));
  step(g, [{ type: 'setPrivateers', country: 3, target: 1, on: true }]);
  changeRelation(g, 3, 1, -20 - relation(g, 1, 3));
  g.diploActions.push({ from: 3, to: 1, kind: 'improve' });
  runDays(g, 32);
  expect(g.privateers).toHaveLength(0);
  raider(g);
  const events: any[] = [];
  navalEncounters(g, events);
  expect(events.filter(e => e.type === 'shipCaptured')).toEqual([]);
});

it('an escort protects its route from privateers too', () => {
  const g = withRoute();
  changeRelation(g, 3, 1, -70 - relation(g, 1, 3));
  step(g, [{ type: 'setPrivateers', country: 3, target: 1, on: true }]);
  const t = raider(g);
  g.ships.push({ id: g.nextId++, owner: 1, kind: 'warship', cell: t.cell, fromCell: t.cell, toCell: t.cell, pathPos: 0, dir: 1, order: { type: 'escort', routeId: t.routeId! }, hp: 1 });
  const events: any[] = [];
  navalEncounters(g, events);
  expect(events.filter(e => e.type === 'shipCaptured')).toEqual([]);
});

it('an AI with a licence sends its warships raiding', async () => {
  const g = withRoute();
  const { navalDecisions } = await import('../ai/naval');
  changeRelation(g, 3, 1, -70 - relation(g, 1, 3));
  step(g, [{ type: 'setPrivateers', country: 3, target: 1, on: true }]);
  const t = g.ships.find(s => s.kind === 'trade')!;
  g.ships.push({ id: g.nextId++, owner: 3, kind: 'warship', cell: t.cell, fromCell: t.cell, toCell: t.cell, pathPos: 0, dir: 1, order: { type: 'patrol', cell: t.cell }, hp: 1 });
  const cmds: any[] = [];
  navalDecisions(g, g.countries[3], [], new Set(), 1, c => cmds.push(c), 1);
  expect(cmds).toContainEqual(expect.objectContaining({ type: 'orderShip', order: expect.objectContaining({ type: 'raid' }) }));
});
