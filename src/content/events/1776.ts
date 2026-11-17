// Events for the 1776 start: the American Revolution, the French Revolution and Napoleon, the partitions of Poland.
import type { EventDef } from './types';

const S1776 = ['1776'];
const y = (year: number, m = 1) => ({ y: year, m, d: 1 });
const COLONIES = ['USA-New York', 'USA-Pennsylvania', 'USA-Virginia', 'USA-North Carolina', 'USA-South Carolina', 'USA-Georgia', 'USA-Maine', 'USA-Vermont'];

export const EVENTS_1776: EventDef[] = [
  // ---- The American Revolution ----
  { id: 'ar.independence', title: 'The Declaration of Independence', starts: S1776, countries: ['GBR'], start: y(1776, 2), end: y(1790), mtthMonths: 2,
    text: 'In Philadelphia the Continental Congress has declared the thirteen colonies free and independent states. Washington’s army besieges Boston.\n\nParliament must decide: fight to keep the colonies, or let them go.',
    conditions: [{ kind: 'ownsState', key: 'USA-Pennsylvania' }],
    options: [
      { label: 'Crush the rebellion', effects: [{ kind: 'independence', tag: 'USA', name: 'United States', color: 0x5d7fc4, keys: COLONIES, group: 'intellectuals', troops: 0.5, defensePct: 110, personality: 'usa' }, { kind: 'modifier', name: 'An ocean away', effects: { attackPct: -60 }, months: 96 }, { kind: 'flag', flag: 'ar.war', global: true }], ai: 4 },
      { label: 'Let them go', effects: [{ kind: 'release', tag: 'USA', name: 'United States', color: 0x5d7fc4, keys: COLONIES }, { kind: 'approval', group: 'landowners', radicalism: 20 }], ai: 0.3 },
    ] },
  { id: 'ar.france', title: 'An American Alliance', starts: S1776, countries: ['FRA'], start: y(1776, 6), end: y(1783), mtthMonths: 4,
    text: 'Benjamin Franklin charms Versailles. Helping the Americans would avenge the last war, but the treasury is already strained.',
    conditions: [{ kind: 'flag', flag: 'ar.war', global: true }, { kind: 'exists', tag: 'USA' }],
    options: [
      { label: 'Back the Americans', effects: [{ kind: 'relation', tag: 'USA', delta: 50 }, { kind: 'relation', tag: 'GBR', delta: -40 }, { kind: 'startPlay', target: 'GBR', demands: [{ kind: 'reparations' }] }, { kind: 'incomeMonths', months: -3 }], ai: 3 },
      { label: 'Stay out of it', effects: [{ kind: 'relation', tag: 'USA', delta: -10 }, { kind: 'incomeMonths', months: 1 }], ai: 1 },
    ] },
  { id: 'ar.constitution', title: 'A More Perfect Union', starts: S1776, countries: ['USA'], start: y(1783), end: y(1800), mtthMonths: 12,
    text: 'The Articles of Confederation are too weak. Delegates propose a federal constitution with an elected president.',
    conditions: [{ kind: 'atPeace' }],
    options: [
      { label: 'Ratify the Constitution', effects: [{ kind: 'setLaw', law: 'republic' }, { kind: 'setLaw', law: 'wealthVoting' }, { kind: 'modifier', name: 'New republic', effects: { growthPct: 15 }, months: 240 }], ai: 4 },
      { label: 'Keep the loose confederation', effects: [{ kind: 'setLaw', law: 'republic' }, { kind: 'setLaw', law: 'lowTaxes' }], ai: 1 },
    ] },

  // ---- The French Revolution and Napoleon ----
  { id: 'fr.estates', title: 'The Estates-General', starts: S1776, countries: ['FRA'], start: y(1787), end: y(1795), mtthMonths: 12,
    text: 'The crown is bankrupt and bread is dear. The King has summoned the Estates-General for the first time since 1614, and the Third Estate is calling itself the National Assembly.',
    conditions: [],
    options: [
      { label: 'Accept a constitution', effects: [{ kind: 'setLaw', law: 'constitutionalMonarchy' }, { kind: 'setLaw', law: 'wealthVoting' }, { kind: 'flag', flag: 'fr.revolution' }], ai: 3 },
      { label: 'Send in the troops', effects: [{ kind: 'approval', group: 'intellectuals', radicalism: 60 }, { kind: 'approval', group: 'workers', radicalism: 60 }, { kind: 'flag', flag: 'fr.revolution' }], ai: 1 },
    ] },
  { id: 'fr.republic', title: 'The Republic', starts: S1776, countries: ['FRA'], start: y(1791), end: y(1800), mtthMonths: 12,
    text: 'The King tried to flee and was caught at Varennes. The Convention abolishes the monarchy. Austria and Prussia threaten war to restore him; the Republic calls the nation to arms.',
    conditions: [{ kind: 'flag', flag: 'fr.revolution' }],
    options: [
      { label: 'Liberty, equality, fraternity', effects: [{ kind: 'setLaw', law: 'republic' }, { kind: 'setLaw', law: 'massConscription' }, { kind: 'setLaw', law: 'freeLabour' }, { kind: 'relation', tag: 'AUS', delta: -40 }, { kind: 'relation', tag: 'PRU', delta: -40 }, { kind: 'flag', flag: 'fr.republic' }], ai: 4 },
      { label: 'A constitutional king, after all', effects: [{ kind: 'approval', group: 'intellectuals', radicalism: 40 }], ai: 1 },
    ] },
  { id: 'fr.wars', title: 'The War of the First Coalition', starts: S1776, countries: ['FRA'], start: y(1792), end: y(1802), mtthMonths: 6,
    text: 'The armies of the Republic stand on the Rhine. The Austrian Netherlands lie open.',
    conditions: [{ kind: 'flag', flag: 'fr.republic' }, { kind: 'exists', tag: 'AUS' }],
    options: [
      { label: 'March into Belgium', effects: [{ kind: 'startPlay', target: 'AUS', demands: [{ kind: 'state', key: 'BEL-Flemish Brabant' }, { kind: 'state', key: 'BEL-Hainaut' }, { kind: 'state', key: 'BEL-Liege' }] }], ai: 3 },
      { label: 'Defend the frontiers only', effects: [{ kind: 'modifier', name: 'Levée en masse', effects: { defensePct: 20 }, months: 60 }], ai: 1 },
    ] },
  { id: 'fr.napoleon', title: 'The First Consul', starts: S1776, countries: ['FRA'], start: y(1799), end: y(1810), mtthMonths: 12,
    text: 'A young Corsican general has seized power in a coup. He promises order at home and glory abroad, and in a few years will crown himself Emperor.',
    conditions: [{ kind: 'flag', flag: 'fr.republic' }],
    options: [
      { label: 'Vive l’Empereur!', effects: [{ kind: 'setLaw', law: 'absoluteMonarchy' }, { kind: 'modifier', name: 'Grande Armée', effects: { attackPct: 25, refillPct: 25 }, months: 180 }, { kind: 'flag', flag: 'fr.napoleon' }], ai: 4 },
      { label: 'Keep the Directory', effects: [{ kind: 'modifier', name: 'Directory', effects: { taxPct: -10 }, months: 60 }], ai: 1 },
    ] },
  { id: 'fr.continental', title: 'The Continental System', starts: S1776, countries: ['FRA'], start: y(1806), end: y(1815), mtthMonths: 6,
    text: 'Britain cannot be beaten at sea. Close every port in Europe to British goods and starve her of trade instead.',
    conditions: [{ kind: 'flag', flag: 'fr.napoleon' }, { kind: 'exists', tag: 'GBR' }],
    options: [
      { label: 'Close the ports', effects: [{ kind: 'relation', tag: 'GBR', delta: -50 }, { kind: 'modifier', name: 'Continental System', effects: { tradePct: -20, industryPct: 10 }, months: 96 }], ai: 3 },
      { label: 'Seek peace with Britain', effects: [{ kind: 'relation', tag: 'GBR', delta: 30 }], ai: 1 },
    ] },
  { id: 'fr.russia', title: 'The Russian Campaign', starts: S1776, countries: ['FRA'], start: y(1810), end: y(1815), mtthMonths: 12,
    text: 'The Tsar trades with Britain behind our back. Half a million men are ready to cross the Niemen.',
    conditions: [{ kind: 'flag', flag: 'fr.napoleon' }, { kind: 'exists', tag: 'RUS' }, { kind: 'atPeace' }],
    options: [
      { label: 'Invade Russia', effects: [{ kind: 'startPlay', target: 'RUS', demands: [{ kind: 'reparations' }] }], ai: 3 },
      { label: 'Winter is coming; stay home', effects: [{ kind: 'relation', tag: 'RUS', delta: 20 }], ai: 1 },
    ] },

  // ---- The partitions of Poland ----
  { id: 'pl.second.rus', title: 'The Second Partition of Poland', starts: S1776, countries: ['RUS'], start: y(1792), end: y(1800), mtthMonths: 12,
    text: 'Polish reformers have written a constitution. Catherine will not allow it: her armies can take the east of the Commonwealth.',
    conditions: [{ kind: 'exists', tag: 'POL' }],
    options: [
      { label: 'Take the east', effects: [{ kind: 'transferStates', keys: ['BLR-Minsk', 'UKR-Zhytomyr', 'UKR-Vinnytsya', "UKR-Khmel'nyts'kyy", 'UKR-Cherkasy'], to: 'self', from: 'POL' }, { kind: 'flag', flag: 'pl.second', global: true }], ai: 4 },
      { label: 'Leave Poland be', effects: [{ kind: 'relation', tag: 'POL', delta: 30 }], ai: 1 },
    ] },
  { id: 'pl.second.pru', title: 'South Prussia', starts: S1776, countries: ['PRU'], start: y(1792), end: y(1800), mtthMonths: 6,
    text: 'Russia is carving up Poland. If we stand aside, the Tsarina takes everything.',
    conditions: [{ kind: 'exists', tag: 'POL' }, { kind: 'flag', flag: 'pl.second', global: true }],
    options: [
      { label: 'Take Greater Poland', effects: [{ kind: 'transferStates', keys: ['POL-Greater Poland', 'POL-Łódź'], to: 'self', from: 'POL' }], ai: 4 },
      { label: 'Stay out', effects: [{ kind: 'relation', tag: 'POL', delta: 20 }], ai: 1 },
    ] },
  { id: 'pl.third.rus', title: 'The Third Partition of Poland', starts: S1776, countries: ['RUS'], start: y(1795), end: y(1805), mtthMonths: 12,
    text: 'Kościuszko’s rising has been crushed. Poland is to vanish from the map.',
    conditions: [{ kind: 'exists', tag: 'POL' }, { kind: 'flag', flag: 'pl.second', global: true }],
    options: [
      { label: 'Finish it', effects: [{ kind: 'transferStates', keys: ['LTU-Kauno', 'LTU-Panevezio', 'LTU-Utenos', 'LTU-Vilniaus', 'LTU-Šiauliai', 'BLR-Brest', 'BLR-Grodno', 'UKR-Volyn', 'UKR-Rivne', 'LVA-Kuldigas', 'LVA-Iecavas'], to: 'self', from: 'POL' }, { kind: 'flag', flag: 'pl.third', global: true }], ai: 4 },
      { label: 'Let a small Poland survive', effects: [{ kind: 'relation', tag: 'POL', delta: 20 }], ai: 1 },
    ] },
  { id: 'pl.third.pru', title: 'New East Prussia', starts: S1776, countries: ['PRU'], start: y(1795), end: y(1805), mtthMonths: 6,
    text: 'Warsaw itself can be ours in the final partition.',
    conditions: [{ kind: 'exists', tag: 'POL' }, { kind: 'flag', flag: 'pl.third', global: true }],
    options: [
      { label: 'Take Warsaw', effects: [{ kind: 'transferStates', keys: ['POL-Masovian', 'POL-Podlachian'], to: 'self', from: 'POL' }], ai: 4 },
      { label: 'Leave it to the others', effects: [{ kind: 'relation', tag: 'RUS', delta: -10 }], ai: 1 },
    ] },
  { id: 'pl.third.aus', title: 'West Galicia', starts: S1776, countries: ['AUS'], start: y(1795), end: y(1805), mtthMonths: 6,
    text: 'Russia and Prussia are dividing what is left of Poland. Kraków and Lublin could be ours.',
    conditions: [{ kind: 'exists', tag: 'POL' }, { kind: 'flag', flag: 'pl.third', global: true }],
    options: [
      { label: 'Take West Galicia', effects: [{ kind: 'transferStates', keys: ['POL-Lesser Poland', 'POL-Lublin', 'POL-Świętokrzyskie'], to: 'self', from: 'POL' }], ai: 4 },
      { label: 'No part in this', effects: [{ kind: 'relation', tag: 'POL', delta: 20 }], ai: 1 },
    ] },
];
