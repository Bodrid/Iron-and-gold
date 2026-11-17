import type { Difficulty, GameSetup } from '../types';

export interface DifficultyParams {
  label: string; level: number; decisionDays: number; mistakeChance: number; aggression: number; playerFocus: number;
  /** Share of troops sent in attacks. */ attackRatio: number;
  bonuses: null | { troopRefillPct: number; buildCostPct: number; researchPct: number };
}

export const DIFFICULTY_ORDER: Difficulty[] = ['easy', 'normal', 'hard', 'veryHard', 'grandMaster'];

export const DIFFICULTIES: Record<Difficulty, DifficultyParams> = {
  easy: { label: 'Easy', level: 0, decisionDays: 30, mistakeChance: 0.35, aggression: 0.2, playerFocus: 0.3, attackRatio: 0.3, bonuses: null },
  normal: { label: 'Normal', level: 1, decisionDays: 15, mistakeChance: 0.15, aggression: 0.5, playerFocus: 1.0, attackRatio: 0.4, bonuses: null },
  hard: { label: 'Hard', level: 2, decisionDays: 7, mistakeChance: 0.05, aggression: 0.8, playerFocus: 1.0, attackRatio: 0.5, bonuses: null },
  veryHard: { label: 'Very Hard', level: 3, decisionDays: 3, mistakeChance: 0, aggression: 1.0, playerFocus: 1.2, attackRatio: 0.6, bonuses: null },
  grandMaster: { label: 'Grand Master', level: 4, decisionDays: 1, mistakeChance: 0, aggression: 1.0, playerFocus: 1.3, attackRatio: 0.65,
    bonuses: { troopRefillPct: 20, buildCostPct: -15, researchPct: 15 } },
};

export function effectiveDifficulty(setup: GameSetup, countryIsRival: boolean): Difficulty {
  if (!setup.rivalsHarder || !countryIsRival) return setup.difficulty;
  return DIFFICULTY_ORDER[Math.min(DIFFICULTY_ORDER.length - 1, DIFFICULTY_ORDER.indexOf(setup.difficulty) + 1)];
}

export function bonusText(d: Difficulty): string | null {
  const b = DIFFICULTIES[d].bonuses;
  return b ? `AI gets +${b.troopRefillPct}% troop refill, ${b.buildCostPct}% building cost, +${b.researchPct}% research` : null;
}
