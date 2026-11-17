// The simulation worker's logic, independent of the Worker global so tests can run it in-process.
import type { MapData } from '../map/format';
import { dateAtTick, formatDate, TICKS_PER_DAY } from '../sim/calendar';
import { setTile } from '../sim/control';
import { createGame } from '../sim/state';
import { step } from '../sim/step';
import { computeScores } from '../sim/victory';
import type { BuildingIcon, Command, GameState, Label, SimEvent, StartDef } from '../sim/types';
import { applyCommand } from '../sim/registry';
import { coalesceTiles, type FromWorker, type ToWorker } from './protocol';
import { TickScheduler } from './scheduler';
import { allSummaries, fleetView, militaryView, packShips, stateDetail, tradeView } from './summaries';
import { countryDetail, diploView } from './diploView';

export interface HandlerDeps {
  post: (msg: FromWorker, transfer?: Transferable[]) => void;
  loadMap: (baseUrl: string) => Promise<MapData>;
  getStart: (id: string) => StartDef;
  now: () => number;
  /** Optional extras wired in by later features (labels, icons, saves). */
  hooks?: Partial<WorkerHooks>;
}

export interface WorkerHooks {
  labels: (state: GameState) => Label[];
  buildings: (state: GameState) => BuildingIcon[];
  save: (slot: string, state: GameState) => Promise<void>;
  load: (slot: string, map: MapData) => Promise<GameState | { error: string }>;
}

const FRAME_MS = 50;
const LABEL_DAYS = 30;

