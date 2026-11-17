import { it, expect } from 'vitest';
import { keyAction } from './keyboard';

it('ignores shortcuts held with Cmd, Ctrl or Alt', () => {
  expect(keyAction({ key: 'r', shiftKey: false, metaKey: true })).toBeNull();
  expect(keyAction({ key: 'r', shiftKey: false })).toBe('tabResearch');
});
