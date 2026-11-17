// Treaties in force on 1 January 1776.
import type { TreatyKind } from '../../../sim/types';

type T = { kind: TreatyKind; a: string; b: string };
/** The Holy Roman Empire: the Emperor (Austria) stands behind the smaller German states. */
const EMPIRE = ['BAV', 'SAX', 'HAN', 'WUR', 'HES', 'THU', 'PAL'];

export const TREATIES_1776: T[] = [
  ...EMPIRE.map(m => ({ kind: 'guarantee' as const, a: 'AUS', b: m })),
  { kind: 'alliance', a: 'FRA', b: 'SPA' },         // the Family Compact
  { kind: 'alliance', a: 'GBR', b: 'POR' },         // the oldest alliance
  { kind: 'alliance', a: 'AUS', b: 'FRA' },         // since the Diplomatic Revolution
];
