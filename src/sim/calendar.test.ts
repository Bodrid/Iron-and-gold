import { it, expect } from 'vitest';
import { dateAtTick, ticksUntil, formatDate, TICKS_PER_DAY } from './calendar';

const s = { y: 1836, m: 1, d: 1 };
it('calendar handles leap years', () => {
  expect(dateAtTick(s, 59 * TICKS_PER_DAY)).toEqual({ y: 1836, m: 2, d: 29 });
  expect(dateAtTick(s, 60 * TICKS_PER_DAY + 3)).toEqual({ y: 1836, m: 3, d: 1 });
  expect(ticksUntil(s, { y: 1936, m: 1, d: 1 })).toBe(36524 * TICKS_PER_DAY); // 24 leap days: 1900 is not a leap year
});
it('1900 is not a leap year', () => {
  expect(dateAtTick({ y: 1900, m: 2, d: 28 }, TICKS_PER_DAY)).toEqual({ y: 1900, m: 3, d: 1 });
});
it('formats dates', () => { expect(formatDate({ y: 1836, m: 3, d: 14 })).toBe('14 Mar 1836'); });
