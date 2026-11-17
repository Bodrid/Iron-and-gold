import { it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { EVENTS } from './index';
import { STARTS } from '../starts';
import { FORMABLES } from '../formables';
import { LAW_BY_ID } from '../laws';
import { TECH_BY_ID } from '../techs';
import type { EventEffect, Condition } from './types';

const stateKeys = new Set((JSON.parse(readFileSync('public/data/states.json', 'utf8')) as { key: string }[]).map(s => s.key));
const knownTags = (startId?: string[]) => {
  const t = new Set<string>(FORMABLES.map(f => f.tag));
  for (const s of STARTS) if (!startId || startId.includes(s.id)) for (const c of s.countries) t.add(c.tag);
  // Tags created by events themselves (independence, release).
  for (const e of EVENTS) for (const o of e.options) for (const x of o.effects) if (x.kind === 'independence' || x.kind === 'release') t.add(x.tag);
  return t;
};

it('every event refers to things that exist, and every option does something', () => {
  const ids = new Set<string>();
  for (const e of EVENTS) {
    expect(ids.has(e.id), `duplicate ${e.id}`).toBe(false);
    ids.add(e.id);
    const tags = knownTags(e.starts);
    expect(e.options.length, e.id).toBeGreaterThanOrEqual(1);
    expect(e.options.length, e.id).toBeLessThanOrEqual(3);
    if (e.countries !== 'any') for (const t of e.countries) expect(tags.has(t), `${e.id}: country ${t}`).toBe(true);
    const checkTag = (t: string) => expect(t === 'self' || tags.has(t), `${e.id}: tag ${t}`).toBe(true);
    const checkKey = (k: string) => expect(stateKeys.has(k), `${e.id}: state ${k}`).toBe(true);
    for (const k of e.conditions as Condition[]) {
      if ('tag' in k) checkTag(k.tag);
      if (k.kind === 'ownsState' || k.kind === 'notOwnsState') checkKey(k.key);
      if (k.kind === 'law' || k.kind === 'notLaw') expect(LAW_BY_ID[k.law], `${e.id}: law ${k.law}`).toBeDefined();
      if (k.kind === 'hasTech') expect(TECH_BY_ID[k.tech]).toBeDefined();
    }
    for (const o of e.options) {
      expect(o.effects.length, `${e.id}: "${o.label}" does nothing`).toBeGreaterThan(0);
      for (const x of o.effects as EventEffect[]) {
        if (x.kind === 'relation' || x.kind === 'inviteToBloc') checkTag(x.tag);
        if (x.kind === 'startPlay') { checkTag(x.target); for (const d of x.demands) if (d.kind === 'state') checkKey(d.key); }
        if (x.kind === 'transferStates') { x.keys.forEach(checkKey); checkTag(x.to); if (x.from) checkTag(x.from); }
        if (x.kind === 'independence' || x.kind === 'release') x.keys.forEach(checkKey);
        if (x.kind === 'formNation') expect(FORMABLES.some(f => f.tag === x.tag), `${e.id}: formable ${x.tag}`).toBe(true);
        if (x.kind === 'setLaw') expect(LAW_BY_ID[x.law], `${e.id}: law ${x.law}`).toBeDefined();
        if (x.kind === 'tech') expect(TECH_BY_ID[x.tech], `${e.id}: tech ${x.tech}`).toBeDefined();
      }
    }
  }
  for (const start of ['1776', '1836']) expect(EVENTS.filter(e => !e.starts || e.starts.includes(start)).length, start).toBeGreaterThanOrEqual(35);
});

it('every formable has a unique tag no start uses, and is eligible to someone that can exist', () => {
  const startTags = new Set(STARTS.flatMap(s => s.countries.map(c => c.tag)));
  const all = knownTags();
  expect(new Set(FORMABLES.map(f => f.tag)).size).toBe(FORMABLES.length);
  for (const f of FORMABLES) {
    expect(startTags.has(f.tag), f.tag).toBe(false);
    expect(f.from.some(t => all.has(t)), f.tag).toBe(true);
    for (const c of f.cores) expect([...stateKeys].some(k => k.startsWith(c)), `${f.tag}: ${c}`).toBe(true);
  }
});
