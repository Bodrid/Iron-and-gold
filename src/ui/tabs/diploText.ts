import type { TreatyKind } from '../../sim/types';

export const DIPLO_REASON: Record<string, string> = {
  needsCordial: 'Needs Cordial relations', needsNeutral: 'Needs at least Neutral relations', notStronger: 'You must be stronger than them',
  alreadySigned: 'Already signed', atWar: 'You are at war', hostile: 'Relations are Hostile', allied: 'You are allies',
  playUnderWay: 'There is already a play under way involving one of you', puppet: 'Puppets can’t do that: their overlord decides', alreadyPuppet: 'They are already your puppet',
  targetIsPuppet: 'They are someone’s puppet: make demands of their overlord', noCapacity: 'No free diplomats', needsHostile: 'Needs Hostile relations',
  tooSoon: 'Too soon: wait a while longer (puppets can be annexed after 10 years; charters change once a year)', alreadyInvolved: 'You are already part of a play or war', badDemands: 'Choose 1–3 demands',
  notTheirState: 'That state isn’t theirs', noBloc: 'You need to lead a power bloc', targetInBloc: 'They are already in a power bloc',
  inBloc: 'You are already in a power bloc', notMajor: 'Only major powers can found a bloc', notLeader: 'Only the bloc leader can do that',
  badPrinciples: 'Pick up to two different principles', cantAfford: 'Not enough money', notInBloc: 'You aren’t in a power bloc', notMember: 'Not a member',
  rebels: 'Not possible with rebels: it’s a civil war', theyRefuse: 'They won’t have you: improve relations first', invitedRecently: 'They were asked recently',
  sameBloc: 'You are in the same power bloc', alreadyExists: 'That nation already exists', notEligible: 'Your country can’t form it',
  needsCores: 'You need more of its lands', askThePlayer: 'They decide who joins: wait for an invitation',
  notYours: 'A historical company of another country', alreadyFounded: 'Already founded', tooMany: 'Build more industry to run another company',
  noCompany: 'Found the company first', alreadyGranted: 'Already granted', noPuppets: 'Needs at least one puppet', noCharter: 'No charter to revoke', 'no such play': 'That play is over', notYourPuppet: 'Not your puppet', 'no such country': 'Not possible',
};

export const TREATY_NAMES: Record<TreatyKind, string> = { alliance: 'Alliance', defensivePact: 'Defensive pact', tradeAgreement: 'Trade agreement', guarantee: 'Guarantee independence', embargo: 'Embargo' };

export function relationText(v: number): { label: string; cls: string } {
  if (v <= -50) return { label: 'Hostile', cls: 'rel-hostile' };
  if (v <= -15) return { label: 'Cold', cls: 'rel-cold' };
  if (v < 15) return { label: 'Neutral', cls: 'rel-neutral' };
  if (v < 50) return { label: 'Cordial', cls: 'rel-cordial' };
  return { label: 'Friendly', cls: 'rel-friendly' };
}
