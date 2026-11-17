import { it, expect } from 'vitest';
import { UpdateGate } from './updatePolicy';

it('applies a waiting update only when no game is open', () => {
  let applied = 0;
  const gate = new UpdateGate(() => applied++);
  gate.setScreen('game');
  gate.updateReady();
  expect(applied).toBe(0);
  gate.setScreen('loading');
  expect(applied).toBe(0);
  gate.setScreen('menu');
  expect(applied).toBe(1);
  gate.setScreen('menu');
  expect(applied).toBe(1);
});

it('applies straight away when the update arrives on the menu', () => {
  let applied = 0;
  const gate = new UpdateGate(() => applied++);
  gate.setScreen('newGame');
  gate.updateReady();
  expect(applied).toBe(1);
});
