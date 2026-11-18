import { BUILDINGS, BUILDING_TYPES } from '../../content/buildings';
import { GOOD_NAMES } from '../../content/goods';
import type { BuildingDef } from '../../content/buildings';
import { TECH_GATED } from '../../sim/mods';
import { session } from '../game';
import { fmtMoney, ui } from '../store';
import { defaultSend, REASON_TEXT, type Send } from './common';

function effectText(def: BuildingDef): string {
  const io = (r: BuildingDef['inputs']) => Object.entries(r).map(([g, n]) => `${n} ${GOOD_NAMES[g as keyof typeof GOOD_NAMES].toLowerCase()}`).join(' + ');
  if (Object.keys(def.outputs).length) return Object.keys(def.inputs).length ? `${io(def.inputs)} → ${io(def.outputs)} /mo` : `+${io(def.outputs)} /mo`;
  const e = def.effects ?? {};
  if (e.troopRefillPct) return `+${e.troopRefillPct}% troop refill, +${e.maxTroops} troops`;
  if (e.defenseMult) return `Attackers pay ×${e.defenseMult} here`;
  if (e.researchPoints) return `+${e.researchPoints} research /mo, literacy`;
  if (e.stateOutputPct) return `+${e.stateOutputPct}% state output (uses coal)`;
  if (e.taxPct) return `+${e.taxPct}% taxes from this state`;
  if (e.tradeRoutes) return `+${e.tradeRoutes} trade routes`;
  if (e.shipBuilding) return 'Builds warships and transports';
  return '';
}

export function BuildTab({ send = defaultSend }: { send?: Send }) {
  const d = ui.selection.value;
  const me = ui.playerId.value;
  if (!d || d.id !== ui.selectedState.value || d.owner !== me) {
    const known = new Set(ui.politics.value?.research.techs.filter(t => t.status === 'known').map(t => t.id));
    const unlocked = BUILDING_TYPES.filter(t => !TECH_GATED.has(t) || known.has(TECH_GATED.get(t)!));
    return (
    <div class="build">
      <div class="build-head">
        <b>Build anywhere</b>
        <small>Tap to build in your best state for it, or tap a state on the map to choose.</small>
      </div>
      <div class="cards">
        {unlocked.map(type => (
          <button class="bcard" key={type} onClick={() => send({ type: 'build', country: me, building: type })}>
            <span class="bname">{BUILDINGS[type].name}</span>
            <small>{effectText(BUILDINGS[type])}</small>
          </button>
        ))}
      </div>
    </div>
    );
  }
  const level = (t: string) => d.buildings.filter(b => b.type === t).reduce((s, b) => s + b.level, 0);
  // Buildable first, so the useful cards are at the top.
  const options = [...d.buildOptions].sort((a, b) => Number(b.check.ok) - Number(a.check.ok));
  return (
    <div class="build">
      <div class="build-head">
        <b>{d.name}</b> <button class="ghost" onClick={() => session.game?.selectState(null)}>Any state</button>
        <small>{d.slots.used} of {d.slots.total} slots used{d.resources.coal ? ' · coal' : ''}{d.resources.iron ? ' · iron' : ''}{d.coastal ? ' · coast' : ''}</small>
      </div>
      {d.constructions.length > 0 && (
        <ul class="queue">
          {d.constructions.map(c => <li key={c.id}>{BUILDINGS[c.type].name} · {c.daysLeft} days left</li>)}
        </ul>
      )}
      <div class="cards">
        {options.map(({ type, check }) => {
          const def = BUILDINGS[type];
          const lv = level(type);
          return (
            <button class={`bcard ${check.ok ? '' : 'off'}`} key={type} disabled={!check.ok}
              onClick={() => send({ type: 'build', country: me, state: d.id, building: type })}>
              <span class="bname">{def.name}{lv ? <em> ×{lv}</em> : null}</span>
              <small>{effectText(def)}</small>
              <span class={check.ok ? 'cost' : 'reason'}>{check.ok ? fmtMoney(check.cost) : REASON_TEXT[check.reason]}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
