// @vitest-environment jsdom
import { it, expect, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/preact';
import { NewGame } from './NewGame';

afterEach(cleanup);

it('shows Grand Master bonuses and both start dates', () => {
  render(<NewGame onStart={() => {}} />);
  expect(screen.getByText(/\+20% troop refill/)).toBeTruthy();
  expect((screen.getByRole('button', { name: /^1776/ }) as HTMLButtonElement).disabled).toBe(false);
  expect(screen.getByRole('button', { name: /^1836/ }).getAttribute('aria-pressed')).toBe('true');
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

it('offers both start dates; picking 1776 shows its countries and starts there', async () => {
  const { render, screen, fireEvent } = await import('@testing-library/preact');
  const started: any[] = [];
  render(<NewGame onStart={s => started.push(s)} />);
  fireEvent.click(screen.getByRole('button', { name: /^1776/ }));
  expect(screen.queryByRole('button', { name: /Poland-Lithuania/ })).toBeTruthy();
  expect(screen.queryByRole('button', { name: /^United States/ })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: /Poland-Lithuania/ }));
  fireEvent.click(screen.getByRole('button', { name: /Start as Poland-Lithuania/ }));
  expect(started[0]).toMatchObject({ startId: '1776', playerTag: 'POL' });
});
