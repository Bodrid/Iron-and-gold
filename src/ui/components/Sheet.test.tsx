// @vitest-environment jsdom
import { it, expect, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/preact';
import { Sheet } from './Sheet';
import { ui } from '../store';

beforeEach(() => { ui.tab.value = 'build'; ui.sheet.value = 'half'; });

function drag(el: Element, dy: number) {
  fireEvent.pointerDown(el, { clientY: 300, pointerId: 1 });
  fireEvent.pointerMove(el, { clientY: 300 + dy, pointerId: 1 });
  fireEvent.pointerUp(el, { clientY: 300 + dy, pointerId: 1 });
}

it('drags up to full and down to half, then closes', () => {
  const { container } = render(<Sheet title="Build">content</Sheet>);
  const grab = container.querySelector('[data-ui=grabber]')!;
  drag(grab, -200);
  expect(ui.sheet.value).toBe('full');
  drag(grab, 200);
  expect(ui.sheet.value).toBe('half');
  drag(grab, 200);
  expect(ui.tab.value).toBe(null);
});

it('a small drag changes nothing', () => {
  const { container } = render(<Sheet title="Build">content</Sheet>);
  drag(container.querySelector('[data-ui=grabber]')!, -20);
  expect(ui.sheet.value).toBe('half');
  expect(ui.tab.value).toBe('build');
});
