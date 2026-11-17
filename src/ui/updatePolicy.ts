import type { Screen } from './store';

/** Holds a downloaded app update until no game is open, so a running game never loses its files mid-session. */
export class UpdateGate {
  private ready = false;
  private screen: Screen = 'menu';
  private done = false;
  constructor(private apply: () => void) {}
  setScreen(s: Screen) { this.screen = s; this.check(); }
  updateReady() { this.ready = true; this.check(); }
  private check() {
    if (this.ready && !this.done && (this.screen === 'menu' || this.screen === 'newGame')) { this.done = true; this.apply(); }
  }
}
