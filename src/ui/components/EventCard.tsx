import { ui } from '../store';
import { defaultSend, type Send } from '../tabs/common';
import { session } from '../game';

const close = () => { ui.openEvent.value = null; session.game?.resumeAfterEvent(); };

/** A history event: title, story and 2–3 choices with their effects, over the map. */
export function EventCard({ send = defaultSend }: { send?: Send }) {
  const id = ui.openEvent.value;
  const e = ui.events.value?.pending.find(p => p.id === id);
  if (!e) return null;
  const me = ui.playerId.value;
  return (
    <div class="event-backdrop" role="dialog" aria-modal="true" aria-labelledby={`event-${e.id}`}>
      <div class="event-card glass">
        <div class="event-head">
          <h2 id={`event-${e.id}`}>{e.title}</h2>
          <button class="ghost" aria-label="Decide later" onClick={close}>Later</button>
        </div>
        <div class="event-text">{e.text.split('\n\n').map((p, i) => <p key={i}>{p}</p>)}</div>
        <small class="dim">The game is paused while you decide. If you put it off, the first option is taken after {e.daysLeft} days.</small>
        <div class="event-options">
          {e.options.map((o, i) => (
            <button key={i} class="event-option" onClick={() => { send({ type: 'chooseEventOption', country: me, pending: e.id, option: i }); close(); }}>
              <b>{o.label}</b>
              {o.effects.map((x, k) => <small key={k}>{x}</small>)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
