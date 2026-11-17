import { SPEED_TICKS_PER_SECOND } from '../sim/calendar';

/** Decides how many simulation ticks are due, from real time and the chosen speed. */
export class TickScheduler {
  private last: number;
  private carry = 0;
  private speed: 0 | 1 | 2 | 3 = 0;
  constructor(private now: () => number) { this.last = now(); }

  setSpeed(s: 0 | 1 | 2 | 3): void {
    this.accumulate();
    this.speed = s;
  }

  getSpeed(): 0 | 1 | 2 | 3 { return this.speed; }

  private accumulate(): void {
    const t = this.now();
    const rate = SPEED_TICKS_PER_SECOND[this.speed];
    this.carry = Math.min(this.carry + ((t - this.last) / 1000) * rate, Math.max(rate, 8));
    this.last = t;
  }

  /** Ticks to run now (at most 8). */
  dueTicks(): number {
    this.accumulate();
    const n = Math.min(8, Math.floor(this.carry + 1e-9));
    this.carry -= n;
    return n;
  }
}
