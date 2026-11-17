import type { Demand } from '../sim/types';

/** Infamy for winning a demand (half of it is gained when the play starts). */
export const DEMAND_INFAMY: Record<Demand['kind'], number> = { state: 5, puppet: 10, openMarket: 2, reparations: 3, law: 0, joinBloc: 3, independence: 0 };

export const DEMAND_NAMES: Record<Demand['kind'], string> = { state: 'Take a state', puppet: 'Make them our puppet', openMarket: 'Open their market', reparations: 'Reparations', law: 'Change a law', joinBloc: 'Join our power bloc', independence: 'Independence' };

/** Peace-point costs. A state costs a base plus its share of the loser's population. */
export const DEMAND_COST = { stateBase: 20, statePerShare: 80, stateMax: 70, puppet: 60, openMarket: 15, reparations: 20, law: 40, joinBloc: 30, independence: 70, nonGoalFactor: 1.5, casualtyPoints: 40,
  /** A play's war goals together cost this many points, however many there are. */ goalTotal: 60,
  /** Score lead over the enemy needed before demands are accepted. */ minLead: 10 };
