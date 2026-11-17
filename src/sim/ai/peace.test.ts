import { it, expect } from 'vitest';
import { makeGame, occupy, runDays, stateTiles } from '../testing';
import { atWar, startWar } from '../war';
import type { GameState } from '../types';

// Two AI countries at war; the player (ZZZ) watches from far away.
const world = (): GameState => {
  const g = makeGame({ rows: ['AAABBBCC', 'AAABBBCC'], owners: { A: 'XXX', B: 'YYY', C: 'ZZZ' }, player: 'ZZZ', population: 2_000_000, money: 1e6, ai: true });
  for (const c of g.countries.slice(1)) { c.troops = 5000; c.maxTroops = 20_000; }
  return g;
};

it('a winning defender AI ends the war', () => {
  const g = world();
  const w = startWar(g, [1], [2], [{ kind: 'reparations' }], []);
  occupy(g, 2, stateTiles(g, 'T-A'));
  w.casualties = [12_000, 1000];
  g.countries[1].troops = 0;
  runDays(g, 120);
  expect(atWar(g, 1, 2)).toBeUndefined();
});

it('a losing attacker AI ends the war', () => {
  const g = world();
  const w = startWar(g, [2], [1], [{ kind: 'reparations' }], []);
  occupy(g, 1, stateTiles(g, 'T-B').slice(0, 4));
  w.casualties = [12_000, 1000];
  g.countries[2].troops = 0;
  runDays(g, 120);
  expect(atWar(g, 1, 2)).toBeUndefined();
});
