# Iron & Gold — Stage 4 (Research, Laws and Revolts) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Paradox-style research in three trees across eras, Victoria-style laws in eight areas backed or opposed by six interest groups, and revolts that spawn rebel countries fought like any war — for the player and the AI.

**Architecture:** Content-driven: `src/content/techs.ts` and `src/content/laws.ts` define everything; the simulation stores known techs, the research queue, current laws, law enactments in progress, and interest-group approval/radicalism per country. Effects reach existing systems through small modifier functions (`mods(state, c)`) read by economy, troops, combat, naval and growth code, so each system asks "what's my multiplier" instead of knowing about techs or laws. Revolts append a new country (relations and palette grow).

**Tech Stack:** unchanged.

**Spec:** `docs/superpowers/specs/2026-11-17-iron-and-gold-design.md` — "Research", "Laws and politics", Interface (Research tab, Nation tab with laws and interest groups).

## Global Constraints

- All earlier Global Constraints apply (determinism, commands, content as data, iOS UI rules, perf budget).
- **Three trees:** Production, Military, Society. **Eras** 1770–1810, 1810–1850, 1850–1880, 1880–1910, 1910–1940. The 1836 start begins with era-1 techs known (more for advanced countries); later start dates set their own known techs.
- Research points from population, literacy and universities (stage 1 already accumulates `researchPoints`; they are now spent). One tech at a time from a queue.
- Techs unlock buildings, give building upgrades (more output), better troops and ships, bigger troop pools, and SoL boosts.
- **Tech spread:** cost falls with the share of countries that know a tech; researching ahead of the current era costs more.
- **Eight law areas** exactly as in the spec (government, voting, trade, labour, army, taxes, education, welfare) with the listed options; every option has clear trade-offs.
- **Six interest groups:** landowners, industrialists, workers, clergy, army, intellectuals. Passing a law takes months and needs enough support. Groups angry long enough revolt: rebels appear as a new country with troops; civil wars use the normal war system.
- Phone tab bar: six tabs (Build, Army, Trade, Diplomacy, Research, Nation) — each still ≥ 44 px wide at 874 px. Laws and interest groups live in the Nation tab.
- Saves: `SAVE_VERSION` 4.

## Review Focus

