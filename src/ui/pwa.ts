// Service worker registration: new versions download in the background and install when you are on the menu.
import { effect } from '@preact/signals';
import { registerSW } from 'virtual:pwa-register';
import { ui } from './store';
import { UpdateGate } from './updatePolicy';

export function setupPwa(): void {
  let updateSW: ((reload?: boolean) => Promise<void>) | null = null;
  const gate = new UpdateGate(() => { void updateSW?.(true); });
  updateSW = registerSW({ onNeedRefresh: () => gate.updateReady() });
  effect(() => gate.setScreen(ui.screen.value));
}
