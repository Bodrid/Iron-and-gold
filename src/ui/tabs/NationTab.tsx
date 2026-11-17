import { GOODS, GOOD_NAMES } from '../../content/goods';
import { BALANCE } from '../../sim/balance';
import type { CountrySummary } from '../../worker/protocol';
import { fmtMoney, fmtNum, player, ui } from '../store';

export function rankOf(countries: CountrySummary[], id: number): number {
  const alive = countries.filter(c => c.alive);
  const max = (f: (c: CountrySummary) => number) => Math.max(1e-9, ...alive.map(f));
  const [g, p, s, t] = [max(c => c.gdp), max(c => c.population), max(c => c.sol), max(c => c.tiles)];
  const W = BALANCE.score;
  const score = (c: CountrySummary) => W.GDP * (c.gdp / g) + W.POPULATION * (c.population / p) + W.SOL * (c.sol / s) + W.LAND * (c.tiles / t);
  const sorted = [...alive].sort((a, b) => score(b) - score(a));
  return sorted.findIndex(c => c.id === id) + 1;
}

function Spark({ values, label, fmt }: { values: number[]; label: string; fmt: (n: number) => string }) {
  const w = 140, h = 36;
  if (values.length < 2) return <div class="spark"><small>{label}</small><b>{fmt(values[0] ?? 0)}</b></div>;
  const lo = Math.min(...values), hi = Math.max(...values), span = hi - lo || 1;
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * w},${h - 3 - ((v - lo) / span) * (h - 6)}`).join(' ');
  return (
    <div class="spark">
      <small>{label}</small><b>{fmt(values[values.length - 1])}</b>
      <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} aria-hidden="true">
        <polyline points={`0,${h} ${pts} ${w},${h}`} fill="rgba(229,181,74,0.15)" stroke="none" />
        <polyline points={pts} fill="none" stroke="#e5b54a" stroke-width="1.5" />
      </svg>
    </div>
  );
}

export function NationTab({ extra }: { extra?: preact.ComponentChildren }) {
  const p = player();
  if (!p) return null;
  const h = p.history;
  return (
    <div class="nation">
      <div class="sparks">
        <Spark label="GDP" values={h.map(x => x.gdp)} fmt={fmtMoney} />
        <Spark label="Population" values={h.map(x => x.population)} fmt={fmtNum} />
        <Spark label="Standard of living" values={h.map(x => x.sol)} fmt={n => n.toFixed(1)} />
      </div>
      <div class="kv">
        <div><small>World rank</small><b>#{rankOf(ui.countries.value, p.id)}</b></div>
        <div><small>Treasury</small><b>{fmtMoney(p.money)}</b></div>
        <div><small>Income</small><b class={p.income < 0 ? 'warn' : ''}>{fmtMoney(p.income)}/mo</b></div>
        <div><small>Literacy</small><b>{Math.round(p.literacy * 100)}%</b></div>
        <div><small>Research</small><b>+{p.researchRate.toFixed(1)}/mo</b><small>Research tab</small></div>
        <div><small>Land</small><b>{fmtNum(p.tiles)} tiles</b></div>
      </div>
      <h3>Stockpile</h3>
      <table class="goods">
        <thead><tr><th>Good</th><th>Stock</th><th>Made /mo</th><th>Wanted /mo</th><th>Price</th></tr></thead>
        <tbody>
          {GOODS.map(g => (
            <tr key={g}><td>{GOOD_NAMES[g]}</td><td>{fmtNum(p.stockpile[g])}</td><td>{fmtNum(p.produced[g])}</td><td>{fmtNum(p.demanded[g])}</td><td>£{p.prices[g].toFixed(0)}</td></tr>
          ))}
        </tbody>
      </table>
      {extra}
    </div>
  );
}