1. **A rebel country is created mid-war, mid-play, or while the parent is a puppet** → relations, palette, wars and plays all handle the new id; the rebel never inherits treaties (test in Task 5).
2. **The player enacts a law, then loses the war / the state / its support midway** → the enactment ends cleanly with a clear message; nothing stays half-applied (test in Task 3).
3. **Researching with 0 research points, an empty queue, or a tech whose prerequisites are lost** (prerequisites can't be lost, but saves from older versions…) → the UI explains; research never divides by zero (test in Task 1).
4. **Huge countries with many groups and states (Qing, Russia)** → monthly politics stays within the bench budget (test in Task 4 / bench).
5. **Revolt wins** → the law changes (or the rebels become independent) and the rebel country is removed or kept consistently; the player sees what happened (test in Task 5).

---

### Task 1: Tech content, research points and the queue
`src/content/techs.ts` (~60 techs: 3 trees × 5 eras × 4, each `{ id, name, tree, era, cost, requires: string[], effects }`), `Country.techs: string[]` (known), `Country.researching: string | null`, `Country.researchQueue: string[]`; monthly: add research points (existing formula + `RESEARCH_POP` × sqrt(population/1M) + literacy bonus), progress the current tech at `techCost(state, c, id) = base × (1 − 0.5 × knownShare) × (1 + 0.3 × max(0, era − currentEra(year)))`; commands `research {tech}` (prepend), `queueTech {tech}`, `unqueueTech {tech}`; starts: 1836 gives era-1 techs to everyone and selected era-2 techs to GBR/FRA/PRU/USA/BEL/NET. Tests: progress and completion, spread makes techs cheaper, ahead-of-time costs more, prerequisites enforced, queue order, zero points safe.

### Task 2: Tech effects through modifiers
`src/sim/mods.ts`: `mods(state, c): Mods` (cached per month) combining techs (and later laws): `outputPct[category]`, `buildingUnlocks: Set<BuildingType>`, `maxTroopsPct`, `refillPct`, `attackCostPct`, `defensePct`, `shipStrengthPct`, `shipSpeedPct`, `solBonus`, `literacyBonus`, `taxPct`, `growthPct`, `researchPct`. Economy, troops, combat, naval and population read them. Some buildings become tech-gated (railway → "Railways", arms factory upgrade, university → "Universities" already known in 1836 for most). Tests: a tech raises farm output; railway needs its tech; a military tech lowers attack cost; SoL bonus applies.

### Task 3: Laws and enactment
`src/content/laws.ts`: 8 areas × 3–4 options, each `{ id, area, name, effects (Mods), attitudes: Record<GroupId, −2..+2> }`; `Country.laws: Record<LawArea, string>` (start values per country in start content, defaulting by government type); command `enactLaw {law}` → `Country.enacting = { law, startTick, progress }`; monthly chance to pass = f(support) where support = Σ clout × attitude of groups; fails after `ENACT_MAX_MONTHS` or if support collapses; `cancelEnactment`. Law effects through mods (tax rate, manpower share, trade income/tariffs, growth, literacy, SoL, research, revolt risk). Tests (incl. Review Focus 2): passing with support, failing without, cancel, effects apply on pass, enactment ends cleanly on elimination/puppeting.

### Task 4: Interest groups
`src/content/groups.ts` (6 groups, likes/dislikes); per country monthly: clout from economy (landowners ∝ farm/logging output share, industrialists ∝ industry output share, workers ∝ industrial employment, clergy base by laws, army ∝ troops/barracks, intellectuals ∝ literacy/universities), approval −10..10 from laws' attitudes + SoL + wars lost + taxes, radicalism rises while approval ≤ −5 and decays otherwise. Tests: farms raise landowner clout; hated law lowers approval; radicalism builds and decays; huge country stays fast (Review Focus 4).

### Task 5: Revolts and civil wars
When a group's radicalism ≥ `REVOLT_AT`: spawn a rebel country (`${group} revolt in ${country}`, colour derived) owning the states where that group is strongest (≈ group clout share of states, never the capital), with troops ∝ radical population; `startWar(rebels, [parent] + parent's puppets, goals: [{ kind: 'law', law }] or independence)`. Rebels win (peace in their favour) → the parent enacts the rebels' law at once (revolution) and the rebel states return, or (independence revolts) the rebels stay a country; parent wins → rebel states return, rebel eliminated. New ids extend relations (`ensureRelations`), palette, labels; rebels never inherit treaties (Review Focus 1, 5). Tests accordingly. Add `Demand` kind `{ kind: 'law'; law }` priced high.

### Task 6: AI research and politics
Research by personality weights (Britain production/naval, Prussia military, …) and era; laws: move toward options its strong groups like, avoid enacting with low support, react to radical groups (concede the law they want when a revolt looms on easier difficulties; crush on harder); tests: AI researches every year, never issues rejected commands over 10 years, revolts happen but not every year.

### Task 7: Research tab and Nation tab politics
Research tab (6th tab): current tech with progress bar and points/month, queue with reorder/remove, three tree columns by era with locked/available/known states and costs, tap to research or queue. Nation tab: Laws (each area: current option, other options with effects and group support preview, Enact button with chance/month, enactment progress, Cancel) and Interest groups (clout bar, approval chip, radicalism warning). Toasts: tech researched, law passed/failed, revolt. Tests: component tests for the tech list and law enact button; e2e: research a tech and enact a law as Britain.

### Task 8: Saves, bench, docs
`SAVE_VERSION` 4; bench within budget; README; `docs/stage-4-device-checklist.md`; full verification; commit and push.
