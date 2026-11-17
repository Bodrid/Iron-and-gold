# Iron & Gold

Single-player grand strategy web game (OpenFront-style map and fighting, Victoria 3-style economy, diplomacy and politics), played mainly on iPhone/iPad as a Home Screen web app.

- Spec: `docs/superpowers/specs/2026-11-17-iron-and-gold-design.md`. Plans: `docs/superpowers/plans/`.
- Scripts: `npm run dev`, `npm test` (Vitest), `npm run test:e2e` (Playwright, uses the pre-installed Chromium; keep `@playwright/test` at the installed version), `npm run lint`, `npm run build`, `npm run map` (regenerates `public/data/` from Natural Earth), `npm run bench`.
- `src/sim/**` must stay deterministic: no Math.random, Date, performance, transcendental Math functions or for...in (enforced by ESLint). All actions go through `Command`s applied by `step()`.
- All tunable numbers live in `src/sim/balance.ts`. Content (countries, buildings, starts) lives in `src/content/`.
- Storage names start with `iron-and-gold-`. The site is served under `/<repo-name>/` (env `BASE_PATH`).
- Deploys: push to `main` runs `.github/workflows/pages.yml`.
