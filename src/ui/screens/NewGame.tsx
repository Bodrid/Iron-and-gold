import { useMemo, useState } from 'preact/hooks';
import { STARTS } from '../../content/starts';
import { DIFFICULTIES, DIFFICULTY_ORDER, bonusText } from '../../sim/ai/difficulty';
import type { Difficulty, GameSetup } from '../../sim/types';
import { colourCss, fmtNum } from '../store';

const GREAT = new Set(['GBR', 'FRA', 'PRU', 'AUS', 'RUS', 'TUR', 'USA', 'CHI', 'JAP']);
const DIFF_TEXT: Record<Difficulty, string> = {
  easy: 'Slow, obvious choices. Rarely attacks you.',
  normal: 'Builds sensibly and picks fair fights.',
  hard: 'Times its attacks and punishes weakness.',
  veryHard: 'Plays sharply and decides every few days.',
  grandMaster: '',
};

function tier(tag: string, pop: number): string {
  if (GREAT.has(tag)) return 'Great power';
  return pop >= 5e6 ? 'Regional power' : 'Minor';
}

export function NewGame({ onStart, onBack }: { onStart: (s: GameSetup) => void; onBack?: () => void }) {
  const start = STARTS[0];
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');
  const [rivals, setRivals] = useState(false);
  const [query, setQuery] = useState('');
  const [tag, setTag] = useState<string | null>(null);
  const list = useMemo(() => [...start.countries].sort((a, b) => b.population - a.population), [start]);
  const shown = list.filter(c => c.name.toLowerCase().includes(query.trim().toLowerCase()) || c.tag.toLowerCase() === query.trim().toLowerCase());
  const chosen = list.find(c => c.tag === tag);
  return (
    <div class="screen newgame">
      <div class="ng-head">
        {onBack && <button class="ghost" onClick={onBack}>‹ Back</button>}
        <h2>New game</h2>
      </div>
      <section>
        <h3>Start date</h3>
        <div class="choices">
          <button class="choice on" aria-pressed="true">1836 <small>Victorian Era · 100 years</small></button>
          <button class="choice" disabled>1776 <small>Coming in a later update</small></button>
        </div>
      </section>
      <section>
        <h3>Difficulty</h3>
        <div class="choices diff">
          {DIFFICULTY_ORDER.map(d => (
            <button class={`choice ${difficulty === d ? 'on' : ''}`} aria-pressed={difficulty === d} onClick={() => setDifficulty(d)}>
              {DIFFICULTIES[d].label} <small>{d === 'grandMaster' ? `Its best play, plus: ${bonusText(d)}` : DIFF_TEXT[d]}</small>
            </button>
          ))}
        </div>
        <label class="toggle"><input type="checkbox" checked={rivals} onChange={e => setRivals((e.target as HTMLInputElement).checked)} /> Rivals one level harder <small>(countries next to you)</small></label>
      </section>
      <section>
        <h3>Country</h3>
        <input type="search" class="search" placeholder="Search countries" value={query} onInput={e => setQuery((e.target as HTMLInputElement).value)} aria-label="Search countries" />
        <div class="country-list">
          {shown.map(c => (
            <button class={`crow ${tag === c.tag ? 'on' : ''}`} key={c.tag} aria-pressed={tag === c.tag} onClick={() => setTag(c.tag)}>
              <span class="flag" style={{ background: colourCss(c.color) }} />
              <span class="grow">{c.name}</span>
              <small>{tier(c.tag, c.population)} · {fmtNum(c.population)}</small>
            </button>
          ))}
          {!shown.length && <p class="hint">No country matches “{query}”.</p>}
        </div>
      </section>
      <div class="ng-foot">
        <button class="primary" disabled={!chosen} onClick={() => chosen && onStart({ startId: start.id, playerTag: chosen.tag, difficulty, rivalsHarder: rivals, seed: Math.floor(Math.random() * 1e9) })}>
          {chosen ? `Start as ${chosen.name}` : 'Pick a country'}
        </button>
      </div>
    </div>
  );
}
