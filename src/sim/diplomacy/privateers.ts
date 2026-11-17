// Privateer licences: raid a Hostile country's trade without a war, at a cost in infamy and relations.
import { BALANCE } from '../balance';
import { piracyHooks } from '../naval/ships';
import { handlers, systems } from '../registry';
import type { Command, GameState } from '../types';
import { addInfamy } from './infamy';
import { changeRelation, relation } from './relations';

const D = BALANCE.diplomacy;

piracyHooks.licensed = (state, a, b) => state.privateers.some(p => p.from === a && p.target === b);

handlers.setPrivateers = (state, cmd: Extract<Command, { type: 'setPrivateers' }>) => {
  const has = state.privateers.some(p => p.from === cmd.country && p.target === cmd.target);
  if (!cmd.on) { state.privateers = state.privateers.filter(p => !(p.from === cmd.country && p.target === cmd.target)); return has ? null : 'notLicensed'; }
  if (has) return 'alreadyLicensed';
  if (!state.countries[cmd.target]?.alive || cmd.target === cmd.country || cmd.target <= 0) return 'no such country';
  if (relation(state, cmd.country, cmd.target) > -50) return 'needsHostile';
  state.privateers.push({ from: cmd.country, target: cmd.target });
  addInfamy(state, cmd.country, D.PRIVATEER_INFAMY);
  changeRelation(state, cmd.country, cmd.target, D.PRIVATEER_RELATION);
  return null;
};

systems.month.push((state: GameState) => {
  state.privateers = state.privateers.filter(p => state.countries[p.from].alive && state.countries[p.target].alive && relation(state, p.from, p.target) <= -50);
});
