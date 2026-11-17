import { it, expect } from 'vitest';
import { step } from './step';
import { makeGame, runDays, stateId, invariantProblems, occupy } from './testing';
import { atWar, startWar } from './war';
import { startRevolt, wantedLaw, revoltDay } from './revolts';
import { makePuppet } from './diplomacy/subjects';
import { relation } from './diplomacy/relations';
import { hasTreaty, sign } from './diplomacy/treaties';
import type { GameState, SimEvent } from './types';
import { getStateTiles as stateTilesOf } from '../map/stateTiles';

// XXX has five states (A1..A5, capital A1); YYY and ZZZ are neighbours.
const world = (): GameState => {
  const g = makeGame({ rows: ['AAABBBCCCDDDEEEYYYZZZ', 'AAABBBCCCDDDEEEYYYZZZ'], owners: { A: 'XXX', B: 'XXX', C: 'XXX', D: 'XXX', E: 'XXX', Y: 'YYY', Z: 'ZZZ' }, population: 1_000_000, money: 1e6, player: 'ZZZ' });
  for (const c of g.countries.slice(1)) { c.troops = 10_000; c.maxTroops = 20_000; }
  return g;
};
const angry = (g: GameState) => {
  const c = g.countries[1];
  c.laws = { ...c.laws, labour: 'serfdom' };
  c.groups.workers.clout = 0.3; c.groups.workers.radicalism = 100;
};

it('a radical group with clout rises up as a new country at war with its parent', () => {
  const g = world();
  angry(g);
  const events: SimEvent[] = [];
  revoltDay(g, events, []);
  const rebels = g.countries[g.countries.length - 1];
  expect(rebels.rebel).toEqual({ parent: 1, group: 'workers', law: 'freeLabour' });
  expect(events).toContainEqual(expect.objectContaining({ type: 'revolt', country: 1, rebels: rebels.id, group: 'workers' }));
  expect(rebels.alive).toBe(true);
  expect(rebels.tiles).toBeGreaterThan(0);
  expect(rebels.troops).toBeGreaterThan(0);
  expect(g.states[g.countries[1].capitalState].owner).toBe(1);           // never the capital
  expect(atWar(g, rebels.id, 1)).toBeDefined();
  expect(g.countries[1].groups.workers.radicalism).toBeLessThan(100);
  expect(() => relation(g, rebels.id, 2)).not.toThrow();
  expect(() => runDays(g, 3)).not.toThrow();
});

it('a radical group with little clout does not revolt', () => {
  const g = world();
  angry(g);
  g.countries[1].groups.workers.clout = 0.03;
  revoltDay(g, [], []);
  expect(g.countries.length).toBe(4);
});

it('the wanted law is the group’s favourite in the area it hates most', () => {
  const g = world();
  const c = g.countries[1];
  c.laws = { ...c.laws, labour: 'serfdom', voting: 'noVoting' };
  expect(wantedLaw(c, 'workers')).toBe('freeLabour');   // serfdom −2 is worse than no voting −1
});

it('rebels never inherit treaties, and the parent’s puppets fight them; mid-war revolts work', () => {
  const g = world();
  sign(g, 1, 2, 'alliance', []);
  makePuppet(g, 1, 3, []);
  startWar(g, [1], [2], [], []);                                         // already at war with someone
  angry(g);
  const r = startRevolt(g, g.countries[1], 'workers', [], []);
  expect(r).not.toBeNull();
  const id = r!.id;
  expect(g.treaties.some(t => t.a === id || t.b === id)).toBe(false);
  const war = atWar(g, id, 1)!;
  expect(war.sideB).toContain(3);                                        // the puppet joins the parent
  expect(hasTreaty(g, id, 2, 'alliance')).toBe(false);
});

