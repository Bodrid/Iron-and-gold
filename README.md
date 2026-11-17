# Iron & Gold

A single-player grand strategy game for iPhone and iPad (it runs on PC too): OpenFront-style borders that move tile by tile, with a Victoria 3-style economy on top. Start in 1836, build farms, mines, mills and factories, colonise, go to war, and see where your country stands in 1936.

## Play

- **iPhone / iPad:** open the game's site in Safari, tap **Share → Add to Home Screen**, then launch it from the icon. It runs full screen and works offline.
- **PC:** open the site in any modern browser. Scroll to zoom, drag to pan, keys: Space pause, 1–3 speed, B/A/D/N tabs, Esc close, W/S and arrow keys pan.

The game saves itself every 1 January and whenever you leave the app; **Continue** on the menu picks up where you left off.

## What's in this version (stage 1)

- The real world map with 958 named states and the 1836 borders (71 countries).
- Tile-by-tile attacks with an attack slider, colonising unclaimed land, wars, occupation and a simple peace deal.
- 15 buildings, 8 goods, money, GDP, population, standard of living, literacy.
- AI on five levels (Easy to Grand Master; only Grand Master gets bonuses, shown when you pick it).
- Saves, end-of-century score, early victory at half the world's land.

Coming next, in order: trade and navies (with piracy), Victoria-style diplomacy, research and laws, power blocs and companies, history events and the 1776 start, deeper AI. See `docs/superpowers/specs/2026-11-17-iron-and-gold-design.md`.

## Develop

```bash
npm install
npm run dev        # local dev server
npm test           # unit tests (Vitest)
npm run test:e2e   # browser tests on iPhone, iPad and desktop sizes (Playwright)
npm run bench      # simulation speed on the real map
npm run map        # rebuild public/data from Natural Earth (public domain)
```

Pushing to `main` deploys to GitHub Pages (`.github/workflows/pages.yml`).
