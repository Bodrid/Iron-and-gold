// Rough 1836 population (millions) by modern territory.
const M: Record<string, number> = {
  GBR: 18.5, IRL: 6.8, FRA: 33.5, DEU: 29, POL: 9, AUT: 3.6, CZE: 6.5, SVK: 2.2, HUN: 5, SVN: 1, HRV: 1.8, ROU: 6.5, SRB: 1.2, BIH: 1.1, MNE: 0.1,
  ALB: 0.5, MKD: 0.6, KOS: 0.3, BGR: 2.5, GRC: 2, ITA: 22, CHE: 2.2, BEL: 4.2, NLD: 2.7, LUX: 0.17, DNK: 1.3, NOR: 1.1, SWE: 3, FIN: 1.4, EST: 0.6,
  LVA: 0.9, LTU: 1.2, BLR: 3, UKR: 15, MDA: 0.8, RUS: 30, ESP: 13, PRT: 3.5, TUR: 14, CYP: 0.1, SYR: 1.5, LBN: 0.3, ISR: 0.3, PSX: 0.2, JOR: 0.2,
  IRQ: 1.3, SAU: 2.5, YEM: 2.5, OMN: 0.5, ARE: 0.05, EGY: 4.5, LBY: 0.7, TUN: 1, DZA: 2.5, MAR: 3.5, IRN: 6.5, AFG: 4, PAK: 12, IND: 120, BGD: 18,
  NPL: 3, BTN: 0.1, LKA: 1.3, MMR: 4, THA: 5, LAO: 0.6, KHM: 1, VNM: 7, MYS: 0.4, IDN: 18, PHL: 3.5, TWN: 2, CHN: 400, MNG: 0.6, KOR: 6, PRK: 3.5,
  JPN: 31, KAZ: 2.5, UZB: 3, TKM: 0.6, KGZ: 0.5, TJK: 0.6, ARM: 0.3, AZE: 0.7, GEO: 0.7, KAS: 1.5, USA: 15, CAN: 1.4, MEX: 7, GTM: 0.7, HND: 0.3,
  SLV: 0.3, NIC: 0.25, CRI: 0.08, PAN: 0.1, CUB: 0.9, HTI: 0.8, DOM: 0.15, JAM: 0.4, PRI: 0.35, COL: 1.7, VEN: 0.9, ECU: 0.6, PER: 1.5, BOL: 1.1,
  CHL: 1.1, ARG: 0.8, URY: 0.1, PRY: 0.4, BRA: 4.5, ETH: 4, SDN: 3, NGA: 15, GHA: 2, ZAF: 1, COD: 6, AGO: 2, TZA: 3, KEN: 2, UGA: 2, SOM: 1, MOZ: 2,
  MDG: 2.5, ZMB: 1, ZWE: 1, MLI: 2, NER: 1.5, TCD: 1.5, CAF: 1, CMR: 2, SEN: 1, GIN: 1, BFA: 2, AUS: 0.6, NZL: 0.1,
  GRL: 0.01, ISL: 0.06, FRO: 0.008, ALD: 0.01, AND: 0.005, ATG: 0.035, BHS: 0.02, BLZ: 0.01, BRB: 0.1, BRN: 0.02, CPV: 0.06, CUW: 0.015, CYM: 0.002,
  CYN: 0.05, DMA: 0.02, ERI: 0.3, FLK: 0.0003, GNB: 0.1, GRD: 0.03, GUY: 0.1, HKG: 0.005, IMN: 0.04, JEY: 0.04, KWT: 0.02, LCA: 0.015, LIE: 0.006,
  MLT: 0.12, MUS: 0.1, QAT: 0.01, SGP: 0.03, SHN: 0.005, STP: 0.02, SUR: 0.06, TCA: 0.002, TLS: 0.1, TTO: 0.04,
};

/** Fixed figures for states held by someone other than their modern country. */
const STATES: Record<string, number> = {
  'USA-California': 0.1, 'USA-Texas': 0.05, 'USA-New Mexico': 0.06, 'USA-Arizona': 0.01, 'USA-Nevada': 0.005, 'USA-Utah': 0.01, 'USA-Colorado': 0.01,
  'USA-Hawaii': 0.12, 'DEU-Schleswig-Holstein': 0.8, 'USA-Alaska (East)': 0.01, 'USA-Alaska (North-East)': 0.01, 'USA-Alaska (West)': 0.01, 'RUS-Kaliningrad': 0.8,
};

export const POPULATION_1836: Record<string, number> = Object.fromEntries([...Object.entries(M), ...Object.entries(STATES)].map(([k, v]) => [k, Math.round(v * 1e6)]));
