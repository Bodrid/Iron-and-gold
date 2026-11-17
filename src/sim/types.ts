import type { MapData } from '../map/format';
import type { BuildingType } from '../content/buildingTypes';
import type { ShipKind } from '../content/ships';
import type { GroupId } from '../content/groups';
import type { LawArea } from '../content/laws';
import type { BlocType, PrincipleId } from '../content/blocs';
import type { CharterKind } from '../content/companies';
import type { Effects } from '../content/effects';

export type { BuildingType, ShipKind };
export type CountryId = number; // 1..4095; 0 = nobody (unclaimed)
export type Difficulty = 'easy' | 'normal' | 'hard' | 'veryHard' | 'grandMaster';
export type Good = 'grain' | 'wood' | 'coal' | 'iron' | 'textiles' | 'tools' | 'arms' | 'luxuries';
export interface GameDate { y: number; m: number; d: number }

export interface CountryDef { tag: string; name: string; color: number; capital: string; population: number; money: number; personality?: string }
export type OwnershipRule = { modern: string; owner: string } | { states: string[]; owner: string } | { states: string[]; unclaimed: true };
export interface StartDef { id: string; name: string; startDate: GameDate; endYear: number; countries: CountryDef[]; ownership: OwnershipRule[]; /** Give countries starting farms, mines etc. Default true. */ seedEconomy?: boolean;
  /** Historical population (people) by modern territory code, spread over that territory's states; overrides CountryDef.population there. */ regionPopulation?: Record<string, number>;
  /** Every tech up to this era is known at the start (default: the era before the start year's). */ knownEra?: number;
  /** Extra known techs by country tag. */ extraTechs?: Record<string, string[]>;
  /** Starting laws by country tag (the rest are the defaults). */ laws?: Record<string, Partial<Record<LawArea, string>>>;
  /** Starting literacy by tag, and for everyone else. */ literacy?: Record<string, number>; defaultLiteracy?: number }
export interface GameSetup { startId: string; playerTag: string; difficulty: Difficulty; rivalsHarder: boolean; seed: number; /** Tests/tools: AI countries do nothing. */ aiDisabled?: boolean }

export interface StatSample { tick: number; gdp: number; population: number; sol: number; tiles: number; money: number }

export interface Country {
  id: CountryId; tag: string; name: string; color: number; alive: boolean; isPlayer: boolean;
  capitalState: number; difficulty: Difficulty; personality: string;
  troops: number; maxTroops: number; money: number;
  stockpile: Record<Good, number>; prices: Record<Good, number>;
  /** Last month's production and demand per good (for prices and the UI). */
  produced: Record<Good, number>; demanded: Record<Good, number>;
  gdp: number; income: number; sol: number; literacy: number;
  /** Unspent research points (banked; spent on the current tech). */ researchPoints: number;
  /** Research points earned last month. */ researchRate: number;
  techs: string[]; researching: string | null; researchQueue: string[];
  laws: Record<LawArea, string>;
  /** A law being passed (months counted since it started). */ enacting: { law: string; startTick: number; months: number } | null;
  groups: Record<GroupId, { clout: number; approval: number; radicalism: number }>;
  /** Tick of the last war this country lost (0 = never). */ lastDefeat: number;
  companies: { id: string; founded: number; charter: CharterKind | null; /** Output bonus %, recomputed monthly. */ bonus: number; /** When a charter was last granted or revoked. */ charterSet?: number }[];
  flags: string[];
  /** Temporary modifiers from events. */ modifiers: { name: string; effects: Effects; until: number }[];
  /** No bloc invites this (player) country before this tick. */ blocInvitesUntil?: number;
  /** Set on rebel countries while their revolt lasts. */ rebel?: { parent: CountryId; group: GroupId; law: string; /** Fighting to be a country of its own. */ independence?: boolean };
  /** Money earned from trade last month (included in income). */ tradeIncome: number;
  /** Rises when taking land and puppets; decays monthly. */ infamy: number;
  /** The country this one is a puppet of (0 = independent). */ overlord: CountryId;
  puppetSince: number;
  /** Owned tiles. */ tiles: number;
  /** Controlled tiles (owned and not occupied, plus occupied enemy tiles). */ controlled: number;
  population: number; history: StatSample[];
}

export interface Building { type: BuildingType; level: number; tile: number }
export interface StateRuntime { id: number; owner: CountryId; controller: CountryId; population: number; buildings: Building[] }
export interface Construction { id: number; country: CountryId; state: number; type: BuildingType; doneTick: number }
export interface Attack { id: number; attacker: CountryId; target: CountryId; troops: number }
export type Demand = { kind: 'state'; state: number } | { kind: 'puppet' } | { kind: 'openMarket' } | { kind: 'reparations' } | { kind: 'law'; law: string } | { kind: 'joinBloc' } | { kind: 'independence' };
/** a/b are the side leaders (the play's initiator and target). casualties[0] is side A's, [1] side B's. */
export interface War { id: number; a: CountryId; b: CountryId; sideA: CountryId[]; sideB: CountryId[]; goals: Demand[]; startTick: number; casualties: [number, number];
  /** Refused peace proposals (the AI waits before proposing again). */ refusals?: { from: CountryId; tick: number }[] }
