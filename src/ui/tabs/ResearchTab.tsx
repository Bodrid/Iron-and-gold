import { BUILDINGS } from '../../content/buildings';
import { describeEffects } from '../../content/effects';
import { ERAS, TECH_BY_ID, TREES, type TechTree } from '../../content/techs';
import type { PoliticsView } from '../../worker/protocol';
import { fmtNum, ui } from '../store';
import { BALANCE } from '../../sim/balance';
import { defaultSend, type Send } from './common';

const effectsText = (id: string) => describeEffects(TECH_BY_ID[id].effects, t => BUILDINGS[t].name).join(' · ');
const STATUS: Record<PoliticsView['research']['techs'][number]['status'], string> = {
  known: 'Known', researching: 'Researching', queued: 'Queued', available: 'Available', locked: 'Locked',
};

export function ResearchTab({ send = defaultSend }: { send?: Send }) {
  const p = ui.politics.value;
  const me = ui.playerId.value;
  if (!p) return <p class="hint">Loading…</p>;
  const r = p.research;
  const tree = ui.techTree.value;
  const months = r.researching && r.rate > 0 ? Math.max(0, Math.ceil((r.cost - r.points) / r.rate)) : null;
  const byId = new Map(r.techs.map(t => [t.id, t]));
  const full = r.queue.length >= BALANCE.research.MAX_QUEUE;
  return (
    <div class="research">
      <div class="card current-tech">
        {r.researching ? (
          <>
            <b>{TECH_BY_ID[r.researching].name}</b>
            <div class="bar" role="progressbar" aria-valuemin={0} aria-valuemax={r.cost} aria-valuenow={Math.min(r.cost, r.points)}><div style={{ width: `${Math.min(100, (100 * r.points) / Math.max(1, r.cost))}%` }} /></div>
            <small>{fmtNum(Math.min(r.points, r.cost))} of {fmtNum(r.cost)} points · +{r.rate.toFixed(1)}/month{months !== null ? ` · about ${months} month${months === 1 ? '' : 's'}` : ''}</small>
            <small>{effectsText(r.researching)}</small>
            <div class="row"><button class="ghost" onClick={() => send({ type: 'unqueueTech', country: me, tech: r.researching! })}>Stop</button></div>
          </>
        ) : (
          <p class="hint">Nothing is being researched. {r.rate > 0 ? `Points still bank up (+${r.rate.toFixed(1)}/month, ${fmtNum(r.points)} saved).` : 'Universities and literacy earn research points.'} Pick a tech below.</p>
        )}
      </div>
      {r.queue.length > 0 && (
        <div class="queue">
          <h3>Next up</h3>
          {r.queue.map(id => (
            <div class="crow" key={id}>
              <span>{TECH_BY_ID[id].name}</span><small>{fmtNum(byId.get(id)?.cost ?? 0)} pts</small>
              <span class="grow" />
              {TECH_BY_ID[id].requires.every(q => byId.get(q)?.status === 'known')
                ? <button onClick={() => send({ type: 'research', country: me, tech: id })}>Now</button>
                : !TECH_BY_ID[id].requires.every(q => ['known', 'researching', 'queued'].includes(byId.get(q)?.status ?? '')) && <small class="warn">needs {TECH_BY_ID[id].requires.filter(q => byId.get(q)?.status !== 'known').map(q => TECH_BY_ID[q].name).join(', ')}</small>}
              <button class="ghost" aria-label={`Remove ${TECH_BY_ID[id].name}`} onClick={() => send({ type: 'unqueueTech', country: me, tech: id })}>✕</button>
            </div>
          ))}
        </div>
      )}
      <div class="seg" role="tablist" aria-label="Research trees">
        {TREES.map(t => <button role="tab" aria-selected={tree === t.id} class={tree === t.id ? 'on' : ''} onClick={() => (ui.techTree.value = t.id as TechTree)}>{t.name}</button>)}
      </div>
      {ERAS.map(era => (
        <div class="era" key={era.era}>
          <h3>{era.name} <small>from {era.from}</small></h3>
          <div class="techs">
            {r.techs.filter(t => TECH_BY_ID[t.id].tree === tree && TECH_BY_ID[t.id].era === era.era).map(t => {
              const def = TECH_BY_ID[t.id];
              const missing = def.requires.filter(q => byId.get(q)?.status !== 'known').map(q => TECH_BY_ID[q].name);
              const plannable = t.status === 'locked' && def.requires.every(q => ['known', 'researching', 'queued'].includes(byId.get(q)?.status ?? ''));
              return (
                <div class={`tech ${t.status}`} key={t.id} data-tech={t.id}>
                  <b>{def.name}</b>
                  <small class="status">{STATUS[t.status]}{t.status !== 'known' ? ` · ${fmtNum(t.cost)} pts` : ''}</small>
                  <small>{effectsText(t.id)}</small>
                  {t.status === 'locked' && <small class="dim">Needs {missing.join(', ')}</small>}
                  {t.status === 'available' && (
                    <div class="row">
                      <button onClick={() => send({ type: 'research', country: me, tech: t.id })}>Research</button>
                      {r.researching && !full && <button class="ghost" onClick={() => send({ type: 'queueTech', country: me, tech: t.id })}>Queue</button>}
                    </div>
                  )}
                  {plannable && !full && <div class="row"><button class="ghost" onClick={() => send({ type: 'queueTech', country: me, tech: t.id })}>Queue</button></div>}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
