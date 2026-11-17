# Iron & Gold — Stage 5 (Power Blocs, Companies and Charters) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Victoria-style power blocs (four types, a leader who picks 2–3 principles from at least 8, members who share the buffs and the leader's protection, plays that force a country into your bloc), and companies (historical and generic) that boost a building type, with charters that give bigger bonuses at a cost. Built for the player and the AI.

**Architecture:** Content in `src/content/blocs.ts` and `src/content/companies.ts`. The simulation keeps `GameState.blocs` and `Country.companies`. Effects reach the economy through the stage 4 `effectSources` modifier hook. Trade bonuses go through `tradeHooks`, defence through the plays' `joiners`, and relations through `relationPairHooks`. Bloc and company commands are validated like everything else; the AI issues the same commands.

**Tech Stack:** unchanged.

**Spec:** `docs/superpowers/specs/2026-11-17-iron-and-gold-design.md`: "Power blocs, puppets, companies, charters", Diplomacy (the "force them into your power bloc" demand), Interface (bloc inside Diplomacy on iPhone; its own seventh tab on iPad; companies under Nation).

## Global Constraints

- All earlier Global Constraints apply: determinism, commands, content as data, iOS UI rules, perf budget.
- **Founding a bloc:** only a major power (top 8 by score, or 15M+ people) that isn't in a bloc and isn't a puppet. It costs money. There's one bloc per leader; a country is in at most one bloc.
- **Bloc types:** trade league, empire, military alliance, ideological union. Each type has one fixed principle; the leader picks 1–2 more, so 2–3 in all, from **10 principles**.
- **Leader vs members:** the leader gets the full effect of each principle and members get half. Puppets join their overlord's bloc automatically.
- **Joining:** by invitation (AI members accept by relations, strength and shared rivals), by a play with the new `joinBloc` demand, or by asking. Members can leave, which costs relations with the leader; the leader can expel.
- **Companies:** at least 12 (8 historical tied to a country tag, plus generic ones anyone can found). Each boosts one or two building types. Its bonus grows with the levels of those buildings the country owns, up to a cap. A country may run `1 + floor(industry levels / 25)` companies, at most 4. Founding costs money.
- **Charters:** one per company. Colonial charter: cheaper attacks on unclaimed land, costs tax income. Monopoly: more output from its buildings, but the trade bonus is lost and industrialists like it while workers don't. Investment charter: the company's buildings in puppets count toward it and tribute grows, but puppet relations fall.
- **Interface:** on iPhone a "Power bloc" section in the Diplomacy tab and "Companies" in the Nation tab, with six tabs. On iPad a seventh **Bloc** tab (desk width ≥ 1000 px).
- Saves: `SAVE_VERSION` 5.

## Review Focus

1. **The bloc leader is eliminated, puppeted, or a member's rebels win** → the bloc dissolves cleanly or passes leadership on; no member is left in a dead bloc (test in Task 2).
2. **Principles stack with techs and laws** without double counting; a member in a dissolved bloc loses the buffs at once (test in Task 2).
3. **A `joinBloc` play against a country already in another bloc**, or against a puppet: refused with a reason, and peace terms skip it when it's stale (test in Task 3).
4. **Losing the buildings a company needs** drops the bonus but keeps the company. Losing the state that holds a charter's region ends the charter cleanly (test in Task 4).
5. **The AI doesn't spam invitations to the player**: at most one every 180 days per bloc (test in Task 6).

---

### Task 1: Bloc and principle content
`src/content/blocs.ts`: `BlocType` (tradeLeague, empire, militaryAlliance, ideologicalUnion), each with a fixed principle. Ten principles `{ id, name, description, leader: Effects, member: Effects, special? }`:
- Free Trade Area: trade with members +30% and never blocked.
- Common Defence: members defend each other in plays.
- Military Drill: +15% troop refill.
- Shared Science: +15% research.
- Railway Union: +10% railway and industry output.
- Colonial Office: −30% troops spent on unclaimed land.
- Mercantile Navy: +20% ship strength and +10% speed.
- Imperial Tribute: members pay 5% of income to the leader.
- Ideological Unity: groups' approval +1.
- Market Integration: +10% industry output.