export interface Play { id: number; initiator: CountryId; target: CountryId; demands: Demand[]; sideA: CountryId[]; sideB: CountryId[]; startTick: number; endTick: number; /** AI third parties have picked sides. */ decided?: boolean }
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
export type TreatyKind = 'alliance' | 'defensivePact' | 'tradeAgreement' | 'guarantee' | 'embargo';
/** a proposed it (guarantor for guarantees, embargoer for embargoes). */
export interface Treaty { id: number; kind: TreatyKind; a: CountryId; b: CountryId; since: number }
export interface PeaceTerms { demands: Demand[]; white?: boolean; /** The proposer hands these demands to the other side. */ give?: boolean }
export interface PeaceOffer { from: CountryId; to: CountryId; tick: number; warId: number; terms: PeaceTerms }
export interface Bloc { id: number; leader: CountryId; type: BlocType; principles: PrincipleId[]; members: CountryId[]; founded: number; /** Last time the principles were set. */ principlesSet: number; /** AI leaders: last invitation sent to the player. */ lastPlayerInvite?: number }
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
  plays: Play[];
  reparations: { from: CountryId; to: CountryId; until: number }[];
  peaceOffers: PeaceOffer[];
  tradeRoutes: TradeRoute[];
  /** Routes the player or AI cancelled: not reopened until `until`. */ tradeBlocks: { exporter: CountryId; importer: CountryId; good: Good; until: number }[];
  ships: Ship[];
  shipBuilds: ShipBuild[];
  /** Relations, n×n (index a*n+b), −100..100. */ relations: Int16Array;
  diploActions: { from: CountryId; to: CountryId; kind: 'improve' | 'worsen' }[];
  treaties: Treaty[];
  coalitions: { id: number; target: CountryId; members: CountryId[] }[];
  privateers: { from: CountryId; target: CountryId }[];
  treatyOffers: { from: CountryId; to: CountryId; kind: TreatyKind; tick: number }[];
  /** Countries that switched automatic trade off. */ tradeOff: CountryId[];
  blocs: Bloc[];
  /** World-wide event flags. */ flags: string[];
  /** Event cards waiting for the player. */ pendingEvents: { id: number; event: string; country: CountryId; tick: number }[];
  eventLog: { event: string; country: CountryId; tick: number; option: number }[];
  /** Bloc invitations waiting for the player. */ blocOffers: { from: CountryId; to: CountryId; tick: number }[];
  nextId: number;
  outcome: Outcome;
}

export type Command =
  | { type: 'attack'; country: CountryId; target: CountryId; ratio: number }
  | { type: 'cancelAttack'; country: CountryId; attackId: number }
  | { type: 'build'; country: CountryId; state: number; building: BuildingType }
  | { type: 'proposePeace'; country: CountryId; warId: number; terms: PeaceTerms }
  | { type: 'respondPeace'; country: CountryId; from: CountryId; accept: boolean }
  | { type: 'cancelTradeRoute'; country: CountryId; routeId: number }
  | { type: 'setTradeAuto'; country: CountryId; on: boolean }
  | { type: 'buildShip'; country: CountryId; state: number; kind: 'warship' | 'transport' }
  | { type: 'orderShip'; country: CountryId; shipId: number; order: ShipOrder }
  | { type: 'navalInvasion'; country: CountryId; target: CountryId; tile: number; ratio: number }
  | { type: 'improveRelations'; country: CountryId; target: CountryId }
  | { type: 'worsenRelations'; country: CountryId; target: CountryId }
  | { type: 'stopDiploAction'; country: CountryId; target: CountryId }
  | { type: 'proposeTreaty'; country: CountryId; target: CountryId; kind: TreatyKind }
  | { type: 'respondTreaty'; country: CountryId; from: CountryId; kind: TreatyKind; accept: boolean }
  | { type: 'cancelTreaty'; country: CountryId; treatyId: number }
  | { type: 'startPlay'; country: CountryId; target: CountryId; demands: Demand[] }
  | { type: 'joinPlay'; country: CountryId; playId: number; side: 'A' | 'B' }
  | { type: 'backDown'; country: CountryId; playId: number }
  | { type: 'separatePeace'; country: CountryId; warId: number }
  | { type: 'annexPuppet'; country: CountryId; puppet: CountryId }
  | { type: 'setPrivateers'; country: CountryId; target: CountryId; on: boolean }
  | { type: 'research'; country: CountryId; tech: string }
  | { type: 'queueTech'; country: CountryId; tech: string }
  | { type: 'unqueueTech'; country: CountryId; tech: string }
  | { type: 'enactLaw'; country: CountryId; law: string }
  | { type: 'cancelEnactment'; country: CountryId }
  | { type: 'foundBloc'; country: CountryId; blocType: BlocType; principles: PrincipleId[] }
  | { type: 'inviteToBloc'; country: CountryId; target: CountryId }
  | { type: 'respondBlocInvite'; country: CountryId; from: CountryId; accept: boolean }
  | { type: 'askToJoinBloc'; country: CountryId; leader: CountryId }
  | { type: 'leaveBloc'; country: CountryId }
  | { type: 'expelFromBloc'; country: CountryId; target: CountryId }
  | { type: 'setPrinciples'; country: CountryId; principles: PrincipleId[] }
  | { type: 'foundCompany'; country: CountryId; company: string }
  | { type: 'grantCharter'; country: CountryId; company: string; charter: CharterKind }
  | { type: 'revokeCharter'; country: CountryId; company: string }
  | { type: 'formNation'; country: CountryId; tag: string }
  | { type: 'chooseEventOption'; country: CountryId; pending: number; option: number };

