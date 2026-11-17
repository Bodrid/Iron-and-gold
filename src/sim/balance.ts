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
    /** Share of the missing troops refilled per day. */
    REFILL_RATE: 0.01,
    /** Refill speed when there are no arms in stock. */
    NO_ARMS_FACTOR: 0.4,
    /** Troops refilled per unit of arms. */
    TROOPS_PER_ARMS: 50,
    /** Extra max troops per barracks level. */
    BARRACKS_TROOPS: 2000,
    /** Extra refill per barracks level, percent (capped). */
    BARRACKS_REFILL_PCT: 15,
    BARRACKS_REFILL_CAP_PCT: 150,
    RAILWAY_REFILL_PCT: 5,
    /** Share of excess troops lost per day when above max. */
    EXCESS_DECAY: 0.05,
  },
  combat: {
    MIN_ATTACK_TROOPS: 50,
    /** An attack takes one frontier tile per tick for every this many troops it has. */
    TROOPS_PER_TILE_RATE: 500,
    MAX_TILES_PER_TICK: 40,
    /** Troops spent per tile before defenders, by terrain (Plains, Forest, Hills, Mountains, Desert). */
    TERRAIN_COST: { plains: 10, forest: 15, hills: 20, mountains: 35, desert: 14 },
    RIVER_MULT: 1.5,
    /** Multiplier per fort level in the tile's state, applied as 1 + level × (FORT_MULT - 1). */
    FORT_MULT: 1.75,
    /** Defender troops per controlled tile that doubles the cost. */
    DENSITY_REF: 5,
    /** Defender troops lost per tile taken, as a multiple of their density. */
    DEFENDER_LOSS: 1,
    UNCLAIMED_COST_MULT: 1.5,
  },
  economy: {
    /** Stockpile at start, in months of the population's basic consumption. */
    START_STOCK_MONTHS: 3,
  },
} as const;
