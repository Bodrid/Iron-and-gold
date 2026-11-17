import { useEffect } from 'preact/hooks';
import { ui } from './store';
import { GameScreen } from './GameScreen';
import { startNewGame } from './boot';
import './styles.css';

export function App() {
  useEffect(() => {
    const q = new URLSearchParams(location.search).get('quickstart');
    if (q) void startNewGame({ startId: '1836', playerTag: q.toUpperCase(), difficulty: 'normal', rivalsHarder: false, seed: Date.now() % 100000 });
  }, []);
  const s = ui.screen.value;
  if (s === 'game') return <GameScreen />;
  if (s === 'loading') return <div class="screen loading"><div class="spinner" /><p>{ui.loadingText.value}</p></div>;
  return (
    <div class="screen boot">
      <h1>Iron &amp; Gold</h1>
      {ui.error.value && <p class="error">{ui.error.value}</p>}
    </div>
  );
}
