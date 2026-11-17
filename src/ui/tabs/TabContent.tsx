import type { Tab } from '../store';

export function TabContent({ tab }: { tab: Tab }) {
  return <p class="dim">{tab}</p>;
}
