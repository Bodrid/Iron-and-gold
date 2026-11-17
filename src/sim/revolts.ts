// Revolts: an interest group that stays radical long enough, with real clout, rises up. The rebels become a new
// country holding the states where that group is strongest and fight a normal war for the law they want.
// If they win, the law changes; either way their land goes back to the parent when the war ends.
import { GROUPS, GROUP_IDS, type GroupId } from '../content/groups';
import { LAW_AREAS, lawsIn } from '../content/laws';
import { BUILDINGS } from '../content/buildings';
import { getStateTiles } from '../map/stateTiles';
import { BALANCE } from './balance';
import { setTile } from './control';
import { makeCountry } from './country';
import { changeRelation, ensureRelations } from './diplomacy/relations';
import { attitude } from './politics';
import { systems } from './registry';
import { atWar, eliminate, startWar } from './war';
import type { Country, GameState, SimEvent } from './types';

const P = BALANCE.politics;

/** The law the group wants: its favourite option in the area whose current law it likes least. */
export function wantedLaw(c: Country, g: GroupId): string | null {
  let worst: { area: string; v: number } | null = null;
  for (const a of LAW_AREAS) {
    const v = attitude(g, c.laws[a.id]);
    if (!worst || v < worst.v) worst = { area: a.id, v };
  }
  if (!worst || worst.v >= 0) return null;
  const options = lawsIn(worst.area as typeof LAW_AREAS[number]['id']);
  let best = options[0];
  for (const o of options) if (attitude(g, o.id) > attitude(g, best.id)) best = o;
  return attitude(g, best.id) > worst.v ? best.id : null;
}

/** How strongly a group is rooted in a state (for picking the rebels' states). */
function rooted(state: GameState, stateId: number, g: GroupId): number {
  const st = state.states[stateId];
  let n = 0;
  for (const b of st.buildings) {
    const def = BUILDINGS[b.type];
    if (g === 'landowners' && (b.type === 'farm' || b.type === 'loggingCamp')) n += b.level;
    if ((g === 'industrialists' || g === 'workers') && (def.category === 'industry' || b.type === 'coalMine' || b.type === 'ironMine')) n += b.level;
    if (g === 'army' && (b.type === 'barracks' || b.type === 'fort')) n += b.level;
    if (g === 'intellectuals' && b.type === 'university') n += b.level;
  }
  return n * 1e7 + st.population;
}

function blend(a: number, b: number): number {
  const ch = (x: number, s: number) => (x >> s) & 255;
  const mix = (s: number) => Math.round((ch(a, s) + ch(b, s)) / 2) << s;
  return mix(16) | mix(8) | mix(0);
}

/** Starts a revolt now. Returns the rebel country, or null if the country can't revolt (too small, no grievance…). */
export function startRevolt(state: GameState, parent: Country, g: GroupId, events: SimEvent[], changed: number[]): Country | null {
  const law = wantedLaw(parent, g);
  if (!law || state.countries.length >= P.MAX_COUNTRIES) return null;
  const owned = state.states.filter(s => s.id && s.owner === parent.id && s.controller === parent.id && s.id !== parent.capitalState);
  if (owned.length < 2) return null;
  const clout = parent.groups[g].clout;
  const total = owned.length + 1;
  const k = Math.max(1, Math.min(Math.floor(total / 2), Math.round(total * clout * P.REVOLT_STATE_SHARE)));
  const picked = owned.sort((a, b) => rooted(state, b.id, g) - rooted(state, a.id, g) || a.id - b.id).slice(0, k);

  const id = state.countries.length;
  // Soldiers, money and goods defect in proportion to the group's clout.
  const share = Math.min(P.REVOLT_MAX_SHARE, clout + P.REVOLT_BASE_SHARE);
  const rebels = splinter(state, parent, { tag: `R${id}`, name: `${parent.name} ${GROUPS[g].name} Revolt`, color: blend(parent.color, GROUPS[g].color) }, picked.map(s => s.id), share, changed);
  rebels.rebel = { parent: parent.id, group: g, law };
  changeRelation(state, id, parent.id, -100);
  parent.groups[g].radicalism = P.RADICAL_AFTER_REVOLT;
  // No treaties carry over: it's a brand-new country. Puppets of the parent join the parent (warStartHooks).
  startWar(state, [id], [parent.id], [{ kind: 'law', law }], events);
  events.push({ type: 'revolt', country: parent.id, rebels: id, group: g, law });
  return rebels;
}

