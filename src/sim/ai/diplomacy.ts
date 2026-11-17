// The AI's diplomacy: relations, treaties, sides in plays, climb-downs, puppets, privateers, separate peace.
import { anyTag } from '../tags';
import { personalityOf } from '../../content/personalities';
import { TICKS_PER_DAY } from '../calendar';
import { BALANCE } from '../balance';
import { applyCommand } from '../registry';
import { annexCheck, puppetsOf } from '../diplomacy/subjects';
import { diploCapacity, relation } from '../diplomacy/relations';
import { hasTreaty, treatyCheck, treatyPolicy } from '../diplomacy/treaties';
import { involved, playHooks, sideStrength } from '../diplomacy/plays';
import { warScore, warsOf } from '../war';
import type { Command, Country, CountryId, GameState, TreatyKind } from '../types';
import type { DifficultyParams } from './difficulty';

const YEAR = 365 * TICKS_PER_DAY;
const D = BALANCE.diplomacy;

export function diplomacyDecisions(state: GameState, c: Country, d: DifficultyParams, neighbours: Set<CountryId>, issue: (cmd: Command) => void): void {
  const pers = personalityOf(c.personality);
  const alive = state.countries.filter(x => x.alive && x.id && x.id !== c.id);
  const isRival = (x: Country) => anyTag(pers.rivals, x) || anyTag(personalityOf(x.personality).rivals, c);

  // Relations: warm up to strong non-rival neighbours, cool down on rivals, within our diplomats.
  const mine = state.diploActions.filter(a => a.from === c.id);
  for (const a of mine) {
    const v = relation(state, c.id, a.to);
    if ((a.kind === 'improve' && v >= 60) || (a.kind === 'worsen' && v <= -60) || !state.countries[a.to].alive) issue({ type: 'stopDiploAction', country: c.id, target: a.to });
  }
  let free = diploCapacity(state, c.id) - state.diploActions.filter(a => a.from === c.id).length;
  const friends = alive.filter(x => neighbours.has(x.id) && !isRival(x) && relation(state, c.id, x.id) < 55 && relation(state, c.id, x.id) > -40 && !mine.some(a => a.to === x.id))
    .sort((a, b) => b.troops - a.troops || a.id - b.id);
  for (const x of friends) { if (free <= 0) break; issue({ type: 'improveRelations', country: c.id, target: x.id }); free--; }
  for (const x of alive.filter(isRival)) { if (free <= 0) break; if (!mine.some(a => a.to === x.id) && relation(state, c.id, x.id) > -55) { issue({ type: 'worsenRelations', country: c.id, target: x.id }); free--; } }

  // Treaties (capped, so not every target ends up with a wall of defenders).
  const count = (x: CountryId, kind: TreatyKind) => state.treaties.filter(t => t.kind === kind && (t.a === x || t.b === x)).length;
  const propose = (target: CountryId, kind: TreatyKind) => {
    if (treatyCheck(state, c.id, target, kind)) return;
    if (kind === 'defensivePact' && (count(c.id, 'defensivePact') >= D.AI_MAX_PACTS || (!state.countries[target].isPlayer && count(target, 'defensivePact') >= D.AI_MAX_PACTS))) return;
    if (kind === 'guarantee' && state.treaties.filter(t => t.kind === 'guarantee' && t.a === c.id).length >= D.AI_MAX_GUARANTEES) return;
    if (!state.countries[target].isPlayer && !treatyPolicy.accepts(state, target, c.id, kind)) return;   // don't spam refusals
    if (state.treatyOffers.some(o => o.from === c.id && o.to === target && o.kind === kind)) return;
    // Ask the player at most twice a year.
    if (state.countries[target].isPlayer && Math.floor(state.tick / TICKS_PER_DAY) % 180 >= d.decisionDays) return;
    issue({ type: 'proposeTreaty', country: c.id, target, kind });
  };
  let alliances = state.treaties.filter(t => t.kind === 'alliance' && (t.a === c.id || t.b === c.id)).length;
  for (const x of alive) {
    const v = relation(state, c.id, x.id);
    if (isRival(x)) continue;
    if (alliances < 1 && v >= 50 && x.troops > c.troops * 0.3) { propose(x.id, 'alliance'); alliances++; }
    else if (v >= 40 && neighbours.has(x.id) && x.troops < c.troops) propose(x.id, 'defensivePact');
    if (v >= 0 && state.tradeRoutes.some(r => (r.exporter === c.id && r.importer === x.id) || (r.exporter === x.id && r.importer === c.id))) propose(x.id, 'tradeAgreement');
    if (v >= 20 && neighbours.has(x.id) && x.troops * 3 < c.troops && !hasTreaty(state, c.id, x.id, 'guarantee')) propose(x.id, 'guarantee');
  }

  // Back down from a hopeless play we started.
  for (const p of state.plays) {
    if (p.initiator === c.id && p.endTick - state.tick <= d.decisionDays * TICKS_PER_DAY && sideStrength(state, p.sideB) > D.AI_CLIMB_DOWN_RATIO * sideStrength(state, p.sideA)) issue({ type: 'backDown', country: c.id, playId: p.id });
  }

  // Puppets: annex when allowed and our infamy is low.
  for (const p of puppetsOf(state, c.id)) if (!state.countries[p].isPlayer && !annexCheck(state, c.id, p) && c.infamy < 20) issue({ type: 'annexPuppet', country: c.id, puppet: p });

  // Privateers against Hostile rivals if we have a navy.
  const warships = state.ships.filter(s => s.owner === c.id && s.kind === 'warship').length;
  if (warships >= 2) for (const x of alive) {
    if (relation(state, c.id, x.id) <= -50 && !state.privateers.some(p => p.from === c.id && p.target === x.id)) { issue({ type: 'setPrivateers', country: c.id, target: x.id, on: true }); break; }
  }

  // Leave a lost war we only joined.
  for (const w of warsOf(state, c.id)) {
    if (w.a === c.id || w.b === c.id) continue;
    if (state.tick - w.startTick > YEAR && warScore(state, w, c.id) < 25) issue({ type: 'separatePeace', country: c.id, warId: w.id });
  }
}

/** At the halfway mark of a play, uninvolved AI countries may pick a side. */
playHooks.decide = (state, p, events) => {
  for (const x of state.countries) {
    if (!x.alive || !x.id || x.isPlayer || x.overlord || involved(state, x.id) || warsOf(state, x.id).length) continue;
    const toA = relation(state, x.id, p.initiator), toB = relation(state, x.id, p.target);
    let side: 'A' | 'B' | null = null;
    if (toB >= 30 && toA <= -15) side = 'B';
    else if (toA >= 30 && toB <= -30) side = 'A';
    if (side) applyCommand(state, { type: 'joinPlay', country: x.id, playId: p.id, side }, events, []);
  }
};
