import type { ComponentChildren } from 'preact';
import { ui } from '../store';

/** The iPad / desktop panel, docked to the right so it never covers the map. */
export function Dock({ title, children }: { title: string; children: ComponentChildren }) {
  return (
    <section class="dock glass" data-ui="dock" aria-label={title}>
      <div class="dock-head">
        <h2>{title}</h2>
        <button class="close" aria-label="Close panel" onClick={() => (ui.tab.value = null)}>✕</button>
      </div>
      <div class="panel-body">{children}</div>
    </section>
  );
}
