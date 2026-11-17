// Wires pointer and wheel events on the map canvas to the camera and to tap / long-press handlers.
import type { Camera } from '../render/camera';
import { GestureRecognizer, type PointerSample } from './gestures';

export interface InputHandlers { onTap(tile: [number, number]): void; onLongPress(tile: [number, number]): void; onChange(): void }

export function attachInput(canvas: HTMLElement, cam: Camera, h: InputHandlers): () => void {
  const r = new GestureRecognizer();
  let timer: ReturnType<typeof setInterval> | null = null;
  const local = (e: { clientX: number; clientY: number }) => { const b = canvas.getBoundingClientRect(); return [e.clientX - b.left, e.clientY - b.top]; };
  const run = (gs: ReturnType<GestureRecognizer['feed']>) => {
    let changed = false;
    for (const g of gs) {
      if (g.type === 'pan') { cam.pan(g.dx, g.dy); changed = true; }
      else if (g.type === 'pinch') { cam.zoomAt(g.cx, g.cy, g.scale); changed = true; }
      else if (g.type === 'tap') h.onTap(cam.screenToTile(g.x, g.y));
      else if (g.type === 'longPress') h.onLongPress(cam.screenToTile(g.x, g.y));
    }
    if (changed) h.onChange();
  };
  const sample = (e: PointerEvent, kind: PointerSample['kind']): PointerSample => { const [x, y] = local(e); return { id: e.pointerId, x, y, t: performance.now(), kind, button: e.button }; };
  const down = (e: PointerEvent) => {
    if (e.button > 0) return;
    canvas.setPointerCapture?.(e.pointerId);
    run(r.feed(sample(e, 'down')));
    timer ??= setInterval(() => run(r.tick(performance.now())), 50);
  };
  const move = (e: PointerEvent) => run(r.feed(sample(e, 'move')));
  const up = (e: PointerEvent, kind: 'up' | 'cancel') => {
    run(r.feed(sample(e, kind)));
    if (timer && !(e.buttons & 1) && e.pointerType === 'mouse') { clearInterval(timer); timer = null; }
  };
  const onUp = (e: PointerEvent) => up(e, 'up');
  const onCancel = (e: PointerEvent) => up(e, 'cancel');
  const wheel = (e: WheelEvent) => {
    e.preventDefault();
    const [x, y] = local(e);
    cam.zoomAt(x, y, Math.exp(-e.deltaY * 0.0015));
    h.onChange();
  };
  const ctx = (e: Event) => e.preventDefault();
  canvas.addEventListener('pointerdown', down);
  canvas.addEventListener('pointermove', move);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointercancel', onCancel);
  canvas.addEventListener('wheel', wheel, { passive: false });
  canvas.addEventListener('contextmenu', ctx);
  canvas.style.touchAction = 'none';
  return () => {
    canvas.removeEventListener('pointerdown', down);
    canvas.removeEventListener('pointermove', move);
    canvas.removeEventListener('pointerup', onUp);
    canvas.removeEventListener('pointercancel', onCancel);
    canvas.removeEventListener('wheel', wheel);
    canvas.removeEventListener('contextmenu', ctx);
    if (timer) clearInterval(timer);
  };
}