export function createWorkerHandler(deps: HandlerDeps) {
  const sched = new TickScheduler(deps.now);
  let state: GameState | null = null;
  let map: MapData | null = null;
  let queue: Command[] = [];
  const dirty: number[] = [];
  let lastFrame = -Infinity;
  let lastCountriesDay = -1;
  let lastLabelsDay = -Infinity;
  let buildingsDirty = true;
  let selected: number | null = null;
  let selectionDirty = false;
  let selectedCountry: number | null = null;
  const player = () => state!.countries.find(c => c.isPlayer)!.id;
  const date = () => formatDate(dateAtTick(state!.startDate, state!.tick));

  function ready() {
    const s = state!;
    const owner = s.owner.slice(), controller = s.controller.slice();
    lastLabelsDay = Math.floor(s.tick / TICKS_PER_DAY);
    buildingsDirty = false;
    deps.post({
      type: 'ready', player: player(), startId: s.setup.startId, mapInfo: { width: s.map.width, height: s.map.height },
      countries: allSummaries(s), owner, controller, date: date(), tick: s.tick,
      labels: deps.hooks?.labels?.(s) ?? [], buildings: deps.hooks?.buildings?.(s) ?? [], outcome: s.outcome ? { kind: s.outcome.kind } : null,
    }, [owner.buffer, controller.buffer]);
  }

  function frame(force = false) {
    const s = state!;
    const t = deps.now();
    if (!force && t - lastFrame < FRAME_MS) return;
    lastFrame = t;
    const tiles = coalesceTiles(dirty, s.owner, s.controller);
    dirty.length = 0;
    const day = Math.floor(s.tick / TICKS_PER_DAY);
    const msg: any = { type: 'frame', tick: s.tick, date: date(), speed: sched.getSpeed(), tiles };
    if (day !== lastCountriesDay || force) {
      lastCountriesDay = day;
      msg.countries = allSummaries(s);
      Object.assign(msg, militaryView(s));
      msg.ships = packShips(s);
      msg.trade = tradeView(s, player());
      msg.fleet = fleetView(s, player());
      msg.diplo = diploView(s, player());
      if (selectedCountry !== null) msg.countryDetail = countryDetail(s, player(), selectedCountry);
      if (selected !== null) selectionDirty = true;
    }
    if (deps.hooks?.labels && day - lastLabelsDay >= LABEL_DAYS) { lastLabelsDay = day; msg.labels = deps.hooks.labels(s); }
    if (deps.hooks?.buildings && buildingsDirty) { buildingsDirty = false; msg.buildings = deps.hooks.buildings(s); }
    if (selectionDirty) { selectionDirty = false; msg.selection = selected === null ? null : stateDetail(s, selected, player()); }
    deps.post(msg, msg.ships ? [tiles.idx.buffer, tiles.val.buffer, msg.ships.buffer] : [tiles.idx.buffer, tiles.val.buffer]);
  }

  function pump() {
    if (!state) return;
    try { pumpInner(); } catch (err) {
      // Never leave a frozen, silent game: stop time and tell the player.
      sched.setSpeed(0);
      queue = [];
      deps.post({ type: 'error', message: `The simulation hit a problem and was paused: ${err instanceof Error ? err.message : String(err)}` });
      frame(true);
    }
  }

  function pumpInner() {
    if (!state) return;
    const n = sched.dueTicks();
    const events: SimEvent[] = [];
    const hadCommands = queue.length > 0;
    for (let i = 0; i < n; i++) {
      const r = step(state, queue);
      queue = [];
      if (r.newMonth && deps.hooks?.save && dateAtTick(state.startDate, state.tick - 1).m === 1) {
        void deps.hooks.save('auto', state).then(() => deps.post({ type: 'saved', slot: 'auto' })).catch(() => {});
      }
      for (const t of r.changedTiles) dirty.push(t);
      for (const e of r.events) events.push(e);
    }
    let commanded = false;
    if (queue.length && n === 0) {
      // Paused: apply commands immediately so the player sees the result.
      const r = step0(state, queue);
      queue = [];
      for (const t of r.changed) dirty.push(t);
      events.push(...r.events);
      commanded = true;
    }
    if (n > 0 && hadCommands) commanded = true;
    if (commanded) {
      if (selected !== null) selectionDirty = true;
      if (!events.length) { frame(true); return; }
    }
    if (events.length) {
      const remap = (e: SimEvent) => e.type === 'peace' || e.type === 'eliminated' || e.type === 'revolt' || e.type === 'revoltEnded';
      if (events.some(e => e.type === 'built' || remap(e))) buildingsDirty = true;
      if (events.some(remap)) { lastLabelsDay = -Infinity; lastCountriesDay = -Infinity; }
      if (events.some(e => e.type !== 'rejected' || (e.command as any).country === player())) selectionDirty = selected !== null;
      deps.post({ type: 'events', events });
      const over = events.find(e => e.type === 'gameOver');
      if (over && over.type === 'gameOver') { sched.setSpeed(0); deps.post({ type: 'gameOver', kind: over.kind, scores: computeScores(state) }); }
      frame(true);
      return;
    }
    frame();
  }

  async function onMessage(msg: ToWorker) {
    try {
      switch (msg.type) {
        case 'newGame': {
          map = map ?? (await deps.loadMap(msg.baseUrl));
          state = createGame(map, deps.getStart(msg.setup.startId), msg.setup);
          sched.setSpeed(0);
          ready();
          break;
        }
        case 'loadGame': {
          map = map ?? (await deps.loadMap(msg.baseUrl));
          const r = await deps.hooks!.load!(msg.slot, map);
          if ('error' in r) { deps.post({ type: 'error', message: r.error }); break; }
          state = r;
          sched.setSpeed(0);
          ready();
          break;
        }
        case 'command': queue.push(msg.command); break;
        case 'setSpeed': sched.setSpeed(msg.speed); if (state) frame(true); break;
        case 'select': selected = msg.stateId; selectionDirty = true; if (state) frame(true); break;
        case 'selectCountry': selectedCountry = msg.country; if (state) frame(true); break;
        case 'save':
          if (state && deps.hooks?.save) {
            try { await deps.hooks.save(msg.slot, state); deps.post({ type: 'saved', slot: msg.slot }); }
            catch (err) { deps.post({ type: 'saveFailed', slot: msg.slot, message: err instanceof Error ? err.message : String(err) }); }
          }
          break;
        case 'debug': if (state && msg.action === 'eliminatePlayer') debugEliminate(state, dirty); break;
      }
    } catch (err) {
      deps.post({ type: 'error', message: err instanceof Error ? err.message : String(err) });
    }
  }

  return { onMessage, pump, getState: () => state };
}

/** Applies commands without advancing time (used while paused). */
function step0(state: GameState, cmds: Command[]): { changed: number[]; events: SimEvent[] } {
  const events: SimEvent[] = [];
  const changed: number[] = [];
  for (const c of cmds) applyCommand(state, c, events, changed);
  return { changed, events };
}

function debugEliminate(state: GameState, dirty: number[]) {
  const p = state.countries.find(c => c.isPlayer)!;
  const heir = state.countries.find(c => c.alive && !c.isPlayer && c.id)!;
  for (let t = 0; t < state.owner.length; t++) if (state.owner[t] === p.id) setTile(state, t, heir.id, heir.id, dirty);
}
