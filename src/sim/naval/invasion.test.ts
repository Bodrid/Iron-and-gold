import { it, expect } from 'vitest';
import { makeGame, runDays, stateId, stateTiles } from '../testing';
import { step } from '../step';
import { declareWarRaw } from '../war';
import { setTile } from '../control';
import { COAST_BIT } from '../../map/format';
import type { GameState } from '../types';

// West island A (XXX, with a port), open sea, east island: unclaimed plains p (or YYY's B).
function islands(east: 'p' | 'B' = 'p'): GameState {
  const rows: string[] = [];
  for (let y = 0; y < 24; y++) rows.push((y >= 22 && east === 'p' ? 'B' : 'A').repeat(16) + '.'.repeat(24) + east.repeat(16));
  const g = makeGame({ rows, owners: { A: 'XXX', B: 'YYY' }, unclaimed: ['p'], population: 5_000_000 });
  g.states[stateId(g, 'T-A')].buildings.push({ type: 'port', level: 1, tile: stateTiles(g, 'T-A')[0] });
  g.countries[1].troops = 40_000;
  return g;
}
const eastCoastTile = (g: GameState) => { for (let y = 10; y < 14; y++) { const t = y * g.map.width + 40; if (g.map.terrain[t] & COAST_BIT) return t; } throw new Error('no coast'); };

it('a country with no land border colonises another island by boat', () => {
  const g = islands();
  const before = g.countries[1].tiles;
  const r = step(g, [{ type: 'navalInvasion', country: 1, target: 0, tile: eastCoastTile(g), ratio: 0.3 }]);
  expect(r.events.filter(e => e.type === 'rejected')).toEqual([]);
  expect(g.countries[1].troops).toBeLessThan(40_000);
  runDays(g, 60);
  expect(g.countries[1].tiles).toBeGreaterThan(before + 5);
  expect(g.owner[eastCoastTile(g)]).toBe(1);
});

it('invading another country needs a war', () => {
  const g = islands('B');
  const r = step(g, [{ type: 'navalInvasion', country: 1, target: 2, tile: eastCoastTile(g), ratio: 0.3 }]);
  expect(r.events[0]).toMatchObject({ type: 'rejected' });
  declareWarRaw(g, 1, 2);
  const r2 = step(g, [{ type: 'navalInvasion', country: 1, target: 2, tile: eastCoastTile(g), ratio: 0.3 }]);
  expect(r2.events.filter(e => e.type === 'rejected')).toEqual([]);
  runDays(g, 60);
  expect(g.controller[eastCoastTile(g)]).toBe(1);
});

it('if the landing spot is lost before arrival, troops land nearby or come back', () => {
  const g = islands();
  const tile = eastCoastTile(g);
  step(g, [{ type: 'navalInvasion', country: 1, target: 0, tile, ratio: 0.3 }]);
  const inBoat = 40_000 - g.countries[1].troops;
  // A third party settles the whole east island before the boat arrives.
  for (const t of stateTiles(g, 'T-p1')) setTile(g, t, 2, 2, []);
  runDays(g, 60);
  expect(g.ships.filter(s => s.kind === 'transport')).toHaveLength(0);
  expect(g.countries[1].troops).toBeGreaterThan(40_000 - inBoat - 1);  // troops returned (plus refill)
});

it('rapid duplicate invasions never spend more troops than the pool', () => {
  const g = islands();
  g.countries[1].troops = 1000;
  step(g, Array(10).fill({ type: 'navalInvasion', country: 1, target: 0, tile: eastCoastTile(g), ratio: 1 }));
  const boats = g.ships.filter(s => s.kind === 'transport');
  const aboard = boats.reduce((n, s) => n + (s.troops ?? 0), 0);
  expect(g.countries[1].troops).toBeGreaterThanOrEqual(0);
  expect(boats).toHaveLength(1);
  expect(aboard).toBeLessThanOrEqual(1000);
});

it('the beach tile is reported as changed so the map redraws it', () => {
  const g = islands();
  const tile = eastCoastTile(g);
  step(g, [{ type: 'navalInvasion', country: 1, target: 0, tile, ratio: 0.3 }]);
  let seen = false;
  for (let i = 0; i < 60 * 4 && !seen; i++) { const r = step(g, []); if (r.changedTiles.includes(tile)) seen = true; }
  expect(seen).toBe(true);
});
