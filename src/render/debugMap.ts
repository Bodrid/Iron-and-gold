// ?debugMap: renders the real 1836 map with no UI (for tests and quick checks).
import { loadMap } from '../map/format';
import { getStart } from '../content/starts';
import { createGame } from '../sim/state';
import { Camera } from './camera';
import { MapRenderer } from './mapRenderer';
import { buildPalette } from './palette';

export async function startDebugMap(root: HTMLElement): Promise<void> {
  const map = await loadMap(import.meta.env.BASE_URL);
  const g = createGame(map, getStart('1836'), { startId: '1836', playerTag: 'PRU', difficulty: 'normal', rivalsHarder: false, seed: 1, aiDisabled: true });
  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%';
  root.appendChild(canvas);
  const r = new MapRenderer(canvas, map);
  const cam = new Camera(map.width, map.height, innerWidth, innerHeight);
  r.resize(innerWidth, innerHeight, devicePixelRatio);
  r.setOwnership(g.owner, g.controller);
  r.setPalette(buildPalette(g.countries));
  cam.flyTo(1290, 210, 3);
  r.render(cam);
  (window as any).__sampleColours = (n: number) => r.sampleColours(n, cam);
  (window as any).__loseAndRestoreContext = () => r.testContextLoss();
  r.onRestored = () => r.render(cam);
  (window as any).__mapReady = true;
}
