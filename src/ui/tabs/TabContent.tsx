import type { Tab } from '../store';
import { ArmyTab } from './ArmyTab';
import { BuildTab } from './BuildTab';
import { DiplomacyTab } from './DiplomacyTab';
import { NationTab } from './NationTab';
import { ResearchTab } from './ResearchTab';
import { PoliticsSection } from './PoliticsSection';
import { TradeTab } from './TradeTab';
import { backToMenu } from '../screens/ScoreScreen';
import { session } from '../game';
import { pushToast } from '../store';

export function TabContent({ tab }: { tab: Tab }) {
  if (tab === 'build') return <BuildTab />;
  if (tab === 'army') return <ArmyTab />;
  if (tab === 'trade') return <TradeTab />;
  if (tab === 'diplomacy') return <DiplomacyTab />;
  if (tab === 'research') return <ResearchTab />;
  return <NationTab extra={<><PoliticsSection /><SaveRow /></>} />;
}

function SaveRow() {
  const save = async (slot: '1' | '2' | '3') => {
    try { await session.game?.host.save(slot); pushToast({ kind: 'good', text: `Saved to slot ${slot}.` }); }
    catch (err) { pushToast({ kind: 'war', text: `Couldn't save: ${err instanceof Error ? err.message : String(err)}` }); }
  };
  return (
    <div class="row nation-actions">
      <button onClick={() => save('1')}>Save 1</button>
      <button onClick={() => save('2')}>Save 2</button>
      <button onClick={() => save('3')}>Save 3</button>
      <span class="grow" />
      <button onClick={backToMenu}>Main menu</button>
    </div>
  );
}
