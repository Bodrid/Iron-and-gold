import { it, expect } from 'vitest';
import { step } from './step';
import { makeGame, runDays } from './testing';
import { blocOf, foundCheck } from './blocs';
import { mods } from './mods';
import { makePuppet } from './diplomacy/subjects';
import { changeRelation, relation } from './diplomacy/relations';
import { startPlay } from './diplomacy/plays';
import type { GameState } from './types';

// XXX is a big power; YYY, ZZZ, QQQ are small. The player is QQQ unless a test says otherwise.
const world = (player = 'QQQ'): GameState => {
  const g = makeGame({ rows: ['AAAAAABBCCDD', 'AAAAAABBCCDD'], owners: { A: 'XXX', B: 'YYY', C: 'ZZZ', D: 'QQQ' }, population: 5_000_000, money: 1e7, player, seedEconomy: true });
  g.countries[1].population = 30_000_000;
  for (const c of g.countries.slice(1)) { c.troops = 10_000; c.maxTroops = 20_000; }
  return g;
};
const friends = (g: GameState, a: number, b: number) => changeRelation(g, a, b, 90 - relation(g, a, b));   // tiny test worlds make everyone a major power
const found = (g: GameState) => step(g, [{ type: 'foundBloc', country: 1, blocType: 'militaryAlliance', principles: ['militaryDrill'] }]);

it('a major power founds a bloc with the type’s fixed principle plus its picks', () => {
  const g = world();
  const r = found(g);
  expect(r.events.filter(e => e.type === 'rejected')).toEqual([]);
  expect(g.blocs).toHaveLength(1);
  expect(g.blocs[0].principles).toEqual(['commonDefence', 'militaryDrill']);
  expect(blocOf(g, 1)?.leader).toBe(1);
  // In a world of ten countries, a small one isn't a major power.
  const many = makeGame({ rows: ['ABCDEFGHIJ'], owners: Object.fromEntries('ABCDEFGHIJ'.split('').map((k, i) => [k, `C${i}${i}`])), seedEconomy: true, money: 1e6 });
  many.countries[1].population = 30_000_000;
  expect(foundCheck(many, 1, 'empire', ['sharedScience'])).toBeNull();
  expect(foundCheck(many, 10, 'empire', ['sharedScience'])).toBe('notMajor');
  expect(found(g).events).toContainEqual(expect.objectContaining({ type: 'rejected', reason: 'inBloc' }));
  expect(step(g, [{ type: 'foundBloc', country: 2, blocType: 'empire', principles: ['sharedScience', 'railwayUnion', 'mercantileNavy'] }]).events[0]).toMatchObject({ type: 'rejected' });
});

it('invited AI friends join; the leader gets full buffs and members half', () => {
  const g = world();
  found(g);
  friends(g, 1, 2);
  const r = step(g, [{ type: 'inviteToBloc', country: 1, target: 2 }]);
  expect(r.events).toContainEqual(expect.objectContaining({ type: 'blocJoined', country: 2, leader: 1 }));
  expect(mods(g, g.countries[1]).refillPct).toBe(15);
  expect(mods(g, g.countries[2]).refillPct).toBe(7.5);
  expect(mods(g, g.countries[3]).refillPct).toBe(0);
});

it('the player gets invitations as offers and can accept', () => {
  const g = world();
  found(g);
  friends(g, 1, 4);
  const r = step(g, [{ type: 'inviteToBloc', country: 1, target: 4 }]);
  expect(r.events).toContainEqual(expect.objectContaining({ type: 'blocInvited', from: 1, to: 4 }));
  step(g, [{ type: 'respondBlocInvite', country: 4, from: 1, accept: true }]);
  expect(blocOf(g, 4)?.leader).toBe(1);
});

it('puppets follow their overlord into its bloc', () => {
  const g = world();
  found(g);
  makePuppet(g, 1, 3, []);
  expect(blocOf(g, 3)?.leader).toBe(1);
  expect(mods(g, g.countries[3]).refillPct).toBe(7.5);
});

it('Common Defence brings members into a play against one of them', () => {
  const g = world();
  found(g);
  friends(g, 1, 2);
  step(g, [{ type: 'inviteToBloc', country: 1, target: 2 }]);
  const p = startPlay(g, 3, 2, [{ kind: 'reparations' }], []);
  expect(p.sideB).toContain(1);
});

it('members leave (with a relations cost) and buffs stop at once', () => {
  const g = world();
  found(g);
  friends(g, 1, 2);
  step(g, [{ type: 'inviteToBloc', country: 1, target: 2 }]);
  const before = relation(g, 1, 2);
  step(g, [{ type: 'leaveBloc', country: 2 }]);
  expect(blocOf(g, 2)).toBeUndefined();
  expect(mods(g, g.countries[2]).refillPct).toBe(0);
  expect(relation(g, 1, 2)).toBeLessThan(before);
});

it('if the leader falls, the strongest member leads; with nobody left the bloc dissolves', () => {
  const g = world();
  found(g);
  friends(g, 1, 2); friends(g, 1, 3);
  step(g, [{ type: 'inviteToBloc', country: 1, target: 2 }, { type: 'inviteToBloc', country: 1, target: 3 }]);
  g.countries[2].troops = 50_000;
  g.countries[1].alive = false;
  runDays(g, 1);
  expect(g.blocs).toHaveLength(1);
  expect(g.blocs[0].leader).toBe(2);
  expect(g.blocs[0].members).toEqual([3]);
  g.countries[2].alive = false; g.countries[3].alive = false;
  runDays(g, 1);
  expect(g.blocs).toHaveLength(0);
});

