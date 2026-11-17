// Every tunable number in the game lives here.
export const BALANCE = {
  population: {
    /** People in an unclaimed state per unit of popWeight. */
    UNCLAIMED_POP_PER_WEIGHT: 20,
    /** Cap on people per unit of popWeight for owned states with no historical figure. */
    UNCOVERED_MAX_PER_WEIGHT: 2000,
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
    BASE_SLOTS: 4,
    TILES_PER_SLOT: 60,
    POP_PER_SLOT: 40_000,
    MAX_SLOTS: 80,
    /** Concurrent constructions: BASE + owned states / PER_STATES. */
    CONSTRUCTION_BASE: 2,
    CONSTRUCTION_PER_STATES: 8,
    WORKFORCE_SHARE: 0.4,
    /** Monthly consumption per 1,000 people. */
    GRAIN_PER_K: 2,
    TEXTILES_PER_K: 0.5,
    LUXURIES_PER_K: 0.2,
    SOL_BASE: 2,
    SOL_GRAIN: 8,
    SOL_TEXTILES: 6,
    SOL_LUXURIES: 6,
    TAX_RATE: 0.2,
    /** Pounds per soldier per month. */
    ARMY_UPKEEP: 0.1,
    PRICE_MIN: 0.5,
    PRICE_MAX: 2,
    HISTORY_MAX: 1200,
    /** Starting economy (when the start date seeds one). */
    START_FARM_SHARE: 0.5,
    START_LOGGING_SHARE: 0.05,
    START_MINE_MIN_POP: 300_000,
    START_UNIVERSITY_MIN_POP: 5_000_000,
    START_BIG_PORT_POP: 20_000_000,
  },
  growth: {
    /** Monthly population growth at SoL 10. */
    BASE_GROWTH: 0.0008,
    /** Extra monthly growth per 10 SoL above 10 (negative below). */
    SOL_GROWTH: 0.0006,
    UNIVERSITY_LITERACY: 0.002,
    /** Literacy gained per month everywhere. */
    BASE_LITERACY_GROWTH: 0.0003,
    /** Output bonus per point of literacy (1.0 = +100% at full literacy). */
    LITERACY_OUTPUT: 1,
    RESEARCH_PER_LEVEL: 5,
  },
  research: {
    /** Points per month every country gets (so small countries still advance). */
    BASE: 4,
    /** Points per month per sqrt(millions of people), times (0.5 + literacy). */
    POP: 3,
    /** A tech every country knows costs this much less. */
    SPREAD_DISCOUNT: 0.5,
    /** Extra cost per era ahead of the current one. */
    AHEAD_PENALTY: 0.3,
    MAX_QUEUE: 12,
    /** University research is levels / (1 + levels / this). */
    UNIVERSITY_SOFT_CAP: 12,
  },
  politics: {
    /** Living standards at which groups neither like nor dislike how people live. */
    SOL_NEUTRAL: 10,
    /** Approval moves this far toward its target each month. */
    APPROVAL_STEP: 2,
    /** At or below this approval a group grows radical. */
    ANGRY_AT: -5,
    /** Monthly radicalism gain = (−approval − OFFSET) × MULT (so −5 → +1, −10 → +3.5). */
    ANGRY_RISE_OFFSET: 3,
    ANGRY_RISE_MULT: 0.5,
    RADICAL_DECAY: 4,
    /** Years a lost war keeps the army (and others) unhappy. */
    DEFEAT_YEARS: 3,
    ENACT_MIN_MONTHS: 3,
    ENACT_MAX_MONTHS: 24,
    /** Support below this and the law fails (or can't be started). */
    FAIL_SUPPORT: -0.3,
    PASS_BASE: 0.05,
    PASS_PER_SUPPORT: 0.2,
    PASS_MAX: 0.4,
    /** A group revolts at this radicalism… */
    REVOLT_AT: 100,
    /** …if it has at least this much clout. */
    REVOLT_MIN_CLOUT: 0.1,
    /** Share of the country's states the rebels take, per unit of clout. */
    REVOLT_STATE_SHARE: 1.5,
    /** Troops, money and goods that defect: clout + BASE, at most MAX. */
    REVOLT_BASE_SHARE: 0.15,
    REVOLT_MAX_SHARE: 0.6,
    RADICAL_AFTER_REVOLT: 40,
    MAX_COUNTRIES: 4000,
    /** The AI starts a law only with at least this much support. */
    AI_MIN_SUPPORT: 0.3,
    /** How the AI scores a law: support (which mostly decides whether it can pass), its effects, and the unrest it causes. */
    AI_SUPPORT_WEIGHT: 0.25,
    AI_UTILITY_WEIGHT: 4,
    AI_UNREST_WEIGHT: 0.08,
  },
  blocs: {
    /** A major power: this many people, or in the top ranks by score. */
    MAJOR_POPULATION: 15_000_000,
    MAJOR_RANK: 8,
    FOUND_COST: 200_000,
    /** Principles the leader picks on top of the type's fixed one. */
    MAX_PICKS: 2,
    INVITE_MIN_RELATION: 0,
    AI_JOIN_RELATION: 25,
    AI_MAJOR_JOIN_RELATION: 70,
    OFFER_DAYS: 30,
    MEMBER_RELATION: 15,
    LEAVE_RELATION: -20,
    FREE_TRADE_BONUS: 0.3,
    TRIBUTE: 0.05,
    AI_INVITE_PLAYER_RELATION: 15,
    /** An AI bloc invites the player at most this often. */
    PLAYER_INVITE_DAYS: 180,
    AI_LEAVE_RELATION: -20,
  },
  companies: {
    MAX: 4,
    /** One extra company per this many levels of industry and mines. */
    LEVELS_PER_EXTRA: 25,
    FOUND_COST: 50_000,
    /** Output bonus: +BONUS_PER_STEP% per LEVELS_PER_STEP levels of its buildings, up to BONUS_CAP%. */
    LEVELS_PER_STEP: 10,
    BONUS_PER_STEP: 5,
    BONUS_CAP: 25,
    TRADE_PCT: 3,
    MONOPOLY_PCT: 15,
    COLONIAL_PCT: 25,
    COLONIAL_TAX_PCT: 5,
    INVESTMENT_TRIBUTE: 0.05,
    INVESTMENT_RELATION: -10,
  },
  trade: {
    /** Months of demand an exporter keeps before selling the rest. */
    EXPORT_KEEP_MONTHS: 2,
    MAX_ROUTE_AMOUNT: 400,
    /** Share of the goods' value the exporter earns. */
    EXPORT_EARN: 0.7,
    /** Customs income for the importer, as a share of the goods' value. */
    IMPORT_EARN: 0.1,
    IDLE_END_MONTHS: 3,
    /** Importers considered per new route (closest shortages first). */
    CANDIDATES: 5,
    PATH_SEARCHES_PER_MONTH: 3,
    /** Days a cancelled route stays closed. */
    CANCEL_BLOCK_DAYS: 365,
  },
  navy: {
    /** Battle losses: share of the loser's ships sunk per unit of strength advantage. */
    LOSS_RATE: 0.6,
    /** Damage taken by the winner, per unit of the loser's strength relative to the winner's. */
    WINNER_DAMAGE: 0.25,
    /** Troops a one-off boat carries when the country has no free transport. */
    BOAT_TROOPS_MAX: 5000,
    /** How far (in navigation cells) troops look for another beach if theirs is lost. */
    REROUTE_CELLS: 10,
  },
  diplomacy: {
    BORDER: -10, RIVAL: -25, SHARED_ENEMY: 15, TRADE_ROUTE: 10,
    /** How far an active improve/worsen action moves the target value. */
    ACTION_SHIFT: 40,
    /** Monthly movement of relations toward their target. */
    DRIFT: 3,
    RELATION_ACTION_COST: 500,
    CAPACITY_BASE: 2,
    CAPACITY_PER_POP: 20_000_000,
    TREATY_RELATION: { alliance: 20, defensivePact: 15, tradeAgreement: 10, guarantee: 10, embargo: -30 },
    ALLIANCE_CANCEL_PENALTY: -20,
    TRADE_AGREEMENT_BONUS: 0.25,
    OFFER_DAYS: 30,
    INFAMY_DECAY: 0.5,
    INFAMY_COOL: 25,
    INFAMY_COOL_RELATION: -10,
    INFAMY_COALITION: 50,
    /** Relation at or below which a country joins a coalition. */
    COALITION_RELATION: -15,
    PLAY_DAYS: 60,
    /** The target gives in if its side is weaker than this share of the initiator's side. */
    BACK_DOWN_RATIO: 0.5,
    MAX_DEMANDS: 3,
    REPARATIONS_YEARS: 5,
    REPARATIONS_SHARE: 0.1,
    PUPPET_TRIBUTE: 0.2,
    ANNEX_YEARS: 10,
    PUPPET_RELATION: 20,
    ANNEX_INFAMY: 10,
    PRIVATEER_INFAMY: 5,
    PRIVATEER_RELATION: -10,
    /** AI countries keep at most this many defensive pacts / guarantees given. */
    AI_MAX_PACTS: 2,
    AI_MAX_GUARANTEES: 2,
    /** An AI initiator backs down only if the defenders are this much stronger. */
    AI_CLIMB_DOWN_RATIO: 2,
  },
  score: { GDP: 40, POPULATION: 20, SOL: 20, LAND: 20 },
} as const;
