# Iron & Gold — Stage 2 (Trade and Navies) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ports trade surplus goods along visible sea lanes for money; shipyards build warships and transports; warships raid enemy trade (piracy), escort your own and fight each other; transports carry troops across water for OpenFront-style naval invasions; the AI does all of it.

**Architecture:** A coarse sea navigation grid (4×4 tiles per cell) is built once per map; deterministic A* finds sea lanes between port cells and caches them. Trade routes, ships and transports are new deterministic simulation entities in `src/sim/naval/`, registered with the existing `systems`/`handlers` registry and validated `Command`s. Ship positions go to the main thread in each frame and are drawn on the overlay canvas. New UI: a Trade tab (5th tab), a Navy section in the Army tab, and "Send boat" in the selection card.

**Tech Stack:** unchanged from stage 1.

**Spec:** `docs/superpowers/specs/2026-11-17-iron-and-gold-design.md` (sections "Trade and piracy", "Fighting (OpenFront)" ships bullet, Interface).

## Global Constraints

- Everything in stage 1's Global Constraints still applies (determinism, commands, content as data, 44 px targets, safe areas, base path, storage prefix, 60 fps on iPad Air 5th gen / iPhone 17 Pro, speed 3 keeps up).
- Piracy in stage 2 = capturing ships of countries you are **at war** with. Privateer licences need relations and infamy and arrive with stage 3 (ruled during planning).
- Trade routes need: both countries have a port, they are not at war, both alive. Both sides earn money from every delivered cargo.
- Trade ships are visible and move along sea lanes.
- `SAVE_VERSION` becomes 2; stage-1 saves show the existing "older version" message.
- No nukes.

## Review Focus

1. **A port's state is conquered or occupied while ships are at sea** → routes from that port end cleanly, ships at sea return to another own port or are lost; nothing points at a port the country no longer owns (test in Task 3).
2. **A landlocked country, or one whose only port is on an enclosed lake** → it simply has no routes and no shipyards; AI never issues ship or route commands it can't use (test in Task 2 and Task 7).
3. **Two countries' ports with no sea path between them** (e.g. Caspian vs. ocean) → no route is created; pathfinding returns null quickly instead of searching forever (test in Task 1).
4. **Hundreds of ships at speed 3** → simulation stays within the stage-1 bench budget; frame messages carry ships compactly (test in Task 4 and the bench in Task 8).
5. **Invading with a transport whose landing tile gets taken before arrival** → troops land at the nearest coastal tile you can attack, or return home; never vanish silently (test in Task 5).

---

## File Structure

```
src/sim/naval/nav.ts          NavGrid (4×4 cells), port cells, A* sea lanes with cache
src/sim/naval/trade.ts        trade routes: creation, monthly delivery, income, cancellation
src/sim/naval/ships.ts        ship entities: trade ships, warships, transports; movement, capture, combat
src/sim/naval/invasion.ts     transports landing troops as attacks
src/content/ships.ts          ship kinds: cost, upkeep, speed, strength, capacity
src/sim/types.ts              + TradeRoute, Ship, ShipKind, new Command and SimEvent variants
src/sim/balance.ts            + trade / navy sections
src/sim/ai/naval.ts           AI: shipyards, warships, raiding, escorts, invasions
src/worker/protocol.ts        + ships in frames, trade routes in summaries
src/render/overlay.ts         + ship drawing
src/ui/tabs/TradeTab.tsx      routes, income, cancel, auto-trade toggle
src/ui/tabs/ArmyTab.tsx       + Navy section
src/ui/components/SelectionCard.tsx  + Send boat
src/save/saves.ts             SAVE_VERSION = 2
tools/bench.ts                + ships in the report
```

---

### Task 1: Sea navigation grid and sea lanes

**Files:** Create `src/sim/naval/nav.ts`; Test `src/sim/naval/nav.test.ts`

