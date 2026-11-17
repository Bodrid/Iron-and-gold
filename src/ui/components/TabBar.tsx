import { ui, type Tab } from '../store';

export const TABS: { id: Tab; label: string }[] = [
  { id: 'build', label: 'Build' }, { id: 'army', label: 'Army' }, { id: 'trade', label: 'Trade' }, { id: 'diplomacy', label: 'Diplomacy' }, { id: 'research', label: 'Research' }, { id: 'nation', label: 'Nation' },
];

/** iPad (docked panel) gets a seventh tab for the power bloc. */
const BLOC_TAB: { id: Tab; label: string } = { id: 'bloc', label: 'Bloc' };

export function TabBar() {
  const tab = ui.tab.value;
  const tabs = ui.layout.value === 'dock' ? [...TABS.slice(0, 4), BLOC_TAB, ...TABS.slice(4)] : TABS;
  return (
    <nav class="tabbar glass" data-ui="tabbar" aria-label="Panels">
      {tabs.map(t => (
        <button class={tab === t.id ? 'on' : ''} aria-pressed={tab === t.id} onClick={() => { ui.tab.value = tab === t.id ? null : t.id; if (ui.tab.value) ui.sheet.value = 'half'; }}>{t.label}</button>
      ))}
    </nav>
  );
}
