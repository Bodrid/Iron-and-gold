// Trade routes: ports send surplus goods to countries short of them. Both sides earn money from every delivery.
import { BUILDINGS } from '../../content/buildings';
import { GOODS } from '../../content/goods';
import { BALANCE } from '../balance';
import { handlers, systems } from '../registry';
import { atWar } from '../war';
import type { Command, Country, CountryId, GameState, Good, SimEvent, TradeRoute } from '../types';
import { getNavGrid, portCell, seaPath, seaPathKnown } from './nav';

const T = BALANCE.trade;

/** Hooks for the ships module (trade ships appear and disappear with routes). */
export const routeHooks = { opened: (_s: GameState, _r: TradeRoute) => {}, closed: (_s: GameState, _r: TradeRoute) => {} };

export function portStates(state: GameState, c: CountryId): number[] {
  const out: number[] = [];
  for (const st of state.states) {
    if (!st.id || st.owner !== c || st.controller !== c) continue;
    if (st.buildings.some(b => b.type === 'port' && b.level > 0) && portCell(state.map, st.id) >= 0) out.push(st.id);
  }
  return out;
}

export function routeCapacity(state: GameState, c: CountryId): number {
  let n = 0;
  for (const st of state.states) if (st.id && st.owner === c && st.controller === c) for (const b of st.buildings) if (b.type === 'port') n += b.level * (BUILDINGS.port.effects?.tradeRoutes ?? 0);
  return n;
}

export function routesOf(state: GameState, c: CountryId): TradeRoute[] {
  return state.tradeRoutes.filter(r => r.exporter === c || r.importer === c);
}

export function surplus(_state: GameState, c: Country, g: Good): number {
  return c.stockpile[g] - T.EXPORT_KEEP_MONTHS * c.demanded[g];
}

export function shortage(_state: GameState, c: Country, g: Good): number {
  return Math.max(0, c.demanded[g] - c.produced[g] - c.stockpile[g]);
}

/** Main port: highest port level, then most populous. */
function mainPort(state: GameState, c: CountryId): number {
  let best = 0, bestKey = -1;
  for (const s of portStates(state, c)) {
    const lvl = state.states[s].buildings.find(b => b.type === 'port')!.level;
    const key = lvl * 1e12 + state.states[s].population;
    if (key > bestKey) { bestKey = key; best = s; }
  }
  return best;
}

function cellDistance(state: GameState, a: number, b: number): number {
  const g = getNavGrid(state.map);
  const dx = (a % g.w) - (b % g.w), dy = Math.floor(a / g.w) - Math.floor(b / g.w);
  return Math.sqrt(dx * dx + dy * dy);
}

function routeValid(state: GameState, r: TradeRoute): boolean {
  const e = state.countries[r.exporter], i = state.countries[r.importer];
  if (!e.alive || !i.alive || atWar(state, r.exporter, r.importer)) return false;
  const ok = (sid: number, c: CountryId) => {
    const st = state.states[sid];
    return st.owner === c && st.controller === c && st.buildings.some(b => b.type === 'port');
  };
  return ok(r.fromState, r.exporter) && ok(r.toState, r.importer);
}

export function closeRoute(state: GameState, r: TradeRoute): void {
  state.tradeRoutes = state.tradeRoutes.filter(x => x !== r);
  routeHooks.closed(state, r);
}

