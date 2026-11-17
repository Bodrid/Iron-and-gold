// Ships at sea: trade ships shuttling their routes, warships and transports following orders; building them; port loss.
import { SHIPS } from '../../content/ships';
import { GOODS } from '../../content/goods';
import { TICKS_PER_DAY } from '../calendar';
import { BALANCE } from '../balance';
import { handlers, systems } from '../registry';
import { atWar } from '../war';
import type { Command, CountryId, GameState, Ship, ShipOrder, SimEvent, TradeRoute } from '../types';
import { getNavGrid, portCell, seaPath } from './nav';
import { portStates, routeHooks } from './trade';

export function shipyardLevel(state: GameState, stateId: number, c: CountryId): number {
  const st = state.states[stateId];
  if (!st || st.owner !== c || st.controller !== c) return 0;
  return st.buildings.filter(b => b.type === 'shipyard').reduce((n, b) => n + b.level, 0);
}

export function lane(state: GameState, s: Ship): Int32Array | null {
  return s.fromCell === s.toCell ? Int32Array.of(s.fromCell) : seaPath(state.map, s.fromCell, s.toCell);
}

/** Sends a ship from where it is to a cell. Returns false if there is no sea lane. */
export function sailTo(state: GameState, s: Ship, cell: number): boolean {
  if (cell === s.cell) { s.fromCell = s.toCell = cell; s.pathPos = 0; s.dir = 1; return true; }
  if (!seaPath(state.map, s.cell, cell)) return false;
  s.fromCell = s.cell; s.toCell = cell; s.pathPos = 0; s.dir = 1;
  return true;
}

export function canReach(state: GameState, from: number, to: number): boolean {
  const g = getNavGrid(state.map);
  return from >= 0 && to >= 0 && g.sea[from] === 1 && g.sea[to] === 1 && g.region[from] === g.region[to];
}

function nearestOwnPort(state: GameState, c: CountryId, fromCell: number): number {
  const g = getNavGrid(state.map);
  let best = 0, bestD = Infinity;
  for (const p of portStates(state, c)) {
    const pc = portCell(state.map, p);
    if (!canReach(state, fromCell, pc)) continue;
    const dx = (pc % g.w) - (fromCell % g.w), dy = Math.floor(pc / g.w) - Math.floor(fromCell / g.w);
    const d = dx * dx + dy * dy;
    if (d < bestD) { bestD = d; best = p; }
  }
  return best;
}

/** Ships removed during the current encounter pass (avoids O(n) membership checks in big battles). */
let removedNow: Set<Ship> | null = null;

export function removeShip(state: GameState, s: Ship, events: SimEvent[] | null): void {
  if (removedNow) { if (removedNow.has(s)) return; removedNow.add(s); }
  else state.ships = state.ships.filter(x => x !== s);
  if (events && s.kind !== 'trade') events.push({ type: 'shipLost', country: s.owner, ship: s.id, kind: s.kind });
}

// Trade ships come and go with their routes.
routeHooks.opened = (state: GameState, r: TradeRoute) => {
  const from = portCell(state.map, r.fromState), to = portCell(state.map, r.toState);
  state.ships.push({ id: state.nextId++, owner: r.exporter, kind: 'trade', cell: from, fromCell: from, toCell: to, pathPos: 0, dir: 1, order: { type: 'trade', routeId: r.id }, hp: 1, routeId: r.id });
};
routeHooks.closed = (state: GameState, r: TradeRoute) => {
  state.ships = state.ships.filter(s => !(s.kind === 'trade' && s.routeId === r.id));
};

export function moveShips(state: GameState, events: SimEvent[]): void {
  for (const s of state.ships.slice()) {
    if (!state.countries[s.owner].alive) { removeShip(state, s, null); continue; }
    // Home port lost: go to another port, or the ship is lost.
    if (s.order.type === 'idle') {
      const st = state.states[s.order.port];
      if (st.owner !== s.owner || st.controller !== s.owner) {
        const p = nearestOwnPort(state, s.owner, s.cell);
        if (!p) { removeShip(state, s, events); continue; }
        s.order = { type: 'idle', port: p };
        sailTo(state, s, portCell(state.map, p));
      }
    }
    const path = lane(state, s);
    if (!path) continue;
    const last = path.length - 1;
    if (s.kind === 'trade') {
      s.pathPos += SHIPS.trade.speed * s.dir;
      if (s.pathPos >= last) { s.pathPos = last; s.dir = -1; } else if (s.pathPos <= 0) { s.pathPos = 0; s.dir = 1; }
    } else {
      s.pathPos = Math.min(last, s.pathPos + SHIPS[s.kind].speed);
    }
    s.cell = path[Math.round(s.pathPos)];
  }
  // Escorts that reached their route stay with its trade ship.
  for (const s of state.ships) {
    if (s.order.type !== 'escort') continue;
    const order = s.order;
    if (!state.tradeRoutes.some(r => r.id === order.routeId)) { s.order = { type: 'patrol', cell: s.cell }; s.fromCell = s.toCell = s.cell; s.pathPos = 0; continue; }
    const path = lane(state, s);
    if (path && s.pathPos < path.length - 1) continue;
    const t = state.ships.find(x => x.kind === 'trade' && x.routeId === order.routeId);
    if (t) { s.cell = s.fromCell = s.toCell = t.cell; s.pathPos = 0; }
  }
}

