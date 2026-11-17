# Iron & Gold

A single-player grand strategy game for iPhone and iPad (it runs on PC too): OpenFront-style borders that move tile by tile, with a Victoria 3-style economy on top. Start in 1836, build farms, mines, mills and factories, colonise, go to war, and see where your country stands in 1936.

## Play

- **iPhone / iPad:** open the game's site in Safari, tap **Share → Add to Home Screen**, then launch it from the icon. It runs full screen and works offline.
- **PC:** open the site in any modern browser. Scroll to zoom, drag to pan, keys: Space pause, 1–3 speed, B/A/T/D/R/N tabs, Esc close, W/S and arrow keys pan.

The game saves itself every 1 January and whenever you leave the app; **Continue** on the menu picks up where you left off.

## What's in this version (stages 1–4)

- The real world map with 958 named states and the 1836 borders (71 countries).
- Tile-by-tile attacks with an attack slider, colonising unclaimed land, wars, occupation and a simple peace deal.
- 15 buildings, 8 goods, money, GDP, population, standard of living, literacy.
- AI on five levels (Easy to Grand Master; only Grand Master gets bonuses, shown when you pick it).
- Saves, end-of-century score, early victory at half the world's land.
- Trade: ports open routes automatically for spare goods and shortages; trade ships sail visible sea lanes and both sides earn money (Trade tab).
- Diplomacy: relations and diplomats, treaties (alliance, defensive pact, trade agreement, guarantee, embargo), infamy and coalitions, diplomatic plays (make demands, 60 days for others to pick sides, then they give in or it's war), multi-country wars, peace deals where dominating — and bleeding — earns extra demands, puppets, privateer licences. No surprise attacks.
- Navies: shipyards build warships and transports; warships raid enemy trade in wartime, escort yours and fight; boats and transports carry troops for invasions across the sea ("Send boat").

- Research: 60 techs in three trees (Production, Military, Society) across five eras from 1770 to 1940. Techs unlock railways, raise output, troops, ships, growth and living standards; a tech most of the world knows is cheaper, one ahead of its time dearer (Research tab).
- Laws and politics: eight law areas (government, voting, trade, labour, army, taxes, education, welfare), six interest groups whose clout comes from your economy, laws that take months to pass and need support, and revolts: groups that stay angry rise up as a rebel country and fight for the law they want (Nation tab).

Coming next, in order: power blocs and companies, history events and the 1776 start, deeper AI. See `docs/superpowers/specs/2026-11-17-iron-and-gold-design.md`.

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
