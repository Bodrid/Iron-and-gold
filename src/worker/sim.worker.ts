/// <reference lib="webworker" />
import { loadMap } from '../map/format';
import { getStart } from '../content/starts';
import { createWorkerHandler } from './handler';
import { buildingIcons, computeLabels } from '../sim/labels';
import { deserialize, loadGame, LOAD_ERROR_TEXT, saveGame, type SaveSlot } from '../save/saves';
import type { ToWorker } from './protocol';

const handler = createWorkerHandler({
  post: (msg, transfer) => (self as unknown as DedicatedWorkerGlobalScope).postMessage(msg, transfer ?? []),
  loadMap,
  getStart,
  now: () => performance.now(),
  hooks: {
    labels: computeLabels,
    buildings: buildingIcons,
    save: async (slot, state) => { await saveGame(slot as SaveSlot, state); },
    load: async (slot, map) => {
      const r = await loadGame(slot as SaveSlot);
      return 'error' in r ? { error: LOAD_ERROR_TEXT[r.error] } : deserialize(r, map);
    },
  },
});
self.onmessage = (e: MessageEvent<ToWorker>) => { void handler.onMessage(e.data); };
setInterval(() => handler.pump(), 16);
