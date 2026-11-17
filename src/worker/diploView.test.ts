import { it, expect } from 'vitest';
import { makeGame } from '../sim/testing';
import { startWar } from '../sim/war';
import { diploView } from './diploView';

it('peace candidates include non-state war goals such as joining your bloc', () => {
  const g = makeGame({ rows: ['AABBCC'], owners: { A: 'XXX', B: 'YYY', C: 'ZZZ' } });
  g.blocs.push({ id: 9, leader: 1, type: 'tradeLeague', principles: ['freeTradeArea', 'sharedScience'], members: [], founded: 0, principlesSet: 0 });
  startWar(g, [1], [2], [{ kind: 'joinBloc' }], []);
  const w = diploView(g, 1).wars[0];
  const c = w.candidates.find(x => x.demand.kind === 'joinBloc');
  expect(c).toBeDefined();
  expect(c!.goal).toBe(true);
  expect(w.goals).toEqual(['Join our power bloc']);
});
