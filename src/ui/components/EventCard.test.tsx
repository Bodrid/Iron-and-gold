// @vitest-environment jsdom
import { it, expect, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/preact';
import { EventCard } from './EventCard';
import { EventsSection } from '../tabs/EventsSection';
import { ui } from '../store';

afterEach(cleanup);
const view = () => ({
  pending: [{ id: 7, title: 'The Zollverein', text: 'German states talk of a customs union.\n\nPrussia could lead it.', daysLeft: 25,
    options: [{ label: 'Lead the union', effects: ['Found a Trade League'] }, { label: 'Stay apart', effects: ['Bavaria: relations −10'] }] }],
  history: [{ title: 'A gift', choice: 'Take it', date: '1 Feb 1836' }],
  decisions: [{ tag: 'GER', name: 'Germany', description: 'Unite the German states.', owned: 5, total: 12, needed: 9, check: 'needsCores' }],
});

it('shows the open event with its story and options, and sends the choice', () => {
  ui.playerId.value = 1;
  ui.events.value = view();
  ui.openEvent.value = 7;
  const sent: any[] = [];
  render(<EventCard send={x => sent.push(x)} />);
  expect(screen.getByRole('dialog')).toBeTruthy();
  expect(screen.getByText('Prussia could lead it.')).toBeTruthy();
  expect(screen.getByText('Bavaria: relations −10')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: /Stay apart/ }));
  expect(sent).toEqual([{ type: 'chooseEventOption', country: 1, pending: 7, option: 1 }]);
  expect(ui.openEvent.value).toBeNull();
});

it('decide later closes the card; the Nation tab lists it, history and decisions', () => {
  ui.events.value = view();
  ui.openEvent.value = 7;
  render(<EventCard />);
  fireEvent.click(screen.getByRole('button', { name: 'Decide later' }));
  expect(ui.openEvent.value).toBeNull();
  cleanup();
  render(<EventsSection send={() => {}} />);
  expect(screen.getByText(/You own 5 of its 12 states; 9 are needed/)).toBeTruthy();
  expect((screen.getByRole('button', { name: 'Proclaim Germany' }) as HTMLButtonElement).disabled).toBe(true);
  fireEvent.click(screen.getByRole('button', { name: 'Open' }));
  expect(ui.openEvent.value).toBe(7);
  expect(screen.getByText(/Take it · 1 Feb 1836/)).toBeTruthy();
});
