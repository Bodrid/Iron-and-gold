import { effect } from '@preact/signals';
import { session } from '../game';
import { colourCss, country, fmtMoney, fmtNum, player, ui } from '../store';
import { defaultSend, type Send } from './common';
import { DIPLO_REASON, TREATY_NAMES, relationText } from './diploText';
import { PeaceDeal } from './PeaceDeal';
import { PlayPicker } from './PlayPicker';
import type { TreatyKind } from '../../sim/types';

// Tell the worker which country the panel shows, so it can send what we may do with it.
effect(() => { const id = ui.diploCountry.value; session.game?.host.selectCountry(id); });

const name = (id: number) => country(id)?.name ?? '…';
const reason = (r: string | null | undefined) => (r ? DIPLO_REASON[r] ?? r : null);

export function DiplomacyTab({ send = defaultSend }: { send?: Send }) {
  const d = ui.diplo.value;
  const me = ui.playerId.value;
  const screen = ui.diploScreen.value;
  if (!d) return <p class="hint">Loading…</p>;
  if (screen?.kind === 'play' && ui.countryDetail.value?.id === screen.target) {
    return <PlayPicker me={me} targetName={name(screen.target)} detail={ui.countryDetail.value} send={send} onDone={() => { ui.diploScreen.value = null; ui.diploCountry.value = null; }} />;
  }
  if (screen?.kind === 'peace') {
    const w = d.wars.find(x => x.id === screen.warId);
    if (w) return <PeaceDeal me={me} war={w} enemyName={name(w.enemySide[0])} send={send} onDone={() => (ui.diploScreen.value = null)} />;
  }
  if (ui.diploCountry.value) return <CountryPanel send={send} />;
  return <Overview send={send} />;
}

function Overview({ send }: { send: Send }) {
  const d = ui.diplo.value!;
  const me = ui.playerId.value;
  const list = ui.countries.value.filter(c => c.alive && !c.isPlayer).sort((a, b) => b.gdp - a.gdp);
  return (
    <div class="diplo">
      <div class="kv">
        <div><small>Infamy</small><b class={d.infamy >= 25 ? 'warn' : ''}>{Math.round(d.infamy)}</b></div>
        <div><small>Diplomats</small><b>{d.capacity.used} of {d.capacity.total}</b></div>
        {d.coalitionAgainstMe.length > 0 && <div><small>Coalition against you</small><b class="warn">{d.coalitionAgainstMe.length} countries</b></div>}
      </div>
      {d.treatyOffers.map(o => (
        <div class="row offer" key={`t${o.from}${o.kind}`}>
          <span class="grow">{name(o.from)} proposes: {TREATY_NAMES[o.kind]}</span>
          <button onClick={() => send({ type: 'respondTreaty', country: me, from: o.from, kind: o.kind, accept: true })}>Accept</button>
          <button class="ghost" onClick={() => send({ type: 'respondTreaty', country: me, from: o.from, kind: o.kind, accept: false })}>Refuse</button>
        </div>
      ))}
      {d.peaceOffers.map(o => (
        <div class="row offer" key={`p${o.from}`}>
          <span class="grow">{name(o.from)} offers peace{o.white ? ' (white peace)' : o.give ? `, giving you: ${o.demands.join(', ')}` : `, demanding: ${o.demands.join(', ')}`}</span>
          <button aria-label="Accept peace" onClick={() => send({ type: 'respondPeace', country: me, from: o.from, accept: true })}>Accept</button>
          <button aria-label="Refuse peace" class="ghost" onClick={() => send({ type: 'respondPeace', country: me, from: o.from, accept: false })}>Refuse</button>
        </div>
      ))}
      {d.plays.length > 0 && <h3>Diplomatic plays</h3>}
      {d.plays.map(p => {
        const mine = p.initiator === me || p.target === me;
        const inA = p.sideA.includes(me), inB = p.sideB.includes(me);
        const total = Math.max(1, p.strengthA + p.strengthB);
        return (
          <div class="play-card" key={p.id}>
            <b>{name(p.initiator)} → {name(p.target)}</b> <small>{p.daysLeft} days left · {p.demands.join(', ')}</small>
            <div class="sides"><div class="side-a" style={{ width: `${(100 * p.strengthA) / total}%` }} /></div>
            <small>{p.sideA.map(name).join(', ')} vs {p.sideB.map(name).join(', ')}</small>
            <div class="row">
              {!inA && !inB && <><button onClick={() => send({ type: 'joinPlay', country: me, playId: p.id, side: 'A' })}>Back {name(p.initiator)}</button><button onClick={() => send({ type: 'joinPlay', country: me, playId: p.id, side: 'B' })}>Back {name(p.target)}</button></>}
              {mine && <button class="ghost" onClick={() => send({ type: 'backDown', country: me, playId: p.id })}>{p.target === me ? 'Give in' : 'Back down'}</button>}
              {!mine && (inA || inB) && <button class="ghost" onClick={() => send({ type: 'backDown', country: me, playId: p.id })}>Leave</button>}
            </div>
          </div>
        );
      })}
      {d.wars.length > 0 && <h3>Wars</h3>}
      {d.wars.map(w => (
        <div class="play-card" key={w.id}>
          <b>War with {w.enemySide.map(name).join(', ')}</b> <small>score {Math.round(w.myScore)} vs {Math.round(w.enemyScore)}{w.goals.length ? ` · goals: ${w.goals.join(', ')}` : ''}</small>
          <div class="row">
            {w.leader ? <button class="primary" onClick={() => (ui.diploScreen.value = { kind: 'peace', warId: w.id })}>Make peace…</button>
              : <button onClick={() => send({ type: 'separatePeace', country: me, warId: w.id })}>Separate peace</button>}
          </div>
        </div>
      ))}
      {d.puppets.length > 0 && <h3>Your puppets</h3>}
      {d.puppets.map(p => (
        <div class="row" key={p.id}>
          <span class="grow">{name(p.id)}</span>
          <button disabled={!!p.annex} onClick={() => send({ type: 'annexPuppet', country: me, puppet: p.id })}>Annex</button>
          {p.annex && <small>{reason(p.annex)}</small>}
        </div>
      ))}
      <h3>Countries</h3>
      {list.map(c => {
        const rel = relationText(d.relations[c.id] ?? 0);
        const treaties = d.treaties.filter(t => t.a === c.id || t.b === c.id).map(t => TREATY_NAMES[t.kind]);
        return (
          <button class="crow" key={c.id} onClick={() => { ui.diploCountry.value = c.id; session.game?.flyToState(c.capitalState); }}>
            <span class="flag" style={{ background: colourCss(c.color) }} />
            <span class="grow">{c.name}{c.overlord ? <small> · puppet of {name(c.overlord)}</small> : null}</span>
            {player()?.atWarWith.includes(c.id) && <span class="chip-war">At war</span>}
            <span class={`chip-rel ${rel.cls}`}>{rel.label}</span>
            <small>{treaties.join(', ') || `${fmtMoney(c.gdp)} · ${fmtNum(c.troops)} troops`}</small>
          </button>
        );
      })}
    </div>
  );
}

