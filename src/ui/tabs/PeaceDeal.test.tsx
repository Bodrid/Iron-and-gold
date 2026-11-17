// @vitest-environment jsdom
import { it, expect, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/preact';
import { PeaceDeal } from './PeaceDeal';

afterEach(cleanup);
const war = { id: 5, leader: true, mySide: [1], enemySide: [2], myScore: 110, enemyScore: 20, available: 120, goals: ['Take Silesia'],
  candidates: [{ demand: { kind: 'state' as const, state: 9 }, label: 'Take Silesia', cost: 50, goal: true }, { demand: { kind: 'state' as const, state: 10 }, label: 'Take Bohemia', cost: 80, goal: false }, { demand: { kind: 'reparations' as const }, label: 'Reparations', cost: 30, goal: false }] };

it('starts with the war goals picked, adds up costs against the points available, and offers the terms', () => {
  const sent: any[] = [];
  render(<PeaceDeal me={1} war={war} enemyName="Austria" send={c => sent.push(c)} onDone={() => {}} />);
  expect(screen.getByText(/50 of 120 points/)).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: /Take Bohemia/ }));
  expect(screen.getByText(/130 of 120 points/)).toBeTruthy();
  expect((screen.getByRole('button', { name: /^Offer these terms/ }) as HTMLButtonElement).disabled).toBe(true);
  fireEvent.click(screen.getByRole('button', { name: /Take Bohemia/ }));
  fireEvent.click(screen.getByRole('button', { name: /Reparations/ }));
  fireEvent.click(screen.getByRole('button', { name: /^Offer these terms/ }));
  expect(sent).toEqual([{ type: 'proposePeace', country: 1, warId: 5, terms: { demands: [{ kind: 'state', state: 9 }, { kind: 'reparations' }] } }]);
});

it('offers a white peace', () => {
  const sent: any[] = [];
  render(<PeaceDeal me={1} war={war} enemyName="Austria" send={c => sent.push(c)} onDone={() => {}} />);
  fireEvent.click(screen.getByRole('button', { name: /White peace/ }));
  expect(sent[0]).toMatchObject({ type: 'proposePeace', terms: { demands: [], white: true } });
});
