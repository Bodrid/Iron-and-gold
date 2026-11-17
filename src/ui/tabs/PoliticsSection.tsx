import { describeEffects } from '../../content/effects';
import { GROUPS } from '../../content/groups';
import { LAW_AREAS, LAW_BY_ID } from '../../content/laws';
import { BUILDINGS } from '../../content/buildings';
import { ui } from '../store';
import { defaultSend, type Send } from './common';

const effects = (law: string) => describeEffects(LAW_BY_ID[law].effects, t => BUILDINGS[t].name).join(' · ') || 'No special effects';
const LAW_REASON: Record<string, string> = {
  noSupport: 'Not enough support: the groups with clout are against it', alreadyEnacting: 'Already passing another law', puppet: 'Your overlord decides', alreadyLaw: 'Already the law',
};

export function supportText(s: number): { label: string; cls: string } {
  if (s >= 0.5) return { label: 'Strong support', cls: 'good' };
  if (s >= 0.1) return { label: 'Some support', cls: 'good' };
  if (s > -0.1) return { label: 'Divided', cls: '' };
  if (s >= -0.3) return { label: 'Opposed', cls: 'warn' };
  return { label: 'Strongly opposed', cls: 'warn' };
}

export function moodText(approval: number): { label: string; cls: string } {
  if (approval >= 5) return { label: 'Loyal', cls: 'good' };
  if (approval >= 0) return { label: 'Content', cls: '' };
  if (approval > -5) return { label: 'Unhappy', cls: 'warn' };
  return { label: 'Angry', cls: 'war' };
}

export function PoliticsSection({ send = defaultSend }: { send?: Send }) {
  const p = ui.politics.value;
  const me = ui.playerId.value;
  if (!p) return null;
  const e = p.enacting;
  return (
    <div class="politics">
      <h3>Laws</h3>
      {e && (
        <div class="card enacting">
          <b>Passing: {LAW_BY_ID[e.law].name}</b>
          <small>Month {e.months} · {e.months < e.minMonths ? `can pass after ${e.minMonths} months` : `${Math.round(e.chance * 100)}% chance each month`} · fails after {e.maxMonths} months or if support collapses</small>
          <small class={supportText(e.support).cls}>{supportText(e.support).label}</small>
          <div class="row"><button class="ghost" onClick={() => send({ type: 'cancelEnactment', country: me })}>Cancel</button></div>
        </div>
      )}
      {p.laws.map(a => (
        <details class="law-area" key={a.area}>
          <summary><span>{LAW_AREAS.find(x => x.id === a.area)!.name}</span><b>{LAW_BY_ID[a.current].name}</b></summary>
          <small class="dim">{effects(a.current)}</small>
          {a.options.map(o => {
            const s = supportText(o.support);
            return (
              <div class="law-option" key={o.id}>
                <div><b>{LAW_BY_ID[o.id].name}</b> <small class={s.cls}>{s.label}{o.check ? '' : ` · ~${Math.round(o.chance * 100)}%/month`}</small></div>
                <small>{effects(o.id)}</small>
                <small class="dim">{likes(o.id)}</small>
                <div class="row">
                  <button disabled={!!o.check} onClick={() => send({ type: 'enactLaw', country: me, law: o.id })}>Enact</button>
                  {o.check && <small class="hint">{LAW_REASON[o.check] ?? o.check}</small>}
                </div>
              </div>
            );
          })}
        </details>
      ))}
      <h3>Interest groups</h3>
      <div class="groups">
        {[...p.groups].sort((a, b) => b.clout - a.clout).map(g => {
          const m = moodText(g.approval);
          return (
            <div class="group" key={g.id}>
              <div class="crow">
                <b>{GROUPS[g.id].name}</b><small>{Math.round(g.clout * 100)}% clout</small><span class="grow" /><small class={`mood ${m.cls}`}>{m.label}</small>
              </div>
              <div class="bar"><div style={{ width: `${Math.round(g.clout * 100)}%`, background: `#${GROUPS[g.id].color.toString(16).padStart(6, '0')}` }} /></div>
              {g.radicalism >= 25 && (
                <small class={g.radicalism >= 75 ? 'war' : 'warn'}>
                  Radicalism {Math.round(g.radicalism)}%{g.radicalism >= 75 && g.clout >= 0.1 ? ' — close to revolt!' : g.clout < 0.1 ? ' (too weak to revolt for now)' : ''}{g.wants ? ` · wants ${LAW_BY_ID[g.wants].name}` : ''}
                </small>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function likes(law: string): string {
  const a = LAW_BY_ID[law].attitudes;
  const fans = Object.entries(a).filter(([, v]) => (v ?? 0) > 0).map(([g]) => GROUPS[g as keyof typeof GROUPS].name);
  const foes = Object.entries(a).filter(([, v]) => (v ?? 0) < 0).map(([g]) => GROUPS[g as keyof typeof GROUPS].name);
  return [fans.length ? `Liked by ${fans.join(', ')}` : '', foes.length ? `disliked by ${foes.join(', ')}` : ''].filter(Boolean).join('; ');
}
