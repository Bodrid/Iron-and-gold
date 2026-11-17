// The computer players. Each AI country decides every few days (more often on harder levels) and acts only through commands.
import { personalityOf } from '../../content/personalities';
import { TICKS_PER_DAY } from '../calendar';
import { BALANCE } from '../balance';
import { canAttack, sharesBorder } from '../combat';
import { buildCheck, buildCostHooks, researchHooks } from '../economy';
import { applyCommand, systems } from '../registry';
import { nextRandom } from '../rng';
import { refillBonusHooks } from '../troops';
import { enemiesIn, warsOf } from '../war';
import { daysSinceRefused, peacePoints, termsCost } from '../diplomacy/peace';
import { playCheck } from '../diplomacy/plays';
import { blocOf } from '../blocs';
import type { Command, Country, CountryId, Demand, GameState, PeaceTerms, War } from '../types';
import { DIFFICULTIES, effectiveDifficulty } from './difficulty';
import { buildOptions, neighborCountries } from './evaluate';
import { navalDecisions } from './naval';
import { diplomacyDecisions } from './diplomacy';
import { politicsDecisions } from './politics';
import { blocDecisions, companyDecisions } from './blocs';

const YEAR = 365 * TICKS_PER_DAY;
/** Chance per 30 days that a fully aggressive AI looks for a war. */
const WAR_CHANCE_PER_MONTH = 0.12;

function pick<T>(state: GameState, items: T[], weight: (t: T) => number, mistake: boolean): T | undefined {
  if (!items.length) return undefined;
  if (mistake) return items[Math.floor(nextRandom(state) * items.length)];
  let best = items[0], bw = weight(best);
  for (const it of items) { const w = weight(it); if (w > bw) { best = it; bw = w; } }
  return best;
}

/** Decides and issues this country's commands for today. */
export function aiDecide(state: GameState, c: Country, issue: (cmd: Command) => void): void {
  const d = DIFFICULTIES[c.difficulty];
  const pers = personalityOf(c.personality);
  const mistake = () => d.mistakeChance > 0 && nextRandom(state) < d.mistakeChance;
  const myWars = warsOf(state, c.id);
  const enemies = [...new Set(myWars.flatMap(w => enemiesIn(w, c.id)))];
  const neighbors = neighborCountries(state, c);
  const threatened = enemies.length > 0 || [...neighbors].some(n => n && state.countries[n].troops > c.troops * 1.5);
  const minAttack = BALANCE.combat.MIN_ATTACK_TROOPS;
  const attack = (target: CountryId, ratio: number) => {
    if (Math.floor(c.troops * ratio) < minAttack || !canAttack(state, c.id, target)) return false;
    if (state.attacks.some(a => a.attacker === c.id && a.target === target)) return false;
    if (!sharesBorder(state, c.id, target)) return false;
    issue({ type: 'attack', country: c.id, target, ratio });
    return true;
  };

  // 1. Economy: order the best buildings while money and construction slots allow.
  const reserve = 3 * c.troops * BALANCE.economy.ARMY_UPKEEP;
  for (let i = 0; i < 3; i++) {
    const opts = buildOptions(state, c, pers, enemies.length > 0, threatened).filter(o => c.money - o.cost >= reserve);
    const choice = pick(state, opts, o => o.score, mistake());
    if (!choice || !buildCheck(state, c.id, choice.state, choice.type).ok) break;
    issue({ type: 'build', country: c.id, state: choice.state, building: choice.type });
  }

  // 2. Defence: hit back at whoever is attacking us.
  if (c.troops >= c.maxTroops * 0.3) {
    for (const a of state.attacks) if (a.target === c.id && attack(a.attacker, Math.min(0.6, d.attackRatio + 0.1))) break;
  }

  // 3. Ongoing wars: keep pushing.
  if (c.troops >= c.maxTroops * 0.4) for (const e of enemies) if (attack(e, d.attackRatio)) break;

  // 4. Colonise unclaimed land.
  if (neighbors.has(0) && c.troops >= c.maxTroops * 0.5 && !state.attacks.some(a => a.attacker === c.id && a.target === 0)) {
    attack(0, Math.max(0.2, d.attackRatio - 0.15));
  }

  // 4b. The sea: warships, raids, escorts, invasions.
  navalDecisions(state, c, enemies, neighbors, Math.max(0.2, d.attackRatio - 0.1), issue, pers.buildWeights.shipyard ?? 1);

  // 4c. Diplomacy: relations, treaties, plays in progress, puppets.
  diplomacyDecisions(state, c, d, neighbors, issue);
  politicsDecisions(state, c, d, mistake, issue);
  blocDecisions(state, c, d, issue);
  companyDecisions(state, c, d, issue);

  // 5. Make demands of a weaker neighbour (a diplomatic play; war follows only if they don't give in).
  if (!enemies.length && !state.plays.some(p => p.sideA.includes(c.id) || p.sideB.includes(c.id)) && c.troops >= c.maxTroops * 0.6) {
    const chance = WAR_CHANCE_PER_MONTH * d.aggression * pers.aggression * (d.decisionDays / 30);
    if (nextRandom(state) < chance) {
      // A play isn't a war: the target may give in, so demand of anyone noticeably weaker.
      const targets = [...neighbors].filter(n => n && state.countries[n].alive && !state.countries[n].overlord && state.countries[n].troops < c.troops * 0.9);
      const weight = (n: CountryId) => {
        const t = state.countries[n];
        let w = c.troops / Math.max(1, t.troops);
        if (t.isPlayer) w *= d.playerFocus;
        if (pers.rivals.includes(t.tag)) w *= 2;
        if (pers.interests.length && state.states.some(s => s.owner === n && pers.interests.some(p => state.map.states[s.id].key.startsWith(p)))) w *= 2;
        if (d.level >= 2 && (warsOf(state, n).length > 0 || t.troops < t.maxTroops * 0.4)) w *= 2;
        return w;
      };
      let target = pick(state, targets, weight, mistake());
      if (target && state.countries[target].isPlayer && nextRandom(state) > d.playerFocus) target = undefined;
      if (target && sharesBorder(state, c.id, target)) {
        // No surprise attacks: demand a state next to us and let the play run its course.
        const mine = new Set(state.states.filter(s => s.owner === c.id).map(s => s.id));
        const wanted = state.states.filter(s => s.owner === target && state.map.states[s.id].neighbors.some(n => mine.has(n)))
          .sort((a, b) => b.population - a.population || a.id - b.id)[0];
        // A bloc leader sometimes asks for the target to join its bloc instead of land.
        const intoBloc = state.blocs.some(b => b.leader === c.id) && !blocOf(state, target) && nextRandom(state) < 0.3;
        const cmd = { type: 'startPlay' as const, country: c.id, target, demands: intoBloc ? [{ kind: 'joinBloc' as const }] : [{ kind: 'state' as const, state: wanted?.id ?? 0 }] };
        if ((wanted || intoBloc) && !playCheck(state, cmd)) issue(cmd);
      }
    }
  }

  // 6. Peace: take the goals (and extras) when winning, concede when beaten, white peace when it drags on.
  for (const w of myWars) {
    if (!state.wars.includes(w) || (w.a !== c.id && w.b !== c.id)) continue;   // only war leaders negotiate
    const enemy = w.a === c.id ? w.b : w.a;
    if (state.peaceOffers.some(o => o.from === c.id && o.to === enemy)) continue;
    if (daysSinceRefused(state, w, c.id) < PEACE_RETRY_DAYS) continue;
    const terms = peaceTerms(state, w, c.id, enemy);
    if (terms) issue({ type: 'proposePeace', country: c.id, warId: w.id, terms });
  }
}

