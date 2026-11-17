// @vitest-environment jsdom
import { it, expect, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/preact';
import { TradeTab } from './TradeTab';
import { ui } from '../store';

afterEach(cleanup);

const c = (id: number, name: string) => ({ id, name, tag: name.slice(0, 3), color: 0, alive: true } as any);

it('lists routes with partner, good and amount, and cancels one', () => {
  ui.playerId.value = 1;
  ui.countries.value = [c(1, 'Prussia'), c(2, 'Russia')];
  ui.trade.value = { routes: [{ id: 5, exporter: 1, importer: 2, good: 'coal', amount: 120 }], capacity: 4, used: 1, auto: true, income: 2500 };
  const sent: any[] = [];
  render(<TradeTab send={x => sent.push(x)} />);
  expect(screen.getByText(/Coal to Russia/)).toBeTruthy();
  expect(screen.getByText(/1 of 4 routes/)).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: /Cancel/ }));
  expect(sent).toEqual([{ type: 'cancelTradeRoute', country: 1, routeId: 5 }]);
});

it('toggles automatic trade', () => {
  ui.trade.value = { routes: [], capacity: 2, used: 0, auto: true, income: 0 };
  const sent: any[] = [];
  render(<TradeTab send={x => sent.push(x)} />);
  fireEvent.click(screen.getByRole('checkbox'));
  expect(sent).toEqual([{ type: 'setTradeAuto', country: 1, on: false }]);
});

it('tells you to build a port when you have none', () => {
  ui.trade.value = { routes: [], capacity: 0, used: 0, auto: true, income: 0 };
  render(<TradeTab send={() => {}} />);
  expect(screen.getByText('Build a port to start trading.')).toBeTruthy();
});
