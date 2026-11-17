import { it, expect } from 'vitest';
import { step } from './step';
import { makeGame, runDays, stateId } from './testing';
import { addLevel } from './economy';
import { companyLimit, companiesMonth } from './companies';
import { mods } from './mods';
import { approvalTarget } from './politics';
import { makePuppet } from './diplomacy/subjects';
import type { GameState, SimEvent } from './types';

const world = (): GameState => {
  const g = makeGame({ rows: ['AAAABBBBCC', 'AAAABBBBCC'], owners: { A: 'XXX', B: 'XXX', C: 'YYY' }, population: 3_000_000, money: 1e7, player: 'YYY' });
  return g;
};

it('found a generic company; a historical one belongs to its country only', () => {
  const g = world();
  const r = step(g, [{ type: 'foundCompany', country: 1, company: 'coalCompany' }]);
  expect(r.events.filter(e => e.type === 'rejected')).toEqual([]);
  expect(g.countries[1].companies.map(c => c.id)).toEqual(['coalCompany']);
  expect(step(g, [{ type: 'foundCompany', country: 1, company: 'eastIndia' }]).events[0]).toMatchObject({ type: 'rejected', reason: 'notYours' });
  expect(step(g, [{ type: 'foundCompany', country: 1, company: 'coalCompany' }]).events[0]).toMatchObject({ type: 'rejected', reason: 'alreadyFounded' });
});

it('the number of companies grows with industry', () => {
  const g = world();
  expect(companyLimit(g, 1)).toBe(1);
  for (const k of ['T-A', 'T-B']) addLevel(g, stateId(g, k), 'textileMill', 15);
  expect(companyLimit(g, 1)).toBe(2);
  step(g, [{ type: 'foundCompany', country: 1, company: 'coalCompany' }, { type: 'foundCompany', country: 1, company: 'timberCompany' }]);
  const r = step(g, [{ type: 'foundCompany', country: 1, company: 'ironWorks' }]);
  expect(r.events[0]).toMatchObject({ type: 'rejected', reason: 'tooMany' });
});

it('a company boosts its buildings more as they grow, up to a cap, and the bonus drops if they go', () => {
  const g = world();
  const base = mods(g, g.countries[1]).output.textileMill;   // techs already give some
  const out = () => mods(g, g.countries[1]).output.textileMill - base;
  step(g, [{ type: 'foundCompany', country: 1, company: 'textileCombine' }]);
  companiesMonth(g, []);
  expect(out()).toBe(0);
  addLevel(g, stateId(g, 'T-A'), 'textileMill', 20);
  companiesMonth(g, []);
  expect(out()).toBe(10);
  addLevel(g, stateId(g, 'T-B'), 'textileMill', 100);
  companiesMonth(g, []);
  expect(out()).toBe(25);
  g.states[stateId(g, 'T-A')].buildings = []; g.states[stateId(g, 'T-B')].buildings = [];
  companiesMonth(g, []);
  expect(out()).toBe(0);
  expect(g.countries[1].companies).toHaveLength(1);       // the company stays
});

it('charters: a monopoly adds output but splits the interest groups; colonial costs taxes', () => {
  const g = world();
  const base = mods(g, g.countries[1]).output.textileMill;
  step(g, [{ type: 'foundCompany', country: 1, company: 'textileCombine' }]);
  addLevel(g, stateId(g, 'T-A'), 'textileMill', 20);
  companiesMonth(g, []);
  const c = g.countries[1];
  const ind = approvalTarget(g, c, 'industrialists'), work = approvalTarget(g, c, 'workers');
  step(g, [{ type: 'grantCharter', country: 1, company: 'textileCombine', charter: 'monopoly' }]);
  expect(mods(g, c).output.textileMill - base).toBe(25);
  expect(approvalTarget(g, c, 'industrialists')).toBeGreaterThan(ind);
  expect(approvalTarget(g, c, 'workers')).toBeLessThan(work);
  step(g, [{ type: 'revokeCharter', country: 1, company: 'textileCombine' }]);
  expect(mods(g, c).output.textileMill - base).toBe(10);
  const tax = mods(g, c).taxPct;
  step(g, [{ type: 'grantCharter', country: 1, company: 'textileCombine', charter: 'colonial' }]);
  expect(mods(g, c).taxPct).toBe(tax - 5);
  expect(mods(g, c).colonisePct).toBe(25);
});

it('an investment charter needs puppets and ends cleanly when the last one goes', () => {
  const g = world();
  const base = mods(g, g.countries[1]).output.textileMill;
  step(g, [{ type: 'foundCompany', country: 1, company: 'textileCombine' }]);
  expect(step(g, [{ type: 'grantCharter', country: 1, company: 'textileCombine', charter: 'investment' }]).events[0]).toMatchObject({ type: 'rejected', reason: 'noPuppets' });
  makePuppet(g, 1, 2, []);
  addLevel(g, stateId(g, 'T-C'), 'textileMill', 20);
  step(g, [{ type: 'grantCharter', country: 1, company: 'textileCombine', charter: 'investment' }]);
  companiesMonth(g, []);
  expect(mods(g, g.countries[1]).output.textileMill - base).toBe(10);   // the puppet's mills count
  g.countries[2].overlord = 0;
  const events: SimEvent[] = [];
  companiesMonth(g, events);
  expect(g.countries[1].companies[0].charter).toBeNull();
  expect(events).toContainEqual({ type: 'charterEnded', country: 1, company: 'textileCombine' });
  expect(() => runDays(g, 40)).not.toThrow();
});
