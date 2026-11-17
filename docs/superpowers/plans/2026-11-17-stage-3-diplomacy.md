# Iron & Gold — Stage 3 (Diplomacy) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace stage 1's "declare war" placeholder with Victoria-style diplomacy: relations, treaties, infamy and coalitions, diplomatic plays with a countdown in which other countries pick sides, multi-country wars, peace deals where dominating (and bleeding) earns extra demands, puppets, and privateer licences — played by the AI too.

**Architecture:** New deterministic modules under `src/sim/diplomacy/` registered with the existing systems/handlers registry. Wars become side-based (`War.sides`), and every war comes from a play (except revolts in stage 4). Peace deals are explicit term lists priced in "peace points". The Diplomacy tab becomes the hub (country list → country panel → actions; plays in progress; peace deal screen).

**Tech Stack:** unchanged.

**Spec:** `docs/superpowers/specs/2026-11-17-iron-and-gold-design.md` — "Diplomacy (Victoria 3)", "Power blocs, puppets…" (puppets only; blocs are stage 5), "Trade and piracy" (privateers), AI.

## Global Constraints

- All earlier Global Constraints apply (determinism, commands, content as data, iOS UI rules, perf budget: bench avg ≤ 6 ms, p95 ≤ 20 ms, worst month ≤ 60 ms).
- **No surprise attacks:** attacking another country requires a war, and wars start only from a diplomatic play (or, later, revolts). `declareWar` is removed.
- Relations levels: Hostile (≤ −50) → Cold (≤ −15) → Neutral → Cordial (≥ 15) → Friendly (≥ 50), range −100..100.
- Treaties: alliance, defensive pact, trade agreement, guarantee of independence, embargo.
- Demands in plays: take a state, make a puppet, open market (forced trade agreement), reparations. ("Join our power bloc" arrives with blocs in stage 5.)
- War score can exceed 100% of the war goal; the excess **plus the winner's own casualties** become points for extra demands. The AI gets the same.
- Infamy rises from taking land and puppets; high infamy makes others hostile and can form coalitions.
- Privateer licences: warships may raid ships of countries you are **Hostile** with, at an infamy cost.
- Saves: `SAVE_VERSION` 3.

## Review Focus

1. **A play's target or a backer dies, or two plays involve the same countries at once** → plays resolve or cancel cleanly; no war with a dead side; a country can't be on both sides (test in Task 4).
2. **Allies dragged into overlapping wars** (A allied to B and C, B and C fight) → the alliance with the attacker is not honoured against another ally; nothing loops or deadlocks (test in Task 5).
3. **Peace terms that no longer make sense by the time they are accepted** (state already transferred, puppet already annexed) → those terms are skipped, the rest applied (test in Task 6).
4. **Puppet of a puppet, or a puppet whose overlord is eliminated** → no chains; the puppet becomes independent when its overlord dies (test in Task 7).
5. **The player sits at 0 diplomatic capacity / can't afford actions** → buttons say why; nothing silently fails (test in Task 9).

---

## File Structure

```
src/sim/diplomacy/relations.ts   relation values, monthly drift, levels, improve/worsen actions, diplomatic capacity
src/sim/diplomacy/treaties.ts    alliance, defensive pact, trade agreement, guarantee, embargo; proposals and AI acceptance
src/sim/diplomacy/infamy.ts      infamy gain/decay, coalitions
src/sim/diplomacy/plays.ts       diplomatic plays: start, countdown, sides, back down or war
src/sim/diplomacy/peace.ts       peace points, terms, proposals, acceptance, applying terms
src/sim/diplomacy/subjects.ts    puppets: tribute, war joining, annexation, independence
src/sim/war.ts                   side-based wars (replaces the placeholder), war score per side
src/sim/naval/ships.ts           privateer licences in captures
src/sim/ai/diplomacy.ts          AI: relations, treaties, plays, sides, peace, puppets
src/content/diplomacy.ts         demand costs, infamy per demand, AI interest weights
src/ui/tabs/DiplomacyTab.tsx     country list, country panel, plays, peace deal screen
src/ui/components/PlayCard.tsx, PeaceDeal.tsx
```

---

### Task 1: Relations and diplomatic capacity