**Interfaces:**
- Produces:
```ts
export const NAV_CELL = 4;
export interface NavGrid { w: number; h: number; sea: Uint8Array /* 1 = navigable */; region: Uint16Array /* connected sea id per cell, 0 = land */ }
export function getNavGrid(map: MapData): NavGrid;                    // cached per map (WeakMap); a cell is sea if ≥ 6 of its 16 tiles are Sea (lakes are not navigable)
export function portCell(map: MapData, stateId: number): number | -1; // nav cell next to the state's coast nearest its centroid; -1 if not coastal on navigable sea
export function seaPath(map: MapData, fromCell: number, toCell: number): Int32Array | null; // cells, 8-directional A*, integer costs 10/14, ties by cell index; null if regions differ; cached by (from,to)
export function cellCentre(cell: number, grid: NavGrid): [number, number]; // tile coords
```
- [ ] **Step 1: Write failing tests** — `seaPath` between two ports on the same sea returns a path whose first/last cells are the endpoints and every step is 8-adjacent sea; two ports on different `region`s return `null` without visiting more than the cells of one region; `portCell` of a landlocked state is `-1`; repeated calls return the identical cached array; test world helper: `makeTestWorld` rows with `.` sea and `~` lake.
- [ ] **Step 2: Run** `npx vitest run src/sim/naval/nav.test.ts` → FAIL.
- [ ] **Step 3: Implement** with the signatures above (binary heap from `combat.ts` extracted to `src/sim/heap.ts` and reused).
- [ ] **Step 4: Run** → PASS; also time `getNavGrid` + 100 random `seaPath`s on the real map in a test with a 2 s budget.
- [ ] **Step 5: Commit** `feat: sea navigation grid and sea lanes`.

### Task 2: Trade routes

**Files:** Create `src/sim/naval/trade.ts`; Modify `types.ts`, `balance.ts`, `systems.ts`, `economy.ts` (port effect), `content/buildings.ts` (port description); Test `src/sim/naval/trade.test.ts`

**Interfaces:**
- Produces:
```ts
export interface TradeRoute { id: number; exporter: CountryId; importer: CountryId; fromState: number; toState: number; good: Good; amount: number /* per month */; path: Int32Array | null /* cache, rebuilt on load */; createdTick: number }
// GameState gains: tradeRoutes: TradeRoute[]; tradeAuto: Record<CountryId, boolean> (default true)
// Commands: { type: 'cancelTradeRoute'; country; routeId } | { type: 'setTradeAuto'; country; on: boolean }
export function routeCapacity(state: GameState, c: CountryId): number;      // Σ port levels × BUILDINGS.port.effects.tradeRoutes
export function surplus(state: GameState, c: Country, g: Good): number;     // stockpile beyond EXPORT_KEEP_MONTHS of demand
export function shortage(state: GameState, c: Country, g: Good): number;    // demand − production − stockpile, ≥ 0
export function monthlyTrade(state: GameState, events: SimEvent[]): void;   // deliver, pay, end invalid routes, open new routes (auto)
```
Rules (numbers in `BALANCE.trade`): each month, for countries with free capacity and `tradeAuto`, pair their biggest surplus with the nearest importer whose shortage of that good is biggest (sea path must exist; not at war; importer has free capacity too); amount = min(surplus, shortage, MAX_ROUTE_AMOUNT). Delivery moves goods exporter→importer and pays the exporter `amount × exporterPrice × (1 + TRADE_MARGIN)` from the importer, and both gain `amount × price × TRADE_BONUS` extra income (trade creates value: "both sides earn"). Routes end when either side loses its port state, goes to war with the other, dies, or the surplus/shortage disappears for 3 months. A delivery whose trade ship was captured this month (Task 4) is lost.
- [ ] Steps: failing tests — two countries with ports, one with grain surplus and one short: after a month a route exists and grain moved, both incomes rose; no route without ports / when at war / when no sea path; `cancelTradeRoute` ends it and auto-trade off stops new ones for that country; capacity respected. → FAIL → implement → PASS → commit `feat: trade routes`.

### Task 3: Ships — trade ships, warships, transports; movement and port loss

