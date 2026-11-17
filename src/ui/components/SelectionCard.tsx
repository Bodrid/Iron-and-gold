import { colourCss, country, fmtNum, ui } from '../store';
import { session } from '../game';

export function SelectionCard() {
  const id = ui.selectedState.value;
  const d = ui.selection.value;
  if (!id && ui.selectedSea.value !== null && session.game) return <SeaCard />;
  if (!id || !d || d.id !== id || !session.game) return null;
  const me = ui.playerId.value;
  const owner = d.owner ? country(d.owner) : undefined;
  const ctrl = d.controller && d.controller !== d.owner ? country(d.controller) : undefined;
  const mine = d.owner === me;
  const atWar = !!owner && (country(me)?.atWarWith.includes(owner.id) ?? false);
  const confirm = ui.confirmWar.value === d.owner;
  const tile = ui.selectedTile.value;
  const beach = tile !== null && d.coastal && !mine && (!d.owner || atWar) && ui.trade.value.capacity > 0 ? session.game.beachNear(tile, d.id, d.owner) : -1;
  const boatable = beach >= 0;
  return (
    <div class="selection glass" data-ui="selection">
      <div class="sel-head">
        <span class="flag" style={{ background: owner ? colourCss(owner.color) : '#9aa' }} />
        <div>
          <b>{d.name}</b>
          <small>{owner ? owner.name : 'Unclaimed land'}{ctrl ? ` · occupied by ${ctrl.name}` : ''} · {fmtNum(d.population)} people</small>
        </div>
      </div>
      <div class="sel-actions">
        {mine && <button onClick={() => { ui.tab.value = 'build'; ui.sheet.value = 'half'; }}>Build here</button>}
        {!d.owner && <button class="war" onClick={() => session.game!.attack(0)}>Attack</button>}
        {boatable && <button onClick={() => session.game!.send({ type: 'navalInvasion', country: me, target: d.owner, tile: beach, ratio: ui.attackRatio.value })}>Send boat</button>}
        {owner && !mine && atWar && <button class="war" onClick={() => session.game!.attack(owner.id)}>Attack</button>}
        {owner && !mine && !atWar && !confirm && <button onClick={() => (ui.confirmWar.value = owner.id)}>Declare war</button>}
        {owner && !mine && !atWar && confirm && (
          <>
            <button class="war" onClick={() => { session.game!.send({ type: 'declareWar', country: me, target: owner.id }); ui.confirmWar.value = null; }}>Yes, declare war on {owner.name}</button>
            <button class="ghost" onClick={() => (ui.confirmWar.value = null)}>Cancel</button>
          </>
        )}
        <button class="ghost" aria-label="Close" onClick={() => session.game!.selectState(null)}>✕</button>
      </div>
    </div>
  );
}

function SeaCard() {
  const ships = ui.fleet.value.ships.length;
  return (
    <div class="selection glass" data-ui="selection">
      <div class="sel-head"><div><b>Open sea</b><small>{ships ? 'Send your ships here from the Army tab.' : 'Build a shipyard to make warships.'}</small></div></div>
      <div class="sel-actions">
        {ships > 0 && <button onClick={() => { ui.tab.value = 'army'; ui.sheet.value = 'half'; }}>Ships</button>}
        <button class="ghost" aria-label="Close" onClick={() => { ui.selectedSea.value = null; session.game!.selectState(null); }}>✕</button>
      </div>
    </div>
  );
}
