// Unifications, federations and the new nations of the age, for both starts: Austria-Hungary, Scandinavia, India,
// Rome, the Balkans, Romania, Latin America, Iberia, the Low Countries, Arabia and the British dominions.
import type { EventDef } from './types';

const S1776 = ['1776'];
const S1836 = ['1836'];
const y = (year: number, m = 1) => ({ y: year, m, d: 1 });

const HUNGARY = ['HUN-Baranya', 'HUN-Borsod-Abaúj-Zemplén', 'HUN-Bács-Kiskun', 'HUN-Gyor-Moson-Sopron', 'HUN-Jász-Nagykun-Szolnok', 'HUN-Pest', 'HUN-Vas'];
const NORWAY = ['NOR-Akershus', 'NOR-Aust-Agder', 'NOR-Buskerud', 'NOR-Finnmark', 'NOR-Hedmark', 'NOR-Hordaland', 'NOR-Møre og Romsdal', 'NOR-Nord-Trøndelag', 'NOR-Nordland',
  'NOR-Oppland', 'NOR-Rogaland', 'NOR-Sogn og Fjordane', 'NOR-Svalbard', 'NOR-Sør-Trøndelag', 'NOR-Telemark', 'NOR-Troms', 'NOR-Vest-Agder'];
const DENMARK = ['DNK-Midtjylland', 'DNK-Nordjylland', 'DNK-Sjaælland', 'DNK-Syddanmark', 'ISL-Norðurland eystra', 'ISL-Suðurland'];
const SERBIA = ['SRB-Grad Beograd', 'SRB-Pomoravski', 'SRB-Zajecarski', 'SRB-Zlatiborski'];
const GREECE = ['GRC-Peloponnisos', 'GRC-Stereá Elláda', 'GRC-Dytiki Ellada', 'GRC-Notio Aigaio'];
const BELGIUM = ['BEL-Flemish Brabant', 'BEL-Hainaut', 'BEL-Liege'];
const MEXICO = ['MEX-Baja California', 'MEX-Chiapas', 'MEX-Chihuahua', 'MEX-Coahuila', 'MEX-Durango', 'MEX-Jalisco', 'MEX-Oaxaca', 'MEX-Puebla', 'MEX-Quintana Roo', 'MEX-Sonora', 'MEX-Tamaulipas', 'MEX-Zacatecas'];
const CENTRAL_AMERICA = ['GTM-Quiché', 'HND-Olancho', 'SLV-San Miguel', 'NIC-Atlántico Norte', 'CRI-Puntarenas'];
const VENEZUELA = ['VEN-Amazonas', 'VEN-Barinas', 'VEN-Bolívar', 'VEN-Lara'];
const ECUADOR = ['ECU-Galápagos', 'ECU-Los Rios', 'ECU-Morona Santiago'];
const GRAN_COLOMBIA = ['COL-Amazonas', 'COL-Antioquia', 'COL-Caquetá', 'COL-Cauca', 'COL-Cesar', 'COL-Meta', 'COL-Santander', 'COL-Vichada', 'PAN-Veraguas', ...VENEZUELA, ...ECUADOR];
const PLATA = ['ARG-Buenos Aires', 'ARG-Catamarca', 'ARG-Chaco', 'ARG-Chubut', 'ARG-Corrientes', 'ARG-Córdoba', 'ARG-Entre Ríos', 'ARG-Formosa', 'ARG-La Pampa', 'ARG-La Rioja',
  'ARG-Mendoza', 'ARG-Neuquén', 'ARG-Río Negro', 'ARG-Salta', 'ARG-San Juan', 'ARG-San Luis', 'ARG-Santa Cruz', 'ARG-Santa Fe', 'ARG-Santiago del Estero', 'ARG-Tierra del Fuego',
  'URY-Durazno', 'PRY-Alto Paraguay', 'PRY-Boquerón', 'PRY-Caaguazú'];
const PERU = ['PER-Ayacucho', 'PER-Cajamarca', 'PER-Huánuco', 'PER-Loreto', 'PER-Madre de Dios', 'PER-Puno', 'PER-Ucayali'];
const BOLIVIA = ['BOL-Chuquisaca', 'BOL-El Beni', 'BOL-La Paz', 'BOL-Potosí', 'BOL-Santa Cruz'];
const CHILE = ['CHL-Aisén del General Carlos Ibáñez del Campo', 'CHL-Antofagasta', 'CHL-Atacama', 'CHL-Bío-Bío', 'CHL-La Araucanía', 'CHL-Magallanes y Antártica Chilena'];
const BRAZIL = ['BRA-Acre', 'BRA-Amapá', 'BRA-Amazonas (East)', 'BRA-Amazonas (West)', 'BRA-Bahia', 'BRA-Ceará', 'BRA-Goiás', 'BRA-Maranhão', 'BRA-Mato Grosso', 'BRA-Mato Grosso do Sul',
  'BRA-Minas Gerais', 'BRA-Paraná', 'BRA-Paraíba', 'BRA-Pará', 'BRA-Pernambuco', 'BRA-Piauí', 'BRA-Rio Grande do Sul', 'BRA-Rondônia', 'BRA-Roraima', 'BRA-Santa Catarina', 'BRA-São Paulo', 'BRA-Tocantins'];
