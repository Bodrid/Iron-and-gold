// Laws in 1836 that differ from the defaults (absolute monarchy, no elections, mercantilism, free labour,
// professional army, medium taxes, religious schools, no welfare).
import type { LawArea } from '../../laws';

type L = Partial<Record<LawArea, string>>;
const constitutional: L = { government: 'constitutionalMonarchy', voting: 'wealthVoting' };
const latinRepublic: L = { government: 'republic', voting: 'wealthVoting', trade: 'protectionism' };

export const LAWS_1836: Record<string, L> = {
  GBR: { ...constitutional, trade: 'protectionism', welfare: 'poorLaws' },
  FRA: { ...constitutional, trade: 'protectionism', army: 'conscription' },
  PRU: { trade: 'protectionism', army: 'conscription', education: 'publicSchools' },
  AUS: { trade: 'protectionism', labour: 'serfdom', army: 'conscription' },
  RUS: { labour: 'serfdom', army: 'conscription', education: 'noEducation' },
  TUR: { education: 'noEducation' },
  USA: { government: 'republic', voting: 'wealthVoting', trade: 'protectionism', labour: 'slavery', taxes: 'lowTaxes' },
  CHI: { taxes: 'lowTaxes' },
  JAP: { labour: 'serfdom' },
  SPA: { ...constitutional },
  POR: { ...constitutional },
  NET: { ...constitutional, trade: 'freeTrade' },
  BEL: { ...constitutional, trade: 'protectionism' },
  SWE: { ...constitutional, education: 'publicSchools' },
  DEN: { trade: 'protectionism' },
  SWI: { government: 'republic', voting: 'wealthVoting', trade: 'freeTrade' },
  BAV: { ...constitutional, trade: 'protectionism' },
  WUR: { ...constitutional, trade: 'protectionism' },
  SAX: { trade: 'protectionism' },
  HAN: { trade: 'protectionism' },
  GRE: { education: 'noEducation' },
  EGY: { army: 'conscription', education: 'noEducation' },
  ETH: { labour: 'serfdom', education: 'noEducation' },
  MEX: { ...latinRepublic },
  TEX: { government: 'republic', voting: 'wealthVoting', labour: 'slavery', taxes: 'lowTaxes' },
  CAM: { ...latinRepublic },
  COL: { ...latinRepublic, labour: 'slavery' },
  VNZ: { ...latinRepublic, labour: 'slavery' },
  ECU: { ...latinRepublic },
  PEU: { ...latinRepublic, labour: 'slavery' },
  BOL: { ...latinRepublic },
  CHL: { ...latinRepublic },
  ARG: { ...latinRepublic },
  URU: { ...latinRepublic },
  PAR: { government: 'republic' },
  BRZ: { ...constitutional, labour: 'slavery' },
  HAI: { government: 'republic' },
};
