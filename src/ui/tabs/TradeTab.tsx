import { GOOD_NAMES } from '../../content/goods';
import { country, fmtMoney, fmtNum, ui } from '../store';
import { defaultSend, type Send } from './common';

export function TradeTab({ send = defaultSend }: { send?: Send }) {
  const t = ui.trade.value;
  const me = ui.playerId.value;
  return (
    <div class="trade">
      <div class="kv">
        <div><small>Routes</small><b>{t.used} of {t.capacity} routes used</b></div>
        <div><small>Trade income last month</small><b>{fmtMoney(t.income)}</b></div>
      </div>
      <label class="toggle">
        <input type="checkbox" checked={t.auto} onChange={e => send({ type: 'setTradeAuto', country: me, on: (e.target as HTMLInputElement).checked })} />
        Automatic trade <small>(open routes for spare goods and shortages)</small>
      </label>
      {t.capacity === 0 && <p class="hint">Build a port to start trading.</p>}
      {t.capacity > 0 && t.routes.length === 0 && <p class="hint">No routes yet. They open on the 1st of the month when you have spare goods, or are short of something another port has.</p>}
      {t.routes.map(r => {
        const out = r.exporter === me;
        const partner = country(out ? r.importer : r.exporter)?.name ?? '…';
        return (
          <div class="row" key={r.id}>
            <span class="grow">{GOOD_NAMES[r.good]} {out ? 'to' : 'from'} {partner} <small>{fmtNum(r.amount)}/mo{r.earns ? ` · +${fmtMoney(r.earns)}` : ''}</small></span>
            <button aria-label={`Cancel ${GOOD_NAMES[r.good]} route`} onClick={() => send({ type: 'cancelTradeRoute', country: me, routeId: r.id })}>Cancel</button>
          </div>
        );
      })}
      <p class="hint">Warships can raid enemy trade ships in wartime, or escort yours: see the Army tab.</p>
    </div>
  );
}
