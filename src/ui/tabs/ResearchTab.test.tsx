// @vitest-environment jsdom
import { it, expect, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/preact';
import { ResearchTab } from './ResearchTab';
import { PoliticsSection } from './PoliticsSection';
import { ui } from '../store';
import { TECHS } from '../../content/techs';
import type { PoliticsView } from '../../worker/protocol';

afterEach(cleanup);

function view(over: Partial<PoliticsView['research']> = {}): PoliticsView {
  const known = new Set(TECHS.filter(t => t.era === 1).map(t => t.id));
  return {
    research: {
      researching: null, queue: [], points: 40, rate: 12.5, cost: 0,
      techs: TECHS.map(t => ({ id: t.id, status: known.has(t.id) ? 'known' : t.requires.every(r => known.has(r)) ? 'available' : 'locked', cost: 300 })),
      ...over,
    },
    laws: [{ area: 'trade', current: 'mercantilism', options: [
      { id: 'protectionism', support: 0.6, chance: 0.17, check: null },
      { id: 'freeTrade', support: -0.8, chance: 0, check: 'noSupport' },
    ] }],
    enacting: null,
    groups: [{ id: 'workers', clout: 0.2, approval: -7, radicalism: 80, wants: 'freeLabour' }, { id: 'landowners', clout: 0.5, approval: 6, radicalism: 0, wants: null }],
    companies: { limit: 1, cost: 50_000, mine: [], available: [] },
  };
}

it('explains an empty research slot and starts a tech from the tree', () => {
  ui.playerId.value = 1;
  ui.techTree.value = 'production';
  ui.politics.value = view();
  const sent: any[] = [];
  render(<ResearchTab send={x => sent.push(x)} />);
  expect(screen.getByText(/Nothing is being researched/)).toBeTruthy();
  const card = document.querySelector('[data-tech="steamEngine"]')!;
  fireEvent.click(card.querySelector('button')!);
  expect(sent).toEqual([{ type: 'research', country: 1, tech: 'steamEngine' }]);
  expect(document.querySelector('[data-tech="railways"]')!.textContent).toMatch(/Needs Steam Engine/);
});

it('shows progress, and lets you queue and remove techs', () => {
  ui.politics.value = view({ researching: 'steamEngine', points: 150, cost: 300, queue: ['puddling'] });
  const sent: any[] = [];
  render(<ResearchTab send={x => sent.push(x)} />);
  expect(screen.getByText(/150 of 300 points/)).toBeTruthy();
  expect(screen.getByText(/about 12 months/)).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Remove Iron Puddling' }));
  expect(sent).toContainEqual({ type: 'unqueueTech', country: 1, tech: 'puddling' });
  fireEvent.click(screen.getByRole('tab', { name: 'Military' }));
  expect(ui.techTree.value).toBe('military');
});

it('enacts a supported law; an unsupported one is disabled with the reason; radical groups warn', () => {
  ui.politics.value = view();
  const sent: any[] = [];
  render(<PoliticsSection send={x => sent.push(x)} />);
  const buttons = screen.getAllByRole('button', { name: 'Enact' }) as HTMLButtonElement[];
  expect(buttons[1].disabled).toBe(true);
  expect(screen.getByText(/Not enough support/)).toBeTruthy();
  fireEvent.click(buttons[0]);
  expect(sent).toEqual([{ type: 'enactLaw', country: 1, law: 'protectionism' }]);
  expect(screen.getByText(/close to revolt/)).toBeTruthy();
  expect(screen.getByText(/wants Free Labour/)).toBeTruthy();
});
