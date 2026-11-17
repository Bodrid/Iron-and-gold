import { useState } from 'preact/hooks';
import type { Demand } from '../../sim/types';
import type { DiploView } from '../../worker/protocol';
import type { Send } from './common';

type WarView = DiploView['wars'][number];
const key = (d: Demand) => (d.kind === 'state' ? `s${d.state}` : d.kind);

export function PeaceDeal({ me, war, enemyName, send, onDone }: { me: number; war: WarView; enemyName: string; send: Send; onDone: () => void }) {
  const [picked, setPicked] = useState<string[]>(() => war.candidates.filter(c => c.goal).map(c => key(c.demand)));
  const chosen = war.candidates.filter(c => picked.includes(key(c.demand)));
  const cost = Math.round(chosen.reduce((n, c) => n + c.cost, 0));
  const available = Math.round(war.available);
  const toggle = (k: string) => setPicked(picked.includes(k) ? picked.filter(x => x !== k) : [...picked, k]);
  return (
    <div class="peace-deal">
      <p class="hint">Peace with {enemyName}. War score {Math.round(war.myScore)} against {Math.round(war.enemyScore)}. Your points: the war score plus your own losses. Your war goals cost less; extra demands cost 50% more.</p>
      <div class="choices">
        {war.candidates.map(c => (
          <button class={`choice ${picked.includes(key(c.demand)) ? 'on' : ''}`} aria-pressed={picked.includes(key(c.demand))} key={key(c.demand)} onClick={() => toggle(key(c.demand))}>
            {c.label}<small>{Math.round(c.cost)} points{c.goal ? ' · war goal' : ''}</small>
          </button>
        ))}
      </div>
      <p class={cost > available ? 'hint warn' : 'hint'}>{cost} of {available} points</p>
      <div class="row">
        <button class="ghost" onClick={onDone}>Back</button>
        <button onClick={() => { send({ type: 'proposePeace', country: me, warId: war.id, terms: { demands: [], white: true } }); onDone(); }}>White peace</button>
        <button class="primary" disabled={!chosen.length || cost > available} onClick={() => { send({ type: 'proposePeace', country: me, warId: war.id, terms: { demands: chosen.map(c => c.demand) } }); onDone(); }}>Offer these terms</button>
      </div>
    </div>
  );
}
