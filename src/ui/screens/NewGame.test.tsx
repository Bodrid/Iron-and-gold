// @vitest-environment jsdom
import { it, expect, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/preact';
import { NewGame } from './NewGame';

afterEach(cleanup);

it('shows Grand Master bonuses and disables 1776', () => {
  render(<NewGame onStart={() => {}} />);
  expect(screen.getByText(/\+20% troop refill/)).toBeTruthy();
  expect((screen.getByRole('button', { name: /1776/ }) as HTMLButtonElement).disabled).toBe(true);
});

it('search filters the country list', () => {
  render(<NewGame onStart={() => {}} />);
  fireEvent.input(screen.getByRole('searchbox'), { target: { value: 'pru' } });
  expect(screen.queryByRole('button', { name: /Prussia/ })).toBeTruthy();
  expect(screen.queryByRole('button', { name: /^France/ })).toBeNull();
});

it('starts with the chosen country, difficulty and rivals setting', () => {
  let setup: any = null;
  render(<NewGame onStart={s => (setup = s)} />);
  fireEvent.click(screen.getByRole('button', { name: /^Hard/ }));
  fireEvent.click(screen.getByRole('checkbox'));
  fireEvent.click(screen.getByRole('button', { name: /Prussia/ }));
  fireEvent.click(screen.getByRole('button', { name: /^Start as Prussia/ }));
  expect(setup).toMatchObject({ startId: '1836', playerTag: 'PRU', difficulty: 'hard', rivalsHarder: true });
});
