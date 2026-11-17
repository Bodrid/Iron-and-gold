import { it, expect } from 'vitest';
import { step } from './step';
import { makeGame, runDays, stateId } from './testing';
import { addLevel } from './economy';
import { mods } from './mods';
import { lawSupport, monthlyPolitics, passChance } from './politics';
import { makePuppet } from './diplomacy/subjects';
import { LAWS, LAW_AREAS, DEFAULT_LAWS } from '../content/laws';
import { GROUP_IDS } from '../content/groups';
import type { Country, SimEvent } from './types';

const game = () => makeGame({ rows: ['AAAABBBB', 'AAAABBBB'], owners: { A: 'XXX', B: 'YYY' }, population: 2_000_000, money: 1e6 });
/** Make every group love (or hate) `law` relative to the current one by giving all clout to one group. */
const cloutTo = (c: Country, g: typeof GROUP_IDS[number]) => { for (const x of GROUP_IDS) c.groups[x].clout = x === g ? 1 : 0; };

it('every area has 3 options and the defaults are valid', () => {
  for (const a of LAW_AREAS) {
    expect(LAWS.filter(l => l.area === a.id)).toHaveLength(3);
    expect(LAWS.find(l => l.id === DEFAULT_LAWS[a.id])?.area).toBe(a.id);
  }
});

it('laws change the country’s modifiers', () => {
  const g = game();
  const c = g.countries[1];
  const tax = mods(g, c).taxPct;
  c.laws = { ...c.laws, taxes: 'highTaxes' };
  expect(mods(g, c).taxPct).toBe(tax + 30);
});

it('a law with support passes after a few months', () => {
  const g = game();
  const c = g.countries[1];
  for (const st of g.states) if (st.owner === 1) addLevel(g, st.id, 'textileMill', 10);   // an industrial country
  runDays(g, 35);
  expect(lawSupport(c, 'protectionism')).toBeGreaterThan(0);
  const r = step(g, [{ type: 'enactLaw', country: 1, law: 'protectionism' }]);
  expect(r.events.filter(e => e.type === 'rejected')).toEqual([]);
  expect(c.enacting?.law).toBe('protectionism');
  const events: SimEvent[] = [];
  for (let m = 0; m < 30 && c.enacting; m++) monthlyPolitics(g, events);
  expect(c.laws.trade).toBe('protectionism');
  expect(events).toContainEqual({ type: 'lawPassed', country: 1, law: 'protectionism' });
});

it('a law nobody wants is refused, and one that loses support fails with a reason', () => {
  const g = game();
  const c = g.countries[1];
  cloutTo(c, 'landowners');
  const r = step(g, [{ type: 'enactLaw', country: 1, law: 'universalSuffrage' }]);
  expect(r.events).toContainEqual(expect.objectContaining({ type: 'rejected', reason: 'noSupport' }));

  cloutTo(c, 'workers');
  step(g, [{ type: 'enactLaw', country: 1, law: 'universalSuffrage' }]);
  expect(c.enacting).not.toBeNull();
  // The economy turns agrarian and the landowners take over: the law fails.
  const events: SimEvent[] = [];
  for (const st of g.states) if (st.owner === 1) addLevel(g, st.id, 'farm', 4);
  c.laws = { ...c.laws, labour: 'serfdom' };
  monthlyPolitics(g, events);
  expect(c.enacting).toBeNull();
  expect(events).toContainEqual(expect.objectContaining({ type: 'lawFailed', law: 'universalSuffrage', reason: 'noSupport' }));
  expect(c.laws.voting).toBe('noVoting');   // nothing half-applied
});

it('enactment can be cancelled, and ends cleanly on becoming a puppet or being eliminated', () => {
  const g = game();
  const c = g.countries[1];
  cloutTo(c, 'industrialists');
  step(g, [{ type: 'enactLaw', country: 1, law: 'protectionism' }]);
  step(g, [{ type: 'cancelEnactment', country: 1 }]);
  expect(c.enacting).toBeNull();

  cloutTo(c, 'industrialists');
  step(g, [{ type: 'enactLaw', country: 1, law: 'protectionism' }]);
  expect(c.enacting).not.toBeNull();
  makePuppet(g, 2, 1, []);
  const events: SimEvent[] = [];
  monthlyPolitics(g, events);
  expect(events).toContainEqual(expect.objectContaining({ type: 'lawFailed', reason: 'puppeted' }));
  expect(c.laws.trade).toBe('mercantilism');

  const h = game();
  const d = h.countries[2];
  cloutTo(d, 'industrialists');
  step(h, [{ type: 'enactLaw', country: 2, law: 'protectionism' }]);
  d.alive = false;
  expect(() => monthlyPolitics(h, [])).not.toThrow();
  expect(d.enacting).toBeNull();
});

it('farms raise landowner clout and industry raises industrialists', () => {
  const a = game(), b = game();
  addLevel(a, stateId(a, 'T-A'), 'farm', 10);
  addLevel(b, stateId(b, 'T-A'), 'textileMill', 10);
  runDays(a, 35); runDays(b, 35);
  expect(a.countries[1].groups.landowners.clout).toBeGreaterThan(b.countries[1].groups.landowners.clout);
  expect(b.countries[1].groups.industrialists.clout).toBeGreaterThan(a.countries[1].groups.industrialists.clout);
  let sum = 0;
  for (const g of GROUP_IDS) sum += a.countries[1].groups[g].clout;
  expect(sum).toBeCloseTo(1, 6);
});

it('a hated law makes a group angry, radicalism builds, and it cools off again', () => {
  const g = game();
  const c = g.countries[1];
  c.laws = { ...c.laws, labour: 'serfdom', voting: 'noVoting', education: 'noEducation', government: 'absoluteMonarchy', army: 'massConscription', welfare: 'noWelfare' };
  runDays(g, 365);
  expect(c.groups.workers.approval).toBeLessThanOrEqual(-5);
  expect(c.groups.workers.radicalism).toBeGreaterThan(20);
  c.laws = { ...DEFAULT_LAWS, labour: 'freeLabour', voting: 'universalSuffrage', welfare: 'socialSecurity' };
  const r = c.groups.workers.radicalism;
  runDays(g, 365);
  expect(c.groups.workers.radicalism).toBeLessThan(r);
});

it('the chance to pass grows with support and is capped', () => {
  expect(passChance(-1)).toBe(0);
  expect(passChance(1)).toBeGreaterThan(passChance(0));
  expect(passChance(10)).toBeLessThanOrEqual(0.4);
});
