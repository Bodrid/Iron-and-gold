import { it, expect } from 'vitest';
import { step } from './step';
import { makeGame, runDays, stateId, stateTiles } from './testing';
import { addLevel, buildCheck, buildCost } from './economy';
import { mods } from './mods';
import { tileCost } from './combat';
import { recomputeMaxTroops } from './troops';
import { declareWarRaw } from './war';

const game = () => makeGame({ rows: ['AAAABBBB', 'AAAABBBB'], owners: { A: 'XXX', B: 'YYY' }, population: 2_000_000, money: 1e6 });

it('mods add up tech effects and change when a tech is learned', () => {
  const g = game();
  const c = g.countries[1];
  const before = mods(g, c).output.farm;
  c.techs.push('threshingMachines');
  expect(mods(g, c).output.farm).toBe(before + 10);
  c.techs.push('telegraph');
  expect(mods(g, c).output.farm).toBe(before + 15);
  expect(mods(g, c).taxPct).toBeGreaterThan(0);
});

it('a farm tech raises grain output', () => {
  const a = game(), b = game();
  for (const g of [a, b]) addLevel(g, stateId(g, 'T-A'), 'farm', 2);
  b.countries[1].techs.push('threshingMachines');
  runDays(a, 35); runDays(b, 35);
  expect(b.countries[1].produced.grain).toBeGreaterThan(a.countries[1].produced.grain * 1.05);
});

it('railways need the Railways tech', () => {
  const g = game();
  const s = stateId(g, 'T-A');
  expect(buildCheck(g, 1, s, 'railway')).toEqual({ ok: false, reason: 'needsTech' });
  g.countries[1].techs.push('steamEngine', 'railways');
  expect(buildCheck(g, 1, s, 'railway').ok).toBe(true);
  const r = step(g, [{ type: 'build', country: 1, state: s, building: 'railway' }]);
  expect(r.events.some(e => e.type === 'rejected')).toBe(false);
});

it('military techs make attacks cheaper and defence dearer', () => {
  const g = game();
  declareWarRaw(g, 1, 2);
  const tile = stateTiles(g, 'T-B')[0];
  const base = tileCost(g, tile, 2, 1);
  g.countries[1].techs.push('percussionCaps');
  expect(tileCost(g, tile, 2, 1)).toBeLessThan(base);
  g.countries[2].techs.push('fieldFortifications');
  const withDef = tileCost(g, tile, 2, 1);
  g.countries[2].techs.pop();
  expect(withDef).toBeGreaterThan(tileCost(g, tile, 2, 1));
});

it('living standards and troop limits follow techs', () => {
  const a = game(), b = game();
  b.countries[1].techs.push('romanticism');
  runDays(a, 35); runDays(b, 35);
  expect(b.countries[1].sol).toBeCloseTo(a.countries[1].sol + 1, 5);
  const c = a.countries[1];
  recomputeMaxTroops(a, c);
  const max = c.maxTroops;
  c.techs.push('generalStaff', 'railMobilisation', 'reserveSystem');
  recomputeMaxTroops(a, c);
  expect(c.maxTroops).toBeGreaterThan(max * 1.15);
});

it('building cost falls with finance techs', () => {
  const g = game();
  const before = buildCost(g, 1, 'farm');
  g.countries[1].techs.push('jointStock');
  expect(buildCost(g, 1, 'farm')).toBeLessThan(before);
});
