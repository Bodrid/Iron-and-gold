# Iron & Gold

A single-player grand strategy game for iPhone and iPad (it runs on PC too): OpenFront-style borders that move tile by tile, with a Victoria 3-style economy on top. Start in 1776 or 1836, build farms, mines, mills and factories, colonise, go to war, live through the history of your century and see where your country stands a hundred years later.

## Play

- **iPhone / iPad:** open the game's site in Safari, tap **Share → Add to Home Screen**, then launch it from the icon. It runs full screen and works offline.
- **PC:** open the site in any modern browser. Scroll to zoom, drag to pan, keys: Space pause, 1–3 speed, B/A/T/D/R/N tabs (P: power bloc on wide screens), Esc close, W/S and arrow keys pan.

The game saves itself every 1 January and whenever you leave the app; **Continue** on the menu picks up where you left off.

## How to play

1. **New game:** pick 1776 or 1836, a difficulty and a country. Great powers are easiest to learn with; minors are a challenge.
2. **Build** (bottom tab): tap one of your states on the map, then build farms, mines, mills and factories. Money comes from taxes on what you produce; goods raise living standards and feed industry.
3. **Grow:** expand into grey unclaimed land with the attack slider (right edge), open ports for trade, and research techs (Research tab).
4. **Diplomacy:** there are no surprise wars. Make demands with a diplomatic play; others pick sides; the target gives in or it's war. Win wars to take states, puppets or reparations. Dominating, and bleeding for it, earns extra demands.
5. **Politics:** keep your interest groups happy with your laws (Nation tab), or they'll grow radical and revolt.
6. **History happens:** event cards pause the game and ask you to choose. Unite Germany or Italy from Nation → Decisions.
7. **Win:** have the best score (GDP, population, living standards, land) at the end date, or hold half the world's land.

## What's in this version (stages 1–7)

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

- Power blocs: major powers found a trade league, empire, military alliance or ideological union with 2–3 of 10 principles (free trade, common defence, drill, shared science, tribute…); leaders get the full buffs, members half and protection. Invite countries, or force them in with a "Join our power bloc" demand (Diplomacy tab; its own Bloc tab on iPad).
- Companies and charters: found historical companies (East India Company, Krupp, Mitsui…) or generic ones; each boosts its buildings more as you build them, and a charter (colonial, monopoly, investment) gives more at a price (Nation tab).

- History events: event cards with 2–3 choices for the player and the AI alike — the Great Game, German and Italian unification, the opening of Japan, the Opium Wars, the Eastern Question, Manifest Destiny and the Civil War (1836); the American Revolution, the French Revolution, Napoleon and the partitions of Poland (1776). Independence wars can create new countries; Germany and Italy can be proclaimed (Nation tab → Decisions).
- Two start dates: 1776 (Age of Revolution, to 1876) and 1836 (Victorian Era, to 1936).

- AI on five levels that clearly differ: higher levels pick their moment (attacking busy or weakened neighbours), guard their best trade, research what fits their economy and head off revolts earlier; Easy leaves you in peace for years at a time.
- Balance for a plausible century: historical literacy, believable population growth, living standards that climb, Britain leading the 1836 economy, the German Confederation and the Holy Roman Empire protecting small German states.

Multiplayer, more start dates (Napoleonic Wars, World War I and II) and more history events are planned for later. See `docs/superpowers/specs/2026-11-17-iron-and-gold-design.md`.

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
