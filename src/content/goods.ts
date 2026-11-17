import type { Good } from '../sim/types';

export const GOODS: readonly Good[] = ['grain', 'wood', 'coal', 'iron', 'textiles', 'tools', 'arms', 'luxuries'];

export const GOOD_NAMES: Record<Good, string> = {
  grain: 'Grain', wood: 'Wood', coal: 'Coal', iron: 'Iron', textiles: 'Textiles', tools: 'Tools', arms: 'Arms', luxuries: 'Luxuries',
};

/** Base price in pounds per unit. */
export const BASE_PRICE: Record<Good, number> = {
  grain: 20, wood: 20, coal: 30, iron: 40, textiles: 50, tools: 70, arms: 80, luxuries: 100,
};

export function emptyGoods(): Record<Good, number> {
  return { grain: 0, wood: 0, coal: 0, iron: 0, textiles: 0, tools: 0, arms: 0, luxuries: 0 };
}