**Files:** Create `src/content/ships.ts`, `src/sim/naval/ships.ts`; Modify `types.ts`, `balance.ts`, `economy.ts` (shipyard), `systems.ts`; Test `src/sim/naval/ships.test.ts`

**Interfaces:**
- Produces:
```ts
export type ShipKind = 'trade' | 'warship' | 'transport';
export interface ShipDef { kind: ShipKind; name: string; cost: number; buildDays: number; upkeep: number; speed: number /* cells per day */; strength: number; capacity: number /* troops */; inputs: Partial<Record<Good, number>> }
export const SHIPS: Record<Exclude<ShipKind, 'trade'>, ShipDef>;
export interface Ship { id: number; owner: CountryId; kind: ShipKind; cell: number; path: Int32Array | null; pathPos: number; order: ShipOrder; hp: number; routeId?: number; troops?: number; target?: number }
export type ShipOrder = { type: 'idle'; port: number } | { type: 'patrol'; cell: number } | { type: 'escort'; routeId: number } | { type: 'raid'; cell: number } | { type: 'trade'; routeId: number } | { type: 'invade'; tile: number };
// GameState gains: ships: Ship[]
// Commands: { type: 'buildShip'; country; state; kind: 'warship'|'transport' } | { type: 'orderShip'; country; shipId; order: ShipOrder }
export function moveShips(state: GameState, events: SimEvent[]): void;      // daily
```
Rules: one trade ship per route, spawned at the exporter's port, shuttling along the lane (it is what can be captured). Warships/transports are built at a state with a shipyard (shipyard level = parallel builds), cost money + inputs, appear idle at that port. When a ship's home port state is lost or occupied, idle ships move to the nearest own port; if none, they are lost (event `shipLost`).
- [ ] Steps: failing tests — route spawns a trade ship that moves along the lane and back; building a warship needs a shipyard and money and finishes after buildDays; ships ordered to patrol reach the cell; port lost → idle ship relocates / is lost (Review Focus 1). → FAIL → implement → PASS → commit `feat: ships and movement`.

### Task 4: Piracy, escorts and naval combat

**Files:** Modify `src/sim/naval/ships.ts`, `trade.ts`; Test `src/sim/naval/piracy.test.ts`

**Interfaces:**
- Produces: `export function navalEncounters(state: GameState, events: SimEvent[]): void; // daily, after moveShips` and events `{ type: 'shipCaptured'; ship; by; value }`, `{ type: 'navalBattle'; a; b; winner; cell }`.
Rules: an enemy (at war) trade ship within `CAPTURE_RANGE` cells of a warship on patrol/raid is captured: captor gains cargo value, the route's delivery that month is lost, the trade ship respawns at its port after `RESPAWN_DAYS`. Escorting warships stay with their route's trade ship; a capture attempt against an escorted ship becomes a battle. Battles: each side's total strength in range; loser loses ships in proportion (deterministic: weakest first), winner damaged. Spatial lookup via a cell→ships bucket map rebuilt daily (no O(n²) scans).
- [ ] Steps: failing tests — raiding warship captures an enemy trade ship and gains money, importer gets nothing that month; not at war → no capture; escort turns it into a battle the stronger side wins; 500 ships on the real map advance one day in < 15 ms (Review Focus 4). → FAIL → implement → PASS → commit `feat: piracy, escorts and naval battles`.

### Task 5: Naval invasions

**Files:** Create `src/sim/naval/invasion.ts`; Modify `combat.ts` (attack from a landing tile), `types.ts`; Test `src/sim/naval/invasion.test.ts`

**Interfaces:**
- Produces: Command `{ type: 'navalInvasion'; country; target: CountryId; tile: number; ratio: number }` — picks the country's nearest port with a transport (or its nearest port if the country has none, using an OpenFront-style "boat" with capacity `BOAT_TROOPS_MAX` and no transport needed — the spec's "ships carry troops across water"); troops leave the pool at once; on arrival they become an `Attack` seeded from the landing tile (land the tile as controlled first; requires war or unclaimed). If the landing tile is no longer attackable, land at the nearest attackable coastal tile within 10 cells, else sail home and return troops (Review Focus 5).
- [ ] Steps: failing tests — island conquest: a country with no land border invades unclaimed land across a strait and the tiles become its own; invading a country needs a war; landing tile lost → lands nearby / returns troops; duplicate rapid invasions never spend more troops than the pool. → FAIL → implement → PASS → commit `feat: naval invasions`.

