import type { BlocType, PrincipleId } from '../content/blocs';
import type { CharterKind } from '../content/companies';
import type { GroupId } from '../content/groups';
import type { LawArea } from '../content/laws';
// Messages between the main thread and the simulation worker.
import type { StateResources } from '../map/format';
import type { BuildCheck } from '../sim/economy';
import type { ScoreRow } from '../sim/victory';
import type { Building, BuildingIcon, BuildingType, Command, Construction, CountryId, Demand, GameSetup, Good, Label, SimEvent, TreatyKind } from '../sim/types';
import type { SaveSlot } from '../save/saves';

export type { BuildingIcon, Label };

export type ToWorker =
  | { type: 'newGame'; setup: GameSetup; baseUrl: string }
  | { type: 'loadGame'; slot: SaveSlot; baseUrl: string }
  | { type: 'command'; command: Command }
  | { type: 'setSpeed'; speed: 0 | 1 | 2 | 3 }
  | { type: 'save'; slot: SaveSlot }
  | { type: 'select'; stateId: number | null }
  | { type: 'selectCountry'; country: CountryId | null }
  | { type: 'debug'; action: 'eliminatePlayer' };

export interface CountrySummary {
  id: CountryId; tag: string; name: string; color: number; alive: boolean; isPlayer: boolean; capitalState: number;
  troops: number; maxTroops: number; money: number; income: number; gdp: number; population: number; sol: number; literacy: number;
  tiles: number; researchPoints: number; researchRate: number; infamy: number; overlord: CountryId; atWarWith: CountryId[]; stockpile: Record<Good, number>; prices: Record<Good, number>;
  produced: Record<Good, number>; demanded: Record<Good, number>; history: { tick: number; gdp: number; population: number; sol: number }[];
}

export interface StateDetail {
  id: number; name: string; owner: CountryId; controller: CountryId; population: number;
  slots: { used: number; total: number }; buildings: Building[]; constructions: (Construction & { daysLeft: number })[];
  buildOptions: { type: BuildingType; check: BuildCheck }[]; resources: StateResources; coastal: boolean;
  /** Why the player can't demand this state from its owner (null = can; undefined for own/unclaimed states). */ play?: string | null;
}

export interface TradeView { routes: { id: number; exporter: CountryId; importer: CountryId; good: Good; amount: number }[]; capacity: number; used: number; auto: boolean; income: number }
export interface FleetView {
  ships: { id: number; kind: 'warship' | 'transport'; order: string; cell: number; troops: number }[];
  builds: { kind: string; state: number; daysLeft: number }[];
}
/** Ships packed as [id, owner, kind (0 trade, 1 warship, 2 transport), x×16, y×16] per ship, in tile coordinates. */
export const SHIP_STRIDE = 5;

export interface DiploView {
  bloc: BlocView;
  infamy: number; capacity: { used: number; total: number };
  relations: number[];                                   // by country id, player's row
  actions: { to: CountryId; kind: 'improve' | 'worsen' }[];
  treaties: { id: number; kind: TreatyKind; a: CountryId; b: CountryId }[];
  treatyOffers: { from: CountryId; kind: TreatyKind }[];
  peaceOffers: { from: CountryId; warId: number; white: boolean; give: boolean; demands: string[] }[];
  plays: { id: number; initiator: CountryId; target: CountryId; demands: string[]; sideA: CountryId[]; sideB: CountryId[]; strengthA: number; strengthB: number; daysLeft: number; /** Why the player can't back a side (null = can). */ join: string | null }[];
  wars: { id: number; leader: boolean; mySide: CountryId[]; enemySide: CountryId[]; myScore: number; enemyScore: number; available: number; goals: string[];
    candidates: { demand: Demand; label: string; cost: number; goal: boolean }[] }[];
  puppets: { id: CountryId; annex: string | null }[];
  privateers: CountryId[];
  coalitionAgainstMe: CountryId[];
}
export interface CountryDetail {
  id: CountryId; treaty: Record<TreatyKind, string | null>; play: string | null; states: { id: number; name: string; population: number }[];
  privateers: string | null;
  /** Why the player can't invite them into the player's bloc / ask to join theirs (null = can; undefined = not applicable). */
  invite?: string | null; askJoin?: string | null; theirBloc?: { leader: CountryId; type: BlocType } | null;
}