const PORTUGAL = ['PRT-Azores', 'PRT-Beja', 'PRT-Bragança', 'PRT-Guarda', 'PRT-Madeira', 'PRT-Santarém', 'PRT-Évora'];
const CANADA = ['CAN-New Brunswick', 'CAN-Newfoundland and Labrador', 'CAN-Nova Scotia', 'CAN-Ontario (South-East)', 'CAN-Ontario (North-West)', 'CAN-Québec (East)', 'CAN-Québec (West)', 'CAN-Manitoba',
  'CAN-British Columbia (South-East)', 'CAN-British Columbia (North-West)'];
const AUSTRALIA = ['AUS-New South Wales', 'AUS-Victoria', 'AUS-Tasmania', 'AUS-South Australia', 'AUS-Western Australia (South-West)', 'AUS-Western Australia (North-East)', 'AUS-Western Australia (South-East)',
  'AUS-Queensland (South-East)', 'AUS-Queensland (North-West)', 'AUS-Northern Territory (North)', 'AUS-Northern Territory (South)'];
const CONGRESS_POLAND = ['POL-Masovian', 'POL-Lublin', 'POL-Łódź', 'POL-Podlachian', 'POL-Świętokrzyskie'];
const HOLY_CITIES = [{ kind: 'state' as const, key: 'SAU-Makkah' }, { kind: 'state' as const, key: 'SAU-Al Madinah' }];

