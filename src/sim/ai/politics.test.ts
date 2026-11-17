import { it, expect } from 'vitest';
import { makeGame, makeSmallWorldGame, runYears } from '../testing';
import { addLevel } from '../economy';
import { aiCommands } from './ai';
import { chooseTech, chooseLaw } from './politics';
import { TECH_BY_ID } from '../../content/techs';

it('AI countries always have research going, and even small ones finish techs', () => {
  const g = makeSmallWorldGame({ difficulty: 'normal', seed: 3 });
  const before = g.countries.map(c => c.techs.length);
  const ai = () => g.countries.filter(c => c.alive && c.id && !c.isPlayer);
  for (let y = 0; y < 6; y++) {
    runYears(g, 1);
    for (const c of ai()) expect(c.researching, `${c.tag} year ${y}`).not.toBeNull();
  }
  expect(ai().length).toBeGreaterThan(0);
  for (const c of ai()) expect(c.techs.length, c.tag).toBeGreaterThan(before[c.id]);
}, 60_000);

it('personality steers research: a military AI prefers military techs', () => {
  const g = makeGame({ rows: ['AABB'], owners: { A: 'XXX', B: 'YYY' }, player: 'YYY' });
  const c = g.countries[1];
  c.personality = 'prussia';
  expect(TECH_BY_ID[chooseTech(g, c, false)!].tree).toBe('military');
});

it('an Easy AI gives a rising group the law it wants before it revolts', () => {
  const g = makeGame({ rows: ['AAABBBCCC'], owners: { A: 'XXX', B: 'XXX', C: 'XXX' }, player: 'XXX', difficulty: 'easy' });
  const c = g.countries[1];
  c.isPlayer = false;
  c.laws = { ...c.laws, labour: 'serfdom' };
  for (const st of g.states) if (st.owner === 1) addLevel(g, st.id, 'textileMill', 6);
  c.groups.workers.clout = 0.3; c.groups.workers.radicalism = 80;
  expect(chooseLaw(g, c)).toBe('freeLabour');
});

it('an AI only starts laws it can pass', () => {
  const g = makeGame({ rows: ['AABB'], owners: { A: 'XXX', B: 'YYY' }, player: 'YYY' });
  const c = g.countries[1];
  for (let i = 0; i < 20; i++) {
    const cmds = aiCommands(g, c);
    for (const cmd of cmds) if (cmd.type === 'enactLaw') expect(c.enacting?.law).toBe(cmd.law);
  }
});

it('an AI ruled by landowners still doesn’t throw away schools or free labour', () => {
  const g = makeGame({ rows: ['AAABBB'], owners: { A: 'XXX', B: 'XXX' }, player: 'XXX' });
  const c = g.countries[1];
  c.isPlayer = false;
  for (const st of g.states) if (st.owner === 1) addLevel(g, st.id, 'farm', 6);
  runYears(g, 1);   // let clout settle on the farms
  expect(c.groups.landowners.clout).toBeGreaterThan(0.5);
  expect(['serfdom', 'slavery', 'noEducation']).not.toContain(chooseLaw(g, c));
});
