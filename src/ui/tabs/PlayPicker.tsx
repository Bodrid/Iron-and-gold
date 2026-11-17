import { useState } from 'preact/hooks';
import { DEMAND_INFAMY, DEMAND_NAMES } from '../../content/diplomacy';
import type { Demand } from '../../sim/types';
import type { CountryDetail } from '../../worker/protocol';
import { fmtNum, ui } from '../store';
import type { Send } from './common';
import { DIPLO_REASON } from './diploText';

const key = (d: Demand) => (d.kind === 'state' ? `s${d.state}` : d.kind);

export function PlayPicker({ me, targetName, detail, send, onDone }: { me: number; targetName: string; detail: CountryDetail; send: Send; onDone: () => void }) {
  const [picked, setPicked] = useState<Demand[]>([]);
  if (detail.play) return <p class="hint warn">{DIPLO_REASON[detail.play] ?? detail.play}</p>;
  const has = (d: Demand) => picked.some(p => key(p) === key(d));
  const toggle = (d: Demand) => setPicked(has(d) ? picked.filter(p => key(p) !== key(d)) : picked.length < 3 ? [...picked, d] : picked);
  const infamy = picked.reduce((n, d) => n + DEMAND_INFAMY[d.kind], 0);
  const option = (d: Demand, label: string, sub?: string) => (
    <button class={`choice ${has(d) ? 'on' : ''}`} aria-pressed={has(d)} disabled={!has(d) && picked.length >= 3} onClick={() => toggle(d)}>
      {label}{sub && <small>{sub}</small>}
    </button>
  );
  return (
    <div class="play-picker">
      <p class="hint">Demand up to three things from {targetName}. For 60 days other countries pick sides; then they give in or it's war.</p>
      <div class="choices">
        {detail.states.slice(0, 12).map(s => option({ kind: 'state', state: s.id }, `Take ${s.name}`, `${fmtNum(s.population)} people`))}
        {option({ kind: 'puppet' }, DEMAND_NAMES.puppet)}
        {option({ kind: 'openMarket' }, DEMAND_NAMES.openMarket)}
        {option({ kind: 'reparations' }, DEMAND_NAMES.reparations)}
        {ui.diplo.value?.bloc.mine?.isLeader && !detail.theirBloc && option({ kind: 'joinBloc' }, DEMAND_NAMES.joinBloc)}
      </div>
      <p class="hint">Infamy +{Math.round(infamy / 2)} when the play starts, +{infamy} more if you win.</p>
      <div class="row">
        <button class="ghost" onClick={onDone}>Cancel</button>
        <button class="war" disabled={!picked.length} onClick={() => { send({ type: 'startPlay', country: me, target: detail.id, demands: picked }); onDone(); }}>Start the play</button>
      </div>
    </div>
  );
}
