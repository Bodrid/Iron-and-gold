import type { MapData } from '../map/format';
import type { BuildingType } from '../content/buildingTypes';

export type { BuildingType };
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
  /** Owned tiles. */ tiles: number;
  /** Controlled tiles (owned and not occupied, plus occupied enemy tiles). */ controlled: number;
  population: number; history: StatSample[];
}

export interface Building { type: BuildingType; level: number; tile: number }
export interface StateRuntime { id: number; owner: CountryId; controller: CountryId; population: number; buildings: Building[] }
export interface Construction { id: number; country: CountryId; state: number; type: BuildingType; doneTick: number }
export interface Attack { id: number; attacker: CountryId; target: CountryId; troops: number }
export interface War { id: number; a: CountryId; b: CountryId; startTick: number; casualties: [number, number] }
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
  nextId: number;
  outcome: Outcome;
}

export type Command =
  | { type: 'attack'; country: CountryId; target: CountryId; ratio: number }
  | { type: 'cancelAttack'; country: CountryId; attackId: number }
  | { type: 'build'; country: CountryId; state: number; building: BuildingType }
  | { type: 'declareWar'; country: CountryId; target: CountryId }
  | { type: 'offerPeace'; country: CountryId; target: CountryId }
  | { type: 'respondPeace'; country: CountryId; from: CountryId; accept: boolean };

export type SimEvent =
  | { type: 'warDeclared'; a: CountryId; b: CountryId }
  | { type: 'peace'; a: CountryId; b: CountryId; transferred: number[] }
  | { type: 'peaceOffered'; from: CountryId; to: CountryId }
  | { type: 'peaceRefused'; from: CountryId; to: CountryId }
  | { type: 'built'; country: CountryId; state: number; building: BuildingType }
  | { type: 'eliminated'; country: CountryId }
  | { type: 'rejected'; command: Command; reason: string }
  | { type: 'gameOver'; kind: 'victory' | 'defeat' | 'endDate' };

export interface TickResult { changedTiles: number[]; events: SimEvent[]; newDay: boolean; newMonth: boolean }

export interface Label { country: CountryId; x: number; y: number; size: number; text: string }
export interface BuildingIcon { type: BuildingType; tile: number; level: number; owner: CountryId }
