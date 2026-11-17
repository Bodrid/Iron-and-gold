import { session } from '../game';
import { fmtMoney, fmtNum, player, ui } from '../store';

/** Leaves the game for the menu, saving first (unless the player has been defeated) so Continue resumes here. */
export async function backToMenu(): Promise<void> {
  const g = session.game;
  if (g && ui.outcome.value?.kind !== 'defeat') {
    const timeout = new Promise<void>(res => setTimeout(res, 4000));
    await Promise.race([g.host.save('background').catch(() => {}), timeout]);
  }
  g?.destroy();
  if (session.game === g) session.game = null;
  ui.screen.value = 'menu';
}

export function ScoreScreen() {
  const o = ui.outcome.value;
  if (!o || ui.outcomeDismissed.value) return null;
  const me = ui.playerId.value;
  const p = player();
  const rank = o.scores.findIndex(r => r.country === me) + 1;
  if (o.kind === 'defeat') {
    return (
      <div class="overlay" role="dialog" aria-label="Defeat">
        <div class="overlay-box glass">
          <h2>{p?.name ?? 'Your country'} has fallen</h2>
          <p class="hint">Your last state was lost. The world goes on without you.</p>
          <button class="primary" onClick={backToMenu}>Main menu</button>
        </div>
      </div>
    );
  }
  const headline = o.kind === 'victory' ? 'Victory! Half the world is yours.' : `The century is over. You finished #${rank}.`;
  return (
    <div class="overlay" role="dialog" aria-label="Final score">
      <div class="overlay-box glass">
        <h2>{headline}</h2>
        <table class="goods scores">
          <thead><tr><th>#</th><th>Country</th><th>Score</th><th>GDP</th><th>Pop</th><th>SoL</th></tr></thead>
          <tbody>
            {o.scores.slice(0, 10).map((r, i) => (
              <tr class={r.country === me ? 'me' : ''} key={r.country}><td>{i + 1}</td><td>{r.name}</td><td>{r.score.toFixed(1)}</td><td>{fmtMoney(r.gdp)}</td><td>{fmtNum(r.population)}</td><td>{r.sol.toFixed(1)}</td></tr>
            ))}
            {rank > 10 && <tr class="me"><td>{rank}</td><td>{p?.name}</td><td colSpan={4}>…</td></tr>}
          </tbody>
        </table>
        <div class="row">
          <button onClick={() => (ui.outcomeDismissed.value = true)}>Keep watching</button>
          <button class="primary" onClick={backToMenu}>Main menu</button>
        </div>
      </div>
    </div>
  );
}
