import { it, expect } from 'vitest';
import { createGame } from './state';
import { makeTestWorld } from '../map/testWorld';
import type { StartDef } from './types';

const start: StartDef = {
  id: 't', name: 't', startDate: { y: 1836, m: 1, d: 1 }, endYear: 1936,
  countries: [
    { tag: 'XXX', name: 'X', color: 0xff0000, capital: 'T-A', population: 1000, money: 100 },
    { tag: 'YYY', name: 'Y', color: 0x00ff00, capital: 'T-D', population: 1000, money: 100 },
  ],
  ownership: [{ modern: 'TST', owner: 'XXX' }, { states: ['T-D'], owner: 'YYY' }, { states: ['T-C'], unclaimed: true }],
};
const setup = { startId: 't', playerTag: 'XXX', difficulty: 'normal' as const, rivalsHarder: false, seed: 1 };

it('createGame assigns owners by rules, later rules win', () => {
  const g = createGame(makeTestWorld(['AABB', 'CCDD']), start, setup);
  expect(g.states[1].owner).toBe(1);
  expect(g.states[4].owner).toBe(2);
  expect(g.states[3].owner).toBe(0);
  expect(g.countries[1].tiles).toBe(4);
  expect(g.countries[1].isPlayer).toBe(true);
  expect(g.countries[2].isPlayer).toBe(false);
  expect(g.countries[1].capitalState).toBe(1);
});
it('distributes population over owned states by weight', () => {
  const map = makeTestWorld(['AB'], { popWeight: { 'T-A': 3, 'T-B': 1 } });
  const g = createGame(map, { ...start, countries: [{ ...start.countries[0], population: 4000 }], ownership: [{ modern: 'TST', owner: 'XXX' }] }, setup);
  expect(g.states[1].population).toBe(3000);
  expect(g.states[2].population).toBe(1000);
  expect(g.countries[1].population).toBe(4000);
});
it('sets the end tick from the end year', () => {
  const g = createGame(makeTestWorld(['AABB', 'CCDD']), start, setup);
  expect(g.endTick).toBe(36524 * 4);
});
it('throws on unknown state keys and player tags', () => {
  expect(() => createGame(makeTestWorld(['AABB', 'CCDD']), { ...start, ownership: [{ states: ['T-Z'], owner: 'XXX' }] }, setup)).toThrow(/T-Z/);
  expect(() => createGame(makeTestWorld(['AABB', 'CCDD']), start, { ...setup, playerTag: 'QQQ' })).toThrow(/QQQ/);
});

it('territory populations: fixed state figures, territory totals, and density for uncovered states', () => {
  const map = makeTestWorld(['AABBCC']);
  map.states[3].modern = 'OTH';
  const s2: StartDef = { ...start, countries: [{ ...start.countries[0], population: 999_999 }],
    ownership: [{ modern: 'TST', owner: 'XXX' }, { modern: 'OTH', owner: 'XXX' }],
    regionPopulation: { TST: 3000, 'T-B': 1000 } };
  const g = createGame(map, s2, setup);
  expect(g.states[2].population).toBe(1000);     // fixed
  expect(g.states[1].population).toBe(2000);     // rest of TST
  expect(g.states[3].population).toBe(1500);     // uncovered: the country's average density over covered states
});
