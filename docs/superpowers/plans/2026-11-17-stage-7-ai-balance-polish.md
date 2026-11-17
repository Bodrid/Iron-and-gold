# Iron & Gold — Stage 7 (AI Depth, Balance and Polish) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the difficulty levels feel different, with Grand Master playing like a sharp human. Tune the economy, politics and history so that 100 years play out plausibly. Clear the minor items deferred in the stage 1–6 ledgers that players would notice.

**Architecture:** No new systems. This stage changes AI decision code (`src/sim/ai/*`), numbers in `balance.ts` and start content, and small UI fixes. Every balance change is judged with the probes (`tools/bench.ts`, `tools/politics-probe.ts`, `tools/events-probe.ts`) and a new `tools/balance-report.ts`. That tool prints a 100-year summary (GDP and SoL ranking, wars, techs, revolts, blocs, map changes) for both starts.

**Spec:** `docs/superpowers/specs/2026-11-17-iron-and-gold-design.md`: "AI" (five levels; what higher levels do better; Grand Master's stated bonuses), "Economy" (big number go up), and Interface.

## Global Constraints

- All earlier Global Constraints apply.
- **Difficulty ladder:** across 20 mirrored seeds on the small world, Grand Master beats Very Hard, Very Hard beats Hard, and so on up the ladder, in at least 70% of seeds by final score. Easy rarely makes demands of the player: at most one play against the player per 10 years on average.
- **Plausible centuries:** in the 1836 report (3 seeds, 100 years):
  - Britain is in the top 3 by GDP in 1900, and Qing is not first in techs.
  - At least 6 wars happen and the map changes (some states change hands).
  - Revolts and independence wars happen but don't shatter the great powers.
  - SoL rises over the century for most great powers.
  - In 1776 the USA usually survives, France usually becomes a republic, and Poland usually disappears.
- The perf budget holds for 2-year and 8-year runs on both starts.
- Saves: `SAVE_VERSION` 7 only if the state shape changes.

## Review Focus

1. **The difficulty ladder test is stable**: a fixed seed set, deterministic, under 90 s in CI (Task 2).
2. **Balance changes don't break earlier behaviour tests**: when a test changes, the ledger says why (all tasks).
3. **The AI never edits state** and never issues rejected commands over 10 years on any difficulty, on both starts (Task 2).
4. **UI fixes keep every touch target at 44 px or more** and fit 375 px-wide portrait sheets on iPhone where applicable (Task 5).

---

### Task 1: Balance report tool
`tools/balance-report.ts START YEARS SEEDS` runs AI-only games and prints, per decade, the top 10 by score with GDP, SoL, techs and population, plus counts of wars, plays, revolts, independence wins, formed nations, blocs and companies, states that changed hands, and the worst month in ms. It's a dev tool with no tests; record its output in the ledger before and after each balance task.

### Task 2: AI depth and the difficulty ladder
- **Timing attacks:** Hard and above prefer plays against targets whose troops are low, who are already at war, or whose allies are busy, scored by an `opportunity()` function.
- **Trade protection:** Very Hard and above escort their most valuable routes first.
- **Research order:** Hard and above value techs by what they own (farm techs for farm economies, military techs when threatened).
- **Interest groups:** Very Hard and above head off radicalism earlier (at 35%) and pick laws that cut unrest.
- **Easy and Normal:** more mistakes (mistakeChance already exists); Easy makes demands of the player at most once every 5 years.
- **Peace:** Grand Master presses for extra demands up to its points; Easy settles for its war goals.

Tests:
- the ladder test (Review Focus 1) in `src/sim/ai/ladder.test.ts`;
- `opportunity()` prefers a weakened target;
- Easy leaves the player alone;
- no rejected commands on the 1776 start (Review Focus 3).

### Task 3: Economy and research balance
- **Per-country starting literacy:** 1836 GBR 0.55, PRU 0.6, FRA 0.45, NET 0.6, USA 0.5, SWE 0.6, AUS 0.35, RUS 0.12, TUR 0.08, CHI 0.15, JAP 0.4, India 0.05, others by region; 1776 lower. Research uses literacy more strongly (POP × √(pop/1M) × literacy × 2).
- **SoL:** check consumption and production so that a developing country's SoL climbs from about 8–12 toward 15–20 by 1900.
- **Trade:** fix Britain's zero routes (the port seeding and the route search budget).
- **Variety:** generic companies weigh "fewer founders" so that not every AI picks Agricultural Society, and the bloc founder rule needs a real great power (population ≥ 10M or top 6 by GDP).

Tests: starting literacy applied; Britain's research outpaces Qing's over 20 years (1836 world); SoL rises over 30 years for a developing test country.

### Task 4: Politics and history balance
- Landowner clout falls with industrialisation and literacy, so laws drift over the century.
- Revolt frequency stays sensible.
- The American Revolution takes longer: the rising strength becomes a modifier that decays over time.
- Event weights get a review: Civil War outcomes, unification timing.

The report checks the "plausible centuries" constraints.

### Task 5: Polish (deferred minors that players see)
- Sticky toasts get a ✕.
- Rejection toasts for every remaining raw code (sweep: build reasons, ship reasons, demand reasons).
- Relation action cost shown on the buttons.
- `setPrinciples` gets a UI (once a year).
- Numbers in UI strings (companies, charters) come from BALANCE.
- Trade tab shows per-route earnings.
- Continue labels a finished game.
- Keyboard shortcuts ignore Cmd/Ctrl/Alt combinations.
- The long-press timer stops on touch end.
- AI warships on a raid get new orders after peace.
- Ships slowly repair in port.
- An overlord can set its puppet's laws.
- A player can't be allied with a country in one play and opposed to it in another.
- CI runs lint.

Tests for each behaviour change, and component tests for the UI ones.

### Task 6: Final verification and docs
Run the full test suite, e2e and both benches. Update the README "What's in this version", write `docs/stage-7-device-checklist.md` and a "How to play" section, then commit and push.
