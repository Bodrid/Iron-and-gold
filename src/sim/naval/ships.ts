// Ships at sea: trade ships shuttling their routes, warships and transports following orders; building them; port loss.
import { SHIPS } from '../../content/ships';
import { GOODS } from '../../content/goods';
import { TICKS_PER_DAY } from '../calendar';
import { handlers, systems } from '../registry';
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

export function removeShip(state: GameState, s: Ship, events: SimEvent[] | null): void {
  state.ships = state.ships.filter(x => x !== s);
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
  const bad = validOrder(state, s, cmd.order);
  if (bad) return bad;
  s.order = cmd.order;
  const target = cmd.order.type === 'idle' ? portCell(state.map, cmd.order.port)
    : cmd.order.type === 'escort' ? portCell(state.map, state.tradeRoutes.find(r => r.id === (cmd.order as { routeId: number }).routeId)!.fromState)
    : (cmd.order as { cell: number }).cell;
  sailTo(state, s, target);
  return null;
};

systems.day.push((state, events) => { shipBuildTick(state, events); moveShips(state, events); });
systems.month.push(state => monthlyShipUpkeep(state));
