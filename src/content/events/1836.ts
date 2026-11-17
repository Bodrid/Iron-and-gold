// Events for the 1836 start: the Great Game, German and Italian unification, the opening of Japan, the Opium Wars,
// the Eastern Question, US expansion and the Civil War.
import type { EventDef } from './types';

const S1836 = ['1836'];
const y = (year: number, m = 1) => ({ y: year, m, d: 1 });
const SOUTH = ['USA-North Carolina', 'USA-South Carolina', 'USA-Georgia', 'USA-Florida', 'USA-Alabama', 'USA-Mississippi', 'USA-Louisiana', 'USA-Texas', 'USA-Arkansas', 'USA-Tennessee'];
const BULGARIA = ['BGR-Blagoevgrad', 'BGR-Burgas', 'BGR-Montana', 'BGR-Pleven', 'BGR-Plovdiv', 'BGR-Ruse', 'BGR-Sofia', 'BGR-Stara Zagora', 'BGR-Varna'];

export const EVENTS_1836: EventDef[] = [
  // ---- The Great Game ----
  { id: 'gg.afghan', title: 'The Afghan Question', starts: S1836, countries: ['GBR'], start: y(1838), end: y(1850), mtthMonths: 12,
    text: 'Russian agents have been seen in Kabul. The Governor-General of India urges us to put a friendly ruler on the Afghan throne before the Tsar does.\n\nOthers warn that Afghanistan has swallowed every army that ever marched into it.',
    conditions: [{ kind: 'exists', tag: 'AFG' }, { kind: 'notPuppet' }],
    options: [
      { label: 'March on Kabul', effects: [{ kind: 'startPlay', target: 'AFG', demands: [{ kind: 'puppet' }] }, { kind: 'relation', tag: 'RUS', delta: -20 }, { kind: 'flag', flag: 'gg.started', global: true }], ai: 3 },
      { label: 'Watch the passes and wait', effects: [{ kind: 'modifier', name: 'Frontier garrisons', effects: { defensePct: 10 }, months: 60 }, { kind: 'flag', flag: 'gg.started', global: true }], ai: 1 },
    ] },
  { id: 'gg.khiva', title: 'The Road to Khiva', starts: S1836, countries: ['RUS'], start: y(1839), end: y(1880), mtthMonths: 24,
    text: 'Slave raids from Khiva harass our settlers on the steppe. The generals say a column could reach the khanate before the British can object.',
    conditions: [{ kind: 'exists', tag: 'KHI' }],
    options: [
      { label: 'Send the column', effects: [{ kind: 'startPlay', target: 'KHI', demands: [{ kind: 'puppet' }] }, { kind: 'relation', tag: 'GBR', delta: -15 }], ai: 3 },
      { label: 'Fortify the steppe instead', effects: [{ kind: 'modifier', name: 'Steppe forts', effects: { refillPct: 10 }, months: 60 }], ai: 1 },
    ] },
  { id: 'gg.bukhara', title: 'The Emir of Bukhara', starts: S1836, countries: ['RUS'], start: y(1860), end: y(1890), mtthMonths: 24,
    text: 'With Khiva quiet, Bukhara and its rich cities lie open. London will howl.',
    conditions: [{ kind: 'exists', tag: 'BUK' }, { kind: 'atPeace' }],
    options: [
      { label: 'Demand Bukhara submit', effects: [{ kind: 'startPlay', target: 'BUK', demands: [{ kind: 'puppet' }] }, { kind: 'relation', tag: 'GBR', delta: -20 }], ai: 3 },
      { label: 'Trade, not conquest', effects: [{ kind: 'relation', tag: 'BUK', delta: 30 }, { kind: 'relation', tag: 'GBR', delta: 10 }], ai: 1 },
    ] },
  { id: 'gg.entente', title: 'An End to the Great Game', starts: S1836, countries: ['GBR', 'RUS'], start: y(1890), end: y(1920), mtthMonths: 36,
    text: 'A rising power in Europe worries London and St Petersburg alike. Diplomats propose dividing Persia and Central Asia into spheres and ending the long rivalry.',
    conditions: [{ kind: 'flag', flag: 'gg.started', global: true }, { kind: 'atPeace' }],
    options: [
      { label: 'Sign the convention', effects: [{ kind: 'relation', tag: 'RUS', delta: 40 }, { kind: 'relation', tag: 'GBR', delta: 40 }], ai: 3 },
      { label: 'The rivalry goes on', effects: [{ kind: 'modifier', name: 'Imperial vigilance', effects: { maxTroopsPct: 5 }, months: 120 }], ai: 1 },
    ] },

  // ---- German unification ----
  { id: 'de.zollverein', title: 'The Zollverein', starts: S1836, countries: ['PRU'], start: y(1836, 2), end: y(1860), mtthMonths: 6,
    text: 'The customs union of the German states lowers tolls from the Rhine to the Oder. Prussia could make it the heart of a wider German market under Berlin.\n\nVienna would not be pleased.',
    conditions: [],
    options: [
      { label: 'Lead the German states', effects: [{ kind: 'foundBloc', blocType: 'tradeLeague' }, { kind: 'inviteToBloc', tag: 'SAX' }, { kind: 'inviteToBloc', tag: 'THU' }, { kind: 'inviteToBloc', tag: 'HES' }, { kind: 'relation', tag: 'AUS', delta: -15 }, { kind: 'flag', flag: 'de.zollverein' }], ai: 3 },
      { label: 'Keep it a quiet customs union', effects: [{ kind: 'modifier', name: 'Zollverein', effects: { tradePct: 10 }, months: 240 }, { kind: 'flag', flag: 'de.zollverein' }], ai: 1 },
    ] },
  { id: 'de.schleswig', title: 'The Schleswig-Holstein Question', starts: S1836, countries: ['PRU'], start: y(1848), end: y(1875), mtthMonths: 18,
    text: 'The German duchies under the Danish crown want to join Germany. "Only three people ever understood it," said Palmerston: "one is dead, one went mad, and I have forgotten."',
    conditions: [{ kind: 'flag', flag: 'de.zollverein' }, { kind: 'exists', tag: 'DEN' }],
    options: [
      { label: 'Demand the duchies', effects: [{ kind: 'startPlay', target: 'DEN', demands: [{ kind: 'state', key: 'DEU-Schleswig-Holstein' }] }], ai: 3 },
      { label: 'Leave it to the Diet', effects: [{ kind: 'relation', tag: 'DEN', delta: 20 }], ai: 1 },
    ] },
  { id: 'de.north', title: 'The North German Confederation', starts: S1836, countries: ['PRU'], start: y(1864), end: y(1885), mtthMonths: 12,
    text: 'Bismarck proposes that the northern German states join Prussia in a confederation run from Berlin. Those who refuse will find themselves alone.',
    conditions: [{ kind: 'flag', flag: 'de.zollverein' }, { kind: 'atPeace' }, { kind: 'notPuppet' }],
    options: [
      { label: 'Unite the north', effects: [
        { kind: 'transferStates', keys: ['DEU-Niedersachsen'], to: 'self', from: 'HAN' }, { kind: 'transferStates', keys: ['DEU-Hessen'], to: 'self', from: 'HES' },
        { kind: 'transferStates', keys: ['DEU-Thüringen'], to: 'self', from: 'THU' }, { kind: 'transferStates', keys: ['DEU-Sachsen'], to: 'self', from: 'SAX' },
        { kind: 'relation', tag: 'AUS', delta: -30 }, { kind: 'relation', tag: 'FRA', delta: -20 }, { kind: 'flag', flag: 'de.north' }], ai: 3 },
      { label: 'Not yet', effects: [{ kind: 'relation', tag: 'AUS', delta: 10 }], ai: 1 },
    ] },
  { id: 'de.empire', title: 'Proclaiming the German Empire', starts: S1836, countries: ['PRU'], start: y(1866), end: y(1936), mtthMonths: 3,
    text: 'In the Hall of Mirrors the German princes are ready to hail one emperor. The south will follow Prussia if we ask now.',
    conditions: [{ kind: 'flag', flag: 'de.north' }, { kind: 'atPeace' }, { kind: 'ownsShare', prefixes: ['DEU-'], share: 0.6 }],
    options: [
      { label: 'Hail the Kaiser', effects: [{ kind: 'transferStates', keys: ['DEU-Bayern'], to: 'self', from: 'BAV' }, { kind: 'transferStates', keys: ['DEU-Baden-Württemberg'], to: 'self', from: 'WUR' }, { kind: 'formNation', tag: 'GER' }], ai: 4 },
      { label: 'Prussia is enough', effects: [{ kind: 'modifier', name: 'Prussian pride', effects: { attackPct: 5 }, months: 120 }], ai: 1 },
    ] },

  // ---- Italian unification ----
  { id: 'it.risorgimento', title: 'The Risorgimento', starts: S1836, countries: ['SAR'], start: y(1848), end: y(1866), mtthMonths: 12,
    text: 'From Milan to Palermo, Italians dream of one nation. Turin could lead them, starting with Lombardy, held by Austria.',
    conditions: [{ kind: 'exists', tag: 'AUS' }],
    options: [
      { label: 'Demand Lombardy', effects: [{ kind: 'startPlay', target: 'AUS', demands: [{ kind: 'state', key: 'ITA-Lombardia' }] }, { kind: 'flag', flag: 'it.risorgimento' }], ai: 3 },
      { label: 'Patience', effects: [{ kind: 'flag', flag: 'it.risorgimento' }, { kind: 'relation', tag: 'AUS', delta: 15 }], ai: 1 },
    ] },
  { id: 'it.garibaldi', title: 'The Expedition of the Thousand', starts: S1836, countries: ['SAR'], start: y(1859), end: y(1875), mtthMonths: 12,
    text: 'Garibaldi and his Redshirts have landed in Sicily and swept the Bourbon armies before them. He offers the south to King Victor Emmanuel.\n\nTuscany and the Papal Legations ask to join too.',
    conditions: [{ kind: 'flag', flag: 'it.risorgimento' }, { kind: 'atPeace' }, { kind: 'notPuppet' }],
    options: [
      { label: 'Accept the south and the centre', effects: [
        { kind: 'transferStates', keys: ['ITA-Sicily', 'ITA-Campania', 'ITA-Calabria', 'ITA-Apulia', 'ITA-Basilicata', 'ITA-Abruzzo'], to: 'self', from: 'SIC' },
        { kind: 'transferStates', keys: ['ITA-Toscana'], to: 'self', from: 'TUS' }, { kind: 'transferStates', keys: ['ITA-Emilia-Romagna', 'ITA-Marche'], to: 'self', from: 'PAP' },
        { kind: 'relation', tag: 'AUS', delta: -20 }, { kind: 'relation', tag: 'FRA', delta: -10 }, { kind: 'flag', flag: 'it.garibaldi' }], ai: 3 },
      { label: 'Garibaldi goes too far', effects: [{ kind: 'relation', tag: 'SIC', delta: 20 }, { kind: 'approval', group: 'intellectuals', radicalism: 20 }], ai: 1 },
    ] },
  { id: 'it.kingdom', title: 'The Kingdom of Italy', starts: S1836, countries: ['SAR'], start: y(1860), end: y(1936), mtthMonths: 3,
    text: 'Italy is made. Now, as d’Azeglio said, we must make Italians.',
    conditions: [{ kind: 'flag', flag: 'it.garibaldi' }, { kind: 'atPeace' }, { kind: 'ownsShare', prefixes: ['ITA-'], share: 0.75 }],
    options: [{ label: 'Long live Italy', effects: [{ kind: 'formNation', tag: 'ITA' }], ai: 1 }] },
  { id: 'it.rome', title: 'Rome, the Capital', starts: S1836, countries: ['ITA', 'SAR'], start: y(1866), end: y(1936), mtthMonths: 12,
    text: 'The Pope still holds Rome, guarded by French troops. Without it, Italy is unfinished.',
    conditions: [{ kind: 'exists', tag: 'PAP' }, { kind: 'flag', flag: 'it.garibaldi' }],
    options: [
      { label: 'Demand Rome', effects: [{ kind: 'startPlay', target: 'PAP', demands: [{ kind: 'state', key: 'ITA-Lazio' }] }, { kind: 'relation', tag: 'FRA', delta: -10 }], ai: 3 },
      { label: 'Leave the Pope his city', effects: [{ kind: 'approval', group: 'clergy', radicalism: -20 }], ai: 1 },
    ] },

  // ---- The opening of Japan ----
  { id: 'jp.perry', title: 'The Black Ships', starts: S1836, countries: ['JAP'], start: y(1853, 7), end: y(1860), mtthMonths: 2,
    text: 'American warships belching smoke have anchored in Edo Bay. Commodore Perry demands that Japan open its ports to trade and will return for an answer.',
    conditions: [{ kind: 'exists', tag: 'USA' }],
    options: [
      { label: 'Open the ports', effects: [{ kind: 'setLaw', law: 'freeTrade' }, { kind: 'tech', tech: 'steamships' }, { kind: 'relation', tag: 'USA', delta: 25 }, { kind: 'modifier', name: 'Western learning', effects: { researchPct: 25 }, months: 180 }, { kind: 'flag', flag: 'jp.opened' }], ai: 3 },
      { label: 'Expel the barbarians', effects: [{ kind: 'relation', tag: 'USA', delta: -30 }, { kind: 'modifier', name: 'Sonno joi', effects: { defensePct: 15 }, months: 120 }, { kind: 'approval', group: 'army', radicalism: -20 }], ai: 1, aiHard: 0.5 },
    ] },
  { id: 'jp.meiji', title: 'The Meiji Restoration', starts: S1836, countries: ['JAP'], start: y(1866), end: y(1880), mtthMonths: 12,
    text: 'The young Emperor is restored to power. His ministers want factories, railways, schools and a modern army: rich country, strong army.',
    conditions: [{ kind: 'flag', flag: 'jp.opened' }],
    options: [
      { label: 'Rich country, strong army', effects: [{ kind: 'setLaw', law: 'freeLabour' }, { kind: 'setLaw', law: 'publicSchools' }, { kind: 'modifier', name: 'Meiji reforms', effects: { industryPct: 15, researchPct: 15 }, months: 300 }, { kind: 'approval', group: 'landowners', radicalism: 25 }], ai: 4 },
      { label: 'Go slowly', effects: [{ kind: 'modifier', name: 'Cautious reform', effects: { researchPct: 10 }, months: 180 }], ai: 1 },
    ] },

  // ---- The Opium Wars ----
  { id: 'op.ban', title: 'The Opium Trade', starts: S1836, countries: ['CHI'], start: y(1838), end: y(1845), mtthMonths: 6,
    text: 'British merchants pour Indian opium into Canton. Silver drains away and addiction spreads. Commissioner Lin asks for the power to destroy the drug and expel the smugglers.',
    conditions: [{ kind: 'exists', tag: 'GBR' }],
    options: [
      { label: 'Ban it and burn the chests', effects: [{ kind: 'relation', tag: 'GBR', delta: -40 }, { kind: 'flag', flag: 'op.banned', global: true }, { kind: 'modifier', name: 'War on opium', effects: { growthPct: 5 }, months: 60 }], ai: 3 },
      { label: 'Legalise and tax it', effects: [{ kind: 'incomeMonths', months: 2 }, { kind: 'modifier', name: 'Opium addiction', effects: { growthPct: -10, sol: -1 }, months: 180 }], ai: 1 },
    ] },
  { id: 'op.war', title: 'War for the Opium Trade', starts: S1836, countries: ['GBR'], start: y(1839), end: y(1862), mtthMonths: 6,
    text: 'The Chinese have seized and burned British opium at Canton. The merchants demand redress and an open China.',
    conditions: [{ kind: 'flag', flag: 'op.banned', global: true }, { kind: 'exists', tag: 'CHI' }],
    options: [
      { label: 'Send the gunboats', effects: [{ kind: 'startPlay', target: 'CHI', demands: [{ kind: 'openMarket' }, { kind: 'reparations' }] }], ai: 3 },
      { label: 'Trade is not worth a war', effects: [{ kind: 'relation', tag: 'CHI', delta: 20 }, { kind: 'approval', group: 'industrialists', radicalism: 15 }], ai: 1 },
    ] },

  // ---- The Eastern Question ----
  { id: 'eq.syria', title: 'Muhammad Ali in Syria', starts: S1836, countries: ['TUR'], start: y(1838), end: y(1845), mtthMonths: 12,
    text: 'Our vassal in Egypt holds Syria and threatens Anatolia. The European powers are ready to back us, for now.',
    conditions: [{ kind: 'exists', tag: 'EGY' }],
    options: [
      { label: 'Take Syria back', effects: [{ kind: 'startPlay', target: 'EGY', demands: [{ kind: 'state', key: 'SYR-Aleppo' }, { kind: 'state', key: 'SYR-Homs (Hims)' }] }, { kind: 'relation', tag: 'GBR', delta: 15 }], ai: 3 },
      { label: 'Recognise Egypt’s gains', effects: [{ kind: 'relation', tag: 'EGY', delta: 30 }, { kind: 'approval', group: 'army', radicalism: 15 }], ai: 1 },
    ] },
  { id: 'eq.greece', title: 'The Great Idea', starts: S1836, countries: ['GRE'], start: y(1854), end: y(1915), mtthMonths: 36,
    text: 'Millions of Greeks still live under the Sultan. Athens dreams of Thessaly and Epirus, and beyond them Constantinople.',
    conditions: [{ kind: 'exists', tag: 'TUR' }, { kind: 'atPeace' }],
    options: [
      { label: 'Demand Thessaly and Epirus', effects: [{ kind: 'startPlay', target: 'TUR', demands: [{ kind: 'state', key: 'GRC-Thessalia' }, { kind: 'state', key: 'GRC-Ipeiros' }] }], ai: 2 },
      { label: 'Not while we are weak', effects: [{ kind: 'modifier', name: 'National revival', effects: { literacyPct: 15 }, months: 120 }], ai: 1 },
    ] },
  { id: 'eq.bulgaria', title: 'The April Uprising', starts: S1836, countries: ['TUR'], start: y(1870), end: y(1890), mtthMonths: 24,
    text: 'Bulgarian committees have risen against our rule. Irregulars are burning villages in reply, and Europe is reading about it in the papers.',
    conditions: [{ kind: 'ownsState', key: 'BGR-Sofia' }],
    options: [
      { label: 'Crush the rising', effects: [{ kind: 'independence', tag: 'BUL', name: 'Bulgaria', color: 0x3f8f6b, keys: BULGARIA }, { kind: 'relation', tag: 'RUS', delta: -30 }, { kind: 'relation', tag: 'GBR', delta: -15 }], ai: 3 },
      { label: 'Grant Bulgaria autonomy', effects: [{ kind: 'release', tag: 'BUL', name: 'Bulgaria', color: 0x3f8f6b, keys: BULGARIA }, { kind: 'relation', tag: 'RUS', delta: 10 }], ai: 1 },
    ] },
  { id: 'eq.straits', title: 'The Black Sea Straits', starts: S1836, countries: ['RUS'], start: y(1840), end: y(1880), mtthMonths: 48,
    text: 'Our warships are bottled up in the Black Sea. The Danubian principalities stand between us and the Straits.',
    conditions: [{ kind: 'exists', tag: 'MOL' }, { kind: 'atPeace' }],
    options: [
      { label: 'Make Moldavia a protectorate', effects: [{ kind: 'startPlay', target: 'MOL', demands: [{ kind: 'puppet' }] }, { kind: 'relation', tag: 'TUR', delta: -20 }], ai: 2 },
      { label: 'Seek a treaty with the Porte', effects: [{ kind: 'relation', tag: 'TUR', delta: 30 }], ai: 1 },
    ] },

  // ---- The United States ----
  { id: 'us.texas', title: 'Annexation', starts: S1836, countries: ['TEX'], start: y(1837), end: y(1850), mtthMonths: 24,
    text: 'Most Texans voted to join the United States. Washington has finally offered to take the Lone Star into the Union.',
    conditions: [{ kind: 'exists', tag: 'USA' }, { kind: 'isAI' }],
    options: [
      { label: 'Join the Union', effects: [{ kind: 'transferStates', keys: ['USA-Texas'], to: 'USA', from: 'self' }], ai: 3 },
      { label: 'Stay the Lone Star Republic', effects: [{ kind: 'relation', tag: 'USA', delta: -10 }, { kind: 'relation', tag: 'MEX', delta: 10 }], ai: 1 },
    ] },
  { id: 'us.mexico', title: 'Manifest Destiny', starts: S1836, countries: ['USA'], start: y(1845), end: y(1860), mtthMonths: 12,
    text: 'Newspapers say it is our manifest destiny to spread across the continent. Mexico’s northern lands lie empty between us and the Pacific.',
    conditions: [{ kind: 'exists', tag: 'MEX' }, { kind: 'atPeace' }],
    options: [
      { label: 'Demand California and New Mexico', effects: [{ kind: 'startPlay', target: 'MEX', demands: [{ kind: 'state', key: 'USA-California' }, { kind: 'state', key: 'USA-New Mexico' }] }], ai: 3 },
      { label: 'Settle what we have', effects: [{ kind: 'modifier', name: 'Homesteads', effects: { growthPct: 10 }, months: 120 }], ai: 1 },
    ] },
  { id: 'us.civilwar', title: 'A House Divided', starts: S1836, countries: ['USA'], start: y(1858), end: y(1870), mtthMonths: 12,
    text: 'The new President is pledged against the spread of slavery. Southern states are meeting to discuss leaving the Union.\n\n"A house divided against itself cannot stand."',
    conditions: [{ kind: 'law', law: 'slavery' }],
    options: [
      { label: 'Preserve the Union and end slavery', effects: [{ kind: 'setLaw', law: 'freeLabour' }, { kind: 'independence', tag: 'CSA', name: 'Confederate States', color: 0x9a8c6e, keys: SOUTH, group: 'landowners' }], ai: 3 },
      { label: 'Let the South go in peace', effects: [{ kind: 'release', tag: 'CSA', name: 'Confederate States', color: 0x9a8c6e, keys: SOUTH }, { kind: 'setLaw', law: 'freeLabour' }], ai: 0.2 },
    ] },
];
