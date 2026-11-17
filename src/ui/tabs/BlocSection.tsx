import { signal } from '@preact/signals';
import { BLOC_TYPES, BLOC_TYPE_IDS, PRINCIPLES, PRINCIPLE_IDS, type BlocType, type PrincipleId } from '../../content/blocs';
import { describeEffects } from '../../content/effects';
import { country, fmtMoney, ui } from '../store';
import { defaultSend, type Send } from './common';
import { DIPLO_REASON } from './diploText';

const name = (id: number) => country(id)?.name ?? '…';
const draftType = signal<BlocType>('tradeLeague');
const draftPicks = signal<PrincipleId[]>([]);

function PrincipleLine({ id, leader }: { id: PrincipleId; leader: boolean }) {
  const p = PRINCIPLES[id];
  const fx = describeEffects(leader ? p.leader : p.member).join(' · ');
  return <div class="law-option"><b>{p.name}</b><small>{p.description}</small>{fx && <small class="dim">{leader ? 'You (leader)' : 'You (member)'}: {fx}</small>}</div>;
}

export function BlocSection({ send = defaultSend }: { send?: Send }) {
  const d = ui.diplo.value;
  const me = ui.playerId.value;
  if (!d) return null;
  const b = d.bloc;
  return (
    <div class="bloc">
      <h3>Power bloc</h3>
      {b.invites.map(({ from, type, principles, members }) => (
        <div class="card" key={from}>
          <b>{name(from)} invites you into its {BLOC_TYPES[type].name}</b>
          <small>{members} countries. As a member: {principles.map(p => `${PRINCIPLES[p].name}${describeEffects(PRINCIPLES[p].member).length ? ` (${describeEffects(PRINCIPLES[p].member).join(', ')})` : ''}`).join('; ')}{type === 'empire' ? '. You would pay 5% of your income to the leader.' : '.'}</small>
          <div class="row">
            <button onClick={() => send({ type: 'respondBlocInvite', country: me, from, accept: true })}>Join</button>
            <button class="ghost" onClick={() => send({ type: 'respondBlocInvite', country: me, from, accept: false })}>Refuse</button>
          </div>
        </div>
      ))}
      {b.mine ? <MyBloc send={send} /> : b.found === null ? <details class="law-area"><summary><span>Found a power bloc</span><b>{fmtMoney(b.cost)}</b></summary><FoundForm send={send} /></details> : (
        <p class="hint">{b.found === 'notMajor' ? 'Only major powers can found a power bloc. Smaller countries join one when invited, or ask a bloc leader from their country panel.' : DIPLO_REASON[b.found] ?? b.found}</p>
      )}
      {b.all.length > 0 && (
        <>
          <h3>Blocs of the world</h3>
          {b.all.map(x => <div class="crow" key={x.leader}><span>{name(x.leader)}</span><small>{BLOC_TYPES[x.type].name} · {x.members} countries</small></div>)}
        </>
      )}
    </div>
  );
}

function MyBloc({ send }: { send: Send }) {
  const b = ui.diplo.value!.bloc.mine!;
  const me = ui.playerId.value;
  return (
    <div class="card">
      <b>{BLOC_TYPES[b.type].name} led by {b.isLeader ? 'you' : name(b.leader)}</b>
      <small>{BLOC_TYPES[b.type].description}</small>
      {b.principles.map(p => <PrincipleLine key={p} id={p} leader={b.isLeader} />)}
      <h3>Members</h3>
      {b.members.length === 0 && b.puppets.length === 0 && <p class="hint">{b.isLeader ? 'No members yet: open a country in the Diplomacy tab and invite it.' : ''}</p>}
      {b.members.map(m => (
        <div class="crow" key={m}><span>{name(m)}</span><span class="grow" />{b.isLeader && <button class="ghost" onClick={() => send({ type: 'expelFromBloc', country: me, target: m })}>Expel</button>}</div>
      ))}
      {b.puppets.map(m => <div class="crow" key={m}><span>{name(m)}</span><small>puppet</small></div>)}
      <div class="row">
        <button class="ghost" onClick={() => send({ type: 'leaveBloc', country: me })}>{b.isLeader ? 'Dissolve the bloc' : 'Leave the bloc'}</button>
      </div>
    </div>
  );
}

function FoundForm({ send }: { send: Send }) {
  const b = ui.diplo.value!.bloc;
  const me = ui.playerId.value;
  const type = draftType.value, picks = draftPicks.value;
  const fixed = BLOC_TYPES[type].fixed;
  const ready = picks.length >= 1;
  const toggle = (p: PrincipleId) => {
    draftPicks.value = picks.includes(p) ? picks.filter(x => x !== p) : picks.length < 2 ? [...picks, p] : picks;
  };
  return (
    <div class="card">
      <b>Found a power bloc</b>
      <small>Costs {fmtMoney(b.cost)}. You get each principle’s full effect; members get half, plus your protection.</small>
      <div class="seg" role="radiogroup" aria-label="Bloc type">
        {BLOC_TYPE_IDS.map(t => <button role="radio" aria-checked={type === t} class={type === t ? 'on' : ''} onClick={() => { draftType.value = t; draftPicks.value = picks.filter(p => p !== BLOC_TYPES[t].fixed); }}>{BLOC_TYPES[t].name}</button>)}
      </div>
      <small>Always: <b>{PRINCIPLES[fixed].name}</b>. Pick one or two more:</small>
      <div class="principles">
        {PRINCIPLE_IDS.filter(p => p !== fixed).map(p => (
          <button key={p} class={picks.includes(p) ? 'on' : ''} aria-pressed={picks.includes(p)} disabled={!picks.includes(p) && picks.length >= 2} onClick={() => toggle(p)}>
            <b>{PRINCIPLES[p].name}</b><small>{PRINCIPLES[p].description}</small>
          </button>
        ))}
      </div>
      <div class="row"><button disabled={!ready} onClick={() => send({ type: 'foundBloc', country: me, blocType: type, principles: picks })}>Found the {BLOC_TYPES[type].name}</button>{!ready && <small>Pick at least one more principle</small>}</div>
    </div>
  );
}