export function monthlyTrade(state: GameState, _events: SimEvent[]): void {
  for (const c of state.countries) c.tradeIncome = 0;
  // Deliver on existing routes.
  for (const r of state.tradeRoutes.slice()) {
    if (!routeValid(state, r)) { closeRoute(state, r); continue; }
    const e = state.countries[r.exporter], i = state.countries[r.importer];
    if (surplus(state, e, r.good) <= 0 || shortage(state, i, r.good) <= 0) {
      if (++r.idleMonths >= T.IDLE_END_MONTHS) { closeRoute(state, r); continue; }
    } else r.idleMonths = 0;
    if (r.captured) { r.captured = false; continue; }
    const amount = Math.max(0, Math.min(r.amount, e.stockpile[r.good] - T.EXPORT_KEEP_MONTHS * e.demanded[r.good] * 0.5));
    if (amount <= 0) continue;
    e.stockpile[r.good] -= amount;
    i.stockpile[r.good] += amount;
    const exportEarn = amount * e.prices[r.good] * T.EXPORT_EARN;
    const importEarn = amount * i.prices[r.good] * T.IMPORT_EARN;
    e.money += exportEarn; e.tradeIncome += exportEarn; e.income += exportEarn;
    i.money += importEarn; i.tradeIncome += importEarn; i.income += importEarn;
  }
  // Open at most one new route per country per month.
  const used = new Map<CountryId, number>();
  for (const r of state.tradeRoutes) { used.set(r.exporter, (used.get(r.exporter) ?? 0) + 1); used.set(r.importer, (used.get(r.importer) ?? 0) + 1); }
  const free = (c: CountryId) => routeCapacity(state, c) - (used.get(c) ?? 0);
  // Sea-lane searches are the expensive part: a few new ones per month, countries taking turns to go first.
  let budget = T.PATH_SEARCHES_PER_MONTH;
  const n = state.countries.length - 1;
  const offset = n > 0 ? (Math.floor(state.tick / 120) * 7) % n : 0;
  const order = state.countries.slice(1).map((_, k) => state.countries[1 + ((k + offset) % n)]);
  for (const e of order) {
    if (!e.alive || !e.id || state.tradeOff.includes(e.id) || free(e.id) <= 0 || !portStates(state, e.id).length) continue;
    const goods = GOODS.filter(g => surplus(state, e, g) > 0).sort((a, b) => surplus(state, e, b) * e.prices[b] - surplus(state, e, a) * e.prices[a]);
    for (const g of goods) {
      const candidates = state.countries.filter(i => i.alive && i.id && i.id !== e.id && !state.tradeOff.includes(i.id) && free(i.id) > 0
        && shortage(state, i, g) > 0 && !atWar(state, e.id, i.id) && !state.tradeRoutes.some(r => r.exporter === e.id && r.importer === i.id && r.good === g))
        .sort((a, b) => shortage(state, b, g) - shortage(state, a, g) || a.id - b.id)
        .slice(0, T.CANDIDATES);
      // Rank by shortage over straight-line distance; run the (expensive) sea-lane search only to confirm the choice.
      const from = mainPort(state, e.id), fc = portCell(state.map, from);
      const grid = getNavGrid(state.map);
      const ranked = candidates.map(i => ({ i, to: mainPort(state, i.id) })).filter(x => x.to && grid.region[portCell(state.map, x.to)] === grid.region[fc])
        .map(x => ({ ...x, score: shortage(state, x.i, g) / (1 + cellDistance(state, fc, portCell(state.map, x.to)) / 50) }))
        .sort((a, b) => b.score - a.score || a.i.id - b.i.id);
      let pick: { i: Country; pair: { from: number; to: number } } | null = null;
      for (const x of ranked.slice(0, 2)) {
        const tc = portCell(state.map, x.to);
        if (!seaPathKnown(state.map, fc, tc)) { if (budget <= 0) break; budget--; }
        if (seaPath(state.map, fc, tc)) { pick = { i: x.i, pair: { from, to: x.to } }; break; }
      }
      if (!pick) continue;
      const amount = Math.min(surplus(state, e, g), shortage(state, pick.i, g), T.MAX_ROUTE_AMOUNT);
      const r: TradeRoute = { id: state.nextId++, exporter: e.id, importer: pick.i.id, fromState: pick.pair.from, toState: pick.pair.to, good: g, amount, createdTick: state.tick, idleMonths: 0, captured: false };
      state.tradeRoutes.push(r);
      used.set(e.id, (used.get(e.id) ?? 0) + 1); used.set(pick.i.id, (used.get(pick.i.id) ?? 0) + 1);
      routeHooks.opened(state, r);
      break;
    }
  }
}

handlers.cancelTradeRoute = (state, cmd: Extract<Command, { type: 'cancelTradeRoute' }>) => {
  const r = state.tradeRoutes.find(x => x.id === cmd.routeId && (x.exporter === cmd.country || x.importer === cmd.country));
  if (!r) return 'no such route';
  closeRoute(state, r);
  return null;
};
handlers.setTradeAuto = (state, cmd: Extract<Command, { type: 'setTradeAuto' }>) => {
  state.tradeOff = state.tradeOff.filter(c => c !== cmd.country);
  if (!cmd.on) state.tradeOff.push(cmd.country);
  return null;
};
// Build the sea grid when the game is created, not in the middle of the first month.
systems.init.push(state => { getNavGrid(state.map); });
systems.month.push((state, events) => monthlyTrade(state, events));
