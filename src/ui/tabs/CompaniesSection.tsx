import { BUILDINGS } from '../../content/buildings';
import { CHARTERS, COMPANY_BY_ID, type CharterKind } from '../../content/companies';
import { fmtMoney, ui } from '../store';
import { BALANCE } from '../../sim/balance';
import { defaultSend, type Send } from './common';
import { DIPLO_REASON } from './diploText';

const K = BALANCE.companies;

const buildings = (id: string) => COMPANY_BY_ID[id].buildings.map(b => BUILDINGS[b].name).join(' and ');
const KINDS: CharterKind[] = ['colonial', 'monopoly', 'investment'];

export function CompaniesSection({ send = defaultSend }: { send?: Send }) {
  const p = ui.politics.value;
  const me = ui.playerId.value;
  if (!p) return null;
  const k = p.companies;
  return (
    <div class="companies">
      <h3>Companies <small class="dim">{k.mine.length} of {k.limit}</small></h3>
      {k.mine.map(c => (
        <div class="card" key={c.id}>
          <b>{COMPANY_BY_ID[c.id].name}</b>
          <small>+{c.bonus}% {buildings(c.id)} output{c.charter === 'monopoly' ? ` (+${K.MONOPOLY_PCT}% monopoly)` : ` · +${K.TRADE_PCT}% trade income`} — grows with every {K.LEVELS_PER_STEP} levels you own, up to +{K.BONUS_CAP}%.</small>
          {c.charter ? (
            <div class="row"><small>{CHARTERS[c.charter].name}: {CHARTERS[c.charter].description}</small><button class="ghost" onClick={() => send({ type: 'revokeCharter', country: me, company: c.id })}>Revoke</button></div>
          ) : KINDS.map(x => (
            <div class="row" key={x}>
              <button disabled={!!c.charters[x]} onClick={() => send({ type: 'grantCharter', country: me, company: c.id, charter: x })}>{CHARTERS[x].name}</button>
              <small>{c.charters[x] ? DIPLO_REASON[c.charters[x]!] ?? c.charters[x] : CHARTERS[x].description}</small>
            </div>
          ))}
        </div>
      ))}
      <details class="law-area">
        <summary><span>Found a company</span><b>{fmtMoney(k.cost)}</b></summary>
        {k.available.map(a => (
          <div class="law-option" key={a.id}>
            <b>{COMPANY_BY_ID[a.id].name}{COMPANY_BY_ID[a.id].tag ? ' (historical)' : ''}</b>
            <small>{COMPANY_BY_ID[a.id].description} Boosts {buildings(a.id)}.</small>
            <div class="row">
              <button disabled={!!a.check} onClick={() => send({ type: 'foundCompany', country: me, company: a.id })}>Found</button>
              {a.check && <small class="hint">{DIPLO_REASON[a.check] ?? a.check}</small>}
            </div>
          </div>
        ))}
      </details>
    </div>
  );
}
