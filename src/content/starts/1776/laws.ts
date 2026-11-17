// Laws in 1776 that differ from the defaults (absolute monarchy, no elections, mercantilism, free labour,
// professional army, medium taxes, religious schools, no welfare).
import type { LawArea } from '../../laws';

type L = Partial<Record<LawArea, string>>;

export const LAWS_1776: Record<string, L> = {
  GBR: { government: 'constitutionalMonarchy', voting: 'wealthVoting', welfare: 'poorLaws' },
  NET: { government: 'republic', voting: 'wealthVoting', trade: 'freeTrade' },
  SWI: { government: 'republic', voting: 'wealthVoting' },
  VEN: { government: 'republic', voting: 'wealthVoting' },
  POL: { government: 'constitutionalMonarchy', voting: 'wealthVoting', labour: 'serfdom' },
  SWE: { government: 'constitutionalMonarchy' },
  RUS: { labour: 'serfdom', army: 'conscription', education: 'noEducation' },
  PRU: { labour: 'serfdom', army: 'conscription', education: 'publicSchools' },
  AUS: { labour: 'serfdom', army: 'conscription' },
  DEN: { labour: 'serfdom' },
  BAV: { labour: 'serfdom' }, SAX: { labour: 'serfdom' }, MOL: { labour: 'serfdom' }, WAL: { labour: 'serfdom' },
  JAP: { labour: 'serfdom' },
  POR: { labour: 'slavery' },
  TUR: { education: 'noEducation' },
  CHI: { taxes: 'lowTaxes' },
  MAR: { taxes: 'highTaxes' },
};
