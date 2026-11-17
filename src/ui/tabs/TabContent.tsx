import type { Tab } from '../store';
import { ArmyTab } from './ArmyTab';
import { BuildTab } from './BuildTab';
import { DiplomacyTab } from './DiplomacyTab';
import { NationTab } from './NationTab';
import { backToMenu } from '../screens/ScoreScreen';

export function TabContent({ tab }: { tab: Tab }) {
  if (tab === 'build') return <BuildTab />;
  if (tab === 'army') return <ArmyTab />;
  if (tab === 'diplomacy') return <DiplomacyTab />;
  return <NationTab extra={<div class="row nation-actions"><button onClick={backToMenu}>Main menu</button></div>} />;
}