Tests: every type's fixed principle exists; descriptions render through `describeEffects`.

### Task 2: Founding, members and buffs
`GameState.blocs: { id, leader, type, principles, members, founded }[]`. Commands:
- `foundBloc {type, principles}`, checked by `foundCheck` (major, money, not in a bloc, not a puppet)
- `inviteToBloc {target}`: AI answers by `blocPolicy.accepts`; the player gets an offer
- `respondBlocInvite`
- `askToJoinBloc`
- `leaveBloc`
- `expelFromBloc`
- `setPrinciples` (once a year)

Puppets follow their overlord. Effects go through `effectSources` (leader full, members half) and Free Trade through `tradeHooks`. Common Defence adds members to `joiners`. Members get +15 relations through `relationPairHooks`. A daily check dissolves the bloc or hands leadership to the strongest member when the leader dies or is puppeted. Tests: founding rules, buffs leader vs member, Free Trade income, Common Defence in a play, dissolution (Review Focus 1, 2).

### Task 3: The `joinBloc` demand
New `Demand` kind `{ kind: 'joinBloc' }` for plays and peace, priced like openMarket × 2 with infamy 3. It's refused if the target is in another bloc, is a puppet, or the initiator leads no bloc. `applyDemands` adds the target to the initiator's bloc and skips it when stale. Tests (Review Focus 3).

### Task 4: Companies and charters
`src/content/companies.ts`: historical companies (British East India Co.: textileMill + port, GBR; Hudson's Bay: loggingCamp, GBR; Dutch Trading Co.: port + luxuryWorkshop, NET; Krupp: armsFactory, PRU; Russian-American Co.: loggingCamp + port, RUS; Compagnie des Indes: luxuryWorkshop, FRA; Mitsui: textileMill, JAP; Baltimore & Ohio Railroad: railway, USA) and generic ones (Coal Company, Iron Works, Textile Combine, Timber Company, Arms Consortium, Railway Company).

`Country.companies: { id, founded, charter: null | 'colonial' | 'monopoly' | 'investment' }[]`. Commands: `foundCompany {company}` (cost, limit, historical tag check) and `grantCharter {company, charter}` / `revokeCharter`. The bonus is +5% output on its buildings per 10 levels, up to +25%. A monopoly adds +15% and switches off the trade bonus; colonial gives −25% unclaimed-land cost and −5% taxes; investment counts puppets' buildings, gives tribute +5% and −10 relations with puppets. Interest-group attitudes to monopoly: industrialists +1, workers −1 (into approval). Tests (Review Focus 4).

### Task 5: Bloc and company views and UI
- Worker views: `blocView` and `companyView` for the player.
- Diplomacy tab, Power bloc section:
  - if not in a bloc and allowed: a found form with type and principles, plus the cost
  - the player's bloc: members, principles with leader/member effects, Invite (pick a country), Expel, Leave
  - invitations as toasts with Accept/Refuse
- PlayPicker gets "Join our bloc".
- Nation tab, Companies section: founded companies with their bonus and building count, a found list, charter buttons with their trade-off.
- iPad: a 7th "Bloc" tab when the dock layout is active.
- Tests: component tests for founding and invitations; an e2e as Britain: found a trade league, invite Portugal.

### Task 6: AI blocs and companies
- Majors found a bloc by personality: Britain a trade league, Russia an empire, Prussia a military alliance, France an ideological union.
- Leaders invite friendly neighbours and minors (at most one invitation per 180 days to the player, Review Focus 5) and start `joinBloc` plays on easier targets.
- AIs found companies that match their strongest buildings and grant charters when they pay.
- Tests: in 10 years blocs form in the 1836 world; no rejected commands; Review Focus 5.

### Task 7: Saves, bench, docs
`SAVE_VERSION` 5, bench within budget, README, `docs/stage-5-device-checklist.md`, full verification, then commit and push.
