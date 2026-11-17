// Starting and loading games: creates the worker, loads the map on the main thread, wires debug hooks.
import { loadMap } from '../map/format';
import type { GameSetup } from '../sim/types';
import { GameHost } from '../worker/host';
import type { ReadyMsg } from '../worker/protocol';
import { GameController, session } from './game';
import { ui } from './store';
import type { SaveSlot } from '../save/saves';

const BASE = import.meta.env.BASE_URL;
let mapPromise: ReturnType<typeof loadMap> | null = null;
export const debugEnabled = import.meta.env.DEV || location.search.includes('e2e');

function makeHost(): GameHost {
  const worker = new Worker(new URL('../worker/sim.worker.ts', import.meta.url), { type: 'module' });
  return new GameHost(worker as any);
}

async function begin(start: (host: GameHost) => Promise<ReadyMsg>): Promise<void> {
  session.game?.destroy();
  session.game = null;
  ui.screen.value = 'loading';
  ui.error.value = null;
  try {
    mapPromise ??= loadMap(BASE);
    const host = makeHost();
    const [map, ready] = await Promise.all([mapPromise, start(host)]);
    session.game = new GameController(host, map, ready);
    if (ready.outcome) ui.outcomeDismissed.value = true;
    ui.screen.value = 'game';
    if (debugEnabled) installDebugHooks();
  } catch (err) {
    ui.error.value = err instanceof Error ? err.message : String(err);
    ui.screen.value = 'menu';
  }
}

export function startNewGame(setup: GameSetup) { return begin(host => host.newGame(setup, BASE)); }
export function continueGame(slot: SaveSlot) { return begin(host => host.loadGame(slot, BASE)); }

function installDebugHooks() {
  const w = window as any;
  const g = session.game!;
  w.__gameReady = false;
  const off = g.host.onFrame(() => { w.__gameReady = true; off(); });
  g.host.setSpeed(0);
  w.__setSpeed = (s: 0 | 1 | 2 | 3) => g.setSpeed(s);
  w.__selectCapital = () => { const p = ui.countries.value.find(c => c.id === ui.playerId.value)!; g.flyToState(p.capitalState); };
  w.__selectStateByKey = (key: string) => { const s = g.map.states.find(x => x.key === key); if (s) g.flyToState(s.id); return !!s; };
  w.__debugEliminatePlayer = () => g.host.debug('eliminatePlayer');
  w.__playerTiles = () => ui.countries.value.find(c => c.id === ui.playerId.value)?.tiles ?? 0;
}