export interface BlocView {
  mine: { leader: CountryId; type: BlocType; principles: PrincipleId[]; members: CountryId[]; puppets: CountryId[]; isLeader: boolean; canSetPrinciples: boolean } | null;
  /** Why the player can't found a bloc (null = can). */ found: string | null;
  cost: number;
  all: { leader: CountryId; type: BlocType; members: number }[];
  invites: CountryId[];
}
export interface CompanyView {
  limit: number; cost: number;
  mine: { id: string; bonus: number; charter: CharterKind | null; charters: Record<CharterKind, string | null> }[];
  available: { id: string; check: string | null }[];
}

export interface ReadyMsg {
  type: 'ready'; player: CountryId; startId: string; mapInfo: { width: number; height: number };
  countries: CountrySummary[]; owner: Uint16Array; controller: Uint16Array; date: string; tick: number;
  labels: Label[]; buildings: BuildingIcon[]; outcome: null | { kind: 'victory' | 'defeat' | 'endDate' };
}

export interface FrameMsg {
  type: 'frame'; tick: number; date: string; speed: 0 | 1 | 2 | 3;
  tiles: { idx: Uint32Array; val: Uint32Array };
  countries?: CountrySummary[]; buildings?: BuildingIcon[]; labels?: Label[]; selection?: StateDetail | null; politics?: PoliticsView;
  attacks?: { id: number; attacker: CountryId; target: CountryId; troops: number }[];
  wars?: { id: number; a: CountryId; b: CountryId; scoreA: number; scoreB: number; startTick: number }[];
  peaceOffers?: { from: CountryId; to: CountryId }[];
  ships?: Int32Array; trade?: TradeView; fleet?: FleetView; diplo?: DiploView; countryDetail?: CountryDetail | null;
}

export type FromWorker =
  | ReadyMsg
  | FrameMsg
  | { type: 'events'; events: SimEvent[] }
  | { type: 'gameOver'; kind: 'victory' | 'defeat' | 'endDate'; scores: ScoreRow[] }
  | { type: 'saved'; slot: SaveSlot }
  | { type: 'saveFailed'; slot: SaveSlot; message: string }
  | { type: 'error'; message: string };

let mark = new Uint8Array(0);

/** Deduplicates changed tiles (latest value wins) into transferable arrays: val = owner | controller << 16. */
export function coalesceTiles(changed: Iterable<number>, owner: Uint16Array, controller: Uint16Array): { idx: Uint32Array; val: Uint32Array } {
  if (mark.length < owner.length) mark = new Uint8Array(owner.length);
  const list: number[] = [];
  for (const t of changed) if (!mark[t]) { mark[t] = 1; list.push(t); }
  const idx = new Uint32Array(list.length), val = new Uint32Array(list.length);
  for (let k = 0; k < list.length; k++) {
    const t = list[k];
    mark[t] = 0;
    idx[k] = t;
    val[k] = (owner[t] | (controller[t] << 16)) >>> 0;
  }
  return { idx, val };
}

export interface PoliticsView {
  research: { researching: string | null; queue: string[]; points: number; rate: number; cost: number;
    techs: { id: string; status: 'known' | 'researching' | 'queued' | 'available' | 'locked'; cost: number }[] };
  laws: { area: LawArea; current: string; options: { id: string; support: number; chance: number; check: string | null }[] }[];
  enacting: { law: string; months: number; support: number; chance: number; minMonths: number; maxMonths: number } | null;
  groups: { id: GroupId; clout: number; approval: number; radicalism: number; wants: string | null }[];
  companies: CompanyView;
}
