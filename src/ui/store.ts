// UI state shared by components (Preact signals).
import { signal } from '@preact/signals';
import type { CountryDetail, CountrySummary, DiploView, FleetView, PoliticsView, EventsView, FrameMsg, StateDetail, TradeView } from '../worker/protocol';
import type { ScoreRow } from '../sim/victory';

export type Tab = 'build' | 'army' | 'trade' | 'diplomacy' | 'research' | 'nation' | 'bloc';
export type Screen = 'menu' | 'newGame' | 'loading' | 'game';
export interface Toast { id: number; text: string; kind: 'info' | 'war' | 'peace' | 'good'; actions?: { label: string; run: () => void }[]; sticky?: boolean }

export const ui = {
  screen: signal<Screen>('menu'),
  loadingText: signal('Loading the world…'),
  error: signal<string | null>(null),
  tab: signal<Tab | null>(null),
  sheet: signal<'half' | 'full'>('half'),
  speed: signal<0 | 1 | 2 | 3>(0),
  attackRatio: signal(0.4),
  selectedState: signal<number | null>(null),
  selection: signal<StateDetail | null>(null),
  playerId: signal(0),
  countries: signal<CountrySummary[]>([]),
  date: signal(''),
  tick: signal(0),
  toasts: signal<Toast[]>([]),
  layout: signal<'phone' | 'dock' | 'rotate'>('phone'),
  wars: signal<NonNullable<FrameMsg['wars']>>([]),
  attacks: signal<NonNullable<FrameMsg['attacks']>>([]),
  peaceOffers: signal<NonNullable<FrameMsg['peaceOffers']>>([]),
  outcome: signal<null | { kind: 'victory' | 'defeat' | 'endDate'; scores: ScoreRow[] }>(null),
  outcomeDismissed: signal(false),
  confirmWar: signal<number | null>(null),
  trade: signal<TradeView>({ routes: [], capacity: 0, used: 0, auto: true, income: 0 }),
  fleet: signal<FleetView>({ ships: [], builds: [] }),
  ships: signal<Int32Array>(new Int32Array(0)),
  /** Last tapped tile (land or sea), for Send boat and ship orders. */
  selectedTile: signal<number | null>(null),
  /** Navigation cell of a tapped sea tile, for ship orders. */
  selectedSea: signal<number | null>(null),
  diplo: signal<DiploView | null>(null),
  politics: signal<PoliticsView | null>(null),
  events: signal<EventsView | null>(null),
  /** The event card on screen (pending id), if any. */ openEvent: signal<number | null>(null),
  /** Research tab: which tree is shown. */ techTree: signal<'production' | 'military' | 'society'>('production'),
  countryDetail: signal<CountryDetail | null>(null),
  /** Country open in the Diplomacy tab. */
  diploCountry: signal<number | null>(null),
  /** Sub-screen of the Diplomacy tab. */
  diploScreen: signal<null | { kind: 'play'; target: number } | { kind: 'peace'; warId: number }>(null),
};

export function player(): CountrySummary | undefined {
  return ui.countries.value.find(c => c.id === ui.playerId.value);
}

export function country(id: number): CountrySummary | undefined {
  return ui.countries.value.find(c => c.id === id);
}

let toastId = 1;
export function pushToast(t: Omit<Toast, 'id'>): number {
  const id = toastId++;
  const all = [...ui.toasts.value, { ...t, id }];
  const sticky = all.filter(x => x.sticky);
  const rest = all.filter(x => !x.sticky).slice(-Math.max(1, 4 - sticky.length));
  ui.toasts.value = all.filter(x => x.sticky || rest.includes(x));
  if (!t.sticky) setTimeout(() => dismissToast(id), 6000);
  return id;
}
export function dismissToast(id: number) { ui.toasts.value = ui.toasts.value.filter(t => t.id !== id); }

/** The device's screen, not the window: an iPad in split view has a narrow window but is not a phone. */
export interface DeviceScreen { screenW: number; screenH: number }
const deviceScreen = (): DeviceScreen => (typeof screen === 'undefined' ? { screenW: 1024, screenH: 768 } : { screenW: screen.width, screenH: screen.height });

export function layoutFor(w: number, h: number, dev: DeviceScreen = deviceScreen()): 'phone' | 'dock' | 'rotate' {
  const isPhone = Math.min(dev.screenW, dev.screenH) < 600;
  if (isPhone && w < h) return 'rotate';
  if (w >= 1000 && h >= 600) return 'dock';
  return 'phone';
}

function compact(n: number): string {
  const a = Math.abs(n);
  const f = (v: number, s: string) => `${(Math.round(v * 100) / 100).toString().replace(/(\.\d)0$/, '$1')}${s}`;
  if (a >= 1e9) return f(n / 1e9, 'B');
  if (a >= 1e6) return f(n / 1e6, 'M');
  if (a >= 1e3) return f(Math.round(n / 100) / 10, 'k');
  return String(Math.round(n));
}
export function fmtMoney(n: number): string { return `${n < 0 ? '-' : ''}£${compact(Math.abs(n))}`; }
export function fmtNum(n: number): string { return compact(n); }
export function colourCss(c: number): string { return `#${c.toString(16).padStart(6, '0')}`; }
