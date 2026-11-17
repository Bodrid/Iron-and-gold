import { it, expect } from 'vitest';
import { TickScheduler } from './scheduler';

const drain = (s: TickScheduler) => { let n = 0; for (;;) { const d = s.dueTicks(); if (!d) break; n += d; } return n; };

it('runs the right number of ticks per speed', () => {
  let t = 0;
  const s = new TickScheduler(() => t);
  s.setSpeed(2);
  t = 1000;
  expect(drain(s)).toBe(12);
  t = 1500;
  expect(drain(s)).toBe(6);
  s.setSpeed(3);
  t = 2500;
  expect(drain(s)).toBe(24);
});

it('runs at most 8 ticks per call', () => {
  let t = 0;
  const s = new TickScheduler(() => t);
  s.setSpeed(3);
  t = 1000;
  expect(s.dueTicks()).toBe(8);
});

it('paused runs nothing and does not build a backlog', () => {
  let t = 0;
  const s = new TickScheduler(() => t);
  s.setSpeed(0);
  t = 10_000;
  expect(drain(s)).toBe(0);
  s.setSpeed(1);
  t = 10_500;
  expect(drain(s)).toBe(4);
});

it('drops backlog beyond one second when the device falls behind', () => {
  let t = 0;
  const s = new TickScheduler(() => t);
  s.setSpeed(1);
  t = 60_000;
  expect(drain(s)).toBe(8);
});
