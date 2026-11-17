// Rough 1776 population (millions) by modern territory.
const M: Record<string, number> = {
  GBR: 9.5, IRL: 4, FRA: 27, DEU: 20, POL: 8, AUT: 3, CZE: 4.5, SVK: 1.5, HUN: 4, SVN: 0.7, HRV: 1.2, ROU: 4.5, SRB: 0.8, BIH: 0.9, MNE: 0.08,
  ALB: 0.4, MKD: 0.5, KOS: 0.25, BGR: 2, GRC: 1.6, ITA: 17, CHE: 1.6, BEL: 2.4, NLD: 2, LUX: 0.13, DNK: 0.8, NOR: 0.75, SWE: 2, FIN: 0.6, EST: 0.4,
  LVA: 0.6, LTU: 1, BLR: 2.4, UKR: 9, MDA: 0.5, RUS: 21, ESP: 10, PRT: 3, TUR: 10, CYP: 0.08, SYR: 1.3, LBN: 0.25, ISR: 0.25, PSX: 0.15, JOR: 0.15,
  IRQ: 1.1, SAU: 2, YEM: 2, OMN: 0.4, ARE: 0.04, EGY: 3.5, LBY: 0.6, TUN: 0.9, DZA: 2.2, MAR: 3, IRN: 6, AFG: 3, PAK: 10, IND: 160, BGD: 20,
  NPL: 2.5, BTN: 0.1, LKA: 1, MMR: 3.5, THA: 3.5, LAO: 0.5, KHM: 0.8, VNM: 6, MYS: 0.3, IDN: 8, PHL: 2, TWN: 1, CHN: 290, MNG: 0.5, KOR: 5, PRK: 2.5,
  JPN: 26, KAZ: 2, UZB: 2.5, TKM: 0.5, KGZ: 0.4, TJK: 0.5, ARM: 0.25, AZE: 0.6, GEO: 0.6, KAS: 1.2, USA: 2.6, CAN: 0.2, MEX: 5, GTM: 0.5, HND: 0.2,
  SLV: 0.2, NIC: 0.2, CRI: 0.05, PAN: 0.08, CUB: 0.2, HTI: 0.55, DOM: 0.12, JAM: 0.21, PRI: 0.1, COL: 0.9, VEN: 0.8, ECU: 0.45, PER: 1.2, BOL: 0.9,
  CHL: 0.5, ARG: 0.3, URY: 0.03, PRY: 0.2, BRA: 2, ETH: 3.5, SDN: 2.5, NGA: 12, GHA: 1.8, ZAF: 0.8, COD: 5, AGO: 2, TZA: 2.5, KEN: 1.8, UGA: 1.8, SOM: 0.8,
  MOZ: 1.8, MDG: 2, ZMB: 0.9, ZWE: 0.9, MLI: 1.8, NER: 1.3, TCD: 1.3, CAF: 0.9, CMR: 1.8, SEN: 0.9, GIN: 0.9, BFA: 1.8, AUS: 0.5, NZL: 0.1,
  GRL: 0.01, ISL: 0.05, FRO: 0.005, ALD: 0.01, AND: 0.005, ATG: 0.03, BHS: 0.005, BLZ: 0.005, BRB: 0.08, BRN: 0.02, CPV: 0.04, CUW: 0.01, CYM: 0.002,
  CYN: 0.04, DMA: 0.015, ERI: 0.25, FLK: 0.0001, GNB: 0.08, GRD: 0.03, GUY: 0.03, HKG: 0.004, IMN: 0.03, JEY: 0.03, KWT: 0.01, LCA: 0.015, LIE: 0.005,
  MLT: 0.1, MUS: 0.04, QAT: 0.005, SGP: 0.001, SHN: 0.003, STP: 0.015, SUR: 0.06, TCA: 0.001, TLS: 0.08, TTO: 0.01,
};

/** Fixed figures for states held by someone other than their modern country, or barely settled. */
const STATES: Record<string, number> = {
  'USA-California': 0.01, 'USA-Arizona': 0.005, 'USA-New Mexico': 0.03, 'USA-Texas': 0.005, 'USA-Louisiana': 0.02, 'USA-Arkansas': 0.002,
  'USA-Missouri': 0.005, 'USA-Florida': 0.005, 'USA-Hawaii': 0.25, 'DEU-Schleswig-Holstein': 0.6, 'DEU-Mecklenburg-Vorpommern': 0.4, 'RUS-Kaliningrad': 0.5,
  'UKR-Kherson': 0.15, 'UKR-Mykolayiv': 0.1, 'UKR-Odessa': 0.1, 'NGA-Niger': 2, 'NGA-Kebbi': 1.5, 'IND-Assam': 2, 'DEU-Nordrhein-Westfalen': 1.5,
};

export const POPULATION_1776: Record<string, number> = Object.fromEntries([...Object.entries(M), ...Object.entries(STATES)].map(([k, v]) => [k, Math.round(v * 1e6)]));
