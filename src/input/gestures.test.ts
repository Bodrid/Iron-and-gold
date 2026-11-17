import { it, expect } from 'vitest';
import { GestureRecognizer, type PointerSample } from './gestures';
import { keyAction } from './keyboard';

const ev = (kind: PointerSample['kind'], id: number, x: number, y: number, t: number): PointerSample => ({ kind, id, x, y, t });

it('quick still press is a tap', () => {
  const r = new GestureRecognizer();
  r.feed(ev('down', 1, 100, 100, 0));
  expect(r.feed(ev('up', 1, 102, 101, 120))).toEqual([{ type: 'tap', x: 102, y: 101 }]);
});

it('drag is a pan, not a tap', () => {
  const r = new GestureRecognizer();
  r.feed(ev('down', 1, 100, 100, 0));
  const out = [...r.feed(ev('move', 1, 120, 100, 30)), ...r.feed(ev('move', 1, 140, 100, 60)), ...r.feed(ev('up', 1, 140, 100, 90))];
  expect(out.some(g => g.type === 'tap')).toBe(false);
  const dx = out.filter(g => g.type === 'pan').reduce((s, g: any) => s + g.dx, 0);
  expect(dx).toBe(40);
});

it('held still for 500ms is a long press, and no tap follows', () => {
  const r = new GestureRecognizer();
  r.feed(ev('down', 1, 50, 60, 0));
  expect(r.tick(300)).toEqual([]);
  expect(r.tick(520)).toEqual([{ type: 'longPress', x: 50, y: 60 }]);
  expect(r.feed(ev('up', 1, 50, 60, 700))).toEqual([]);
});

it('slow release without moving is not a tap', () => {
  const r = new GestureRecognizer();
  r.feed(ev('down', 1, 50, 60, 0));
  expect(r.feed(ev('up', 1, 50, 60, 400))).toEqual([]);
});

it('two fingers pinch around their midpoint', () => {
  const r = new GestureRecognizer();
  r.feed(ev('down', 1, 100, 100, 0));
  r.feed(ev('down', 2, 200, 100, 10));
  const out = r.feed(ev('move', 2, 300, 100, 40));
  const pinch = out.find(g => g.type === 'pinch') as any;
  expect(pinch.scale).toBeCloseTo(2, 5);
  expect(pinch.cx).toBe(200);
  const out2 = [...r.feed(ev('up', 2, 300, 100, 60)), ...r.feed(ev('up', 1, 100, 100, 70))];
  expect(out2.some(g => g.type === 'tap')).toBe(false);
});

it('maps keys', () => {
  expect(keyAction({ key: ' ', shiftKey: false })).toBe('pause');
  expect(keyAction({ key: '3', shiftKey: false })).toBe('speed3');
  expect(keyAction({ key: 'b', shiftKey: false })).toBe('tabBuild');
  expect(keyAction({ key: 'Escape', shiftKey: false })).toBe('close');
  expect(keyAction({ key: 'ArrowLeft', shiftKey: false })).toBe('panLeft');
  expect(keyAction({ key: 'q', shiftKey: false })).toBeNull();
});
