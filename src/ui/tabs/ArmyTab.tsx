import { country, fmtMoney, fmtNum, player, ui } from '../store';
import { SHIPS } from '../../content/ships';
import type { ShipOrder } from '../../sim/types';
import { defaultSend, type Send } from './common';

export function ArmyTab({ send = defaultSend }: { send?: Send }) {
  const p = player();
  if (!p) return null;
  const me = p.id;
  const wars = ui.wars.value.filter(w => w.a === me || w.b === me);  // leaders negotiate; members see wars on the map
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
      <NavySection send={send} />
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

function NavySection({ send }: { send: Send }) {
  const me = ui.playerId.value;
  const fleet = ui.fleet.value;
  const sea = ui.selectedSea.value;
  const sel = ui.selection.value;
  const yard = sel && sel.owner === me && sel.buildings.some(b => b.type === 'shipyard') ? sel : null;
  const route = ui.trade.value.routes[0];
  const order = (shipId: number, o: ShipOrder) => send({ type: 'orderShip', country: me, shipId, order: o });
  return (
    <>
      <h3>Navy</h3>
      {yard ? (
        <div class="row">
          <button onClick={() => send({ type: 'buildShip', country: me, state: yard.id, kind: 'warship' })}>Build warship · {fmtMoney(SHIPS.warship.cost)}</button>
          <button onClick={() => send({ type: 'buildShip', country: me, state: yard.id, kind: 'transport' })}>Build transport · {fmtMoney(SHIPS.transport.cost)}</button>
        </div>
      ) : <p class="hint">To build ships, select one of your states with a shipyard.</p>}
      {fleet.builds.map((b, i) => <p class="hint" key={`b${i}`}>{b.kind === 'warship' ? 'Warship' : 'Transport'} · {b.daysLeft} days left</p>)}
      {fleet.ships.length === 0 && <p class="hint">No ships yet.</p>}
      {fleet.ships.length > 0 && sea === null && <p class="hint">Tap the sea on the map to send ships there.</p>}
      {fleet.ships.map(s => (
        <div class="row ship" key={s.id}>
          <span class="grow">{s.kind === 'warship' ? 'Warship' : 'Transport'} <small>{s.order}{s.troops ? ` · ${fmtNum(s.troops)} troops` : ''}</small></span>
          {sea !== null && s.kind === 'warship' && <button onClick={() => order(s.id, { type: 'raid', cell: sea })}>Raid here</button>}
          {sea !== null && <button onClick={() => order(s.id, { type: 'patrol', cell: sea })}>Patrol here</button>}
          {s.kind === 'warship' && route && <button onClick={() => order(s.id, { type: 'escort', routeId: route.id })}>Escort trade</button>}
          {s.order !== 'In port' && <button onClick={() => order(s.id, { type: 'return' })}>Return to port</button>}
        </div>
      ))}
    </>
  );
}
