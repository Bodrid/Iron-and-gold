// @vitest-environment jsdom
import { it, expect, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/preact';
import { ArmyTab } from './ArmyTab';
import { pushToast, ui } from '../store';

afterEach(cleanup);

const summary = (id: number, name: string, extra = {}) => ({ id, tag: name.slice(0, 3).toUpperCase(), name, color: 0, alive: true, isPlayer: id === 1, capitalState: 1, troops: 1000, maxTroops: 2000,
  money: 0, income: 0, gdp: 0, population: 0, sol: 10, literacy: 0, tiles: 1, researchPoints: 0, atWarWith: [2], stockpile: { grain: 0, wood: 0, coal: 0, iron: 0, textiles: 0, tools: 0, arms: 5, luxuries: 0 },
  prices: {} as any, produced: {} as any, demanded: {} as any, history: [], ...extra });

it('lists incoming peace offers with Accept and Refuse', () => {
  ui.playerId.value = 1;
  ui.countries.value = [summary(1, 'Prussia'), summary(2, 'Austria', { atWarWith: [1] })] as any;
  ui.wars.value = [{ id: 7, a: 1, b: 2, scoreA: 40, scoreB: 30, startTick: 0 }];
  ui.peaceOffers.value = [{ from: 2, to: 1 }];
  const sent: any[] = [];
  render(<ArmyTab send={c => sent.push(c)} />);
  expect(screen.getByText(/Austria offers peace/)).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Accept peace' }));
  expect(sent).toEqual([{ type: 'respondPeace', country: 1, from: 2, accept: true }]);
});

it('never pushes a sticky toast (like a peace offer) off the screen', () => {
  ui.toasts.value = [];
  pushToast({ kind: 'peace', sticky: true, text: 'Austria offers peace.' });
  for (let i = 0; i < 6; i++) pushToast({ kind: 'info', text: `news ${i}` });
  expect(ui.toasts.value.some(t => t.text === 'Austria offers peace.')).toBe(true);
  expect(ui.toasts.value.length).toBeLessThanOrEqual(4);
});
