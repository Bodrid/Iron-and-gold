import { it, expect } from 'vitest';
import { BUILDINGS } from './buildings';
import { GOODS } from './goods';

it('has the 15 buildings from the spec, each with a distinct job', () => {
  expect(Object.keys(BUILDINGS)).toHaveLength(15);
  const sigs = Object.values(BUILDINGS).map(b => JSON.stringify([b.inputs, b.outputs, b.effects ?? {}]));
  expect(new Set(sigs).size).toBe(15);
});
it('only uses known goods and sane numbers', () => {
  for (const b of Object.values(BUILDINGS)) {
    for (const g of [...Object.keys(b.inputs), ...Object.keys(b.outputs)]) expect(GOODS).toContain(g);
    expect(b.cost).toBeGreaterThan(0); expect(b.buildDays).toBeGreaterThan(0); expect(b.workers).toBeGreaterThan(0);
    expect(b.name.length).toBeGreaterThan(0); expect(b.description.length).toBeGreaterThan(0);
  }
});
