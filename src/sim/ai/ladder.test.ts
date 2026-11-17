import { it, expect } from 'vitest';
import { makeGame, runYears, runYearsCollect } from '../testing';
import { opportunity } from './ai';
import { startWar } from '../war';
import type { Difficulty } from '../types';

/** Two AI countries of different levels on a mirrored map; sides alternate by seed. True if `strong` ends ahead. */
function match(seed: number, strong: Difficulty, weak: Difficulty): boolean {
  const rows = ['AAAApppppppppppppppBBBB', 'AAAApppppppppppppppBBBB', 'AAAApppppppppppppppBBBB', 'AAAApppppppppppppppBBBB', '.'.repeat(23), 'YY' + '.'.repeat(21)];
  const g = makeGame({ rows, owners: { A: 'STR', B: 'WEK', Y: 'PLR' }, player: 'PLR', seed, population: 1_000_000, money: 50_000, seedEconomy: true, ai: true,
    resources: { 'T-A': { coal: true, iron: true }, 'T-B': { coal: true, iron: true } } });
  const flip = seed % 2 === 0;
  g.countries[1].difficulty = flip ? weak : strong; g.countries[2].difficulty = flip ? strong : weak;
  runYears(g, 15);
  const [a, b] = [g.countries[1], g.countries[2]];
  const score = (c: typeof a) => (c.alive ? c.gdp / Math.max(a.gdp, b.gdp, 1) + c.tiles / Math.max(a.tiles, b.tiles, 1) : 0);
  return (score(a) > score(b)) !== flip;
}

it('each difficulty level beats the one below it in most mirrored games', () => {
  const pairs: [Difficulty, Difficulty][] = [['normal', 'easy'], ['hard', 'normal'], ['veryHard', 'hard'], ['grandMaster', 'veryHard']];
  for (const [s, w] of pairs) {
    let wins = 0;
    for (let seed = 1; seed <= 6; seed++) wins += match(seed, s, w) ? 1 : 0;
    expect(wins, `${s} vs ${w}`).toBeGreaterThanOrEqual(5);
  }
}, 120_000);

it('opportunity favours a target that is busy or weakened', () => {
  const g = makeGame({ rows: ['AABBCC'], owners: { A: 'XXX', B: 'YYY', C: 'ZZZ' } });
  for (const c of g.countries.slice(1)) { c.troops = 10_000; c.maxTroops = 20_000; }
  const calm = opportunity(g, 2);
  startWar(g, [3], [2], [], []);
  expect(opportunity(g, 2)).toBeGreaterThan(calm);
  g.countries[2].troops = 1000;
  expect(opportunity(g, 2)).toBeGreaterThan(2 * calm);
});

/** The player in the middle, bordering two AIs of the given level. Returns plays made against the player in 10 years. */
function demandsOnPlayer(seed: number, level: Difficulty): number {
  const rows = Array.from({ length: 4 }, () => 'AAAAAAPPPPBBBBBB');
  const g = makeGame({ rows, owners: { A: 'AAA', P: 'PLR', B: 'BBB' }, player: 'PLR', seed, population: 1_000_000, money: 50_000, seedEconomy: true, ai: true, difficulty: level });
  g.countries[2].population = 300_000;   // a tempting, weak player
  return runYearsCollect(g, 10).filter(e => e.type === 'playStarted' && e.target === g.countries.find(c => c.isPlayer)!.id).length;
}

it('Easy makes demands of a neighbouring player at most about once in ten years, and less than Normal', () => {
  let easy = 0, normal = 0;
  for (let seed = 1; seed <= 8; seed++) { easy += demandsOnPlayer(seed, 'easy'); normal += demandsOnPlayer(seed, 'normal'); }
  expect(easy / 8).toBeLessThanOrEqual(1);
  expect(normal).toBeGreaterThan(easy);
}, 120_000);
