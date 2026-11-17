// Treaties in force on 1 January 1836.
import type { TreatyKind } from '../../../sim/types';

type T = { kind: TreatyKind; a: string; b: string };
/** The German Confederation: Austria and Prussia stand behind the smaller German states. */
const CONFEDERATION = ['BAV', 'SAX', 'HAN', 'WUR', 'HES', 'THU'];

export const TREATIES_1836: T[] = [
  ...CONFEDERATION.flatMap(m => [{ kind: 'guarantee' as const, a: 'AUS', b: m }, { kind: 'guarantee' as const, a: 'PRU', b: m }]),
  { kind: 'alliance', a: 'AUS', b: 'PRU' },        // the Holy Alliance
  { kind: 'alliance', a: 'AUS', b: 'RUS' },
  { kind: 'tradeAgreement', a: 'PRU', b: 'SAX' }, { kind: 'tradeAgreement', a: 'PRU', b: 'THU' }, { kind: 'tradeAgreement', a: 'PRU', b: 'HES' },   // the Zollverein
];
