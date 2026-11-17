// Every tunable number in the game lives here.
export const BALANCE = {
  population: {
    /** People in an unclaimed state per unit of popWeight. */
    UNCLAIMED_POP_PER_WEIGHT: 20,
  },
  troops: {
    /** Share of population that can serve. */
    MANPOWER_SHARE: 0.01,
    /** Troops at game start as a share of max troops. */
    START_FRACTION: 0.6,
  },
  economy: {
    /** Stockpile at start, in months of the population's basic consumption. */
    START_STOCK_MONTHS: 3,
  },
} as const;
