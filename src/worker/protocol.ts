// Messages between the main thread and the simulation worker.
import type { StateResources } from '../map/format';
import type { BuildCheck } from '../sim/economy';
import type { ScoreRow } from '../sim/victory';
import type { Building, BuildingIcon, BuildingType, Command, Construction, CountryId, GameSetup, Good, Label, SimEvent } from '../sim/types';
import type { SaveSlot } from '../save/saves';

export type { BuildingIcon, Label };

export type ToWorker =
  | { type: 'newGame'; setup: GameSetup; baseUrl: string }
  | { type: 'loadGame'; slot: SaveSlot; baseUrl: string }
  | { type: 'command'; command: Command }
  | { type: 'setSpeed'; speed: 0 | 1 | 2 | 3 }
  | { type: 'save'; slot: SaveSlot }
  | { type: 'select'; stateId: number | null }
  | { type: 'debug'; action: 'eliminatePlayer' };

export interface CountrySummary {
  id: CountryId; tag: string; name: string; color: number; alive: boolean; isPlayer: boolean; capitalState: number;
  troops: number; maxTroops: number; money: number; income: number; gdp: number; population: number; sol: number; literacy: number;
  tiles: number; researchPoints: number; atWarWith: CountryId[]; stockpile: Record<Good, number>; prices: Record<Good, number>;
  produced: Record<Good, number>; demanded: Record<Good, number>; history: { tick: number; gdp: number; population: number; sol: number }[];
}

export interface StateDetail {
  id: number; name: string; owner: CountryId; controller: CountryId; population: number;
  slots: { used: number; total: number }; buildings: Building[]; constructions: (Construction & { daysLeft: number })[];
  buildOptions: { type: BuildingType; check: BuildCheck }[]; resources: StateResources; coastal: boolean;
}

export interface TradeView { routes: { id: number; exporter: CountryId; importer: CountryId; good: Good; amount: number }[]; capacity: number; used: number; auto: boolean; income: number }
export interface FleetView {
  ships: { id: number; kind: 'warship' | 'transport'; order: string; cell: number; troops: number }[];
  builds: { kind: string; state: number; daysLeft: number }[];
}
/** Ships packed as [id, owner, kind (0 trade, 1 warship, 2 transport), x×16, y×16] per ship, in tile coordinates. */
export const SHIP_STRIDE = 5;

export interface ReadyMsg {
  type: 'ready'; player: CountryId; startId: string; mapInfo: { width: number; height: number };
  countries: CountrySummary[]; owner: Uint16Array; controller: Uint16Array; date: string; tick: number;
  labels: Label[]; buildings: BuildingIcon[]; outcome: null | { kind: 'victory' | 'defeat' | 'endDate' };
}

export interface FrameMsg {
  type: 'frame'; tick: number; date: string; speed: 0 | 1 | 2 | 3;
  tiles: { idx: Uint32Array; val: Uint32Array };
  countries?: CountrySummary[]; buildings?: BuildingIcon[]; labels?: Label[]; selection?: StateDetail | null;
  attacks?: { id: number; attacker: CountryId; target: CountryId; troops: number }[];
  wars?: { id: number; a: CountryId; b: CountryId; scoreA: number; scoreB: number; startTick: number }[];
  peaceOffers?: { from: CountryId; to: CountryId }[];
  ships?: Int32Array; trade?: TradeView; fleet?: FleetView;
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