**Interfaces:** `GameState.relations: Int16Array` (n×n, symmetric, index a*n+b; rebuilt when countries are added), `relation(state, a, b): number`, `level(value): 'hostile'|'cold'|'neutral'|'cordial'|'friendly'`, `monthlyRelations(state)` (drift toward a baseline: shared border −10, rival tag −25, shared enemy +15, trade route between them +10, treaty +20; ±2/month toward baseline), commands `improveRelations {country, target}` / `stopImproving`, `worsenRelations {country, target}`; `diploCapacity(state, c) = 2 + floor(population/20M)` active improve/worsen actions, each moves the pair +3/−3 per month and costs `RELATION_ACTION_COST` per month.
- [ ] Failing tests: relations start from content baselines (rivals cold), drift monthly, improving raises relations and uses capacity, capacity limit rejects the extra action with reason `noCapacity`, symmetric values. → implement → pass → commit `feat: relations`.

### Task 2: Treaties

**Interfaces:** `Treaty { id; kind: 'alliance'|'defensivePact'|'tradeAgreement'|'guarantee'|'embargo'; a; b; since }`, `GameState.treaties`, commands `proposeTreaty {country, target, kind}` (AI answers at once via `aiAcceptsTreaty`; to the player it becomes an offer with toast + respond command), `cancelTreaty {country, treatyId}`; rules: alliance/defensive pact need Cordial+, guarantee needs Neutral+ and the guarantor stronger, embargo is one-sided (no consent) and ends trade routes between them and blocks new ones; trade agreement adds +25% trade earnings between the pair and permits routes even when Cold; cancelling an alliance costs −20 relations.
- [ ] Failing tests: alliance needs Cordial; embargo ends routes; trade agreement raises route earnings; guarantee requires strength; cancel. → implement → pass → commit `feat: treaties`.

### Task 3: Infamy and coalitions

**Interfaces:** `Country.infamy`, `addInfamy(state, c, n)`, monthly decay `INFAMY_DECAY` (0.5/month); at infamy ≥ 25 every country's relation drift toward the infamous country gets −10 baseline; at ≥ 50, AI countries whose relations are Cold or worse with it form a **coalition** (`Coalition { target; members }`): members get mutual defensive pacts against the target only; dissolves when infamy < 25.
- [ ] Failing tests: decay; thresholds change relations baseline; coalition forms and dissolves; coalition members join a defensive war against the target. → implement → pass → commit `feat: infamy and coalitions`.

### Task 4: Diplomatic plays

