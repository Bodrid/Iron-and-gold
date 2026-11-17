import type { Demand } from '../sim/types';

/** Infamy for winning a demand (half of it is gained when the play starts). */
export const DEMAND_INFAMY: Record<Demand['kind'], number> = { state: 5, puppet: 10, openMarket: 2, reparations: 3 };

export const DEMAND_NAMES: Record<Demand['kind'], string> = { state: 'Take a state', puppet: 'Make them our puppet', openMarket: 'Open their market', reparations: 'Reparations' };