export type SimEvent =
  | { type: 'warDeclared'; a: CountryId; b: CountryId }
  | { type: 'peace'; a: CountryId; b: CountryId; transferred: number[] }
  | { type: 'peaceOffered'; from: CountryId; to: CountryId; terms: PeaceTerms }
  | { type: 'peaceRefused'; from: CountryId; to: CountryId }
  | { type: 'built'; country: CountryId; state: number; building: BuildingType }
  | { type: 'eliminated'; country: CountryId }
  | { type: 'rejected'; command: Command; reason: string }
  | { type: 'gameOver'; kind: 'victory' | 'defeat' | 'endDate' }
  | { type: 'shipBuilt'; country: CountryId; ship: number; kind: ShipKind }
  | { type: 'shipLost'; country: CountryId; ship: number; kind: ShipKind }
  | { type: 'shipCaptured'; ship: number; owner: CountryId; by: CountryId; value: number }
  | { type: 'navalBattle'; a: CountryId; b: CountryId; winner: CountryId; cell: number }
  | { type: 'treatyOffered'; from: CountryId; to: CountryId; kind: TreatyKind }
  | { type: 'treatySigned'; a: CountryId; b: CountryId; kind: TreatyKind }
  | { type: 'treatyRefused'; from: CountryId; to: CountryId; kind: TreatyKind }
  | { type: 'treatyEnded'; a: CountryId; b: CountryId; kind: TreatyKind }
  | { type: 'coalitionFormed'; target: CountryId; members: CountryId[] }
  | { type: 'coalitionDissolved'; target: CountryId }
  | { type: 'playStarted'; initiator: CountryId; target: CountryId; playId: number }
  | { type: 'playJoined'; country: CountryId; playId: number; side: 'A' | 'B' }
  | { type: 'playYielded'; initiator: CountryId; target: CountryId; demands: Demand[] }
  | { type: 'playCancelled'; initiator: CountryId; target: CountryId }
  | { type: 'puppeted'; overlord: CountryId; puppet: CountryId }
  | { type: 'freed'; puppet: CountryId }
  | { type: 'annexed'; overlord: CountryId; puppet: CountryId }
  | { type: 'techResearched'; country: CountryId; tech: string }
  | { type: 'lawPassed'; country: CountryId; law: string }
  | { type: 'lawFailed'; country: CountryId; law: string; reason: 'noSupport' | 'timeout' | 'puppeted' | 'revolution' }
  | { type: 'revolt'; country: CountryId; rebels: CountryId; group: GroupId; law: string }
  | { type: 'revoltEnded'; country: CountryId; rebels: CountryId; won: boolean; independence?: boolean }
  | { type: 'blocFounded'; leader: CountryId; blocType: BlocType }
  | { type: 'blocInvited'; from: CountryId; to: CountryId }
  | { type: 'blocJoined'; country: CountryId; leader: CountryId }
  | { type: 'blocRefused'; from: CountryId; to: CountryId }
  | { type: 'blocLeft'; country: CountryId; leader: CountryId }
  | { type: 'blocLeaderChanged'; from: CountryId; to: CountryId }
  | { type: 'blocDissolved'; leader: CountryId }
  | { type: 'companyFounded'; country: CountryId; company: string }
  | { type: 'charterEnded'; country: CountryId; company: string }
  | { type: 'nationFormed'; country: CountryId; tag: string; name: string }
  | { type: 'nationReleased'; country: CountryId; from: CountryId }
  | { type: 'eventFired'; country: CountryId; event: string; pending: number }
  | { type: 'eventResolved'; country: CountryId; event: string; option: number; skipped: number };

export interface TickResult { changedTiles: number[]; events: SimEvent[]; newDay: boolean; newMonth: boolean }

export interface Label { country: CountryId; x: number; y: number; size: number; text: string }
export interface BuildingIcon { type: BuildingType; tile: number; level: number; owner: CountryId }
