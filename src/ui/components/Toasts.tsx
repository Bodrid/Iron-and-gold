import { dismissToast, ui } from '../store';

export function Toasts() {
  return (
    <div class="toasts" aria-live="polite">
      {ui.toasts.value.map(t => (
        <div class={`toast glass ${t.kind}`} key={t.id}>
          <span>{t.text}</span>
          {t.actions?.map(a => <button onClick={a.run}>{a.label}</button>)}
          <button class="ghost" aria-label="Dismiss" onClick={() => dismissToast(t.id)}>✕</button>
        </div>
      ))}
    </div>
  );
}
