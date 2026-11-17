import { colourCss, country, fmtNum, ui } from '../store';
import { session } from '../game';

export function SelectionCard() {
  const id = ui.selectedState.value;
  const d = ui.selection.value;
  if (!id || !d || d.id !== id || !session.game) return null;
  const me = ui.playerId.value;
  const owner = d.owner ? country(d.owner) : undefined;
  const ctrl = d.controller && d.controller !== d.owner ? country(d.controller) : undefined;
  const mine = d.owner === me;
  const atWar = !!owner && (country(me)?.atWarWith.includes(owner.id) ?? false);
  const confirm = ui.confirmWar.value === d.owner;
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
