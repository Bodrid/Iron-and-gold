// @vitest-environment jsdom
import { it, expect, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/preact';
import { BlocSection } from './BlocSection';
import { CompaniesSection } from './CompaniesSection';
import { ui } from '../store';
import type { BlocView, DiploView, PoliticsView } from '../../worker/protocol';

afterEach(cleanup);
const c = (id: number, name: string) => ({ id, name, tag: name.slice(0, 3).toUpperCase(), color: 0, alive: true } as any);
const diplo = (bloc: Partial<BlocView>) => ({ bloc: { mine: null, found: null, cost: 200_000, all: [], invites: [], ...bloc } } as unknown as DiploView);

it('founds a bloc with the type’s fixed principle and up to two picks', () => {
  ui.playerId.value = 1;
  ui.countries.value = [c(1, 'United Kingdom'), c(2, 'Portugal')];
  ui.diplo.value = diplo({});
  const sent: any[] = [];
  render(<BlocSection send={x => sent.push(x)} />);
  fireEvent.click(screen.getByRole('radio', { name: 'Trade League' }));
  fireEvent.click(screen.getByRole('button', { name: /Mercantile Navy/ }));
  fireEvent.click(screen.getByRole('button', { name: /Shared Science/ }));
  expect((screen.getByRole('button', { name: /Military Drill/ }) as HTMLButtonElement).disabled).toBe(true);
  fireEvent.click(screen.getByRole('button', { name: /Found the Trade League/ }));
  expect(sent).toEqual([{ type: 'foundBloc', country: 1, blocType: 'tradeLeague', principles: ['mercantileNavy', 'sharedScience'] }]);
});

it('explains why a minor can’t found one, and answers an invitation', () => {
  ui.diplo.value = diplo({ found: 'notMajor', invites: [2] });
  const sent: any[] = [];
  render(<BlocSection send={x => sent.push(x)} />);
  expect(screen.getByText(/Only major powers can found/)).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Join' }));
  expect(sent).toEqual([{ type: 'respondBlocInvite', country: 1, from: 2, accept: true }]);
});

it('shows my bloc’s members and lets the leader expel', () => {
  ui.diplo.value = diplo({ mine: { leader: 1, type: 'empire', principles: ['imperialTribute'], members: [2], puppets: [], isLeader: true, canSetPrinciples: false } });
  const sent: any[] = [];
  render(<BlocSection send={x => sent.push(x)} />);
  expect(screen.getByText(/Empire led by you/)).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Expel' }));
  expect(sent).toEqual([{ type: 'expelFromBloc', country: 1, target: 2 }]);
});

it('companies: founds one, grants a charter, and greys out what isn’t possible', () => {
  ui.politics.value = { companies: { limit: 2, cost: 50_000, mine: [{ id: 'textileCombine', bonus: 10, charter: null, charters: { colonial: null, monopoly: null, investment: 'noPuppets' } }],
    available: [{ id: 'coalCompany', check: null }, { id: 'eastIndia', check: 'tooMany' }] } } as unknown as PoliticsView;
  const sent: any[] = [];
  render(<CompaniesSection send={x => sent.push(x)} />);
  expect(screen.getByText(/\+10% Textile Mill output/)).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Monopoly' }));
  expect((screen.getByRole('button', { name: 'Investment charter' }) as HTMLButtonElement).disabled).toBe(true);
  const found = screen.getAllByRole('button', { name: 'Found' }) as HTMLButtonElement[];
  fireEvent.click(found[0]);
  expect(found[1].disabled).toBe(true);
  expect(sent).toEqual([{ type: 'grantCharter', country: 1, company: 'textileCombine', charter: 'monopoly' }, { type: 'foundCompany', country: 1, company: 'coalCompany' }]);
});
