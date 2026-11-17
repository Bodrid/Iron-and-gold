// @vitest-environment jsdom
import { it, expect, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/preact';
import { PlayPicker } from './PlayPicker';

afterEach(cleanup);
const detail = { id: 7, treaty: {} as any, play: null, privateers: 'needsHostile', states: [{ id: 41, name: 'Schleswig-Holstein', population: 900_000 }, { id: 42, name: 'Sjaælland', population: 600_000 }] };

it('picks up to three demands, shows the infamy, and starts the play', () => {
  const sent: any[] = [];
  render(<PlayPicker me={1} targetName="Denmark" detail={detail} send={c => sent.push(c)} onDone={() => {}} />);
  fireEvent.click(screen.getByRole('button', { name: /Schleswig-Holstein/ }));
  fireEvent.click(screen.getByRole('button', { name: /Reparations/ }));
  expect(screen.getByText(/Infamy \+4/)).toBeTruthy();       // (5 + 3) / 2 when it starts
  fireEvent.click(screen.getByRole('button', { name: /Open their market/ }));
  expect((screen.getByRole('button', { name: /Make them our puppet/ }) as HTMLButtonElement).disabled).toBe(true);
  fireEvent.click(screen.getByRole('button', { name: /^Start the play/ }));
  expect(sent).toEqual([{ type: 'startPlay', country: 1, target: 7, demands: [{ kind: 'state', state: 41 }, { kind: 'reparations' }, { kind: 'openMarket' }] }]);
});

it('explains why a play is not possible', () => {
  render(<PlayPicker me={1} targetName="Denmark" detail={{ ...detail, play: 'playUnderWay' }} send={() => {}} onDone={() => {}} />);
  expect(screen.getByText(/already a play under way/i)).toBeTruthy();
});
