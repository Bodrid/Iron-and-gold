import { it, expect } from 'vitest';
import { makeGame, runYears, runYearsCollect, stateId, stateTiles } from '../testing';
import { declareWarRaw } from '../war';
import { seaWorld } from '../naval/testWorlds';
import type { GameState } from '../types';

function aiIslands(): GameState {
  // AI country AAA on the west island (with a port), an unclaimed east island, the player on a far islet.
  const rows: string[] = [];
  for (let y = 0; y < 24; y++) rows.push('A'.repeat(16) + '.'.repeat(24) + 'p'.repeat(16) + '.'.repeat(4) + (y < 3 ? 'YY' : '..'));
  const g = makeGame({ rows, owners: { A: 'AAA', Y: 'PLR' }, player: 'PLR', unclaimed: ['p'], population: 3_000_000, money: 200_000, seedEconomy: true, ai: true });
  return g;
}

it('AI colonises another island by boat', () => {
  const g = aiIslands();
  const east = stateTiles(g, 'T-p1');
  runYears(g, 10);
  expect(east.filter(t => g.owner[t] === 1).length).toBeGreaterThan(east.length / 4);
}, 120_000);

it('AI at war builds warships and raids enemy trade', () => {
  const g = seaWorld({ shipyards: true, ai: true });
  g.countries[1].stockpile.grain = 1e7; g.countries[2].stockpile.grain = 0;
  declareWarRaw(g, 3, 1);
  const events = runYearsCollect(g, 3);
  expect(g.ships.some(s => s.owner === 3 && s.kind === 'warship') || events.some(e => e.type === 'shipBuilt' && e.country === 3)).toBe(true);
  expect(events.filter(e => e.type === 'shipCaptured' && e.by === 3).length).toBeGreaterThan(0);
}, 120_000);

it('a landlocked AI never issues naval commands', () => {
  const rows = ['PPPP....', 'AAAA....', 'ALLA....', 'ALLA....', 'AAAA....'];
  const g = makeGame({ rows, owners: { P: 'PLR', A: 'AAA', L: 'LND' }, player: 'PLR', population: 2_000_000, money: 200_000, seedEconomy: true, ai: true });
  const land = g.countries.findIndex(c => c.tag === 'LND');
  const events = runYearsCollect(g, 5);
  expect(events.filter(e => e.type === 'rejected')).toEqual([]);
  expect(g.ships.filter(s => s.owner === land)).toEqual([]);
  expect(g.states[stateId(g, 'T-L')].buildings.some(b => b.type === 'shipyard' || b.type === 'port')).toBe(false);
}, 120_000);

it('a raider gets new orders once nobody is prey, and ships mend in port', async () => {
  const { navalDecisions } = await import('./naval');
  const { runDays } = await import('../testing');
  const g = seaWorld({ shipyards: true });
  g.countries[1].stockpile.grain = 1e7; g.countries[2].stockpile.grain = 0;
  runDays(g, 32);
  const t = g.ships.find(s => s.kind === 'trade')!;
  const w = { id: g.nextId++, owner: 1, kind: 'warship' as const, cell: t.cell, fromCell: t.cell, toCell: t.cell, pathPos: 0, dir: 1 as const, order: { type: 'raid' as const, cell: t.cell }, hp: 1 };
  g.ships.push(w);
  const cmds: any[] = [];
  navalDecisions(g, g.countries[1], [], new Set(), 1, c => cmds.push(c), 1);
  expect(cmds).toContainEqual(expect.objectContaining({ type: 'orderShip', shipId: w.id }));
  const harbour = g.states.find(s => s.owner === 1 && s.buildings.some(b => b.type === 'port'))!.id;
  const port = { ...w, id: g.nextId++, order: { type: 'idle' as const, port: harbour }, hp: 0.5 };
  g.ships.push(port);
  runDays(g, 10);
  expect(port.hp).toBeGreaterThan(0.65);
});
