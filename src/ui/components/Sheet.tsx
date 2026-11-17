import type { ComponentChildren } from 'preact';
import { useRef } from 'preact/hooks';
import { ui } from '../store';

const THRESHOLD = 80;

/** Pull-up panel for phones: half height keeps the map visible; drag the grabber to go full height or to close. */
export function Sheet({ title, children }: { title: string; children: ComponentChildren }) {
  const start = useRef<number | null>(null);
  const down = (e: PointerEvent) => { start.current = e.clientY; (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId); };
  const up = (e: PointerEvent) => {
    if (start.current === null) return;
    const dy = e.clientY - start.current;
    start.current = null;
    if (dy < -THRESHOLD) ui.sheet.value = 'full';
    else if (dy > THRESHOLD) { if (ui.sheet.value === 'full') ui.sheet.value = 'half'; else ui.tab.value = null; }
  };
  return (
    <section class={`sheet glass ${ui.sheet.value}`} data-ui="sheet" aria-label={title}>
      <div class="grabber-zone" data-ui="grabber" onPointerDown={down} onPointerUp={up} onPointerMove={() => {}}>
        <div class="grabber" />
        <h2>{title}</h2>
        <button class="close" aria-label="Close panel" onClick={() => (ui.tab.value = null)}>✕</button>
      </div>
      <div class="panel-body">{children}</div>
    </section>
  );
}