function CountryPanel({ send }: { send: Send }) {
  const id = ui.diploCountry.value!;
  const d = ui.diplo.value!;
  const det = ui.countryDetail.value?.id === id ? ui.countryDetail.value : null;
  const me = ui.playerId.value;
  const c = country(id);
  if (!c) { ui.diploCountry.value = null; return null; }
  const v = d.relations[id] ?? 0, rel = relationText(v);
  const action = d.actions.find(a => a.to === id);
  const full = d.capacity.used >= d.capacity.total && !action;
  const myTreaties = d.treaties.filter(t => t.a === id || t.b === id);
  const privateering = d.privateers.includes(id);
  return (
    <div class="country-panel">
      <div class="row"><button class="ghost" onClick={() => (ui.diploCountry.value = null)}>‹ All countries</button></div>
      <div class="build-head"><b><span class="flag" style={{ background: colourCss(c.color) }} /> {c.name}</b><small>{fmtMoney(c.gdp)} GDP · {fmtNum(c.troops)} troops · infamy {Math.round(c.infamy)}</small></div>
      <div class="relbar"><div class={rel.cls} style={{ left: `${(v + 100) / 2}%` }} /></div>
      <p class="hint">Relations {v} ({rel.label}){action ? ` · you are ${action.kind === 'improve' ? 'improving' : 'worsening'} them` : ''}</p>
      <div class="row">
        {action ? <button onClick={() => send({ type: 'stopDiploAction', country: me, target: id })}>Stop</button> : <>
          <button disabled={full} onClick={() => send({ type: 'improveRelations', country: me, target: id })}>Improve relations</button>
          <button disabled={full} onClick={() => send({ type: 'worsenRelations', country: me, target: id })}>Worsen</button>
        </>}
        {full && <small>{DIPLO_REASON.noCapacity}</small>}
      </div>
      <h3>Treaties</h3>
      {myTreaties.map(t => (
        <div class="row" key={t.id}><span class="grow">{TREATY_NAMES[t.kind]}</span>{(t.kind !== 'embargo' || t.a === me) && <button class="ghost" onClick={() => send({ type: 'cancelTreaty', country: me, treatyId: t.id })}>Cancel</button>}</div>
      ))}
      {det && (['alliance', 'defensivePact', 'tradeAgreement', 'guarantee', 'embargo'] as TreatyKind[]).filter(k => det.treaty[k] !== 'alreadySigned').map(k => (
        <div class="row" key={k}>
          <button disabled={!!det.treaty[k]} onClick={() => send({ type: 'proposeTreaty', country: me, target: id, kind: k })}>{k === 'embargo' ? 'Embargo' : `Propose ${TREATY_NAMES[k].toLowerCase()}`}</button>
          {det.treaty[k] && <small>{reason(det.treaty[k])}</small>}
        </div>
      ))}
      <h3>Demands</h3>
      {det && <div class="row">
        <button class="war" disabled={!!det.play} onClick={() => (ui.diploScreen.value = { kind: 'play', target: id })}>Start a diplomatic play…</button>
        {det.play && <small>{reason(det.play)}</small>}
      </div>}
      {det && <div class="row">
        <button disabled={!privateering && !!det.privateers} onClick={() => send({ type: 'setPrivateers', country: me, target: id, on: !privateering })}>{privateering ? 'Revoke privateer licences' : 'License privateers'}</button>
        {!privateering && det.privateers && <small>{reason(det.privateers)}</small>}
      </div>}
    </div>
  );
}
