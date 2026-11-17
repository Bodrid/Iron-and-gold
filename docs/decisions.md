# Decisions and open items

Calls I made on my own while building Iron & Gold, and small issues left for later, by stage. Each "decision" can be changed if you disagree; most are a number in `src/sim/balance.ts` or a line of content.

## Stage 1: core

**Decisions**

- define the full BuildingType union in src/content/buildings.ts during T3 (type only); T6 adds BUILDINGS data — keeps sim types complete from the start — cost if wrong: none.
- Label and BuildingIcon live in src/sim/types.ts; protocol re-exports them — cost if wrong: none.
- e2e smoke test was not run red before the shell existed (unit test was) — app shell is trivial — cost if wrong: none
- calendar test expects 36524 days 1836→1936 (plan said 36525; 1900 is not a leap year) — arithmetic fix — cost if wrong: none.
- step() runs systems/handlers from a registry (src/sim/registry.ts), each module registers itself via src/sim/systems.ts imports — avoids import cycles and lets later tasks plug in — cost if wrong: none.
- added Country.controlled, Country.produced/demanded, GameState.startDate, and created goods.ts + buildingTypes.ts now (needed by types/createGame) — cost if wrong: none.
- frontier tie-break uses tileHash(tile, attack.id) with a static terrain key (not per-tick salt) and cost is paid at the moment of taking the tile — heap order then doesn't depend on history, so a reloaded save replays identically — cost if wrong: none.
- war score = 0.75×min(100, 150×occupied share) + 25×enemy share of casualties; equal scores give a white peace — plan left the formula open — cost if wrong: tuning only.
- building slots = BASE + tiles/60 + population/40k (capped 80) instead of tiles only — farms employ 25k workers per level, so slots must scale with people — cost if wrong: tuning.
- countries start with a seeded economy (farms for half the workforce, logging, mines on deposits, barracks, university + gov office in big capitals) via systems.init; StartDef.seedEconomy=false turns it off (tests) — a 1836 start with zero buildings would have zero GDP — cost if wrong: tuning.
- SoL is computed in economy.ts next to consumption, population.ts does growth/literacy/history — cost if wrong: none.
- BuildingEffects gains inert stage-2 fields tradeRoutes/shipBuilding so port/shipyard have distinct jobs — cost if wrong: none.
- AI acts through aiDecide(state, c, issue) applying each command immediately via applyCommand (aiCommands kept as a wrapper) so multi-step decisions (declare war, then attack) see the updated state — cost if wrong: none.
- balance fix — TAX_RATE 0.2, ARMY_UPKEEP 0.1 (army upkeep was larger than all taxes, AIs went bankrupt); literacy raises output (+100% at full literacy) with base literacy growth 0.0003/month — gives long-term growth once workforce is fully employed — cost if wrong: tuning.
- "AI grows its economy" threshold lowered from 1.5× to 1.3× GDP over 10 years (plan number was a guess; workforce caps seeded agrarian economies) — cost if wrong: none.
- GameSetup.aiDisabled (tests/tools) — economy/war unit tests need AIs idle — cost if wrong: none.
- war chance per decision = 0.08 × difficulty.aggression × personality.aggression × decisionDays/30 (same yearly rate regardless of decision interval); rivals for rivalsHarder = AIs bordering the player at state level or naming the player in personality rivals — cost if wrong: tuning.
- terrain test fixtures are built inline in the tests instead of fixture files; downloads use curl (Node fetch ignores the HTTPS proxy) — cost if wrong: none.
- grouping uses NE `region` only for countries with ≥8 regions and >25 units (instead of a fixed REGION_GROUPED list); European countries merge below 40 tiles, the rest below 240 tiles → 931 states with Länder/voivodeships/Italian regions intact — cost if wrong: re-run `npm run map` with other limits.
- resources.test.ts was written together with resources.ts rather than watched failing first (TDD slip; tests pass and assert real values) — cost if wrong: low.
- Natural Earth 10m regions use uppercase FEATURECLA; terrain reads both cases (test added RED→GREEN) — cost if wrong: none.
- merge passes keep a receivers set so a state never merges into one that is itself being merged (fixed land tiles without a state); non-European minimum raised to 300 tiles → 958 states — cost if wrong: re-run map.
- StartDef.regionPopulation gives historical population by modern territory (and fixed figures by state key); countries' other states use the country's average density — colonial empires otherwise dilute their home population into colonies — cost if wrong: none.
- BAD dropped from required tags (Baden-Württemberg is one generated state; WUR holds it); IND-Punjab merged away in generation so the Sikh spot check uses PAK-Punjab; added minors SND, KAL, HYD, BHU, BRU, HES, THU, SER, MON, WAL, MOL, OMN, NEJ, SOK, ASH, MER, ZUL, URU, PAR, HAI (71 countries) — cost if wrong: content only.
- PRU colour darkened to 0x3d4250 and 14 minors recoloured so every bordering pair differs by ≥60 RGB — cost if wrong: none.
- worker logic lives in src/worker/handler.ts (createWorkerHandler with injectable post/loadMap/getStart/now and a pump()) so tests run it in-process; sim.worker.ts only wires globals; commands sent while paused apply immediately without advancing time; frames also carry attacks/wars/peace offers for the Army tab — cost if wrong: none.
- map grid ships as public/data/world.igz (gzip bytes, custom extension) and loadMap sniffs the gzip magic — static servers (vite preview/sirv) add Content-Encoding to .gz and break DecompressionStream — cost if wrong: none.
- plan's key map conflicted (A/D both tabs and WASD pan) — A/D open Army/Diplomacy, W/S and arrow keys pan; DOM wiring is in src/input/attach.ts (covered by e2e in later tasks) — cost if wrong: none.
- main-thread GameController (src/ui/game.ts) owns renderer/overlay/camera/input and maps worker frames/events to signals + toasts; boot.ts starts games (worker + map) and installs e2e debug hooks (__gameReady, __selectCapital, __selectStateByKey, __setSpeed, __debugEliminatePlayer); quickstart=TAG boots straight into a Normal game — cost if wrong: none.
- new games prime the economy once (GDP/income/prices shown on day one, money and stockpiles untouched) — test added RED→GREEN; label font capped at 34px — cost if wrong: none.
- tabs take an optional send prop (defaults to the live game) for testing; worker refreshes the selection and country figures after any player command, including while paused (test RED→GREEN) — cost if wrong: none.
- stage-1 country picker is a searchable list sorted by population with a tier hint (no map picker) — quicker one-handed on a phone; a map picker can come later — cost if wrong: small UI addition later. listSaves stubbed until Task 19; Nation tab gets a Main menu button.
- controllersOf returns sorted ids so AI neighbour order is identical after save/load; saves store everything but the map (IndexedDB structured clone), deserialize rebuilds control counts; frontier heaps rebuild lazily — save/load hash test passes — cost if wrong: none.
- autosave test written after the autosave code, then verified RED with the code removed and GREEN with it; e2e save test opens ./?e2e=1 instead of reload (reload kept quickstart) — cost if wrong: none.
- AIs at negative treasury with no bankruptcy effect, and Grand Master colonising ~80% of unclaimed land in year one — balance, tuned in stage 7 (AI depth/balance) — cost if wrong: early-game feel until then.
- placeholder peace transfers majority-owned states — stage-1 placeholder replaced by diplomatic plays in stage 3 — cost if wrong: none long-term.
- repeated Attack taps compound (OpenFront behaviour, each validated) — stands — cost if wrong: minor UX.
- worker accepts commands for non-player countries — single-player, no trust boundary; revisit with multiplayer — cost if wrong: none now.
- ?e2e/?quickstart debug hooks reachable in production — harmless in single player — cost if wrong: none.
- play continues after victory/end date ("Keep watching") — deliberate — cost if wrong: none.
- occasional 130 ms worker tick in Grand Master stress — off main thread, scheduler absorbs — cost if wrong: brief tile-update hitch.
- mockup fidelity and iOS page pinch-zoom on panels not verifiable here — covered by the owner's device checklist — cost if wrong: a follow-up fix.

