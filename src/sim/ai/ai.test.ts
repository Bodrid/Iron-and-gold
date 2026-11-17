import { it, expect } from 'vitest';
import { makeSmallWorldGame, runYears, runYearsCollect, makeGame } from '../testing';
import { DIFFICULTIES, effectiveDifficulty } from './difficulty';
import type { Difficulty, GameState } from '../types';

const totalGdp = (g: GameState) => g.countries.filter(c => !c.isPlayer).reduce((s, c) => s + c.gdp, 0);
const unclaimed = (g: GameState) => { let n = 0; for (let t = 0; t < g.owner.length; t++) if (g.map.stateOf[t] && !g.owner[t]) n++; return n; };

it('AI never issues a rejected command over 10 years on every difficulty', () => {
  for (const d of Object.keys(DIFFICULTIES) as Difficulty[]) {
    const g = makeSmallWorldGame({ difficulty: d, seed: 7 });
    const rejected = runYearsCollect(g, 10).filter(e => e.type === 'rejected');
    expect(rejected, d).toEqual([]);
  }
}, 120_000);

it('AI grows its economy', () => {
  const g = makeSmallWorldGame({ difficulty: 'normal' });
  runYears(g, 1);
  const gdp0 = totalGdp(g);
  runYears(g, 10);
  expect(totalGdp(g)).toBeGreaterThan(gdp0 * 1.3);
});

it('AI colonises unclaimed land', () => {
  const g = makeSmallWorldGame({ difficulty: 'normal' });
  const before = unclaimed(g);
  runYears(g, 10);
  expect(unclaimed(g)).toBeLessThan(before * 0.5);
});

function mirrorMatch(seed: number, strong: Difficulty, weak: Difficulty): boolean {
  const rows = ['AAAApppppppppppppppBBBB', 'AAAApppppppppppppppBBBB', 'AAAApppppppppppppppBBBB', 'AAAApppppppppppppppBBBB'];
  rows.push('.'.repeat(23), 'YY' + '.'.repeat(21));
  const g = makeGame({ rows, owners: { A: 'STR', B: 'WEK', Y: 'PLR' }, player: 'PLR', seed, population: 1_000_000, money: 50_000, seedEconomy: true, ai: true,
    resources: { 'T-A': { coal: true, iron: true }, 'T-B': { coal: true, iron: true } } });
  g.countries[1].difficulty = strong; g.countries[2].difficulty = weak;
  runYears(g, 20);
  const [a, b] = [g.countries[1], g.countries[2]];
  const score = (c: typeof a) => (c.alive ? c.gdp / Math.max(a.gdp, b.gdp, 1) + c.tiles / Math.max(a.tiles, b.tiles, 1) : 0);
  return score(a) > score(b);
}

it('Grand Master beats Easy in mirrored games', () => {
  let wins = 0;
  for (const seed of [1, 2, 3, 4, 5]) wins += mirrorMatch(seed, 'grandMaster', 'easy') ? 1 : 0;
  expect(wins).toBeGreaterThanOrEqual(4);
}, 120_000);

it('Easy rarely declares war on the player', () => {
  let wars = 0;
  for (let seed = 1; seed <= 10; seed++) {
    const g = makeSmallWorldGame({ difficulty: 'easy', seed });
    const player = g.countries.find(c => c.isPlayer)!.id;
    wars += runYearsCollect(g, 10).filter(e => e.type === 'warDeclared' && e.b === player).length;
  }
  expect(wars).toBeLessThanOrEqual(2);
}, 120_000);

it('rivals are one level harder when rivalsHarder is set', () => {
  const setup = { startId: 't', playerTag: 'X', difficulty: 'hard' as const, rivalsHarder: true, seed: 1 };
  expect(effectiveDifficulty(setup, true)).toBe('veryHard');
  expect(effectiveDifficulty(setup, false)).toBe('hard');
  expect(effectiveDifficulty({ ...setup, difficulty: 'grandMaster' }, true)).toBe('grandMaster');
});

it('the player country is never driven by the AI', () => {
  const g = makeSmallWorldGame({ difficulty: 'grandMaster' });
  const p = g.countries.find(c => c.isPlayer)!;
  const constructionsBefore = g.constructions.filter(c => c.country === p.id).length;
  runYears(g, 2);
  expect(g.constructions.filter(c => c.country === p.id).length).toBe(constructionsBefore);
  expect(g.attacks.some(a => a.attacker === p.id)).toBe(false);
});