// ---- encounters: battles, piracy, sinking transports ----
function hostile(state: GameState, a: CountryId, b: CountryId): boolean {
  return a !== b && atWar(state, a, b) !== undefined;
}

/** Diplomacy plugs in privateer licences: `a` may raid `b`'s trade without a war. */
export const piracyHooks = { licensed: (_s: GameState, _a: CountryId, _b: CountryId) => false };

function neighbourhood(state: GameState, cell: number, buckets: Map<number, Ship[]>): Ship[] {
  const g = getNavGrid(state.map);
  const out: Ship[] = [];
  const cx = cell % g.w, cy = Math.floor(cell / g.w);
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    const x = cx + dx, y = cy + dy;
    if (x < 0 || y < 0 || x >= g.w || y >= g.h) continue;
    const b = buckets.get(y * g.w + x);
    if (b) for (const s of b) out.push(s);
  }
  return out;
}

function battle(state: GameState, a: Ship[], b: Ship[], cell: number, events: SimEvent[]): CountryId {
  const strength = (side: Ship[]) => side.reduce((n, s) => n + SHIPS[s.kind].strength * s.hp, 0);
  const sa = strength(a), sb = strength(b);
  const [win, lose, sw, sl] = sa >= sb ? [a, b, sa, sb] : [b, a, sb, sa];
  const N = BALANCE.navy;
  const lost = Math.min(lose.length, Math.max(1, Math.ceil(lose.length * Math.min(1, N.LOSS_RATE * (sw / Math.max(1e-9, sl))))));
  const victims = [...lose].sort((x, y) => x.hp - y.hp || SHIPS[x.kind].strength - SHIPS[y.kind].strength || x.id - y.id).slice(0, lost);
  for (const v of victims) removeShip(state, v, events);
  const dmg = N.WINNER_DAMAGE * (sl / Math.max(1e-9, sw));
  for (const w of win) { w.hp -= dmg; if (w.hp <= 0.05) removeShip(state, w, events); }
  const winner = win[0].owner;
  events.push({ type: 'navalBattle', a: a[0].owner, b: b[0].owner, winner, cell });
  return winner;
}

export function navalEncounters(state: GameState, events: SimEvent[]): void {
  const buckets = new Map<number, Ship[]>();
  for (const s of state.ships) { const b = buckets.get(s.cell); if (b) b.push(s); else buckets.set(s.cell, [s]); }
  const fought = new Set<number>();
  removedNow = new Set();
  const gone = removedNow;
  const alive = (s: Ship) => !gone.has(s);
  try { encounterLoop(state, events, buckets, fought, alive); } finally {
    removedNow = null;
    if (gone.size) state.ships = state.ships.filter(s => !gone.has(s));
  }
}

function encounterLoop(state: GameState, events: SimEvent[], buckets: Map<number, Ship[]>, fought: Set<number>, alive: (s: Ship) => boolean): void {
  for (const w of state.ships.slice()) {
    if (w.kind !== 'warship' || fought.has(w.id) || !alive(w)) continue;
    const near = neighbourhood(state, w.cell, buckets).filter(alive);
    // Battles with enemy warships (escorts included).
    const enemy = near.find(x => x.kind === 'warship' && hostile(state, w.owner, x.owner) && !fought.has(x.id));
    if (enemy) {
      const mine = near.filter(x => x.owner === w.owner && x.kind !== 'trade');
      const theirs = near.filter(x => x.owner === enemy.owner && x.kind !== 'trade');
      for (const s of [...mine, ...theirs]) fought.add(s.id);
      battle(state, mine, theirs, w.cell, events);
      if (!alive(w)) continue;
    }
    if (w.order.type !== 'patrol' && w.order.type !== 'raid') continue;
    for (const t of near) {
      if (!alive(t) || !alive(w)) continue;
      if (t.kind === 'transport' && hostile(state, w.owner, t.owner)) {
        const guarded = near.some(x => alive(x) && x.kind === 'warship' && x.owner === t.owner);
        if (!guarded) removeShip(state, t, events);
      } else if (t.kind === 'trade') {
        const r = state.tradeRoutes.find(x => x.id === t.routeId);
        const prey = (x: CountryId) => hostile(state, w.owner, x) || piracyHooks.licensed(state, w.owner, x);
        if (!r || r.captured || !(prey(r.exporter) || prey(r.importer))) continue;
        const guarded = near.some(x => alive(x) && x.kind === 'warship' && x.order.type === 'escort' && (x.order as { routeId: number }).routeId === r.id && hostile(state, w.owner, x.owner));
        if (guarded) continue;
        const value = r.amount * state.countries[r.exporter].prices[r.good];
        r.captured = true;
        state.countries[w.owner].money += value;
        state.countries[w.owner].income += value;
        t.pathPos = 0; t.dir = 1; t.cell = t.fromCell;   // the cargo is gone; the ship starts its voyage again
        events.push({ type: 'shipCaptured', ship: t.id, owner: t.owner, by: w.owner, value });
      }
    }
  }
}

