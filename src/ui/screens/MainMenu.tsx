import { useEffect, useState } from 'preact/hooks';
import { listSaves, type SaveMeta } from '../../save/saves';
import { continueGame } from '../boot';
import { ui } from '../store';

export function MainMenu() {
  const [saves, setSaves] = useState<SaveMeta[]>([]);
  const [showLoad, setShowLoad] = useState(false);
  useEffect(() => { listSaves().then(setSaves).catch(() => setSaves([])); }, []);
  const newest = saves[0];
  return (
    <div class="screen menu">
      <div class="menu-box">
        <h1>Iron &amp; Gold</h1>
        <p class="tag">Build an empire, 1836–1936.</p>
        {ui.error.value && <p class="error">{ui.error.value}</p>}
        {newest && <button class="primary big" onClick={() => continueGame(newest.slot)}>Continue <small>{newest.countryName} · {newest.date}</small></button>}
        <button class={newest ? 'big' : 'primary big'} onClick={() => (ui.screen.value = 'newGame')}>New game</button>
        {saves.length > 0 && <button class="big" onClick={() => setShowLoad(!showLoad)}>Load</button>}
        {showLoad && (
          <div class="saves">
            {saves.map(s => (
              <button class="crow" key={s.slot} onClick={() => continueGame(s.slot)}>
                <span class="grow">{s.slot === 'auto' ? 'Autosave' : s.slot === 'background' ? 'Last session' : `Slot ${s.slot}`}</span>
                <small>{s.countryName} · {s.date} · {s.difficultyLabel}</small>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
