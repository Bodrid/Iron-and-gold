import { it, expect } from 'vitest';
import { step } from './step';
import { makeGame, runDays, runYears, occupy, stateTiles, stateId } from './testing';
import { buildCheck, stateSlots } from './economy';
import { BUILDINGS } from '../content/buildings';
import { declareWarRaw } from './war';

const rich = (opts = {}) => { const g = makeGame({ population: 2_000_000, money: 1e7, ...opts }); return g; };
const build = (g: ReturnType<typeof makeGame>, state: number, building: any, country = 1) => step(g, [{ type: 'build', country, state, building }]);
const levels = (g: ReturnType<typeof makeGame>, state: number, type: string) => g.states[state].buildings.filter(b => b.type === type).reduce((s, b) => s + b.level, 0);

it('a farm is queued, finishes after its build time and produces grain', () => {
  const g = rich();
  build(g, 1, 'farm');
  expect(g.constructions).toHaveLength(1);
  runDays(g, BUILDINGS.farm.buildDays + 1);
  expect(levels(g, 1, 'farm')).toBe(1);
  expect(g.constructions).toHaveLength(0);
  runDays(g, 31);
  expect(g.countries[1].produced.grain).toBeGreaterThan(0);
});

it('building costs money up front', () => {
  const g = rich();
  const before = g.countries[1].money;
  build(g, 1, 'farm');
  expect(g.countries[1].money).toBe(before - BUILDINGS.farm.cost);
});

it('arms factory needs iron and tools', () => {
  const g = rich();
  g.states[1].buildings.push({ type: 'armsFactory', level: 1, tile: stateTiles(g, 'T-A')[0] });
  g.countries[1].stockpile.iron = 0; g.countries[1].stockpile.tools = 0;
  runDays(g, 32);
  expect(g.countries[1].produced.arms).toBe(0);
  g.countries[1].stockpile.iron = 1e6; g.countries[1].stockpile.tools = 1e6;
  runDays(g, 31);
  expect(g.countries[1].produced.arms).toBeGreaterThan(0);
});

it('mines require deposits and ports require a coast', () => {
  const g = rich({ rows: ['AABB'] , resources: { 'T-B': { iron: true } } });
  expect(buildCheck(g, 1, 1, 'ironMine')).toEqual({ ok: false, reason: 'needsIron' });
  expect(buildCheck(g, 1, 1, 'coalMine')).toEqual({ ok: false, reason: 'needsCoal' });
  const h = rich({ rows: ['AABB', 'AABB'] });
  expect(buildCheck(h, 1, 1, 'port')).toEqual({ ok: false, reason: 'needsCoast' });
});

it('cannot build in states you do not own or that are occupied', () => {
  const g = rich();
  expect(buildCheck(g, 1, 2, 'farm')).toEqual({ ok: false, reason: 'notYours' });
  declareWarRaw(g, 1, 2);
  occupy(g, 2, stateTiles(g, 'T-A'));
  expect(buildCheck(g, 1, 1, 'farm')).toEqual({ ok: false, reason: 'occupied' });
});

it('rapid duplicate build orders never overspend or exceed limits', () => {
  const g = makeGame({ population: 2_000_000, money: BUILDINGS.farm.cost * 2.5 });
  step(g, Array(10).fill({ type: 'build', country: 1, state: 1, building: 'farm' }));
  expect(g.countries[1].money).toBeGreaterThanOrEqual(0);
  expect(g.constructions.filter(c => c.country === 1)).toHaveLength(2);
});

it('slots count queued constructions and run out', () => {
  const g = rich();
  for (let i = 0; i < 200 && buildCheck(g, 1, 1, 'farm').ok; i++) { build(g, 1, 'farm'); runDays(g, BUILDINGS.farm.buildDays + 1); }
  expect(buildCheck(g, 1, 1, 'farm')).toEqual({ ok: false, reason: 'noSlots' });
  expect(stateSlots(g, 1).used).toBe(stateSlots(g, 1).total);
});

it('occupied states produce nothing for their owner', () => {
  const g = rich();
  g.states[1].buildings.push({ type: 'farm', level: 3, tile: stateTiles(g, 'T-A')[0] });
  declareWarRaw(g, 1, 2);
  occupy(g, 2, stateTiles(g, 'T-A'));
  runDays(g, 32);
  expect(g.countries[1].produced.grain).toBe(0);
});

it('higher standard of living grows population faster', () => {
  const g = makeGame({ population: 1_000_000 });
  const a = g.countries[1], b = g.countries[2];
  a.stockpile.grain = b.stockpile.grain = 1e9;
  a.stockpile.textiles = 1e9; a.stockpile.luxuries = 1e9;
  b.stockpile.textiles = 0; b.stockpile.luxuries = 0;
  runYears(g, 2);
  expect(a.sol).toBeGreaterThan(b.sol);
  expect(a.population).toBeGreaterThan(b.population);
});

it('GDP rises when you build productive buildings', () => {
  const g = rich();
  for (let i = 0; i < 3; i++) build(g, 1, 'farm');
  runYears(g, 1);
  expect(g.countries[1].gdp).toBeGreaterThan(g.countries[2].gdp);
});

it('income is taxes minus upkeep and is added to money monthly', () => {
  const g = rich();
  g.states[1].buildings.push({ type: 'farm', level: 5, tile: stateTiles(g, 'T-A')[0] });
  const m0 = g.countries[1].money;
  runDays(g, 32);
  expect(g.countries[1].income).not.toBe(0);
  expect(g.countries[1].money).toBeCloseTo(m0 + g.countries[1].income, 0);
});

it('records a history sample each month', () => {
  const g = rich();
  runDays(g, 95);
  expect(g.countries[1].history.length).toBe(3);
  expect(stateId(g, 'T-A')).toBe(1);
});

it('a new game already shows GDP and income without changing money or stockpiles', () => {
  const g = makeGame({ population: 2_000_000, seedEconomy: true });
  expect(g.countries[1].gdp).toBeGreaterThan(0);
  expect(g.countries[1].income).not.toBe(0);
  expect(g.countries[1].money).toBe(10_000);
  expect(g.countries[1].history).toHaveLength(0);
});