export function shipBuildTick(state: GameState, events: SimEvent[]): void {
  const due = state.shipBuilds.filter(b => b.doneTick <= state.tick);
  if (!due.length) return;
  state.shipBuilds = state.shipBuilds.filter(b => b.doneTick > state.tick);
  for (const b of due) {
    const pc = portCell(state.map, b.state);
    const st = state.states[b.state];
    if (pc < 0 || st.owner !== b.country || !state.countries[b.country].alive) continue; // yard lost while building
    const ship: Ship = { id: state.nextId++, owner: b.country, kind: b.kind, cell: pc, fromCell: pc, toCell: pc, pathPos: 0, dir: 1, order: { type: 'idle', port: b.state }, hp: 1 };
    state.ships.push(ship);
    events.push({ type: 'shipBuilt', country: b.country, ship: ship.id, kind: b.kind });
  }
}

export function monthlyShipUpkeep(state: GameState): void {
  for (const s of state.ships) {
    const up = SHIPS[s.kind].upkeep;
    if (!up) continue;
    const c = state.countries[s.owner];
    c.money -= up; c.income -= up;
  }
}

export function validOrder(state: GameState, s: Ship, order: ShipOrder): string | null {
  const g = getNavGrid(state.map);
  switch (order.type) {
    case 'idle': {
      if (!portStates(state, s.owner).includes(order.port)) return 'not your port';
      return canReach(state, s.cell, portCell(state.map, order.port)) ? null : 'unreachable';
    }
    case 'patrol': case 'raid':
      if (!(order.cell >= 0 && order.cell < g.sea.length) || !canReach(state, s.cell, order.cell)) return 'unreachable';
      return null;
    case 'escort': {
      const r = state.tradeRoutes.find(x => x.id === order.routeId);
      if (!r || (r.exporter !== s.owner && r.importer !== s.owner)) return 'no such route';
      return canReach(state, s.cell, portCell(state.map, r.fromState)) ? null : 'unreachable';
    }
    default: return 'bad order';
  }
}

handlers.buildShip = (state, cmd: Extract<Command, { type: 'buildShip' }>) => {
  const def = SHIPS[cmd.kind];
  if (!def || cmd.kind === ('trade' as string)) return 'bad ship';
  const lvl = shipyardLevel(state, cmd.state, cmd.country);
  if (!lvl || portCell(state.map, cmd.state) < 0) return 'needsShipyard';
  if (state.shipBuilds.filter(b => b.state === cmd.state).length >= lvl) return 'shipyardBusy';
  const c = state.countries[cmd.country];
  if (c.money < def.cost) return 'cantAfford';
  for (const gName of GOODS) if ((def.inputs[gName] ?? 0) > c.stockpile[gName]) return 'needsGoods';
  c.money -= def.cost;
  for (const gName of GOODS) c.stockpile[gName] -= def.inputs[gName] ?? 0;
  state.shipBuilds.push({ id: state.nextId++, country: cmd.country, state: cmd.state, kind: cmd.kind, doneTick: state.tick + def.buildDays * TICKS_PER_DAY });
  return null;
};

handlers.orderShip = (state, cmd: Extract<Command, { type: 'orderShip' }>) => {
  const s = state.ships.find(x => x.id === cmd.shipId && x.owner === cmd.country);
  if (!s || s.kind === 'trade') return 'no such ship';
  if (cmd.order.type === 'return') {
    const port = nearestOwnPort(state, s.owner, s.cell);
    if (!port) return 'no port on that sea';
    s.order = { type: 'idle', port };
    sailTo(state, s, portCell(state.map, port));
    return null;
  }
  const bad = validOrder(state, s, cmd.order);
  if (bad) return bad;
  s.order = cmd.order;
  const target = cmd.order.type === 'idle' ? portCell(state.map, cmd.order.port)
    : cmd.order.type === 'escort' ? portCell(state.map, state.tradeRoutes.find(r => r.id === (cmd.order as { routeId: number }).routeId)!.fromState)
    : (cmd.order as { cell: number }).cell;
  sailTo(state, s, target);
  return null;
};

systems.day.push((state, events) => { shipBuildTick(state, events); moveShips(state, events); navalEncounters(state, events); });
systems.month.push(state => monthlyShipUpkeep(state));
