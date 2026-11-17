// The AI's research and politics: research by personality, pass laws its strong groups like, and head off revolts.
import { personalityOf } from '../../content/personalities';
import { TECH_BY_ID, type TechTree } from '../../content/techs';
import { GROUP_IDS } from '../../content/groups';
import { LAWS, LAW_BY_ID } from '../../content/laws';
import { BALANCE } from '../balance';
import { nextRandom } from '../rng';
import { availableTechs, techCost } from '../research';
import { attitude, enactCheck, lawSupport, passChance } from '../politics';
import { wantedLaw } from '../revolts';
import { warsOf } from '../war';
import type { Command, Country, GameState } from '../types';
import type { DifficultyParams } from './difficulty';

const P = BALANCE.politics;
const DEFAULT_TECH_WEIGHTS: Record<TechTree, number> = { production: 1.2, military: 1, society: 1 };

/** The best tech to research now, or null if nothing is available. */
export function chooseTech(state: GameState, c: Country, mistake: boolean, level = 1): string | null {
  const options = availableTechs(state, c);
  if (!options.length) return null;
  if (mistake) return options[Math.floor(nextRandom(state) * options.length)];
  const w = { ...DEFAULT_TECH_WEIGHTS, ...(personalityOf(c.personality).techWeights ?? {}) };
  // Hard and above value techs by what they own: farm techs for farm economies, military techs when threatened.
  const levels = new Map<string, number>();
  if (level >= 2) for (const s of state.states) if (s.id && s.owner === c.id) for (const b of s.buildings) levels.set(b.type, (levels.get(b.type) ?? 0) + b.level);
  const threatened = warsOf(state, c.id).length > 0;
  let best = options[0], bestScore = -Infinity;
  for (const id of options) {
    const t = TECH_BY_ID[id];
    let fit = 1;
    if (level >= 2) {
      for (const [b, v] of Object.entries(t.effects.outputPct ?? {})) fit += (v ?? 0) / 100 * Math.min(3, (b === 'all' ? 30 : (levels.get(b) ?? 0)) / 10);
      if (threatened && t.tree === 'military') fit *= 1.5;
    }
    const score = w[t.tree] * fit * 1000 / Math.max(1, techCost(state, c, id));
    if (score > bestScore) { best = id; bestScore = score; }
  }
  return best;
}

/** The law to start passing now, or null. Heads off revolts first, then follows its strongest groups. */
export function chooseLaw(state: GameState, c: Country, level = 1): string | null {
  if (c.enacting || c.overlord) return null;
  // A revolt looms: concede what the group wants (harder AIs only when the group is strong enough to matter).
  const minClout = level <= 1 ? P.REVOLT_MIN_CLOUT * 0.8 : P.REVOLT_MIN_CLOUT * 1.5;
  for (const g of GROUP_IDS) {
    const gs = c.groups[g];
    if (gs.radicalism < (level >= 3 ? 35 : 50) || gs.clout < minClout) continue;   // sharper AIs act sooner
    const law = wantedLaw(c, g);
    if (law && !enactCheck(state, c, law)) return law;
  }
  // Otherwise: a law that passes, helps the country and doesn't stir up trouble — not just whatever the strongest group wants.
  const threatened = c.troops < c.maxTroops * 0.5;
  let best: string | null = null, bestScore: number = P.AI_MIN_SUPPORT;
  for (const l of LAWS) {
    const current = c.laws[l.area];
    if (current === l.id) continue;
    const s = lawSupport(c, l.id);
    if (passChance(s) <= 0.1 || enactCheck(state, c, l.id)) continue;
    const score = P.AI_SUPPORT_WEIGHT * s + P.AI_UTILITY_WEIGHT * (utility(c, l.id, threatened) - utility(c, current, threatened)) + unrest(c, current, current) - unrest(c, current, l.id);
    if (score > bestScore) { best = l.id; bestScore = score; }
  }
  return best;
}

/** What a law does for the country, roughly in "support" units. */
export function utility(c: Country, law: string, threatened: boolean): number {
  const e = LAW_BY_ID[law]?.effects ?? {};
  let outputs = 0;
  for (const v of Object.values(e.outputPct ?? {})) outputs += v ?? 0;
  return 0.01 * (e.researchPct ?? 0) + 0.005 * (e.literacyPct ?? 0) + 0.01 * (e.growthPct ?? 0) + 0.01 * (e.industryPct ?? 0) + 0.005 * outputs
    + 0.1 * (e.sol ?? 0) + 0.005 * (e.taxPct ?? 0) * (c.money < 0 ? 3 : 1) + 0.003 * (e.maxTroopsPct ?? 0) * (threatened ? 2 : 1)
    + 0.004 * (e.tradePct ?? 0) + 0.004 * (e.attackPct ?? 0) - 0.002 * (e.armyUpkeepPct ?? 0);
}

/** How much trouble the country's groups would cause if `law` replaced `current` (groups well below zero approval). */
function unrest(c: Country, current: string, law: string): number {
  let u = 0;
  for (const g of GROUP_IDS) {
    const a = c.groups[g].approval + attitude(g, law) - attitude(g, current);
    u += P.AI_UNREST_WEIGHT * Math.max(0, -3 - a);
  }
  return u;
}

export function politicsDecisions(state: GameState, c: Country, d: DifficultyParams, mistake: () => boolean, issue: (cmd: Command) => void): void {
  if (!c.researching) {
    const tech = chooseTech(state, c, mistake(), d.level);
    if (tech) issue({ type: 'research', country: c.id, tech });
  }
  // Laws are a slow business: look about once a month.
  if (nextRandom(state) * 30 < d.decisionDays) {
    const law = chooseLaw(state, c, d.level);
    if (law) issue({ type: 'enactLaw', country: c.id, law });
  }
}