**Interfaces:** `Play { id; initiator; target; demands: Demand[]; sideA: CountryId[]; sideB: CountryId[]; endTick; }`, `Demand = { kind: 'state'; state } | { kind: 'puppet' } | { kind: 'openMarket' } | { kind: 'reparations'; amount }`, command `startPlay {country, target, demands}` (validation: not already in a play/war with them, target alive, state demands must be owned by the target, max 3 demands, needs at least Cold relations? no — any), `joinPlay {country, playId, side}`, `backDown {country, playId}`; countdown `PLAY_DAYS` 60; allies with alliances join automatically (initiator's allies only if the target isn't also their ally; defenders' defensive pacts + guarantees + coalitions); AI third parties decide to join by relations/interests/strength at day 30; at the end: if `strength(sideB) < 0.5 × strength(sideA)` the target backs down → demands applied as a peace (infamy as if won); else a war starts with those sides and war goal = demands. Infamy on start: Σ demand infamy × 0.5.
- [ ] Failing tests (incl. Review Focus 1): play countdown → war with correct sides; weak target backs down and demands apply; allies auto-join; a country already on side A can't join side B; dead target cancels the play; two plays against the same target can't run at once. → implement; remove `declareWar` command and its UI → pass (update stage-1 tests that used declareWar to start plays or use `declareWarRaw`) → commit `feat: diplomatic plays`.

### Task 5: Side-based wars and war score

**Interfaces:** `War { id; sideA: CountryId[]; sideB: CountryId[]; goals: Demand[]; leaderA; leaderB; startTick; casualties: Map-like Record<CountryId, number> }`, `atWar(a,b)` true if on opposite sides, `warScore(state, war, side: 'A'|'B'): number` (0..∞, 100 = goals achieved: occupation of goal states + share of enemy land occupied + casualty balance, scaled so occupying all goal states ≈ 100), combat/naval code uses `atWar` unchanged; leaving a war: minor members may make separate white peace.
- [ ] Failing tests (incl. Review Focus 2): ally of both sides stays out; score rises with occupation of goal states above 100 when dominating; separate peace removes a member. → implement → pass → commit `feat: multi-country wars`.

### Task 6: Peace deals with extra demands

**Interfaces:** `peacePoints(state, war, side): { goalPct: number; extra: number }` where `extra = max(0, score − 100) + CASUALTY_POINTS × ownCasualties / ownMaxTroops`; `PeaceTerms = { demands: Demand[]; white?: true }`; demand costs in `src/content/diplomacy.ts` (state cost ∝ its population share, puppet 60, openMarket 15, reparations 20); command `proposePeace {country, warId, terms}`; AI accepts if its side's score is low enough relative to the terms' cost (`aiAcceptsPeace`); terms beyond the war goals must fit within `extra`; applying: transfer states (all owned tiles), puppet, trade agreement, reparations (5 years of monthly payments), occupied tiles revert; infamy per demand. Review Focus 3: stale terms are skipped.
- [ ] Failing tests: dominating winner can take an extra state beyond the goal; heavy own casualties add points; AI refuses excessive terms; stale terms skipped; white peace. → implement → pass → commit `feat: peace deals with extra demands`.

### Task 7: Puppets

**Interfaces:** `Country.overlord: CountryId` (0 = independent), puppets pay `PUPPET_TRIBUTE` (20%) of income monthly, auto-join overlord's wars on its side, can't start plays or join others' plays, can't be targeted by third-party plays except "free them" (stage 3: target the overlord instead); command `annexPuppet {country, puppet}` allowed after `ANNEX_YEARS` (10) and relations ≥ Neutral, costs infamy; overlord eliminated → puppet independent; no puppet chains (puppeting a country frees its puppets).
- [ ] Failing tests (incl. Review Focus 4). → implement → pass → commit `feat: puppets`.

### Task 8: Privateer licences

**Interfaces:** command `setPrivateers {country, target, on}` — requires Hostile relations with target, costs `PRIVATEER_INFAMY` once and −10 relations; while on, the country's raiding warships capture the target's trade ships (not at war); the target may treat it as a casus belli (AI more likely to start a play).
- [ ] Failing tests: capture without war when licensed and Hostile; not when Cold; ends if relations improve to Cold. → implement → pass → commit `feat: privateers`.

### Task 9: Diplomacy UI

Diplomacy tab: list (relation chip, treaties icons, infamy) → country panel: relation bar, Improve/Worsen (capacity n/m), treaty buttons with reasons when unavailable, **Start a play**: demand picker (their states list, puppet, open market, reparations) with infamy preview → confirm; plays in progress: countdown, sides with strength bars, Join A/B / Back down; wars: score bar for each side, **Make peace** → peace deal screen: goals, extra points, term picker (states, puppet, market, reparations, white peace) with point costs; puppets section with Annex. Selection card "Declare war" becomes "Diplomatic play…" (opens the panel). Toasts for plays started against you, sides joining, backing down. All buttons ≥ 44 px; Review Focus 5 — disabled buttons show the reason as text.
- [ ] Failing tests: component tests for the play picker and peace deal points; e2e: as Prussia start a play on Denmark for Schleswig-Holstein, see the countdown, and at the end either Denmark backs down or a war starts. → implement → pass → commit `feat: diplomacy UI`.

### Task 10: AI diplomacy, saves, bench, docs

AI: keeps relations with rivals low and with partners high within capacity; proposes alliances/defensive pacts with friendly strong neighbours, trade agreements with trade partners; starts plays (replacing stage-1 war logic) for interest states, puppets of small neighbours, open market on big closed markets; joins sides by alliance, relations and interests; backs down when hopeless; offers/accepts peace by points; manages puppets (annexes when allowed and infamy low); uses privateers when Hostile and navy-heavy. `SAVE_VERSION` 3; bench within budget; README + `docs/stage-3-device-checklist.md`.
- [ ] Failing tests: AI never issues a rejected command over 10 years on every difficulty (existing test, now with diplomacy); a 20-year AI world produces at least one play that ends in back-down and one in war; save/load mid-play replays identically. → implement → full verification → commit `feat: AI diplomacy; chore: stage 3 saves, bench, docs` and push.