it('a leader that becomes a puppet hands the bloc on', () => {
  const g = world();
  found(g);
  friends(g, 1, 2);
  step(g, [{ type: 'inviteToBloc', country: 1, target: 2 }]);
  makePuppet(g, 4, 1, []);
  runDays(g, 1);
  expect(g.blocs[0]?.leader).toBe(2);
  expect(blocOf(g, 1)).toBeUndefined();
});

it('members of a trade league earn more from trade with each other', async () => {
  const { tradeHooks } = await import('./naval/trade');
  const g = world();
  step(g, [{ type: 'foundBloc', country: 1, blocType: 'tradeLeague', principles: ['sharedScience'] }]);
  friends(g, 1, 2);
  step(g, [{ type: 'inviteToBloc', country: 1, target: 2 }]);
  expect(tradeHooks.bonus(g, 1, 2)).toBeGreaterThanOrEqual(0.3);
  expect(tradeHooks.bonus(g, 1, 3)).toBe(0);
});

it('imperial tribute moves money from members to the leader', () => {
  const g = world(), h = world();
  for (const x of [g, h]) step(x, [{ type: 'foundBloc', country: 1, blocType: 'empire', principles: ['sharedScience'] }]);
  friends(g, 1, 2);
  step(g, [{ type: 'inviteToBloc', country: 1, target: 2 }]);
  g.countries[2].income = h.countries[2].income = 1000;
  runDays(g, 35); runDays(h, 35);
  expect(g.countries[1].money).toBeGreaterThan(h.countries[1].money);
});

// ---- Task 3: the joinBloc demand ----
it('a play can force a country into your bloc; stale or invalid demands are refused or skipped', async () => {
  const { playCheck } = await import('./diplomacy/plays');
  const { applyDemands } = await import('./diplomacy/demands');
  const g = world();
  const demand = [{ kind: 'joinBloc' as const }];
  expect(playCheck(g, { type: 'startPlay', country: 1, target: 2, demands: demand })).toBe('noBloc');
  found(g);
  expect(playCheck(g, { type: 'startPlay', country: 1, target: 2, demands: demand })).toBeNull();
  const done = applyDemands(g, 1, 2, demand, [], []);
  expect(done).toEqual(demand);
  expect(blocOf(g, 2)?.leader).toBe(1);
  // Already in a bloc (ours): refused for plays, skipped in peace terms.
  expect(playCheck(g, { type: 'startPlay', country: 1, target: 2, demands: demand })).toBe('sameBloc');
  expect(applyDemands(g, 1, 2, demand, [], [])).toEqual([]);
});

// ---- stage 5 review fixes ----
it('an AI leader judges requests to join: a rival is refused', async () => {
  const g = world('YYY');
  found(g);
  g.countries[1].personality = 'russia';
  g.countries[2].tag = 'GBR';                                        // Russia's rival
  const r = step(g, [{ type: 'askToJoinBloc', country: 2, leader: 1 }]);
  expect(r.events[0]).toMatchObject({ type: 'rejected', reason: 'theyRefuse' });
  g.countries[3].tag = 'ABC';
  changeRelation(g, 1, 3, 90 - relation(g, 1, 3));
  expect(step(g, [{ type: 'askToJoinBloc', country: 3, leader: 1 }]).events.some(e => e.type === 'rejected')).toBe(false);
});

it('the player is invited at most once in 180 days across all blocs, and a refusal buys a year of quiet', () => {
  const g = world('QQQ');
  found(g);
  g.blocs.push({ id: 77, leader: 2, type: 'tradeLeague', principles: ['freeTradeArea', 'sharedScience'], members: [], founded: 0, principlesSet: 0 });
  friends(g, 1, 4); friends(g, 2, 4);
  step(g, [{ type: 'inviteToBloc', country: 1, target: 4 }]);
  expect(step(g, [{ type: 'inviteToBloc', country: 2, target: 4 }]).events[0]).toMatchObject({ type: 'rejected', reason: 'invitedRecently' });
  step(g, [{ type: 'respondBlocInvite', country: 4, from: 1, accept: false }]);
  g.tick += 200 * 4;
  expect(step(g, [{ type: 'inviteToBloc', country: 2, target: 4 }]).events[0]).toMatchObject({ type: 'rejected', reason: 'invitedRecently' });
  g.tick += 200 * 4;
  expect(step(g, [{ type: 'inviteToBloc', country: 2, target: 4 }]).events.some(e => e.type === 'rejected')).toBe(false);
});

it('blocs have 2–3 principles, embargoes and plays inside a free-trade bloc are refused, bad ids never crash', async () => {
  const g = world();
  expect(step(g, [{ type: 'foundBloc', country: 1, blocType: 'empire', principles: [] }]).events[0]).toMatchObject({ type: 'rejected', reason: 'badPrinciples' });
  step(g, [{ type: 'foundBloc', country: 1, blocType: 'tradeLeague', principles: ['sharedScience'] }]);
  friends(g, 1, 2);
  step(g, [{ type: 'inviteToBloc', country: 1, target: 2 }]);
  expect(step(g, [{ type: 'proposeTreaty', country: 1, target: 2, kind: 'embargo' }]).events[0]).toMatchObject({ type: 'rejected', reason: 'sameBloc' });
  expect(step(g, [{ type: 'startPlay', country: 1, target: 2, demands: [{ kind: 'reparations' }] }]).events[0]).toMatchObject({ type: 'rejected', reason: 'sameBloc' });
  for (const cmd of [{ type: 'foundCompany', country: 1, company: 'constructor' }, { type: 'grantCharter', country: 1, company: 'x', charter: 'toString' }, { type: 'research', country: 1, tech: 'constructor' }, { type: 'enactLaw', country: 1, law: 'toString' }] as any[]) {
    expect(() => step(g, [cmd])).not.toThrow();
  }
});
