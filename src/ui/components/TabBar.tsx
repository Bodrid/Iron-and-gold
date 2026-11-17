import { ui, type Tab } from '../store';

export const TABS: { id: Tab; label: string }[] = [
  { id: 'build', label: 'Build' }, { id: 'army', label: 'Army' }, { id: 'trade', label: 'Trade' }, { id: 'diplomacy', label: 'Diplomacy' }, { id: 'nation', label: 'Nation' },
];

export function TabBar() {
  const tab = ui.tab.value;
  return (
    <nav class="tabbar glass" data-ui="tabbar" aria-label="Panels">
      {TABS.map(t => (
        <button class={tab === t.id ? 'on' : ''} aria-pressed={tab === t.id} onClick={() => { ui.tab.value = tab === t.id ? null : t.id; if (ui.tab.value) ui.sheet.value = 'half'; }}>{t.label}</button>
      ))}
    </nav>
  );
}
