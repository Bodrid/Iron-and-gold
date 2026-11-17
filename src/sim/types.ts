import type { MapData } from '../map/format';
import type { BuildingType } from '../content/buildingTypes';
import type { ShipKind } from '../content/ships';

export type { BuildingType, ShipKind };
export type CountryId = number; // 1..4095; 0 = nobody (unclaimed)
export type Difficulty = 'easy' | 'normal' | 'hard' | 'veryHard' | 'grandMaster';
export type Good = 'grain' | 'wood' | 'coal' | 'iron' | 'textiles' | 'tools' | 'arms' | 'luxuries';
export interface GameDate { y: number; m: number; d: number }

export interface CountryDef { tag: string; name: string; color: number; capital: string; population: number; money: number; personality?: string }
export type OwnershipRule = { modern: string; owner: string } | { states: string[]; owner: string } | { states: string[]; unclaimed: true };
export interface StartDef { id: string; name: string; startDate: GameDate; endYear: number; countries: CountryDef[]; ownership: OwnershipRule[]; /** Give countries starting farms, mines etc. Default true. */ seedEconomy?: boolean;
  /** Historical population (people) by modern territory code, spread over that territory's states; overrides CountryDef.population there. */ regionPopulation?: Record<string, number> }
export interface GameSetup { startId: string; playerTag: string; difficulty: Difficulty; rivalsHarder: boolean; seed: number; /** Tests/tools: AI countries do nothing. */ aiDisabled?: boolean }

export interface StatSample { tick: number; gdp: number; population: number; sol: number; tiles: number; money: number }

export interface Country {
  id: CountryId; tag: string; name: string; color: number; alive: boolean; isPlayer: boolean;
  capitalState: number; difficulty: Difficulty; personality: string;
  troops: number; maxTroops: number; money: number;
  stockpile: Record<Good, number>; prices: Record<Good, number>;
  /** Last month's production and demand per good (for prices and the UI). */
  produced: Record<Good, number>; demanded: Record<Good, number>;
  gdp: number; income: number; sol: number; literacy: number; researchPoints: number;
  /** Money earned from trade last month (included in income). */ tradeIncome: number;
  /** Owned tiles. */ tiles: number;
  /** Controlled tiles (owned and not occupied, plus occupied enemy tiles). */ controlled: number;
  population: number; history: StatSample[];
}

export interface Building { type: BuildingType; level: number; tile: number }
export interface StateRuntime { id: number; owner: CountryId; controller: CountryId; population: number; buildings: Building[] }
export interface Construction { id: number; country: CountryId; state: number; type: BuildingType; doneTick: number }
export interface Attack { id: number; attacker: CountryId; target: CountryId; troops: number }
export interface War { id: number; a: CountryId; b: CountryId; startTick: number; casualties: [number, number] }
export interface TradeRoute {
  id: number; exporter: CountryId; importer: CountryId; fromState: number; toState: number; good: Good; amount: number;
  createdTick: number; idleMonths: number; /** Set when its trade ship was captured; that month's cargo is lost. */ captured: boolean;
}
export type ShipOrder =
  | { type: 'idle'; port: number }
  | { type: 'patrol'; cell: number }
  | { type: 'raid'; cell: number }
  | { type: 'escort'; routeId: number }
  | { type: 'trade'; routeId: number }
  | { type: 'invade'; tile: number; target: CountryId }
  /** Command-only: becomes idle at the nearest reachable own port. */
  | { type: 'return' };
export interface Ship {
  id: number; owner: CountryId; kind: ShipKind; cell: number;
  /** Lane endpoints; the lane itself comes from the sea-lane cache. */ fromCell: number; toCell: number;
  pathPos: number; dir: 1 | -1; order: ShipOrder; hp: number; routeId?: number; troops?: number;
  /** A one-off boat for an invasion, removed when its job is done. */ temp?: boolean;
}
export interface ShipBuild { id: number; country: CountryId; state: number; kind: ShipKind; doneTick: number }
export interface PeaceOffer { from: CountryId; to: CountryId; tick: number }
export type Outcome = null | { kind: 'victory' | 'defeat' | 'endDate'; tick: number };

export interface GameState {
  version: 1;
  setup: GameSetup;
  startDate: GameDate;
  tick: number;
  endTick: number;
  rng: number;
  map: MapData;
  owner: Uint16Array;
  controller: Uint16Array;
  countries: Country[];
  states: StateRuntime[];
  constructions: Construction[];
  attacks: Attack[];
  wars: War[];
  peaceOffers: PeaceOffer[];
  tradeRoutes: TradeRoute[];
  /** Routes the player or AI cancelled: not reopened until `until`. */ tradeBlocks: { exporter: CountryId; importer: CountryId; good: Good; until: number }[];
  ships: Ship[];
  shipBuilds: ShipBuild[];
  /** Relations, n×n (index a*n+b), −100..100. */ relations: Int16Array;
  diploActions: { from: CountryId; to: CountryId; kind: 'improve' | 'worsen' }[];
  /** Countries that switched automatic trade off. */ tradeOff: CountryId[];
  nextId: number;
  outcome: Outcome;
}

export type Command =
  | { type: 'attack'; country: CountryId; target: CountryId; ratio: number }
  | { type: 'cancelAttack'; country: CountryId; attackId: number }
  | { type: 'build'; country: CountryId; state: number; building: BuildingType }
  | { type: 'declareWar'; country: CountryId; target: CountryId }
  | { type: 'offerPeace'; country: CountryId; target: CountryId }
  | { type: 'respondPeace'; country: CountryId; from: CountryId; accept: boolean }
  | { type: 'cancelTradeRoute'; country: CountryId; routeId: number }
  | { type: 'setTradeAuto'; country: CountryId; on: boolean }
  | { type: 'buildShip'; country: CountryId; state: number; kind: 'warship' | 'transport' }
  | { type: 'orderShip'; country: CountryId; shipId: number; order: ShipOrder }
  | { type: 'navalInvasion'; country: CountryId; target: CountryId; tile: number; ratio: number }
  | { type: 'improveRelations'; country: CountryId; target: CountryId }
  | { type: 'worsenRelations'; country: CountryId; target: CountryId }
  | { type: 'stopDiploAction'; country: CountryId; target: CountryId };

export type SimEvent =
  | { type: 'warDeclared'; a: CountryId; b: CountryId }
  | { type: 'peace'; a: CountryId; b: CountryId; transferred: number[] }
  | { type: 'peaceOffered'; from: CountryId; to: CountryId }
  | { type: 'peaceRefused'; from: CountryId; to: CountryId }
  | { type: 'built'; country: CountryId; state: number; building: BuildingType }
  | { type: 'eliminated'; country: CountryId }
  | { type: 'rejected'; command: Command; reason: string }
  | { type: 'gameOver'; kind: 'victory' | 'defeat' | 'endDate' }
  | { type: 'shipBuilt'; country: CountryId; ship: number; kind: ShipKind }
  | { type: 'shipLost'; country: CountryId; ship: number; kind: ShipKind }
  | { type: 'shipCaptured'; ship: number; owner: CountryId; by: CountryId; value: number }
  | { type: 'navalBattle'; a: CountryId; b: CountryId; winner: CountryId; cell: number };

export interface TickResult { changedTiles: number[]; events: SimEvent[]; newDay: boolean; newMonth: boolean }

export interface Label { country: CountryId; x: number; y: number; size: number; text: string }
export interface BuildingIcon { type: BuildingType; tile: number; level: number; owner: CountryId }
