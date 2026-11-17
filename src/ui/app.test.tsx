// @vitest-environment jsdom
import { render, screen } from '@testing-library/preact';
import { it, expect } from 'vitest';
import { App } from './app';

it('renders the game title', () => {
  render(<App />);
  expect(screen.getByText('Iron & Gold')).toBeTruthy();
});