it('if the rebels win, the law changes and their land goes back; if they lose, it just goes back', () => {
  for (const rebelsWin of [true, false]) {
    const g = world();
    angry(g);
    const events: SimEvent[] = [];
    revoltDay(g, events, []);
    const rebels = g.countries[g.countries.length - 1];
    const war = atWar(g, rebels.id, 1)!;
    const winner = rebelsWin ? rebels.id : 1;
    // Settle it directly: the loser hands over the winner's goals.
    const r = step(g, [{ type: 'proposePeace', country: rebelsWin ? 1 : rebels.id, warId: war.id, terms: { demands: rebelsWin ? war.goals : [], give: rebelsWin, white: !rebelsWin } }]);
    void winner;
    const all = r.events.concat(...Array.from({ length: 3 }, () => step(g, []).events), ...Array.from({ length: 4 }, () => step(g, []).events));
    expect(atWar(g, rebels.id, 1)).toBeUndefined();
    expect(g.countries[1].laws.labour).toBe(rebelsWin ? 'freeLabour' : 'serfdom');
    expect(rebels.alive).toBe(false);
    for (let s = 1; s < g.states.length; s++) if (g.map.states[s].key.startsWith('T-') && 'ABCDE'.includes(g.map.states[s].key[2])) expect(g.states[s].owner).toBe(1);
    expect(all).toContainEqual(expect.objectContaining({ type: 'revoltEnded', country: 1, rebels: rebels.id, won: rebelsWin }));
  }
});

it('rebels outlive a parent that is destroyed by someone else', () => {
  const g = world();
  angry(g);
  revoltDay(g, [], []);
  const rebels = g.countries[g.countries.length - 1];
  g.countries[1].alive = false;
  revoltDay(g, [], []);
  expect(rebels.rebel).toBeUndefined();
  expect(rebels.alive).toBe(true);
  void stateId;
});

// ---- review fixes ----
it('when a revolt ends, nothing on the map or in any war still belongs to the dead rebels', () => {
  const g = world();
  // XXX occupies YYY's state in a separate war, then the rebels take it from XXX.
  const other = startWar(g, [1], [2], [], []);
  const yTiles = g.map.states.filter(s => s.key === 'T-Y').flatMap(s => Array.from(stateTilesOf(g.map, s.id)));
  occupy(g, 1, yTiles);
  angry(g);
  const rebels = startRevolt(g, g.countries[1], 'workers', [], [])!;
  occupy(g, rebels.id, yTiles);
  const third = startWar(g, [3], [rebels.id], [], []);                    // ZZZ also fights the rebels
  void third; void other;
  const war = atWar(g, rebels.id, 1)!;
  step(g, [{ type: 'proposePeace', country: rebels.id, warId: war.id, terms: { demands: [], white: true } }]);
  runDays(g, 2);
  expect(rebels.alive).toBe(false);
  for (let t = 0; t < g.controller.length; t++) expect(g.controller[t]).not.toBe(rebels.id);
  expect(g.wars.some(w => w.sideA.includes(rebels.id) || w.sideB.includes(rebels.id))).toBe(false);
  expect(g.attacks.some(a => a.attacker === rebels.id || a.target === rebels.id)).toBe(false);
  expect(invariantProblems(g)).toEqual([]);
});

it('a revolution cancels a conflicting law being passed', () => {
  const g = world();
  angry(g);
  const c = g.countries[1];
  revoltDay(g, [], []);
  const rebels = g.countries[g.countries.length - 1];
  c.enacting = { law: 'slavery', startTick: 0, months: 1 };
  const war = atWar(g, rebels.id, 1)!;
  const r = step(g, [{ type: 'proposePeace', country: 1, warId: war.id, terms: { demands: war.goals, give: true } }]);
  expect(c.laws.labour).toBe('freeLabour');
  expect(c.enacting).toBeNull();
  expect(r.events).toContainEqual(expect.objectContaining({ type: 'lawFailed', law: 'slavery', reason: 'revolution' }));
});

it('rebels can’t be dealt with diplomatically by others, and don’t do diplomacy themselves', async () => {
  const { playCheck } = await import('./diplomacy/plays');
  const { treatyCheck } = await import('./diplomacy/treaties');
  const g = world();
  angry(g);
  revoltDay(g, [], []);
  const id = g.countries.length - 1;
  expect(playCheck(g, { type: 'startPlay', country: 2, target: id, demands: [{ kind: 'reparations' }] })).toBe('rebels');
  expect(treatyCheck(g, 2, id, 'tradeAgreement')).toBe('rebels');
  expect(treatyCheck(g, id, 2, 'guarantee')).toBe('rebels');
});
