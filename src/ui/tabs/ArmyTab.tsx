import { country, fmtNum, player, ui } from '../store';
import { defaultSend, type Send } from './common';

export function ArmyTab({ send = defaultSend }: { send?: Send }) {
  const p = player();
  if (!p) return null;
  const me = p.id;
  const wars = ui.wars.value.filter(w => w.a === me || w.b === me);
  const attacks = ui.attacks.value.filter(a => a.attacker === me);
  const offered = (id: number) => ui.peaceOffers.value.some(o => o.from === me && o.to === id);
  return (
    <div class="army">
      <div class="kv">
        <div><small>Troops</small><b>{fmtNum(p.troops)} / {fmtNum(p.maxTroops)}</b></div>
        <div><small>Arms in stock</small><b class={p.stockpile.arms < 1 ? 'warn' : ''}>{fmtNum(p.stockpile.arms)}</b></div>
        <div><small>Attack size</small><b>{Math.round(ui.attackRatio.value * 100)}% · {fmtNum(p.troops * ui.attackRatio.value)}</b></div>
      </div>
      {p.stockpile.arms < 1 && <p class="hint warn">No arms in stock: troops refill much more slowly. Build an arms factory.</p>}
      {ui.peaceOffers.value.filter(o => o.to === me).map(o => (
        <div class="row offer" key={`offer-${o.from}`}>
          <span class="grow">{country(o.from)?.name} offers peace.</span>
          <button aria-label="Accept peace" onClick={() => send({ type: 'respondPeace', country: me, from: o.from, accept: true })}>Accept</button>
          <button aria-label="Refuse peace" class="ghost" onClick={() => send({ type: 'respondPeace', country: me, from: o.from, accept: false })}>Refuse</button>
        </div>
      ))}
      <h3>Wars</h3>
      {wars.length === 0 && <p class="hint">At peace. Tap a neighbour on the map to declare war.</p>}
      {wars.map(w => {
        const enemy = w.a === me ? w.b : w.a;
        const mine = w.a === me ? w.scoreA : w.scoreB;
        return (
          <div class="row" key={w.id}>
            <span class="grow">{country(enemy)?.name} <small>war score {Math.round(mine)}</small></span>
            <button disabled={offered(enemy)} onClick={() => send({ type: 'offerPeace', country: me, target: enemy })}>{offered(enemy) ? 'Peace offered' : 'Offer peace'}</button>
          </div>
        );
      })}
      <h3>Attacks</h3>
      {attacks.length === 0 && <p class="hint">No attacks under way.</p>}
      {attacks.map(a => (
        <div class="row" key={a.id}>
          <span class="grow">{a.target ? country(a.target)?.name : 'Unclaimed land'} <small>{fmtNum(a.troops)} troops left</small></span>
          <button onClick={() => send({ type: 'cancelAttack', country: me, attackId: a.id })}>Call back</button>
        </div>
      ))}
    </div>
  );
}
