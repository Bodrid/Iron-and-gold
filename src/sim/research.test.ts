import { it, expect } from 'vitest';
import { step } from './step';
import { makeGame, runDays } from './testing';
import { TECHS, TECH_BY_ID, ERA_COST } from '../content/techs';
import { canResearch, currentEra, techCost, researchMonth } from './research';
import type { SimEvent } from './types';

const game = () => makeGame({ rows: ['AABBCC'], owners: { A: 'XXX', B: 'YYY', C: 'ZZZ' } });

it('every tech requires only earlier-or-same-era techs that exist', () => {
  for (const t of TECHS) for (const r of t.requires) {
    expect(TECH_BY_ID[r], `${t.id} needs ${r}`).toBeDefined();
    expect(TECH_BY_ID[r].era).toBeLessThanOrEqual(t.era);
  }
  expect(TECHS.length).toBe(60);
});

it('a test game starts with every era-1 tech known (1836 default)', () => {
  const g = game();
  expect(g.countries[1].techs).toContain('cropRotation');
  expect(g.countries[1].techs).not.toContain('steamEngine');
});

it('the current era follows the year', () => {
  const g = game();
  expect(currentEra(g)).toBe(2);
});

it('research needs the prerequisites', () => {
  const g = game();
  expect(canResearch(g, g.countries[1], 'steamEngine')).toBe(true);
  expect(canResearch(g, g.countries[1], 'railways')).toBe(false);
  const r = step(g, [{ type: 'research', country: 1, tech: 'railways' }]);
  expect(r.events.some(e => e.type === 'rejected')).toBe(true);
  expect(canResearch(g, g.countries[1], 'cropRotation')).toBe(false); // already known
});

it('banked points complete the current tech and the queue moves on', () => {
  const g = game();
  const c = g.countries[1];
  step(g, [{ type: 'research', country: 1, tech: 'steamEngine' }, { type: 'queueTech', country: 1, tech: 'threshingMachines' }]);
  expect(c.researching).toBe('steamEngine');
  expect(c.researchQueue).toEqual(['threshingMachines']);
  c.researchPoints = techCost(g, c, 'steamEngine') + 5;
  const events: SimEvent[] = [];
  researchMonth(g, events);
  expect(c.techs).toContain('steamEngine');
  expect(events).toContainEqual({ type: 'techResearched', country: 1, tech: 'steamEngine' });
  expect(c.researching).toBe('threshingMachines');
  expect(c.researchQueue).toEqual([]);
  expect(c.researchPoints).toBeCloseTo(5, 5);
});

it('a queued tech can wait for a prerequisite that is being researched', () => {
  const g = game();
  const c = g.countries[1];
  const r = step(g, [{ type: 'research', country: 1, tech: 'steamEngine' }, { type: 'queueTech', country: 1, tech: 'railways' }]);
  expect(r.events.filter(e => e.type === 'rejected')).toEqual([]);
  expect(c.researchQueue).toEqual(['railways']);
});

it('research prepends: the current tech goes back to the front of the queue', () => {
  const g = game();
  const c = g.countries[1];
  step(g, [{ type: 'research', country: 1, tech: 'steamEngine' }]);
  step(g, [{ type: 'research', country: 1, tech: 'puddling' }]);
  expect(c.researching).toBe('puddling');
  expect(c.researchQueue).toEqual(['steamEngine']);
  step(g, [{ type: 'unqueueTech', country: 1, tech: 'puddling' }]);
  expect(c.researching).toBe(null);
});

it('techs known by most countries are cheaper', () => {
  const g = game();
  const before = techCost(g, g.countries[1], 'steamEngine');
  g.countries[2].techs.push('steamEngine'); g.countries[3].techs.push('steamEngine');
  researchMonth(g, []); // refreshes the known-share cache
  expect(techCost(g, g.countries[1], 'steamEngine')).toBeLessThan(before);
});

it('researching ahead of your time costs more', () => {
  const g = game();
  const c = g.countries[1];
  expect(techCost(g, c, 'powerLooms')).toBeGreaterThan(ERA_COST[3]); // era 3 in 1836
  expect(techCost(g, c, 'steamEngine')).toBeLessThanOrEqual(ERA_COST[2]);
});

it('every month earns research points even without universities, and zero points is safe', () => {
  const g = game();
  const c = g.countries[1];
  step(g, [{ type: 'research', country: 1, tech: 'steamEngine' }]);
  runDays(g, 35);
  expect(c.researchRate).toBeGreaterThan(0);
  expect(c.researchPoints).toBeGreaterThan(0);
  c.researchPoints = 0; c.researchRate = 0;
  expect(() => researchMonth(g, [])).not.toThrow();
  expect(c.researching).toBe('steamEngine');
});

it('a queued tech whose prerequisite is dropped waits instead of starting', () => {
  const g = game();
  const c = g.countries[1];
  step(g, [{ type: 'research', country: 1, tech: 'steamEngine' }, { type: 'queueTech', country: 1, tech: 'railways' }]);
  step(g, [{ type: 'unqueueTech', country: 1, tech: 'steamEngine' }]);
  c.researchPoints = 10_000;
  researchMonth(g, []);
  expect(c.researching).toBe(null);
  expect(c.techs).not.toContain('railways');
});
