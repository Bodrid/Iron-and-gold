import { it, expect } from 'vitest';
import { makeGame, runDays, stateId } from '../testing';
import { step } from '../step';
import { atWar, startWar } from '../war';
import { makePuppet, puppetsOf } from './subjects';
import { setTile } from '../control';
import type { GameState } from '../types';
import { aiCommands } from '../ai/ai';

const world = (): GameState => {
  const g = makeGame({ rows: ['AAABBBCCCDDD', 'AAABBBCCCDDD'], owners: { A: 'XXX', B: 'YYY', C: 'ZZZ', D: 'QQQ' }, population: 2_000_000, money: 1e6, seedEconomy: true });
  return g;
};

it('a puppet pays tribute to its overlord', () => {
  const g = world(), h = world();
  makePuppet(g, 1, 2, []);
  runDays(g, 62); runDays(h, 62);
  expect(g.countries[1].money).toBeGreaterThan(h.countries[1].money);
  expect(g.countries[2].money).toBeLessThan(h.countries[2].money);
});

it('puppets join their overlord’s wars and cannot start plays or be targeted by others', () => {
  const g = world();
  makePuppet(g, 1, 2, []);
  startWar(g, [1], [3], [], []);
  expect(atWar(g, 2, 3)).toBeDefined();
  expect(step(g, [{ type: 'startPlay', country: 2, target: 4, demands: [{ kind: 'reparations' }] }]).events[0]).toMatchObject({ reason: 'puppet' });
  expect(step(g, [{ type: 'startPlay', country: 4, target: 2, demands: [{ kind: 'reparations' }] }]).events[0]).toMatchObject({ reason: 'targetIsPuppet' });
});

it('annexing needs ten years and decent relations', () => {
  const g = world();
  makePuppet(g, 1, 2, []);
  expect(step(g, [{ type: 'annexPuppet', country: 1, puppet: 2 }]).events[0]).toMatchObject({ reason: 'tooSoon' });
  g.tick += 10 * 366 * 4;
  const r = step(g, [{ type: 'annexPuppet', country: 1, puppet: 2 }]);
  expect(r.events.filter(e => e.type === 'rejected')).toEqual([]);
  expect(g.states[stateId(g, 'T-B')].owner).toBe(1);
  runDays(g, 1);
  expect(g.countries[2].alive).toBe(false);
});

it('no chains: puppeting a country frees its puppets; an overlord’s fall frees its puppets', () => {
  const g = world();
  makePuppet(g, 2, 3, []);
  makePuppet(g, 1, 2, []);
  expect(g.countries[3].overlord).toBe(0);
  expect(puppetsOf(g, 1)).toEqual([2]);
  for (let t = 0; t < g.owner.length; t++) if (g.owner[t] === 1) setTile(g, t, 4, 4, []);
  runDays(g, 2);
  expect(g.countries[1].alive).toBe(false);
  expect(g.countries[2].overlord).toBe(0);
});

it('puppeting is announced, and the AI never annexes the player', () => {
  const g = world();
  const events: import('../types').SimEvent[] = [];
  makePuppet(g, 2, 1, events);                     // the player (XXX) becomes YYY's puppet
  expect(events).toContainEqual({ type: 'puppeted', overlord: 2, puppet: 1 });
  g.countries[1].puppetSince = -20 * 365 * 4;
  const cmds = aiCommands(g, g.countries[2]);
  expect(cmds.some(c => c.type === 'annexPuppet')).toBe(false);
  expect(g.countries[1].alive).toBe(true);
});