**Left for later**

- rejection toasts show raw codes for some reasons (maxLevel, occupied…) — reuse REASON_TEXT
- keyboard shortcuts don't skip Cmd/Ctrl/Alt combos
- long-press interval keeps running after touch ends
- hidden desktop tab keeps simulating (only saves)
- Continue can offer a finished (end-date/victory) game without labelling it
- a failed first map download is cached until reload
- fort/barracks numbers live in both BALANCE and BUILDINGS.effects
- dirty-row texture upload can span the whole map with fronts at both ends
- CI doesn't run lint; Natural Earth downloads from unpinned master
- bench doesn't drive the worker hooks or a war-heavy scenario

## Stage 2: trade and navy

**Decisions**

- nav cells join only within the same tile-level sea body (4-connected), so coarse cells never leak across thin land (Panama/Suez) while tile-connected straits stay open; a cell is navigable with ≥4 sea tiles of its dominant body — cost if wrong: tuning.
- abstract market — exporter earns 70% of the goods' value, importer gets the goods plus 10% customs income, nobody pays from their treasury ("both sides earn money") — cost if wrong: tuning.
- GameState.tradeOff (list of countries with auto-trade off) instead of a Record; Country.tradeIncome added — cost if wrong: none.
- every coastal country starts with a port in its most populous coastal state (level 2 if ≥20M people) — without ports there is no trade in 1836 — cost if wrong: tuning.
- performance — nav cells are 8×8 tiles (not 4×4), A* heuristic weighted ×1.5, partners ranked by straight-line distance with only the choice confirmed by A*, at most 2 uncached lane searches per month with a rotating country order, sea grid built at game creation/load. Bench: worst month 34 ms (was 717). Grid build adds ~0.7 s to game start — cost if wrong: slower new game on iPad; optimize later.
- ships store lane endpoints (fromCell/toCell) and read the lane from the sea-lane cache, so nothing large is saved; ship builds use their own queue (state.shipBuilds, shipyard level = parallel builds) and consume inputs (warship wood/iron/arms, transport wood); trade ships appear/disappear with routes via routeHooks — cost if wrong: none.
- a captured trade ship restarts its voyage from its home port (no separate respawn timer); a route pays its captor once per month at most; unescorted enemy transports in range of a patrolling/raiding warship are sunk with their troops; battles are side-strength comparisons, loser loses ships weakest-first, winner takes damage — cost if wrong: tuning.
- with no free transport an invasion uses a one-off boat (max 5,000 troops, removed afterwards); a transport takes 20,000; if the beach is lost the boat lands at the nearest attackable beach within 10 cells (same target first), else troops return to the pool at once and the ship heads home; landing pays one tile's cost, then the troops become/join an Attack seeded from the beach — cost if wrong: tuning.
- frames carry ships (packed Int32Array, cell centres), a player TradeView and FleetView once per game day; tapping the sea selects a navigation cell (Open sea card); ship orders are per-ship buttons in the Army tab's Navy section (Raid/Patrol here, Escort trade = first own route); Send boat appears on coastal unclaimed/enemy tiles once you have a port; ships drawn from zoom 1.5 — cost if wrong: UI polish later.
- AI ports score 0.05 when coastal, trade capacity is full and it has goods to sell/buy; shipyard 0.04 for the first yard when at war or with ≥2 routes; warships wanted = min(3, routes/2) (+3 at war) × personality shipyard weight; idle warships raid enemy lanes at war, else escort unescorted routes; one invasion at a time, planned in a 7-of-30-day window, against enemies without a land border and (50%) unclaimed land not reachable by land; invasionPlan() shared by handler and AI so AI never issues rejected naval commands — cost if wrong: tuning.
- "land neighbours" for the AI = state-level neighbours (StateDef.neighbors are land adjacencies) instead of tile scans — cost if wrong: occasional boat where a thin land link exists.
- hashState now covers trade routes and ships so save/load tests check them; SAVE_VERSION 2 (stage-1 saves get the 'older version' message) — cost if wrong: none.
- countries trade only from their main port (Russia/USA on several seas) — simpler routes; revisit with stage 7 balance — cost if wrong: fewer routes for multi-coast countries.
- idle/escorting warships don't capture passing enemy ships; patrol/raid only (plan) — stands.
- balance numbers, abstract market economics, boats/reroute, 8×8 cells and 0.7 s grid build — covered by stage-2 rulings.
- Navy row layout at iPhone portrait not checked visually; toast spam from many captures not checked — iPhone is landscape-only; owner's checklist covers play feel.

