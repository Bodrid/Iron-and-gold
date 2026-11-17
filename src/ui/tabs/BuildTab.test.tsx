// @vitest-environment jsdom
import { it, expect, beforeEach, afterEach } from 'vitest';
import { render, cleanup, screen, fireEvent } from '@testing-library/preact';
import { BuildTab } from './BuildTab';
import { ui } from '../store';
import { BUILDING_TYPES } from '../../content/buildings';
import type { StateDetail } from '../../worker/protocol';

function detail(over: Partial<Record<string, any>> = {}): StateDetail {
  return {
    id: 5, name: 'Silesia', owner: 1, controller: 1, population: 2_000_000, slots: { used: 3, total: 10 }, buildings: [{ type: 'farm', level: 2, tile: 0 }],
    constructions: [{ id: 9, country: 1, state: 5, type: 'barracks', doneTick: 400, daysLeft: 58 }],
    buildOptions: BUILDING_TYPES.map(type => ({ type, check: over[type] ?? { ok: true, cost: 1000 } })),
    resources: { coal: true, iron: false, fertility: 0.8, forest: 0.2 }, coastal: false,
  };
}

afterEach(cleanup);
beforeEach(() => { ui.playerId.value = 1; ui.selectedState.value = 5; });

it('shows the reason a building cannot be built', () => {
  ui.selection.value = detail({ ironMine: { ok: false, reason: 'needsIron' } });
  render(<BuildTab send={() => {}} />);
  expect(screen.getByText('Needs iron')).toBeTruthy();
});

it('tapping an available building sends a build command', () => {
  ui.selection.value = detail();
  const sent: any[] = [];
  render(<BuildTab send={c => sent.push(c)} />);
  fireEvent.click(screen.getByRole('button', { name: /^Farm/ }));
  expect(sent).toEqual([{ type: 'build', country: 1, state: 5, building: 'farm' }]);
});

it('lists constructions with days left and slot use', () => {
  ui.selection.value = detail();
  render(<BuildTab send={() => {}} />);
  expect(screen.getByText(/Barracks.*58 days left/)).toBeTruthy();
  expect(screen.getByText(/3 of 10 slots/)).toBeTruthy();
});

it('asks you to pick a state when none of yours is selected', () => {
  ui.selection.value = { ...detail(), owner: 2 };
  render(<BuildTab send={() => {}} />);
  expect(screen.getByText('Tap one of your states on the map.')).toBeTruthy();
});