/** A new country split off `parent`, holding `stateIds` (the parent's tiles in them), with a share of its troops,
 *  money and goods, the same techs and laws, and no treaties. */
export function splinter(state: GameState, parent: Country, who: { tag: string; name: string; color: number }, stateIds: number[], share: number, changed: number[]): Country {
  const id = state.countries.length;
  const capital = stateIds.reduce((best, s) => (state.states[s].population > state.states[best].population ? s : best), stateIds[0]);
  const c = makeCountry(id, { tag: who.tag, name: who.name, color: who.color, capital: '', population: 0, money: 0 }, capital, false, parent.difficulty);
  c.techs = [...parent.techs];
  c.laws = { ...parent.laws };
  c.literacy = parent.literacy;
  c.prices = { ...parent.prices };
  c.sol = parent.sol;
  c.troops = Math.round(parent.troops * share); parent.troops -= c.troops;
  c.money = Math.max(0, parent.money * share * 0.5); parent.money -= c.money;
  for (const good of Object.keys(parent.stockpile) as (keyof typeof parent.stockpile)[]) {
    c.stockpile[good] = parent.stockpile[good] * share; parent.stockpile[good] -= c.stockpile[good];
  }
  state.countries.push(c);
  ensureRelations(state);
  // Tiles a third country occupies stay occupied (and are skipped by the callers where it matters).
  for (const s of stateIds) for (const t of getStateTiles(state.map, s)) if (state.owner[t] === parent.id) setTile(state, t, id, id, changed);   // a new country is at war with nobody but its parent
  for (const s of stateIds) c.population += state.states[s].population;
  return c;
}

function endRevolt(state: GameState, rebels: Country, events: SimEvent[], changed: number[]): void {
  const r = rebels.rebel!;
  const parent = state.countries[r.parent];
  for (let t = 0; t < state.owner.length; t++) if (state.owner[t] === rebels.id) setTile(state, t, parent.id, parent.id, changed);
  parent.troops += rebels.troops * 0.5;
  parent.money += Math.max(0, rebels.money);
  // The normal elimination path: tiles they still occupy go back, other wars and attacks end.
  eliminate(state, rebels.id, events, changed, true);
  const won = !r.independence && Object.values(parent.laws).includes(r.law);
  events.push({ type: 'revoltEnded', country: parent.id, rebels: rebels.id, won });
}

export function revoltDay(state: GameState, events: SimEvent[], changed: number[]): void {
  const active = new Set<number>();
  for (const c of state.countries) {
    if (!c.alive || !c.rebel) continue;
    const parent = state.countries[c.rebel.parent];
    if (!parent.alive) { c.rebel = undefined; continue; }        // the parent is gone: the rebels carry on as a country
    if (!atWar(state, c.id, parent.id)) { endRevolt(state, c, events, changed); continue; }
    active.add(parent.id);
  }
  for (const c of state.countries.slice()) {
    if (!c.alive || c.rebel || active.has(c.id)) continue;
    for (const g of GROUP_IDS) {
      const gs = c.groups[g];
      if (gs.radicalism < P.REVOLT_AT || gs.clout < P.REVOLT_MIN_CLOUT) continue;
      if (startRevolt(state, c, g, events, changed)) break;
      gs.radicalism = P.RADICAL_AFTER_REVOLT;   // nothing to rise over (or no room): cool off instead of retrying daily
    }
  }
}

systems.day.push((state, events, changed) => revoltDay(state, events, changed));
