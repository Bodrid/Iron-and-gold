import { it, expect } from 'vitest';
import { layoutFor, fmtMoney, fmtNum } from './store';

it('iPad split view and Slide Over never show the rotate prompt', () => {
  const ipad = { screenW: 820, screenH: 1180 };
  expect(layoutFor(585, 820, ipad)).toBe('phone');
  expect(layoutFor(375, 820, ipad)).toBe('phone');
  expect(layoutFor(500, 1180, ipad)).toBe('phone');
  expect(layoutFor(310, 1180, ipad)).toBe('phone');
  const iphone = { screenW: 402, screenH: 874 };
  expect(layoutFor(402, 874, iphone)).toBe('rotate');
  expect(layoutFor(874, 402, iphone)).toBe('phone');
});

it('layoutFor picks phone, dock and rotate', () => {
  const iphone = { screenW: 402, screenH: 874 }, ipad = { screenW: 820, screenH: 1180 }, pc = { screenW: 1920, screenH: 1080 };
  expect(layoutFor(874, 402, iphone)).toBe('phone');
  expect(layoutFor(1180, 820, ipad)).toBe('dock');
  expect(layoutFor(402, 874, iphone)).toBe('rotate');
  expect(layoutFor(820, 1180, ipad)).toBe('phone');
  expect(layoutFor(1440, 900, pc)).toBe('dock');
  expect(layoutFor(700, 820, ipad)).toBe('phone');
});

it('formats money and big numbers compactly', () => {
  expect(fmtMoney(1_240_000)).toBe('£1.24M');
  expect(fmtMoney(-8100)).toBe('-£8.1k');
  expect(fmtMoney(512)).toBe('£512');
  expect(fmtNum(14_200_000)).toBe('14.2M');
  expect(fmtNum(2_300_000_000)).toBe('2.3B');
});
