// Main-thread side of the simulation worker.
import type { Command, GameSetup } from '../sim/types';
import type { SaveSlot } from '../save/saves';
import type { FrameMsg, FromWorker, ReadyMsg, ToWorker } from './protocol';

interface WorkerLike { postMessage(msg: ToWorker): void; onmessage: ((e: { data: FromWorker }) => void) | null; terminate(): void }

export class GameHost {
  private frameFns = new Set<(f: FrameMsg) => void>();
  private eventFns = new Set<(e: Extract<FromWorker, { type: 'events' }>['events']) => void>();
  private otherFns = new Set<(m: FromWorker) => void>();
  private pendingReady: { resolve: (r: ReadyMsg) => void; reject: (e: Error) => void } | null = null;
  private pendingSave: (() => void) | null = null;

  constructor(private worker: WorkerLike) {
    worker.onmessage = e => this.receive(e.data);
  }

  private receive(m: FromWorker) {
    if (m.type === 'ready') { this.pendingReady?.resolve(m); this.pendingReady = null; }
    else if (m.type === 'frame') for (const f of this.frameFns) f(m);
    else if (m.type === 'events') for (const f of this.eventFns) f(m.events);
    else if (m.type === 'error' && this.pendingReady) { this.pendingReady.reject(new Error(m.message)); this.pendingReady = null; }
    else if (m.type === 'saved') { this.pendingSave?.(); this.pendingSave = null; }
    for (const f of this.otherFns) f(m);
  }

  private awaitReady(msg: ToWorker): Promise<ReadyMsg> {
    return new Promise((resolve, reject) => { this.pendingReady = { resolve, reject }; this.worker.postMessage(msg); });
  }

  newGame(setup: GameSetup, baseUrl: string) { return this.awaitReady({ type: 'newGame', setup, baseUrl }); }
  loadGame(slot: SaveSlot, baseUrl: string) { return this.awaitReady({ type: 'loadGame', slot, baseUrl }); }
  send(command: Command) { this.worker.postMessage({ type: 'command', command }); }
  setSpeed(speed: 0 | 1 | 2 | 3) { this.worker.postMessage({ type: 'setSpeed', speed }); }
  select(stateId: number | null) { this.worker.postMessage({ type: 'select', stateId }); }
  debug(action: 'eliminatePlayer') { this.worker.postMessage({ type: 'debug', action }); }
  save(slot: SaveSlot): Promise<void> { return new Promise(resolve => { this.pendingSave = resolve; this.worker.postMessage({ type: 'save', slot }); }); }
  onFrame(fn: (f: FrameMsg) => void) { this.frameFns.add(fn); return () => { this.frameFns.delete(fn); }; }
  onEvents(fn: (e: Extract<FromWorker, { type: 'events' }>['events']) => void) { this.eventFns.add(fn); return () => { this.eventFns.delete(fn); }; }
  onMessage(fn: (m: FromWorker) => void) { this.otherFns.add(fn); return () => { this.otherFns.delete(fn); }; }
  terminate() { this.worker.terminate(); }
}