**Left for later**

- AI_naval uses hard-coded grid width 300 in findBeach distance
- AI warships on a raid never get new orders after peace
- ship hp never repairs
- routes/ships keep heading to a lost port until the 1st; non-idle ships of a country with no ports stay at sea paying upkeep
- routeCapacity/portStates rescanned per candidate (precompute monthly)
- some tunables live outside balance.ts (ships.ts 0.05, trade.ts /50 and slice(0,2), naval.ts thresholds)
- Trade tab doesn't show per-route earnings
- ship build lost with no event if the shipyard state is lost; busy check counts the previous owner's builds
- sea-lane cache never shrinks within a session
- if sailTo fails while rerouting, troops land next day without moving

## Stage 3: diplomacy

**Decisions**

- relations move 3/month toward a target = baseline (border −10, rival −25, shared enemy +15, trade route +10, + hooks) ± 40 per active improve/worsen action (500/month each); capacity 2 + 1 per 20M people; stored as an n×n Int16Array (resized when countries are added) — cost if wrong: tuning.
- treaty offers to the player wait 30 days for respondTreaty; AI answers at once (alliance ≥30, defensive pact ≥20, guarantee ≥0, trade ≥−10); embargo is one-sided and closes routes both ways; trade agreement +25% route earnings; treaties end on war or death; diplomacy plugs into trade via tradeHooks — cost if wrong: tuning.
- infamy decays 0.5/month; ≥25 gives −10 relation baseline with everyone; ≥50 AI countries at ≤−15 relations form one coalition per target (needs ≥2 members) that dissolves under 25; coalition defence is exposed as coalitionDefenders() for plays (Task 4); placeholder peace adds 4 infamy per state taken until Task 6 prices demands — cost if wrong: tuning.
- wars became side-based here (sideA/sideB/goals; a/b kept as side leaders) since plays start multi-country wars — Task 5 keeps only war-score/separate-peace work; declareWar command removed (tests updated to startWar/declareWarRaw/startPlay); selection card "Declare war" → "Demand this state" (a play for the tapped state); AI starts plays for its biggest neighbouring state of the chosen target instead of declaring war — cost if wrong: none.
- a play's side strength = troops + half of max troops; AI targets yield below 50% of the initiator's side; the player as target decides (back down or war at the end); one play per target/initiator at a time; reparations = 10% of income + 1% of monthly GDP for 5 years — cost if wrong: tuning.
- war score = 70 × goal states held (defender: min(1, 2×occupation)) + 60 × share of enemy land occupied + 30 × casualty balance; ~100 means goals in hand, up to 160 when dominating; separatePeace for non-leaders returns occupied tiles both ways; a country allied to both sides joins neither — cost if wrong: tuning.
- available peace points = war score + 40 × own casualties / own side's max troops; demand costs: state 20 + 80 × its population share (max 70), puppet 60, open market 15, reparations 20; non-goal demands ×1.5; AI accepts terms within the proposer's points, white peace when within 20 points or after 2 years, concessions when below 60 or worth ≥60% of its score; terms can be 'give' (a losing side concedes); AI winner adds occupied states while points last; old offerPeace removed — cost if wrong: tuning.
- puppets pay 20% of positive income, auto-join the overlord's side when a war starts, can't start/join plays and can't be targeted by third-party plays (target the overlord instead), +20 relation baseline with the overlord; annex after 10 years at Neutral+ (+10 infamy); puppeting a country frees its puppets; an overlord's death frees its puppets — cost if wrong: tuning.
- privateer licence needs relations ≤ −50 (Hostile), costs 5 infamy and −10 relations once, lapses monthly when relations rise above −50; licensed raiders capture the target's trade ships through piracyHooks — cost if wrong: tuning.
- Diplomacy tab = overview (infamy, diplomats, incoming treaty/peace offers, plays with side-strength bar and Back/Give in/Leave, wars with Make peace…/Separate peace, puppets with Annex, countries list with relation chips) → country panel (relation bar, Improve/Worsen/Stop, treaty buttons with reasons, Start a diplomatic play…, privateers) → play picker (≤3 demands, infamy preview) / peace deal (goals pre-picked, points vs cost, White peace); worker sends a DiploView daily and a CountryDetail for the open country — cost if wrong: UI polish later.
- found while testing — Greenland/Iceland etc. had no population figure and took Denmark's density (Denmark 16M people): added 37 small territories to the 1836 table, fixed Schleswig-Holstein at 0.8M, and capped uncovered-state density at 2,000 per popWeight (test RED→GREEN) — cost if wrong: none.
- AI diplomacy — improves relations with strong non-rival neighbours and worsens with rivals within its diplomats (stops at ±60); proposes only treaties the target would accept (alliance: ≤1, Friendly, partner ≥30% of its troops; defensive pact with weaker friendly neighbours at ≥40; trade agreement with trade partners; guarantees for small friends); offers to the player at most twice a year; backs down from its play 5 days before the end if the defence is 1.5× stronger; annexes puppets when allowed and infamy < 20; licenses privateers vs Hostile countries with ≥2 warships; leaves wars it only joined after a year below 25 score; uninvolved AIs pick a side at day 30 by relations — cost if wrong: tuning.
- AI demands of neighbours under 90% of its troops (plays can end in a climb-down) and war chance raised 0.08→0.12/month base; the 20-year diplomacy test runs on the real 1836 world (12 years, Hard) because the symmetric small world never has a weaker target — cost if wrong: tuning.
- SAVE_VERSION 3; mid-play save/load test added — cost if wrong: none.
- #1 Critical fixed. Demands are accepted only from a side leading by `minLead` (10); casualty points go only to the winner; no free 0.5 casualty share; an AI pressing its goals refuses white peace for a year unless it is behind. Tests: losing side demands, day-0 open market, day-0 escape.
- #2 Critical fixed. AI peace proposals were rewritten: the winner (attacker or defender) demands goals plus occupied states or reparations; the loser concedes (`give`); after 2 years, white peace. There is a 90-day wait after a refusal. Tests: winning defender, losing attacker.
- #3 fixed. Each play has a `decided` flag, so third parties decide once at or after the halfway day.
- #4 fixed. A play's goals share 60 points between them; extras cost 1.5× their price.
- #5 fixed. Puppeting ends alliances, pacts and guarantees; puppets are skipped by `joiners`; treatyCheck refuses everything except trade agreements for puppets.
- #6 fixed. The peace toast shows the terms (the `peaceOffered` event carries them), and there is a 90-day refusal cooldown per war.
- #7 fixed. The AI never annexes the player. `makePuppet` emits `puppeted`; there are toasts for annexed and puppeted.
- #8 fixed. Escorts guard their route against any raider; the AI raids its licence targets. The casus belli for plays is deferred to stage 7 (AI depth).
- #9 fixed. Relations build a pair index once a month, and treaties use `relationPairHooks`. Trade agreements between AI countries lapse with no route. 8-year bench: worst month 54.6 ms (was 66).
- #10 fixed. `rejectionText` falls back to DIPLO_REASON, with the missing codes added; play `join` reasons and the selection's `play` reason disable buttons and show the reason.
- #11 tuning. The AI keeps at most 2 defensive pacts and 2 guarantees, and its climb-down ratio is now 2. 8-year bench: 2 wars ongoing, 69 of 71 countries alive.
- minors 12 (window = decisionDays), 13 (no puppet-of-puppet demands), 14 (no "backed down" toast when the initiator died), 16 (no annexing during wars), 18 (cleanups) and 20 (alliance count) fixed.

