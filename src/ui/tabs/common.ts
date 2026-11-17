import type { Command } from '../../sim/types';
import type { BuildRejection } from '../../sim/economy';
import { session } from '../game';

export type Send = (cmd: Command) => void;
export const defaultSend: Send = cmd => session.game?.send(cmd);

export const REASON_TEXT: Record<BuildRejection, string> = {
  needsTech: 'Needs research', notYours: 'Not your state', occupied: 'Occupied by the enemy', noSlots: 'No free slots', needsCoast: 'Needs a coast', needsCoal: 'Needs coal',
  needsIron: 'Needs iron', needsFarmland: 'Needs farmland', needsForest: 'Needs forest', maxLevel: 'Fully built', cantAfford: 'Not enough money',
  tooManyConstructions: 'Builders busy',
};
