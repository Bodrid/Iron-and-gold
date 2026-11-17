import { ui } from '../store';
import { defaultSend, type Send } from './common';
import { DIPLO_REASON } from './diploText';

export function EventsSection({ send = defaultSend }: { send?: Send }) {
  const v = ui.events.value;
  const me = ui.playerId.value;
  if (!v) return null;
  return (
    <div class="events">
      {v.decisions.length > 0 && <h3>Decisions</h3>}
      {v.decisions.map(d => (
        <div class="card" key={d.tag}>
          <b>Proclaim {d.name}</b>
          <small>{d.description} You own {d.owned} of its {d.total} states; {d.needed} are needed.</small>
          <div class="bar"><div style={{ width: `${Math.min(100, (100 * d.owned) / Math.max(1, d.needed))}%` }} /></div>
          <div class="row">
            <button disabled={!!d.check} onClick={() => send({ type: 'formNation', country: me, tag: d.tag })}>Proclaim {d.name}</button>
            {d.check && <small>{DIPLO_REASON[d.check] ?? d.check}</small>}
          </div>
        </div>
      ))}
      {v.pending.length > 0 && <h3>Waiting for you</h3>}
      {v.pending.map(e => (
        <div class="crow" key={e.id}><span>{e.title}</span><small>{e.daysLeft} days</small><span class="grow" /><button onClick={() => (ui.openEvent.value = e.id)}>Open</button></div>
      ))}
      {v.history.length > 0 && <h3>Recent events</h3>}
      {v.history.map((h, i) => <div class="crow" key={i}><span>{h.title}</span><small>{h.choice} · {h.date}</small></div>)}
    </div>
  );
}