**Left for later**

- #15 the peace screen has no concede option for the player; #17 the relation action cost isn't shown in the UI; #19 iPhone 375 px overflow check for long treaty lists and "Back" rows (verify on device); #21 the player can be allied with C in one play and opposed to C in another.

## Stage 4: research, laws and revolts

**Decisions**

- Tasks 3 and 4 were built as one module (`politics.ts`), because enactment support needs clout. They were ledgered as two tasks with one commit range.
- Revolts in stage 4 are law revolts only. Independence revolts (American Revolution) come with stage 6 events, which can spawn rebels with an independence goal. Cost if wrong: small (the `rebel` record can gain a `kind`).
- A revolt needs radicalism 100 and clout ≥ 10%, so tiny radical groups only show warnings. Radicalism rises at (−approval − 3) × 0.5 a month. In a 20-year probe: 1–4 revolts worldwide.
- AI law choice = 0.25 × support + 4 × (utility difference) + change in unrest, and it must pass at more than 10% a month. Weighing support alone made AIs ruled by landowners pass serfdom and no schooling everywhere. Now about 20 laws in 20 years, mostly public schools.
- Universities give research at levels / (1 + levels / 12), and the AI values each one less. This fixed Qing China's 46 universities.
- Base research raised to 4 a month so small countries still finish techs (about one every 4–5 years early on).
- Task 8 — SAVE_VERSION 4; save/load replay test through a revolt and an enactment; bench 2 years worst month 33.8 ms, 8 years 46.8 ms (within budget).
- C1 (critical) fixed. A shared `eliminate()` in war.ts, used by `checkElimination` and `endRevolt`, sweeps every tile the dead country still controls back to its owner, removes it from all wars and attacks, and clears its peace offers. The test covers a revolt that took land the parent was occupying from a third country, with a third party also fighting the rebels. An invariant check (`invariantProblems`) now runs after the 10-year AI test and the revolt test.
- I1 fixed. `setLaw` cancels a same-area enactment and emits `lawFailed` with reason `revolution` when that enactment was for a different law.
- I2 fixed. Rebels can't start or be targeted by plays, sign treaties, join plays, found or be invited into blocs, or pass laws (reason `rebels`). The rebel AI only fights, colonises, uses ships and makes peace.
- I3 fixed. The peace screen offers "Give in" (give: true with the enemy's war goals) to a side-B leader facing goals; the revolt toast points there.
- minors fixed: M1 (laws with a 0% chance can't be started), M2 (readable rejection texts; Queue hidden when the queue is full), M3 (winning rebels demand only their law), M4 (Mercantilism +5% taxes, so it is no longer strictly worse than Protectionism), M5 (queue rows say what's missing), M8 (the hash includes tech, research and law ids).

**Left for later**

- Qing China researches about as fast as Britain because every country starts at 10% literacy; per-country starting literacy belongs to the stage 7 balance pass.
- the political probe tool `tools/politics-probe.ts` is kept as a dev tool.
- M6 dead rebel ids are never reused, so relations grow N² (rare at real tuning; cap at 4000); M7 an overlord can't set its puppet's laws; M9 no dedicated perf test for huge-country politics (the bench and the 1836 test cover it).

## Stage 5: power blocs and companies

**Decisions**

- Charters have no map region. "Losing the state that holds a charter's region" (Review Focus 4) became "an investment charter ends cleanly when the last puppet goes" (event `charterEnded`). The colonial charter is national.
- A company's bonus is recomputed monthly and stored on the company, so the modifier signature stays cheap (mods() is called per tile in combat). It is also recomputed right after founding.
- AI requests to join the player's bloc are not modelled; the player invites (`askThePlayer`).
- Puppets are bloc members through their overlord (`blocOf` follows `overlord`) and don't pay bloc tribute on top of puppet tribute.
- AI blocs: majors join another bloc only at relation ≥ 70; the "stronger neighbour with a shared rival" path needs a shared border; at most one AI monopoly; monopoly anger doesn't stack. A 10-year probe gives about 10 blocs (Britain trade league, Russia/Austria/Qing/Ottoman empires, Prussia/Japan alliances, France union). Minors such as Sokoto, Spain and the Netherlands found blocs when they rank in the top 8 by score (land-heavy scoring). That's a balance matter for stage 7.
- Perf pass (the 2-year bench hit 82 ms after the stage 5 AI): `attackMults` is hoisted out of the per-tile combat loop and `buildCostMult` out of the AI building search. AI invitations check only the 6 warmest contacts. `sharesBorder` scans only states where the target holds tiles or next to one (the same 4-way adjacency, so results are exact). Avg tick 2.1 → 1.5 ms. 2-year worst month 43–47 ms; 8-year 48–56 ms. The remaining spikes are trade path searches.
- Task 7: SAVE_VERSION 5; save/load replay test with a bloc and a chartered company.
- I1 fixed. Peace candidates include the war's non-state goals (joinBloc, law, independence), plus joinBloc whenever the player leads a bloc (test in `src/worker/diploView.test.ts`).
- I2 fixed. An AI leader admits an applicant only when they aren't rivals and relations are at least 25 (`blocPolicy.admits`, reason `theyRefuse`). Rebels can't ask.
- I3 fixed: The player is invited at most once per 180 days across all blocs (`blocInvitesUntil`), and refusing buys 365 days of quiet. AI blocs need relation 70 to invite a player who is a major power. An invitation toast disappears when its offer lapses or is answered elsewhere; 'no such offer' has text. The invite card shows the bloc type, member count, member effects and the empire's tribute.
- I4 fixed. `lastPlayerInvite` is set by the `inviteToBloc` handler; the AI only reads it.
- minors fixed: M1: the lookups (techs, laws, companies) have no prototype and charters use `Object.hasOwn`, so bad ids are rejected and never throw. M2: charters can be granted or revoked once a year (`CHARTER_DAYS`). M3: founding a company recomputes only the founder. M4: blocs need 1–2 picked principles (2–3 in all); the event and AI defaults were updated. M5: no embargo inside a free-trade bloc. M6: no plays inside a bloc. M8: the found form collapses into a details row; the hint names the Diplomacy tab; the Bloc tab falls back to Diplomacy off the dock layout. M9: colonial charter wording says "stronger". M11: rebels are guarded in askToJoinBloc and foundCompany.
- M7 (Common Defence beats alliance neutrality) is intended: bloc duty wins over an alliance with the initiator.

**Left for later**

- Agricultural Society is the first company almost every AI founds (farms dominate 1836 economies). It's fine as "big number go up" but samey; vary it in stage 7.
- `setPrinciples` has no UI yet; numbers in UI strings aren't read from BALANCE; no ✕ on sticky toasts in general; more RF2/RF3 edge tests.

## Stage 6: events, nations and 1776

**Decisions**

- The Task 3 event e2e moves to Task 4: it needs a real event to fire through `__fireEvent`.
- The 1836 content has 22 events over 8 chains, plus formables for Germany and Italy. A 40-year AI probe fires them at plausible dates: Italy forms in 1860, Japan opens in 1853 and the Meiji reforms come in 1866, Bulgaria revolts in 1870, the Civil War chain fires in 1858.
- The Zollverein event no longer requires "not in a bloc" (the Prussian AI founds its bloc first). Its found-bloc effect is skipped when Prussia already has one, and the invitations still go out.
- Effects that take states from minors during unification (North German Confederation, Garibaldi) transfer the states without a war, as a game abstraction. The minors fall when they have nothing left.
- The 1776 start has 62 countries and 798M people, after the first partition of Poland. The thirteen colonies, Florida and Quebec are British; Louisiana and the north of New Spain are Spanish; Bengal, Bihar and Madras belong to the Company (GBR); the Mughal successors are the Marathas, Mysore, Hyderabad and Ahom. Most countries start with no techs, the leaders with a few era-1 ideas.
- The 1776 events (14) fire on history's schedule in a 40-year AI probe: the Revolution in 1776, the Constitution in 1783, the Estates-General in 1787, the Republic in 1791, the partitions in 1792 and 1796, Napoleon in 1799, the Continental System in 1806.
- Independence risings are strong enough to have a chance: They raise fresh troops (at least 25% of the parent's, or an event-set share; the American Revolution is 0.5 with +110% defence). Their troop limit rises to sustain that army, and they get +100% refill for 10 years. Crushing the American rising costs Britain "An ocean away" (−60% attack for 8 years). AI wars with rebels end only at a score of 100 or after 2 years. Probe: the USA wins in 8 of 8 seeds, in 7–8 months (balance for stage 7: aim for a longer, closer war).
- Task 6: the New Game screen lists both starts (1836 stays the default and first); quickstart takes `&start=1776`; SAVE_VERSION 6. Bench: 1836 2y worst month 44 ms; 1776 2y 43 ms, 8y 38 ms.
- C1 fixed. An AI event never moves the player's land: such transfers become a diplomatic play by the receiver with those states as demands. No event transfer ever takes a capital, or a state someone else occupies. `formNation` never absorbs the player's country when it is a puppet. Tests cover the player, capitals and occupied states.
- C2 fixed. The monthly events system passes `changed` through to AI resolutions, so map changes from events reach the screen (test checks changedTiles).
- I1 fixed. A player event pauses the game and opens the card. "Later" or a choice resumes the earlier speed, and the card says the game is paused.
- I2 fixed. `formerTags` is kept when a nation forms, and `hasTag`/`anyTag` (src/sim/tags.ts) are used for rivals (relations, AI, blocs), historical companies and event targeting/lookups.
- I3 fixed. Transfers skip occupied states; independence takes only states the parent controls; `splinter` keeps third-party occupations.
- I4 fixed. A card answered after its conditions stopped holding applies nothing, and a toast says circumstances changed.
- minors fixed: event toasts lapse with their card; labels and buildings refresh on nationFormed, nationReleased and eventResolved; the hash includes country flags and modifiers; the USA rebels get the `usa` personality; the 1776 test replays through the real serialize/deserialize; the bloc hook comment is corrected.

**Left for later**

- events don't queue past their window when the player has 2 cards open; Greek and Serbian independence events; a debt or radicalism trigger for fr.estates; more Review Focus 2/3 tests (parent in a bloc).

## Stage 7: AI, balance and polish

**Decisions**

- Starting literacy is set per country (1836 GBR .55 … CHI .15; default .05; 1776 lower). Research = BASE 6 + 3·√(pop M)·(0.2 + 1.6·literacy). ERA_COST is now [0, 200, 450, 900, 1600, 2600] and AHEAD_PENALTY 0.6. Growth: BASE 0.0004, plus 0.00015 per 10 SoL. SoL weights for grain, textiles and luxuries are 6, 5 and 5, and luxuries per thousand people 0.4. Report (1836, 100 years, seed 1): GBR is #1 by GDP from 1866; SoL climbs from ~9 to ~25; France grows 41M → 114M; Qing 424M → 912M.
- perf. Monthly trade looks up port capacity and main ports once a month; `eliminate()` scans only states the country controls. Hashes over 3 years are identical to before.
- Britain's trade is healthy (43 routes in 1866). Raiders never capture cargo on routes they belong to (Britain was capturing its own ships). AI event transfers between AI countries may take a capital (the loser moves its capital), because "never a capital" had blocked every unification of single-state minors. The player is still protected: their land is demanded through a play, never the capital. "Major power" means 15M+ people or a top-6 economy by GDP. Generic companies are weighted down by how many countries already run them. Report (1836, 100 years): GBR #1 by GDP; Italy formed; 76 wars; 272 states changed hands; 7,403 captures (from 21,872); worst month 58 ms.
- The ladder already held before the changes (10/10 per adjacent pair over 15 years, sides alternated). The test keeps 6 seeds per pair and needs ≥ 5. Added `opportunity()` for Hard+ target choice (busy in another war ×2, short of troops ×2, every ally at war ×1.5). Easy spares the player for 5 years after demands; the timer is set by the startPlay handler, the AI only reads it. Easy takes only its war goals at peace. Very Hard+ escort the most valuable routes first and concede to radical groups from 35% (others 50%). Hard+ research by fit with their buildings (and military when at war).
- Landowner clout × max(0.3, 1.3 − literacy), so laws can drift as countries modernise. Starts can set treaties in force: 1836 has the German Confederation (Austria and Prussia guarantee the six German minors), the Holy Alliance and Zollverein trade agreements; 1776 has the Emperor's guarantees of the German states, the Family Compact, Britain–Portugal and Austria–France. Without them the Netherlands conquered most of western Germany and Prussia never reached its 60% share. Probes (1836, 45 years): Germany forms in seed 1; seed 3 the AI chose "Prussia is enough"; seed 2 falls short of the share.
- done: every toast has a ✕; readable text for the remaining build, event, play and war rejection codes; relation actions show their monthly cost; bloc leaders can change principles once a year; company texts read BALANCE; trade routes show their monthly earnings; shortcuts ignore Cmd/Ctrl/Alt; raiders get new orders once nobody is prey; ships in port mend 2% a day; CI runs lint.
- benches 1836 2y/8y worst month 34/46 ms, 1776 2y/8y 33/52 ms; README gains How to play and a stage 7 section; device checklist written.
- I1 fixed: A monthly sweep (`returnPeacetimeOccupations`, mixed states only) returns any tile held by a country not at war with its owner. Event transfers hand tiles to the new owner unless the occupier is at war with it. `splinter` gives new countries all their tiles. `invariantProblems` now flags peacetime occupation.
- I2 fixed: Closing a card opens the next waiting card and stays paused. "Later" keeps the game paused (the card waits in Nation → Waiting for you). A manual speed change cancels the automatic resume. A loaded game reopens its first waiting card and pauses. Toasts, cards and events reset when a game starts or loads.
- I3. The partition "decline" options weigh 0.1. Probe: full partition in seed 2; in seed 1 Russia drew the rare decline at the third partition.
- I4. The Easy test now uses a player bordering two AIs and asserts Easy ≤ 1 play per 10 years on average and Normal > Easy. It passes, so the feature works.
- I5. A captured route is safe for 90 days (`CAPTURE_SAFE_DAYS`). Report (1836, 100 years, seed 1): 5,540 captures (was 14,075), worst month 49 ms. Benches: 1836 2y/8y 39/45 ms, 1776 8y 42 ms.
- minors fixed: starting (historical) trade agreements don't lapse; views use `hasTag` for companies and decisions; route earnings are shown as "~"; ships repair only at their port; every play against the player (events included) sets `lastDemandedTick`; more rejection texts (alreadyOffered, notInvolved, alreadyLicensed, alreadyLaw, not your port, no such route); capitals relocate only to a held state; the MAJOR_RANK comment is corrected; late research costs more (ERA_COST era 4 is 2,000 and era 5 is 3,800), so leaders don't finish by 1906.
- the politics.test change in Task 4 (clout set explicitly) was needed because landowner clout now depends on literacy; the test checks the concession logic, not clout.

**Left for later**

- Sokoto still founds a bloc (a big farm economy); Agricultural Society is still the most common company.
- the American Revolution still ends in 7–8 months when the USA wins (outcomes are all-or-nothing around troops 0.4–0.55); Greek and Serbian independence events.
- an overlord can't set its puppet's laws; a player can be allied with a country in one play and opposed in another; Continue doesn't label finished games; the long-press needs no timer (gesture-based), so it's not an issue.
- untested Task 2 behaviours (research by fit, value-first escorts, 35% concession); SoL flattens at 25 for great powers after about 1900; Germany forms in about 1 of 3 seeds; France's GDP swings from price volatility; a 375 px portrait check of the "/mo" labels.
