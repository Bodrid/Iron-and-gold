import { session } from '../game';
import { colourCss, fmtMoney, fmtNum, player, ui } from '../store';

export function DiplomacyTab() {
  const me = player();
  const list = ui.countries.value.filter(c => c.alive && !c.isPlayer).sort((a, b) => b.gdp - a.gdp);
  return (
    <div class="diplo">
      <p class="hint">Full diplomacy (relations, treaties, diplomatic plays) arrives in a later update. Tap a country to find it.</p>
      {list.map(c => (
        <button class="crow" key={c.id} onClick={() => session.game?.flyToState(c.capitalState)}>
          <span class="flag" style={{ background: colourCss(c.color) }} />
          <span class="grow">{c.name}</span>
          {me?.atWarWith.includes(c.id) && <span class="chip-war">At war</span>}
          <small>{fmtMoney(c.gdp)} GDP · {fmtNum(c.population)} · {fmtNum(c.troops)} troops</small>
        </button>
      ))}
    </div>
  );
}
