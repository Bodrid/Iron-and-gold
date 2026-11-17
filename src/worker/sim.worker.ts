/// <reference lib="webworker" />
import { loadMap } from '../map/format';
import { getStart } from '../content/starts';
import { createWorkerHandler } from './handler';
import type { ToWorker } from './protocol';

const handler = createWorkerHandler({
  post: (msg, transfer) => (self as unknown as DedicatedWorkerGlobalScope).postMessage(msg, transfer ?? []),
  loadMap,
  getStart,
  now: () => performance.now(),
});
self.onmessage = (e: MessageEvent<ToWorker>) => { void handler.onMessage(e.data); };
setInterval(() => handler.pump(), 16);