export const EVENTS_UNIFICATIONS: EventDef[] = [
  // ---- Austria-Hungary ----
  { id: 'ah.1848', title: 'The Hungarian Revolution', countries: ['AUS'], start: y(1847), end: y(1853), mtthMonths: 6,
    text: 'Revolution has spread from Paris to Vienna. In Pest, Kossuth’s Diet has passed the April Laws and raised a Hungarian army.\n\nThe Tsar offers to send his regiments over the Carpathians to help us crush it.',
    conditions: [{ kind: 'ownsShare', prefixes: ['HUN-'], share: 0.7 }],
    options: [
      { label: 'Crush it, with Russian help', effects: [{ kind: 'independence', tag: 'HUN', name: 'Hungary', color: 0x5f9e5a, keys: HUNGARY }, { kind: 'modifier', name: 'Russian intervention', effects: { attackPct: 40 }, months: 24 }, { kind: 'relation', tag: 'RUS', delta: 25 }, { kind: 'flag', flag: 'ah.1848' }], ai: 3 },
      { label: 'Accept the April Laws', effects: [{ kind: 'approval', group: 'intellectuals', radicalism: -25 }, { kind: 'modifier', name: 'April Laws', effects: { taxPct: -10 }, months: 120 }, { kind: 'flag', flag: 'ah.1848' }], ai: 1 },
    ] },
  { id: 'ah.ausgleich', title: 'The Compromise', countries: ['AUS'], start: y(1860), end: y(1900), mtthMonths: 12,
    text: 'Defeat abroad has shaken the Empire. Deák offers a bargain: Hungary will stay under the Habsburg crown if it is ruled from Budapest as an equal partner.',
    conditions: [{ kind: 'flag', flag: 'ah.1848' }, { kind: 'atPeace' }, { kind: 'notPuppet' }, { kind: 'ownsShare', prefixes: ['HUN-'], share: 0.7 }],
    options: [
      { label: 'Crown Franz Joseph King of Hungary', effects: [{ kind: 'formNation', tag: 'AUH' }, { kind: 'approval', group: 'landowners', radicalism: -15 }], ai: 4 },
      { label: 'Rule from Vienna alone', effects: [{ kind: 'approval', group: 'intellectuals', radicalism: 25 }, { kind: 'modifier', name: 'Centralism', effects: { taxPct: 5 }, months: 120 }], ai: 1 },
    ] },

  // ---- Scandinavia ----
  { id: 'sc.finland', title: 'The Finnish War', starts: S1776, countries: ['RUS'], start: y(1788), end: y(1812), mtthMonths: 36,
    text: 'Swedish Finland sits a day’s march from St Petersburg. Our generals say the Grand Duchy could be ours within a season.',
    conditions: [{ kind: 'exists', tag: 'SWE' }, { kind: 'atPeace' }],
    options: [
      { label: 'Take Finland', effects: [{ kind: 'startPlay', target: 'SWE', demands: [{ kind: 'state', key: 'FIN-Uusimaa' }, { kind: 'state', key: 'FIN-Finland Proper' }, { kind: 'state', key: 'FIN-Pirkanmaa' }] }], ai: 3 },
      { label: 'Leave the Swedes be', effects: [{ kind: 'relation', tag: 'SWE', delta: 20 }], ai: 1 },
    ] },
  { id: 'sc.kiel', title: 'The Treaty of Kiel', starts: S1776, countries: ['DEN'], start: y(1813), end: y(1816), mtthMonths: 4,
    text: 'Napoleon’s empire is falling and we stood with him. Sweden’s Crown Prince Bernadotte, backed by the allies, demands Norway as the price of peace.',
    conditions: [{ kind: 'exists', tag: 'SWE' }, { kind: 'ownsShare', prefixes: ['NOR-'], share: 0.8 }],
    options: [
      { label: 'Cede Norway to Sweden', effects: [{ kind: 'transferStates', keys: NORWAY, to: 'SWE', from: 'self' }, { kind: 'relation', tag: 'SWE', delta: 20 }], ai: 3 },
      { label: 'Never', effects: [{ kind: 'relation', tag: 'SWE', delta: -50 }, { kind: 'relation', tag: 'GBR', delta: -20 }, { kind: 'modifier', name: 'Norway in arms', effects: { defensePct: 15 }, months: 60 }], ai: 1 },
    ] },
  { id: 'sc.scandinavism', title: 'Scandinavism', countries: ['SWE'], start: y(1845), end: y(1870), mtthMonths: 24,
    text: 'Students from Uppsala, Lund and Copenhagen toast the brotherhood of the Nordic peoples. Danes look to Stockholm for help against the Germans.',
    conditions: [{ kind: 'exists', tag: 'DEN' }],
    options: [
      { label: 'Pledge to defend Denmark', effects: [{ kind: 'relation', tag: 'DEN', delta: 40 }, { kind: 'flag', flag: 'sc.pledge' }], ai: 2 },
      { label: 'Sweden comes first', effects: [{ kind: 'modifier', name: 'Armed neutrality', effects: { defensePct: 10 }, months: 120 }], ai: 1 },
    ] },
  { id: 'sc.union', title: 'The Union of the Crowns', countries: ['SWE'], start: y(1850), end: y(1936), mtthMonths: 60,
    text: 'The Danish king has died without an heir. Scandinavists in Copenhagen propose that our king take the Danish crown and unite the North.',
    conditions: [{ kind: 'flag', flag: 'sc.pledge' }, { kind: 'exists', tag: 'DEN' }, { kind: 'relationAbove', tag: 'DEN', value: 50 }, { kind: 'atPeace' }, { kind: 'notPuppet' }, { kind: 'ownsShare', prefixes: ['NOR-'], share: 0.8 }],
    options: [
      { label: 'Unite the North', effects: [{ kind: 'transferStates', keys: DENMARK, to: 'self', from: 'DEN' }, { kind: 'formNation', tag: 'SCA' }, { kind: 'relation', tag: 'PRU', delta: -20 }], ai: 1, aiHard: 2 },
      { label: 'Let Denmark choose its own king', effects: [{ kind: 'relation', tag: 'DEN', delta: 20 }], ai: 2 },
    ] },

  // ---- India ----
  { id: 'in.attock', title: 'From Attock to Cuttack', starts: S1776, countries: ['MAR'], start: y(1776, 3), end: y(1800), mtthMonths: 18,
    text: 'The Mughal Emperor sits in Delhi only because Maratha swords protect him. The Peshwa’s ministers say it is time to rule Hindustan in his name.',
    conditions: [{ kind: 'exists', tag: 'MUG' }, { kind: 'atPeace' }],
    options: [
      { label: 'Take the Emperor under our protection', effects: [{ kind: 'startPlay', target: 'MUG', demands: [{ kind: 'puppet' }] }, { kind: 'relation', tag: 'GBR', delta: -10 }], ai: 3 },
      { label: 'Guard the Deccan', effects: [{ kind: 'modifier', name: 'Maratha horse', effects: { attackPct: 10 }, months: 120 }], ai: 1 },
    ] },
  { id: 'in.tipu', title: 'The Tiger of Mysore', starts: S1776, countries: ['MYS'], start: y(1780), end: y(1799), mtthMonths: 24,
    text: 'Tipu Sultan has French officers, iron rockets and a hatred of the East India Company. He asks whether we will drive the British from the Carnatic.',
    conditions: [{ kind: 'exists', tag: 'GBR' }, { kind: 'atPeace' }],
    options: [
      { label: 'Drive out the Company', effects: [{ kind: 'startPlay', target: 'GBR', demands: [{ kind: 'state', key: 'IND-Tamil Nadu' }] }, { kind: 'relation', tag: 'FRA', delta: 25 }, { kind: 'modifier', name: 'Mysorean rockets', effects: { defensePct: 15 }, months: 120 }], ai: 3 },
      { label: 'Make terms with the Company', effects: [{ kind: 'relation', tag: 'GBR', delta: 30 }, { kind: 'incomeMonths', months: 2 }], ai: 1 },
    ] },
  { id: 'in.ranjit', title: 'The Lion of the Punjab', starts: S1776, countries: ['PUN'], start: y(1799), end: y(1820), mtthMonths: 12,
    text: 'Young Ranjit Singh has taken Lahore and joined the Sikh misls into one state. He looks west, to Peshawar and the Afghan passes.',
    conditions: [{ kind: 'exists', tag: 'AFG' }],
    options: [
      { label: 'Take Peshawar', effects: [{ kind: 'startPlay', target: 'AFG', demands: [{ kind: 'state', key: 'PAK-K.P.' }] }, { kind: 'modifier', name: 'Khalsa army', effects: { attackPct: 15, refillPct: 10 }, months: 240 }], ai: 3 },
      { label: 'Hold the Punjab', effects: [{ kind: 'modifier', name: 'Khalsa army', effects: { defensePct: 15 }, months: 240 }], ai: 1 },
    ] },
  { id: 'in.mutiny', title: 'The Indian Rebellion', starts: S1836, countries: ['GBR'], start: y(1856), end: y(1860), mtthMonths: 6,
    text: 'Sepoys at Meerut have shot their officers and marched on Delhi, where they hail the old Mughal Emperor as ruler of Hindustan. The revolt spreads down the Ganges.',
    conditions: [{ kind: 'ownsState', key: 'IND-Uttar Pradesh' }],
    options: [
      { label: 'Crush the mutiny', effects: [{ kind: 'independence', tag: 'MUG', name: 'Mughal Empire', color: 0x2e7d5b, keys: ['IND-Uttar Pradesh', 'IND-Bihar', 'IND-Madhya Pradesh', 'IND-Jharkhand'], group: 'army' }], ai: 3 },
      { label: 'Crush it, and end Company rule', effects: [{ kind: 'independence', tag: 'MUG', name: 'Mughal Empire', color: 0x2e7d5b, keys: ['IND-Uttar Pradesh', 'IND-Bihar', 'IND-Madhya Pradesh', 'IND-Jharkhand'], group: 'army' }, { kind: 'modifier', name: 'The Raj', effects: { taxPct: -10, defensePct: 10 }, months: 240 }], ai: 2 },
    ] },

  // ---- Rome and Byzantium ----
  { id: 'rm.mare', title: 'Mare Nostrum', countries: ['ITA'], start: y(1880), end: y(1936), mtthMonths: 36,
    text: 'Rome once ruled the whole Mediterranean. The nationalists say Italy’s empire should begin across the water, in Ottoman Tripolitania.',
    conditions: [{ kind: 'exists', tag: 'TUR' }, { kind: 'atPeace' }],
    options: [
      { label: 'Demand Tripolitania', effects: [{ kind: 'startPlay', target: 'TUR', demands: [{ kind: 'state', key: 'LBY-Mizdah' }, { kind: 'state', key: 'LBY-Ajdabiya' }, { kind: 'state', key: 'LBY-Al Butnan' }] }, { kind: 'flag', flag: 'rm.mare' }], ai: 3 },
      { label: 'Italy has enough to do at home', effects: [{ kind: 'modifier', name: 'Home first', effects: { industryPct: 5 }, months: 120 }], ai: 1 },
    ] },
  { id: 'rm.eagles', title: 'The Eagles Return', countries: ['ITA', 'TUR', 'GRE', 'BYZ'], start: y(1850), end: y(1936), mtthMonths: 12,
    text: 'Our banners fly from Rome to Constantinople. Scholars and generals alike say the empire of the Caesars has been reborn in all but name.',
    conditions: [{ kind: 'ownsShare', prefixes: ['ITA-', 'GRC-', 'TUR-'], share: 0.8 }, { kind: 'atPeace' }],
    options: [
      { label: 'Claim the Roman inheritance', effects: [{ kind: 'modifier', name: 'Roman legacy', effects: { attackPct: 10, maxTroopsPct: 10 }, months: 240 }, { kind: 'approval', group: 'army', radicalism: -20 }], ai: 3 },
      { label: 'Old dreams', effects: [{ kind: 'approval', group: 'intellectuals', radicalism: -10 }], ai: 1 },
    ] },
  { id: 'by.macedonia', title: 'The Balkan Wars', countries: ['GRE'], start: y(1900), end: y(1936), mtthMonths: 36,
    text: 'The Ottoman Empire is crumbling in Europe. Salonica and Macedonia are within reach, and beyond them, the City.',
    conditions: [{ kind: 'exists', tag: 'TUR' }, { kind: 'atPeace' }],
    options: [
      { label: 'Demand Macedonia and Thrace', effects: [{ kind: 'startPlay', target: 'TUR', demands: [{ kind: 'state', key: 'GRC-Kentriki Makedonia' }, { kind: 'state', key: 'GRC-Dytiki Makedonia' }, { kind: 'state', key: 'GRC-Anatoliki Makedonia kai Thraki' }] }], ai: 3 },
      { label: 'Not yet', effects: [{ kind: 'modifier', name: 'Army reform', effects: { refillPct: 10 }, months: 60 }], ai: 1 },
    ] },

  // ---- The Balkans ----
  { id: 'bk.serbia', title: 'The Serbian Revolution', starts: S1776, countries: ['TUR'], start: y(1804), end: y(1815), mtthMonths: 12,
    text: 'Karađorđe has led the Serbs of the Belgrade pashalik in revolt against the janissaries, and now against the Sultan himself.',
    conditions: [{ kind: 'ownsState', key: 'SRB-Grad Beograd' }],
    options: [
      { label: 'Crush the rising', effects: [{ kind: 'independence', tag: 'SER', name: 'Serbia', color: 0xac4dcb, keys: SERBIA }, { kind: 'relation', tag: 'RUS', delta: -20 }], ai: 3 },
      { label: 'Grant Serbia autonomy', effects: [{ kind: 'release', tag: 'SER', name: 'Serbia', color: 0xac4dcb, keys: SERBIA }], ai: 1 },
    ] },
  { id: 'bk.greece', title: 'The Greek War of Independence', starts: S1776, countries: ['TUR'], start: y(1821), end: y(1830), mtthMonths: 6,
    text: 'The Greeks of the Morea have risen. Byron and philhellenes from all over Europe are joining them, and London, Paris and St Petersburg are watching.',
    conditions: [{ kind: 'ownsState', key: 'GRC-Peloponnisos' }],
    options: [
      { label: 'Crush the rising', effects: [{ kind: 'independence', tag: 'GRE', name: 'Greece', color: 0x5dade2, keys: GREECE }, { kind: 'relation', tag: 'GBR', delta: -20 }, { kind: 'relation', tag: 'FRA', delta: -20 }, { kind: 'relation', tag: 'RUS', delta: -30 }], ai: 3 },
      { label: 'Recognise Greece', effects: [{ kind: 'release', tag: 'GRE', name: 'Greece', color: 0x5dade2, keys: GREECE }, { kind: 'approval', group: 'army', radicalism: 20 }], ai: 1 },
    ] },
  { id: 'ys.nacertanije', title: 'The Načertanije', countries: ['SER'], start: y(1844), end: y(1880), mtthMonths: 36,
    text: 'Minister Garašanin’s secret plan: Serbia must gather the South Slavs still under the Sultan, starting with Bosnia.',
    conditions: [{ kind: 'exists', tag: 'TUR' }, { kind: 'atPeace' }],
    options: [
      { label: 'Demand Bosnia', effects: [{ kind: 'startPlay', target: 'TUR', demands: [{ kind: 'state', key: 'BIH-Banja Luka' }, { kind: 'state', key: 'BIH-Tuzla' }, { kind: 'state', key: 'BIH-Herzegovina-Neretva' }] }], ai: 2 },
      { label: 'Build up Serbia first', effects: [{ kind: 'modifier', name: 'National revival', effects: { literacyPct: 10 }, months: 120 }], ai: 1 },
    ] },
  { id: 'ys.balkan', title: 'The Balkan League', countries: ['SER', 'YUG'], start: y(1908), end: y(1925), mtthMonths: 24,
    text: 'Serbia, Greece, Bulgaria and Montenegro have agreed to drive the Turks out of Europe at last. Our share is Kosovo and Macedonia.',
    conditions: [{ kind: 'exists', tag: 'TUR' }, { kind: 'atPeace' }],
    options: [
      { label: 'Demand Kosovo and Macedonia', effects: [{ kind: 'startPlay', target: 'TUR', demands: [{ kind: 'state', key: 'KOS-Kosovo Polje' }, { kind: 'state', key: 'MKD-Pelagonia' }, { kind: 'state', key: 'MKD-Southeastern' }] }], ai: 3 },
      { label: 'Stay out', effects: [{ kind: 'relation', tag: 'TUR', delta: 20 }], ai: 1 },
    ] },
  { id: 'ro.union', title: 'The Union of the Principalities', countries: ['WAL'], start: y(1857), end: y(1870), mtthMonths: 6,
    text: 'Moldavia and Wallachia have both elected Colonel Cuza as their prince. One prince, one parliament, one Romania?',
    conditions: [{ kind: 'exists', tag: 'MOL' }, { kind: 'atPeace' }, { kind: 'notPuppet' }],
    options: [
      { label: 'Unite the principalities', effects: [{ kind: 'transferStates', keys: ['ROU-Neamt', 'MDA-Cahul', 'MDA-Călărași'], to: 'self', from: 'MOL' }, { kind: 'formNation', tag: 'ROU' }, { kind: 'relation', tag: 'TUR', delta: -15 }], ai: 3 },
      { label: 'Two thrones, one prince', effects: [{ kind: 'relation', tag: 'MOL', delta: 30 }], ai: 1 },
    ] },
  { id: 'ro.transylvania', title: 'Greater Romania', countries: ['ROU'], start: y(1900), end: y(1936), mtthMonths: 48,
    text: 'Millions of Romanians live across the Carpathians under the Habsburgs. Bucharest wants Transylvania.',
    conditions: [{ kind: 'exists', tag: 'AUS' }, { kind: 'atPeace' }],
    options: [
      { label: 'Demand Transylvania', effects: [{ kind: 'startPlay', target: 'AUS', demands: [{ kind: 'state', key: 'ROU-Cluj' }, { kind: 'state', key: 'ROU-Alba' }, { kind: 'state', key: 'ROU-Brasov' }] }], ai: 2 },
      { label: 'Wait for a better day', effects: [{ kind: 'relation', tag: 'AUS', delta: 15 }], ai: 1 },
    ] },
  { id: 'pl.january', title: 'The January Uprising', starts: S1836, countries: ['RUS'], start: y(1861), end: y(1866), mtthMonths: 12,
    text: 'Young Poles have fled the conscription lists into the forests. A secret national government in Warsaw calls the nation to arms.',
    conditions: [{ kind: 'ownsState', key: 'POL-Masovian' }],
    options: [
      { label: 'Crush the rising', effects: [{ kind: 'independence', tag: 'POL', name: 'Poland', color: 0xc8414b, keys: CONGRESS_POLAND }, { kind: 'relation', tag: 'FRA', delta: -15 }], ai: 3 },
      { label: 'Free the Polish serfs, then crush it', effects: [{ kind: 'independence', tag: 'POL', name: 'Poland', color: 0xc8414b, keys: CONGRESS_POLAND }, { kind: 'approval', group: 'landowners', radicalism: 15 }, { kind: 'approval', group: 'workers', radicalism: -15 }], ai: 1 },
    ] },

  // ---- Latin America (1776) ----
  { id: 'la.mexico', title: 'The Cry of Dolores', starts: S1776, countries: ['SPA'], start: y(1808), end: y(1825), mtthMonths: 18,
    text: 'With the King a prisoner of Napoleon, Father Hidalgo has rung the church bell at Dolores and called New Spain to rise. Central America is stirring too.',
    conditions: [{ kind: 'ownsState', key: 'MEX-Puebla' }],
    options: [
      { label: 'Hold New Spain', effects: [{ kind: 'independence', tag: 'MEX', name: 'Mexico', color: 0x2e8b3e, keys: MEXICO }, { kind: 'independence', tag: 'CAM', name: 'Central America', color: 0x3fa0d0, keys: CENTRAL_AMERICA }, { kind: 'modifier', name: 'An ocean away', effects: { attackPct: -40 }, months: 96 }], ai: 3 },
      { label: 'Let them go', effects: [{ kind: 'release', tag: 'MEX', name: 'Mexico', color: 0x2e8b3e, keys: MEXICO }, { kind: 'release', tag: 'CAM', name: 'Central America', color: 0x3fa0d0, keys: CENTRAL_AMERICA }], ai: 0.5 },
    ] },
  { id: 'la.colombia', title: 'The Liberator', starts: S1776, countries: ['SPA'], start: y(1810), end: y(1825), mtthMonths: 18,
    text: 'Simón Bolívar has crossed the Andes and routed our army at Boyacá. He proclaims a republic of Gran Colombia, from Caracas to Quito.',
    conditions: [{ kind: 'ownsState', key: 'COL-Cauca' }],
    options: [
      { label: 'Fight the Liberator', effects: [{ kind: 'independence', tag: 'GCO', name: 'Gran Colombia', color: 0xe0c040, keys: GRAN_COLOMBIA, troops: 0.3 }], ai: 3 },
      { label: 'Let them go', effects: [{ kind: 'release', tag: 'GCO', name: 'Gran Colombia', color: 0xe0c040, keys: GRAN_COLOMBIA }], ai: 0.5 },
    ] },
  { id: 'la.plata', title: 'The May Revolution', starts: S1776, countries: ['SPA'], start: y(1810), end: y(1820), mtthMonths: 12,
    text: 'The cabildo of Buenos Aires has deposed the Viceroy. The United Provinces of the Río de la Plata govern themselves now, and San Martín is training an army.',
    conditions: [{ kind: 'ownsState', key: 'ARG-Buenos Aires' }],
    options: [
      { label: 'Restore the Viceroy', effects: [{ kind: 'independence', tag: 'PLA', name: 'United Provinces of the Río de la Plata', color: 0x7fb8e0, keys: PLATA, troops: 0.3 }], ai: 3 },
      { label: 'Let them go', effects: [{ kind: 'release', tag: 'PLA', name: 'United Provinces of the Río de la Plata', color: 0x7fb8e0, keys: PLATA }], ai: 0.5 },
    ] },
  { id: 'la.andes', title: 'The Army of the Andes', starts: S1776, countries: ['SPA'], start: y(1817), end: y(1826), mtthMonths: 12,
    text: 'San Martín has crossed the Andes into Chile, and patriots in Lima and Upper Peru are ready to rise when he comes north.',
    conditions: [{ kind: 'ownsState', key: 'PER-Huánuco' }],
    options: [
      { label: 'Hold Peru at all costs', effects: [{ kind: 'independence', tag: 'CHL', name: 'Chile', color: 0x4060b0, keys: CHILE }, { kind: 'independence', tag: 'PEU', name: 'Peru', color: 0xc96f6f, keys: PERU }, { kind: 'independence', tag: 'BOL', name: 'Bolivia', color: 0x9fbf4a, keys: BOLIVIA }], ai: 3 },
      { label: 'Let them go', effects: [{ kind: 'release', tag: 'CHL', name: 'Chile', color: 0x4060b0, keys: CHILE }, { kind: 'release', tag: 'PEU', name: 'Peru', color: 0xc96f6f, keys: PERU }, { kind: 'release', tag: 'BOL', name: 'Bolivia', color: 0x9fbf4a, keys: BOLIVIA }], ai: 0.5 },
    ] },
  { id: 'la.brazil', title: 'I Am Staying', starts: S1776, countries: ['POR'], start: y(1815), end: y(1826), mtthMonths: 12,
    text: 'Lisbon has ordered Prince Pedro home from Rio de Janeiro. He has refused: "I am staying." Brazilians hail him as their emperor.',
    conditions: [{ kind: 'ownsState', key: 'BRA-São Paulo' }],
    options: [
      { label: 'An empire of its own, under our dynasty', effects: [{ kind: 'release', tag: 'BRZ', name: 'Brazil', color: 0x3c9a3c, keys: BRAZIL }, { kind: 'relation', tag: 'BRZ', delta: 30 }], ai: 3 },
      { label: 'Bring the Prince home in chains', effects: [{ kind: 'independence', tag: 'BRZ', name: 'Brazil', color: 0x3c9a3c, keys: BRAZIL }], ai: 1 },
    ] },

  // ---- Latin America (1836) ----
  { id: 'la.confederation', title: 'The Peru-Bolivian Confederation', starts: S1836, countries: ['BOL'], start: y(1836, 2), end: y(1840), mtthMonths: 4,
    text: 'Peru is torn by civil war and one side has asked Marshal Santa Cruz for help. He could join the two countries into one confederation, as in the days of the Inca.\n\nChile and Argentina would see it as a threat.',
    conditions: [{ kind: 'exists', tag: 'PEU' }, { kind: 'atPeace' }, { kind: 'notPuppet' }],
    options: [
      { label: 'Proclaim the Confederation', effects: [{ kind: 'transferStates', keys: PERU, to: 'self', from: 'PEU' }, { kind: 'formNation', tag: 'PBC' }, { kind: 'relation', tag: 'CHL', delta: -40 }, { kind: 'relation', tag: 'ARG', delta: -20 }], ai: 2 },
      { label: 'Stay out of Peru’s quarrels', effects: [{ kind: 'relation', tag: 'PEU', delta: 20 }], ai: 1 },
    ] },
  { id: 'la.bolivar', title: 'Bolívar’s Dream', starts: S1836, countries: ['COL'], start: y(1840), end: y(1900), mtthMonths: 60,
    text: 'Gran Colombia broke apart when the Liberator died. Some in Bogotá, Caracas and Quito still hope to make it whole again.',
    conditions: [{ kind: 'exists', tag: 'VNZ' }, { kind: 'relationAbove', tag: 'VNZ', value: 30 }, { kind: 'atPeace' }, { kind: 'notPuppet' }],
    options: [
      { label: 'Reunite Gran Colombia', effects: [{ kind: 'transferStates', keys: VENEZUELA, to: 'self', from: 'VNZ' }, { kind: 'transferStates', keys: ECUADOR, to: 'self', from: 'ECU' }, { kind: 'formNation', tag: 'GCO' }], ai: 0.5, aiHard: 1 },
      { label: 'Each its own path', effects: [{ kind: 'relation', tag: 'VNZ', delta: 15 }, { kind: 'relation', tag: 'ECU', delta: 15 }], ai: 2 },
    ] },
  { id: 'la.guerra', title: 'The Great Siege', starts: S1836, countries: ['ARG'], start: y(1838), end: y(1852), mtthMonths: 24,
    text: 'Uruguay is at civil war. Rosas can back Oribe’s Blancos and bring Montevideo back into the River Plate’s fold.',
    conditions: [{ kind: 'exists', tag: 'URU' }, { kind: 'atPeace' }],
    options: [
      { label: 'Back Oribe', effects: [{ kind: 'startPlay', target: 'URU', demands: [{ kind: 'puppet' }] }, { kind: 'relation', tag: 'BRZ', delta: -20 }], ai: 2 },
      { label: 'Leave Uruguay be', effects: [{ kind: 'relation', tag: 'URU', delta: 20 }], ai: 1 },
    ] },

  // ---- Iberia and the Low Countries ----
  { id: 'ib.iberism', title: 'Iberism', countries: ['SPA'], start: y(1854), end: y(1900), mtthMonths: 60,
    text: 'Writers on both sides of the border say Spain and Portugal are one people who should share one crown. Lisbon is not unwilling.',
    conditions: [{ kind: 'exists', tag: 'POR' }, { kind: 'relationAbove', tag: 'POR', value: 40 }, { kind: 'atPeace' }, { kind: 'notPuppet' }],
    options: [
      { label: 'Offer a joint crown', effects: [{ kind: 'transferStates', keys: PORTUGAL, to: 'self', from: 'POR' }, { kind: 'formNation', tag: 'IBR' }, { kind: 'relation', tag: 'GBR', delta: -20 }], ai: 0.3, aiHard: 1 },
      { label: 'Spain is enough', effects: [{ kind: 'relation', tag: 'POR', delta: 15 }], ai: 2 },
    ] },
  { id: 'nl.vienna', title: 'The Congress of Vienna', starts: S1776, countries: ['NET'], start: y(1814), end: y(1820), mtthMonths: 6,
    text: 'The allies want a strong kingdom north of France. They offer us the old Austrian Netherlands and Luxembourg.',
    conditions: [{ kind: 'notOwnsState', key: 'BEL-Flemish Brabant' }],
    options: [
      { label: 'Accept the southern provinces', effects: [{ kind: 'transferStates', keys: [...BELGIUM, 'LUX-Luxembourg'], to: 'self' }, { kind: 'flag', flag: 'nl.united' }], ai: 3 },
      { label: 'The Catholics will never be loyal', effects: [{ kind: 'relation', tag: 'GBR', delta: -10 }], ai: 1 },
    ] },
  { id: 'nl.belgium', title: 'The Belgian Revolution', starts: S1776, countries: ['NET'], start: y(1828), end: y(1840), mtthMonths: 12,
    text: 'An opera in Brussels has turned into a riot, and the riot into a revolution. The south wants its own kingdom.',
    conditions: [{ kind: 'flag', flag: 'nl.united' }, { kind: 'ownsState', key: 'BEL-Flemish Brabant' }],
    options: [
      { label: 'Send in the army', effects: [{ kind: 'independence', tag: 'BEL', name: 'Belgium', color: 0x8b5a2b, keys: BELGIUM }], ai: 2 },
      { label: 'Let Belgium go', effects: [{ kind: 'release', tag: 'BEL', name: 'Belgium', color: 0x8b5a2b, keys: BELGIUM }], ai: 1 },
    ] },

  // ---- Arabia ----
  { id: 'sa.holycities', title: 'The Holy Cities', countries: ['NEJ'], start: y(1800), end: y(1936), mtthMonths: 48,
    text: 'The House of Saud has united Nejd behind the call of reform. Mecca and Medina lie in the hands of foreigners.',
    conditions: [{ kind: 'atPeace' }, { kind: 'notOwnsState', key: 'SAU-Makkah' }],
    options: [
      { label: 'Take the Holy Cities', effects: [{ kind: 'startPlay', target: 'TUR', demands: HOLY_CITIES }, { kind: 'startPlay', target: 'EGY', demands: HOLY_CITIES }], ai: 3 },
      { label: 'Hold Nejd', effects: [{ kind: 'modifier', name: 'Desert warriors', effects: { defensePct: 15 }, months: 120 }], ai: 1 },
    ] },

  // ---- The British dominions and Hawaii ----
  { id: 'br.canada', title: 'Confederation', countries: ['GBR'], start: y(1864), end: y(1880), mtthMonths: 12,
    text: 'Delegates from Canada, Nova Scotia and New Brunswick propose one self-governing Dominion, loyal to the Crown and able to defend itself against the Americans.',
    conditions: [{ kind: 'ownsState', key: 'CAN-Ontario (South-East)' }],
    options: [
      { label: 'Proclaim the Dominion of Canada', effects: [{ kind: 'release', tag: 'CAN', name: 'Canada', color: 0xb5454b, keys: CANADA }, { kind: 'relation', tag: 'CAN', delta: 50 }], ai: 3 },
      { label: 'Keep the colonies apart', effects: [{ kind: 'modifier', name: 'Colonial garrisons', effects: { taxPct: -5 }, months: 120 }], ai: 1 },
    ] },
  { id: 'br.australia', title: 'Federation', starts: S1836, countries: ['GBR'], start: y(1895), end: y(1915), mtthMonths: 12,
    text: 'The Australian colonies have voted to federate into one Commonwealth under the Crown.',
    conditions: [{ kind: 'ownsState', key: 'AUS-New South Wales' }],
    options: [
      { label: 'Proclaim the Commonwealth', effects: [{ kind: 'release', tag: 'AST', name: 'Australia', color: 0xd9a03a, keys: AUSTRALIA }, { kind: 'relation', tag: 'AST', delta: 50 }], ai: 3 },
      { label: 'Keep the colonies apart', effects: [{ kind: 'modifier', name: 'Colonial garrisons', effects: { taxPct: -5 }, months: 120 }], ai: 1 },
    ] },
  { id: 'us.hawaii', title: 'Annexation of Hawaii', starts: S1836, countries: ['HAW'], start: y(1890), end: y(1910), mtthMonths: 24,
    text: 'American planters have overthrown the Queen and ask Washington to annex the islands.',
    conditions: [{ kind: 'exists', tag: 'USA' }, { kind: 'isAI' }],
    options: [
      { label: 'Join the United States', effects: [{ kind: 'transferStates', keys: ['USA-Hawaii'], to: 'USA', from: 'self' }], ai: 3 },
      { label: 'Restore the Queen', effects: [{ kind: 'relation', tag: 'USA', delta: -20 }], ai: 1 },
    ] },
];