const PEACE_RETRY_DAYS = 90;

/** What this AI war leader proposes today, if anything. */
function peaceTerms(state: GameState, w: War, me: CountryId, enemy: CountryId): PeaceTerms | null {
  const mine = peacePoints(state, w, me), theirs = peacePoints(state, w, enemy);
  const old = state.tick - w.startTick >= 2 * YEAR;
  const myGoals = w.a === me ? w.goals : [];
  const occupiedBy = (by: CountryId, from: CountryId[]) => state.states
    .filter(st => st.id && st.owner && from.includes(st.owner) && st.controller === by)
    .sort((a, b) => b.population - a.population || a.id - b.id);
  if (mine.winning && mine.score >= 60) {
    // Our goals first (if we have any), then the enemy's most valuable occupied states while points last.
    const demands: Demand[] = [...myGoals];
    for (const st of occupiedBy(me, enemiesIn(w, me))) {
      if (demands.some(d => d.kind === 'state' && d.state === st.id)) continue;
      const next: Demand[] = [...demands, { kind: 'state', state: st.id }];
      if (termsCost(state, w, me, next) <= mine.available) demands.push({ kind: 'state', state: st.id }); else break;
    }
    if (!demands.length && termsCost(state, w, me, [{ kind: 'reparations' }]) <= mine.available) demands.push({ kind: 'reparations' });
    if (demands.length && termsCost(state, w, me, demands) <= mine.available) return { demands };
  }
  if (theirs.winning && theirs.score >= 60) {
    // Beaten: hand over what they fought for, or what they hold plus reparations.
    const theirGoals = w.a === enemy ? w.goals : [];
    const demands: Demand[] = theirGoals.length ? [...theirGoals]
      : [...occupiedBy(enemy, [me]).slice(0, 2).map(st => ({ kind: 'state' as const, state: st.id })), { kind: 'reparations' as const }];
    return { demands, give: true };
  }
  if (old && !mine.winning) return { demands: [], white: true };
  return null;
}

/** For tests and tools: the commands an AI would issue today (applied as it decides). */
export function aiCommands(state: GameState, c: Country): Command[] {
  const out: Command[] = [];
  aiDecide(state, c, cmd => { out.push(cmd); applyCommand(state, cmd, [], []); });
  return out;
}

// ---- wiring ----
const gm = (c: Country) => (c.isPlayer ? null : DIFFICULTIES[c.difficulty].bonuses);
refillBonusHooks.push((_s, c) => gm(c)?.troopRefillPct ?? 0);
buildCostHooks.push((_s, c) => 1 + (gm(c)?.buildCostPct ?? 0) / 100);
researchHooks.push((_s, c) => 1 + (gm(c)?.researchPct ?? 0) / 100);

systems.init.push(state => {
  const player = state.countries.find(c => c.isPlayer);
  if (!player) return;
  const playerStates = new Set(state.states.filter(s => s.owner === player.id).map(s => s.id));
  for (const c of state.countries) {
    if (!c.alive || c.isPlayer) continue;
    const borders = state.states.some(s => s.owner === c.id && state.map.states[s.id].neighbors.some(n => playerStates.has(n)));
    const rival = borders || personalityOf(c.personality).rivals.includes(player.tag);
    c.difficulty = effectiveDifficulty(state.setup, rival);
  }
});

systems.ai.push((state, events, changed) => {
  if (state.setup.aiDisabled) return;
  const day = Math.floor(state.tick / TICKS_PER_DAY);
  for (const c of state.countries) {
    if (!c.alive || c.isPlayer || c.id === 0) continue;
    if ((day + c.id) % DIFFICULTIES[c.difficulty].decisionDays !== 0) continue;
    aiDecide(state, c, cmd => applyCommand(state, cmd, events, changed));
  }
});