### Task 6: Worker, overlay and UI

**Files:** Modify `src/worker/protocol.ts`, `handler.ts`, `summaries.ts`, `src/render/overlay.ts`, `src/ui/game.ts`, `src/ui/components/SelectionCard.tsx`, `src/ui/tabs/ArmyTab.tsx`, `src/ui/components/TabBar.tsx`, `src/ui/tabs/TabContent.tsx`; Create `src/ui/tabs/TradeTab.tsx`; Test `src/ui/tabs/TradeTab.test.tsx`, `e2e/navy.spec.ts`

**Interfaces:**
- Frames gain `ships: Int32Array` packed `[id, owner, kind, tileX*16+subX, tileY*16+subY]` per ship (transferable), and summaries gain `tradeRoutes` for the player and `tradeIncome`.
- Trade tab: routes (good, partner, amount, monthly earnings, Cancel), capacity used / total, auto-trade switch; empty state "Build a port to start trading."
- Army tab Navy section: ships by kind with order chips; Build warship / transport (needs a selected own state with a shipyard); per ship: Patrol here / Raid here / Escort route / Return to port — "here" is the selected sea tile (tapping sea selects a sea tile; the selection card shows "Open sea" with those actions).
- Selection card: "Send boat" on coastal enemy/unclaimed tiles you can't reach by land.
- Overlay: trade ships as small light dots, warships as triangles in the owner's colour, transports as squares; visible from zoom ≥ 1.5.
- Tab bar: phone gets 5 tabs (Build, Army, Trade, Diplomacy, Nation) — still ≥ 44 px each on 874 px wide; iPad adds no Power Bloc tab yet.
- [ ] Steps: failing tests — TradeTab lists a route and sends `cancelTradeRoute`; e2e: as GBR at speed 3 trade ships appear (`__shipCount() > 0` within 20 s), Trade tab shows routes, every button still ≥ 44 px on the iPhone project. → FAIL → implement → PASS → commit `feat: trade and navy UI`.

### Task 7: AI at sea

**Files:** Create `src/sim/ai/naval.ts`; Modify `src/sim/ai/ai.ts`, `evaluate.ts`, `content/personalities.ts`; Test `src/sim/ai/naval.test.ts`

Behaviour: build ports where trade capacity is short and surpluses exist (score from expected trade income); build a shipyard and warships when at war with a coastal enemy or when its trade income is high (Britain personality weights navy ×2); send warships to raid enemy lanes at war, otherwise escort its busiest routes; use naval invasions when at war with no land border, or to colonise unclaimed land reachable only by sea; landlocked countries never issue naval commands (Review Focus 2).
- [ ] Steps: failing tests — small two-island world: AI colonises the other island by boat within 10 years; at war, AI raids enemy trade (captures > 0 within 3 years); landlocked AI issues zero naval commands; "AI never issues a rejected command over 10 years" still passes on every difficulty. → FAIL → implement → PASS → commit `feat: AI trade, navies and invasions`.

### Task 8: Saves, bench, balance check, docs

**Files:** Modify `src/save/saves.ts` (SAVE_VERSION 2, nav/path caches rebuilt on load), `tools/bench.ts` (ships, routes), `README.md`, `docs/stage-1-device-checklist.md` → add `docs/stage-2-device-checklist.md`; Test `src/save/saves.test.ts`

- [ ] Steps: failing test — save/load mid-voyage replays identically (hash equal after 1 more year) and a version-1 save is refused with the existing message; run `npm run bench` (budget unchanged: avg ≤ 6 ms, p95 ≤ 20 ms, worst month ≤ 60 ms) with ships and routes reported; full `npm run lint && npm test && npm run test:e2e && npm run build`; commit `chore: stage 2 saves, bench, docs` and push.
