import type { GameDate } from './types';

export const TICKS_PER_DAY = 4;
export const SPEED_TICKS_PER_SECOND = [0, 8, 12, 24] as const;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Days since 1 Mar 0000 (proleptic Gregorian), integer arithmetic only.
export function toDays(d: GameDate): number {
  const y = d.m <= 2 ? d.y - 1 : d.y;
  const era = Math.floor(y / 400);
  const yoe = y - era * 400;
  const mp = (d.m + 9) % 12;
  const doy = Math.floor((153 * mp + 2) / 5) + d.d - 1;
  const doe = yoe * 365 + Math.floor(yoe / 4) - Math.floor(yoe / 100) + doy;
  return era * 146097 + doe;
}

export function fromDays(z: number): GameDate {
  const era = Math.floor(z / 146097);
  const doe = z - era * 146097;
  const yoe = Math.floor((doe - Math.floor(doe / 1460) + Math.floor(doe / 36524) - Math.floor(doe / 146096)) / 365);
  const doy = doe - (365 * yoe + Math.floor(yoe / 4) - Math.floor(yoe / 100));
  const mp = Math.floor((5 * doy + 2) / 153);
  const d = doy - Math.floor((153 * mp + 2) / 5) + 1;
  const m = mp < 10 ? mp + 3 : mp - 9;
  const y = yoe + era * 400 + (m <= 2 ? 1 : 0);
  return { y, m, d };
}

export function dateAtTick(start: GameDate, tick: number): GameDate {
  return fromDays(toDays(start) + Math.floor(tick / TICKS_PER_DAY));
}

export function ticksUntil(start: GameDate, end: GameDate): number {
  return (toDays(end) - toDays(start)) * TICKS_PER_DAY;
}

export function formatDate(d: GameDate): string {
  return `${d.d} ${MONTHS[d.m - 1]} ${d.y}`;
}
