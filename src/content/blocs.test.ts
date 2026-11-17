import { it, expect } from 'vitest';
import { BLOC_TYPES, BLOC_TYPE_IDS, PRINCIPLES, PRINCIPLE_IDS } from './blocs';
import { describeEffects } from './effects';

it('has four bloc types, each with a fixed principle, and ten principles', () => {
  expect(BLOC_TYPE_IDS).toHaveLength(4);
  for (const t of BLOC_TYPE_IDS) expect(PRINCIPLES[BLOC_TYPES[t].fixed]).toBeDefined();
  expect(PRINCIPLE_IDS.length).toBeGreaterThanOrEqual(8);
});

it('principle effects read as plain text, and members get less than the leader', () => {
  expect(describeEffects(PRINCIPLES.militaryDrill.leader)).toEqual(['+15% troop refill']);
  expect(describeEffects(PRINCIPLES.ideologicalUnity.member)).toEqual(['+0.5 interest group approval']);
  for (const id of PRINCIPLE_IDS) {
    const p = PRINCIPLES[id];
    for (const [k, v] of Object.entries(p.member)) if (typeof v === 'number') expect(Math.abs(v)).toBeLessThanOrEqual(Math.abs((p.leader as any)[k] ?? 0));
  }
});
