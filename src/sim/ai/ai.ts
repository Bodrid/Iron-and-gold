// The computer players. Each AI country decides every few days (more often on harder levels) and acts only through commands.
import { personalityOf } from '../../content/personalities';
import { TICKS_PER_DAY } from '../calendar';
import { BALANCE } from '../balance';
import { canAttack, sharesBorder } from '../combat';
import { buildCheck, buildCostHooks, researchHooks } from '../economy';
import { applyCommand, systems } from '../registry';
import { nextRandom } from '../rng';
import { refillBonusHooks } from '../troops';
import { atWar, peacePolicy, warScore } from '../war';
import type { Command, Country, CountryId, GameState } from '../types';
import { DIFFICULTIES, effectiveDifficulty } from './difficulty';
import { buildOptions, neighborCountries } from './evaluate';
import { navalDecisions } from './naval';

const YEAR = 365 * TICKS_PER_DAY;
/** Chance per 30 days that a fully aggressive AI looks for a war. */
const WAR_CHANCE_PER_MONTH = 0.08;

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
  const myWars = state.wars.filter(w => w.a === c.id || w.b === c.id);
  const enemies = myWars.map(w => (w.a === c.id ? w.b : w.a));
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

  // 5. Start a war against a weaker neighbour.
  if (!enemies.length && c.troops >= c.maxTroops * 0.6) {
    const chance = WAR_CHANCE_PER_MONTH * d.aggression * pers.aggression * (d.decisionDays / 30);
    if (nextRandom(state) < chance) {
      const targets = [...neighbors].filter(n => n && state.countries[n].alive && state.countries[n].troops < c.troops * 0.6);
      const weight = (n: CountryId) => {
        const t = state.countries[n];
        let w = c.troops / Math.max(1, t.troops);
        if (t.isPlayer) w *= d.playerFocus;
        if (pers.rivals.includes(t.tag)) w *= 2;
        if (pers.interests.length && state.states.some(s => s.owner === n && pers.interests.some(p => state.map.states[s.id].key.startsWith(p)))) w *= 2;
        if (d.level >= 2 && (state.wars.some(x => x.a === n || x.b === n) || t.troops < t.maxTroops * 0.4)) w *= 2;
        return w;
      };
      let target = pick(state, targets, weight, mistake());
      if (target && state.countries[target].isPlayer && nextRandom(state) > d.playerFocus) target = undefined;
      if (target && sharesBorder(state, c.id, target)) {
        issue({ type: 'declareWar', country: c.id, target });
        attack(target, Math.min(0.8, d.attackRatio + 0.2));
      }
    }
  }

  // 6. Peace when clearly winning, or after a long losing war.
  for (const w of myWars) {
    if (!state.wars.includes(w)) continue;
    const enemy = w.a === c.id ? w.b : w.a;
    const mine = warScore(state, w, c.id);
    const old = state.tick - w.startTick >= 2 * YEAR;
    if ((mine >= 60 || (old && mine <= 20)) && !state.peaceOffers.some(o => o.from === c.id && o.to === enemy)) {
      issue({ type: 'offerPeace', country: c.id, target: enemy });
    }
  }
}

/** For tests and tools: the commands an AI would issue today (applied as it decides). */
export function aiCommands(state: GameState, c: Country): Command[] {
  const out: Command[] = [];
  aiDecide(state, c, cmd => { out.push(cmd); applyCommand(state, cmd, [], []); });
  return out;
}

export function aiAcceptsPeace(state: GameState, ai: CountryId, from: CountryId): boolean {
  const w = atWar(state, ai, from);
  if (!w) return false;
  const mine = warScore(state, w, ai), theirs = warScore(state, w, from);
  const age = state.tick - w.startTick;
  if (mine >= 50 && mine > theirs) return false;
  return theirs >= 50 || (mine < 25 && age >= YEAR) || age >= 3 * YEAR;
}

// ---- wiring ----
peacePolicy.accepts = aiAcceptsPeace;
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
