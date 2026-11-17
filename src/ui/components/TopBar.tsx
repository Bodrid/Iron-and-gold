import { colourCss, fmtMoney, fmtNum, player, ui } from '../store';
import { session } from '../game';

const SPEEDS: { s: 0 | 1 | 2 | 3; label: string; text: string }[] = [
  { s: 0, label: 'Pause', text: '❚❚' }, { s: 1, label: 'Speed 1', text: '1' }, { s: 2, label: 'Speed 2', text: '2' }, { s: 3, label: 'Speed 3', text: '3' },
];

export function TopBar() {
  const p = player();
  const speed = ui.speed.value;
  return (
    <header class="topbar" data-ui="topbar">
      <div class="chip glass nation">
        <span class="flag" style={{ background: p ? colourCss(p.color) : '#888' }} />
        <span class="nation-name">{p?.name ?? ''}</span>
      </div>
      <div class="chip glass clock">
        <span class="date" data-ui="date">{ui.date.value}</span>
        <div class="speeds" role="group" aria-label="Game speed">
          {SPEEDS.map(x => (
            <button class={`speed ${speed === x.s ? 'on' : ''}`} aria-label={x.label} aria-pressed={speed === x.s} onClick={() => session.game?.setSpeed(x.s)}>{x.text}</button>
          ))}
        </div>
      </div>
      {p && (
        <div class="chip glass stats">
          <Stat value={fmtMoney(p.money)} sub={`${p.income >= 0 ? '+' : ''}${fmtMoney(p.income)}/mo`} label="Treasury" good={p.income >= 0} />
          <Stat value={fmtMoney(p.gdp)} label="GDP" />
          <Stat value={fmtNum(p.population)} label="Pop" />
          <Stat value={p.sol.toFixed(1)} label="SoL" />
        </div>
      )}
    </header>
  );
}

function Stat({ value, label, sub, good }: { value: string; label: string; sub?: string; good?: boolean }) {
  return (
    <div class="stat">
      <b>{value}{sub && <span class={good ? 'up' : 'down'}> {sub}</span>}</b>
      <small>{label}</small>
    </div>
  );
}
