import { useEffect, useRef } from 'preact/hooks';
import { session } from './game';
import { ui } from './store';
import { TopBar } from './components/TopBar';
import { TabBar, TABS } from './components/TabBar';
import { Sheet } from './components/Sheet';
import { Dock } from './components/Dock';
import { AttackSlider } from './components/AttackSlider';
import { SelectionCard } from './components/SelectionCard';
import { Toasts } from './components/Toasts';
import { RotatePrompt } from './components/RotatePrompt';
import { TabContent } from './tabs/TabContent';

export function GameScreen() {
  const mapRef = useRef<HTMLDivElement>(null);
  useEffect(() => { if (mapRef.current && session.game) session.game.mount(mapRef.current); }, []);
  const layout = ui.layout.value;
  const tab = ui.tab.value;
  const title = TABS.find(t => t.id === tab)?.label ?? '';
  const Panel = layout === 'dock' ? Dock : Sheet;
  return (
    <div class={`app layout-${layout === 'rotate' ? 'phone' : layout} ${tab ? 'panel-open' : ''}`}>
      <div class="map" ref={mapRef} />
      <TopBar />
      <AttackSlider />
      <SelectionCard />
      {tab && <Panel title={title}><TabContent tab={tab} /></Panel>}
      <TabBar />
      <Toasts />
      {layout === 'rotate' && <RotatePrompt />}
    </div>
  );
}
