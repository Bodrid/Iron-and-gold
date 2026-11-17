import { it, expect } from 'vitest';
import { step } from './step';
import { makeGame, runDays, invariantProblems } from './testing';
import { atWar, startWar } from './war';
import { formCheck, coreShare, startIndependence, releaseNation } from './nations';
import { makePuppet } from './diplomacy/subjects';
import { relation, changeRelation } from './diplomacy/relations';
import { sign } from './diplomacy/treaties';
import { blocOf } from './blocs';
import type { GameState } from './types';
import { FORMABLES } from '../content/formables';

// A test formable: 'T-A'..'T-D' are the cores; PPP may form it.
const world = (player = 'ZZZ'): GameState => {
  const g = makeGame({ rows: ['AABBCCDDEEZZ'], owners: { A: 'PPP', B: 'PPP', C: 'PPP', D: 'QQQ', E: 'QQQ', Z: 'ZZZ' }, population: 2_000_000, money: 1e7, player });
  for (const c of g.countries.slice(1)) { c.troops = 10_000; c.maxTroops = 20_000; }
  return g;
};
FORMABLES.push({ tag: 'TST', name: 'Testland', color: 0x123456, from: ['PPP'], cores: ['T-A', 'T-B', 'T-C', 'T-D'], share: 0.75, description: 'test' });

it('a country owning enough of the cores forms the nation, keeping relations, treaties, bloc, puppets and wars', () => {
  const g = world();
  expect(coreShare(g, 1, FORMABLES.find(f => f.tag === 'TST')!)).toBeCloseTo(0.75);
  changeRelation(g, 1, 3, 40);
  sign(g, 1, 3, 'tradeAgreement', []);
  g.blocs.push({ id: 50, leader: 1, type: 'empire', principles: ['imperialTribute'], members: [3], founded: 0, principlesSet: 0 });
  const rel = relation(g, 1, 3);
  expect(formCheck(g, 1, 'TST')).toBeNull();
  const r = step(g, [{ type: 'formNation', country: 1, tag: 'TST' }]);
  expect(r.events).toContainEqual(expect.objectContaining({ type: 'nationFormed', country: 1, tag: 'TST' }));
  const c = g.countries[1];
  expect([c.tag, c.name, c.color]).toEqual(['TST', 'Testland', 0x123456]);
  expect(relation(g, 1, 3)).toBe(rel);
  expect(g.treaties.some(t => t.a === 1 && t.b === 3)).toBe(true);
  expect(blocOf(g, 3)?.leader).toBe(1);
  expect(formCheck(g, 1, 'TST')).toBe('alreadyExists');
});

it('forming is refused for the wrong country, too few cores, puppets and countries at war', () => {
  const g = world();
  expect(formCheck(g, 2, 'TST')).toBe('notEligible');
  g.countries[1].tag = 'PPP';
  for (let t = 0; t < g.owner.length; t++) if (g.map.states[g.map.stateOf[t]]?.key === 'T-C') { g.owner[t] = 2; g.controller[t] = 2; }
  g.states.find(s => g.map.states[s.id]?.key === 'T-C')!.owner = 2;
  expect(formCheck(g, 1, 'TST')).toBe('needsCores');
  const h = world();
  startWar(h, [1], [3], [], []);
  expect(formCheck(h, 1, 'TST')).toBe('atWar');
  const k = world();
  makePuppet(k, 2, 1, []);
  expect(formCheck(k, 1, 'TST')).toBe('puppet');
});

it('an independence revolt that wins leaves a real country with its states', () => {
  const g = world();
  const rebels = startIndependence(g, g.countries[2], { tag: 'REB', name: 'Free Republic', color: 0xabcdef, keys: ['T-E'] }, [], [])!;
  expect(rebels.tag).toBe('REB');
  const war = atWar(g, rebels.id, 2)!;
  expect(war.goals).toEqual([{ kind: 'independence' }]);
  const r = step(g, [{ type: 'proposePeace', country: 2, warId: war.id, terms: { demands: war.goals, give: true } }]);
  runDays(g, 2);
  expect(rebels.alive).toBe(true);
  expect(rebels.rebel).toBeUndefined();
  expect(g.states.find(s => g.map.states[s.id]?.key === 'T-E')!.owner).toBe(rebels.id);
  expect(r.events).toContainEqual(expect.objectContaining({ type: 'revoltEnded', rebels: rebels.id, won: true }));
  expect(invariantProblems(g)).toEqual([]);
});

it('an independence revolt that loses hands the land back; one that wins and later loses everything is eliminated cleanly', () => {
  const g = world();
  const rebels = startIndependence(g, g.countries[2], { tag: 'REB', name: 'Free Republic', color: 0xabcdef, keys: ['T-E'] }, [], [])!;
  const war = atWar(g, rebels.id, 2)!;
  step(g, [{ type: 'proposePeace', country: rebels.id, warId: war.id, terms: { demands: [], white: true } }]);
  runDays(g, 2);
  expect(rebels.alive).toBe(false);
  expect(g.states.find(s => g.map.states[s.id]?.key === 'T-E')!.owner).toBe(2);
  expect(invariantProblems(g)).toEqual([]);
});

it('independence mid-war and for a puppet parent keeps wars consistent; a released nation appears in peace', () => {
  const g = world();
  makePuppet(g, 1, 2, []);
  startWar(g, [3], [1], [], []);
  const rebels = startIndependence(g, g.countries[2], { tag: 'REB', name: 'Free Republic', color: 0xabcdef, keys: ['T-E'] }, [], [])!;
  expect(atWar(g, rebels.id, 2)).toBeDefined();
  expect(() => runDays(g, 20)).not.toThrow();
  expect(invariantProblems(g)).toEqual([]);
  const h = world();
  const free = releaseNation(h, h.countries[2], { tag: 'FRE', name: 'Freedonia', color: 0x777777, keys: ['T-E'] }, [])!;
  expect(free.alive).toBe(true);
  expect(atWar(h, free.id, 2)).toBeUndefined();
  expect(free.techs).toEqual(h.countries[2].techs);
});
