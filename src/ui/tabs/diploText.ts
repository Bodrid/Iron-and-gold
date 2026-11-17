import type { TreatyKind } from '../../sim/types';

export const DIPLO_REASON: Record<string, string> = {
  needsCordial: 'Needs Cordial relations', needsNeutral: 'Needs at least Neutral relations', notStronger: 'You must be stronger than them',
  alreadySigned: 'Already signed', atWar: 'You are at war', hostile: 'Relations are Hostile', allied: 'You are allies',
  playUnderWay: 'There is already a play under way involving one of you', puppet: 'Puppets can’t start plays', alreadyPuppet: 'They are already your puppet',
  targetIsPuppet: 'They are someone’s puppet: make demands of their overlord', noCapacity: 'No free diplomats', needsHostile: 'Needs Hostile relations',
  tooSoon: 'Too soon: puppets can be annexed after 10 years', notYourPuppet: 'Not your puppet', 'no such country': 'Not possible',
};

export const TREATY_NAMES: Record<TreatyKind, string> = { alliance: 'Alliance', defensivePact: 'Defensive pact', tradeAgreement: 'Trade agreement', guarantee: 'Guarantee independence', embargo: 'Embargo' };

export function relationText(v: number): { label: string; cls: string } {
  if (v <= -50) return { label: 'Hostile', cls: 'rel-hostile' };
  if (v <= -15) return { label: 'Cold', cls: 'rel-cold' };
  if (v < 15) return { label: 'Neutral', cls: 'rel-neutral' };
  if (v < 50) return { label: 'Cordial', cls: 'rel-cordial' };
  return { label: 'Friendly', cls: 'rel-friendly' };
}
