import { it, expect } from 'vitest';
import { layoutFor, fmtMoney, fmtNum } from './store';

it('layoutFor picks phone, dock and rotate', () => {
  expect(layoutFor(874, 402)).toBe('phone');
  expect(layoutFor(1180, 820)).toBe('dock');
  expect(layoutFor(402, 874)).toBe('rotate');
  expect(layoutFor(820, 1180)).toBe('phone');
  expect(layoutFor(1440, 900)).toBe('dock');
  expect(layoutFor(700, 820)).toBe('phone');
});

it('formats money and big numbers compactly', () => {
  expect(fmtMoney(1_240_000)).toBe('£1.24M');
  expect(fmtMoney(-8100)).toBe('-£8.1k');
  expect(fmtMoney(512)).toBe('£512');
  expect(fmtNum(14_200_000)).toBe('14.2M');
  expect(fmtNum(2_300_000_000)).toBe('2.3B');
});
