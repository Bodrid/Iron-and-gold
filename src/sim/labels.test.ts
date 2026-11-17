import { it, expect } from 'vitest';
import { computeLabels, buildingIcons } from './labels';
import { makeGame } from './testing';

it('places the label on an owned tile, even for a C-shaped country', () => {
  const g = makeGame({ rows: ['AAAAA', 'A....', 'AAAAA'], owners: { A: 'XXX' } });
  const [l] = computeLabels(g);
  expect(l.text).toBe('Country XXX');
  expect(g.owner[Math.floor(l.y) * 5 + Math.floor(l.x)]).toBe(1);
});

it('uses the largest region when a country is split', () => {
  const rows = ['AA....BBBBBBBBB', '......BBBBBBBBB', '......BBBBBBBBB'];
  const g = makeGame({ rows, owners: { A: 'XXX', B: 'XXX' } });
  const [l] = computeLabels(g);
  expect(l.x).toBeGreaterThan(6);
});

it('puts the label in the thick middle and sizes it by area', () => {
  const rows = ['AAAAAAAAAAAAAAAA', 'AAAAAAAAAAAAAAAA', 'AAAAAAAAAAAAAAAA', 'AAAAAAAAAAAAAAAA', 'AAAAAAAAAAAAAAAA', 'BB..............'];
  const g = makeGame({ rows, owners: { A: 'XXX', B: 'YYY' } });
  const labels = computeLabels(g);
  const a = labels.find(l => l.country === 1)!, b = labels.find(l => l.country === 2)!;
  expect(a.y).toBeGreaterThan(1.5); expect(a.y).toBeLessThan(3.5);
  expect(a.size).toBeGreaterThan(b.size);
});

it('lists building icons with their owner', () => {
  const g = makeGame();
  g.states[1].buildings.push({ type: 'farm', level: 3, tile: 0 });
  expect(buildingIcons(g)).toEqual([{ type: 'farm', tile: 0, level: 3, owner: 1 }]);
});
