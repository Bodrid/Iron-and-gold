import { it, expect } from 'vitest';
import { makeGame, runDays } from '../testing';
import { blocOf } from '../blocs';
import { changeRelation, relation } from '../diplomacy/relations';
import { blocDecisions, companyDecisions } from './blocs';
import { DIFFICULTIES } from './difficulty';
import { addLevel } from '../economy';
import type { Command } from '../types';
import { applyCommand } from '../registry';

const world = () => {
  const g = makeGame({ rows: ['AAAAAABBCCDD', 'AAAAAABBCCDD'], owners: { A: 'XXX', B: 'YYY', C: 'ZZZ', D: 'QQQ' }, population: 5_000_000, money: 1e7, player: 'QQQ', seedEconomy: true, ai: true });
  for (const st of g.states) if (st.owner === 1) st.population = 30_000_000;   // a great power
  g.countries[1].population = 30_000_000;
  return g;
};
const decide = (g: ReturnType<typeof world>, id: number, n = 400) => {
  const out: Command[] = [];
  for (let i = 0; i < n; i++) blocDecisions(g, g.countries[id], DIFFICULTIES.grandMaster, cmd => { out.push(cmd); applyCommand(g, cmd, [], []); });
  return out;
};

it('a major AI founds a bloc and fills it with friends', () => {
  const g = world();
  for (const x of [2, 3]) changeRelation(g, 1, x, 100 - relation(g, 1, x));
  for (const x of [2, 3]) g.diploActions.push({ from: 1, to: x, kind: 'improve' });   // keep them warm
  runDays(g, 3 * 365);
  const b = blocOf(g, 1);
  expect(b?.leader).toBe(1);
  expect(b!.members.length).toBeGreaterThan(0);
});

it('the player is invited at most once every 180 days', () => {
  const g = world();
  g.blocs.push({ id: 99, leader: 1, type: 'tradeLeague', principles: ['freeTradeArea'], members: [], founded: 0, principlesSet: 0 });
  changeRelation(g, 1, 4, 90 - relation(g, 1, 4));   // tiny worlds make the player a major power
  for (const x of [2, 3]) changeRelation(g, 1, x, -60 - relation(g, 1, x));   // nobody else wants in
  const first = decide(g, 1).filter(c => c.type === 'inviteToBloc' && c.target === 4);
  expect(first).toHaveLength(1);
  g.blocOffers = [];
  g.tick += 100 * 4;
  expect(decide(g, 1).filter(c => c.type === 'inviteToBloc')).toHaveLength(0);
  g.tick += 100 * 4;
  expect(decide(g, 1).filter(c => c.type === 'inviteToBloc')).toHaveLength(1);
});

it('an AI founds a company for its biggest industry', () => {
  const g = world();
  for (const st of g.states) if (st.owner === 1) { st.buildings = []; addLevel(g, st.id, 'textileMill', 12); }
  const out: Command[] = [];
  for (let i = 0; i < 200 && !out.length; i++) companyDecisions(g, g.countries[1], DIFFICULTIES.grandMaster, cmd => out.push(cmd));
  expect(out[0]).toEqual({ type: 'foundCompany', country: 1, company: 'textileCombine' });
});
