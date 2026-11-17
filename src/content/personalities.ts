import type { Personality } from '../sim/ai/personality';

const p = (x: Personality) => x;

export const PERSONALITIES: Record<string, Personality> = {
  default: p({ id: 'default', aggression: 0.4, buildWeights: {}, interests: [], rivals: [] }),
  britain: p({ id: 'britain', aggression: 0.5, buildWeights: { port: 3, shipyard: 2, textileMill: 1.5, governmentOffice: 1.2 }, interests: ['IND-', 'EGY-', 'ZAF-', 'AFG-', 'PAK-', 'MMR-'], rivals: ['RUS', 'FRA'] }),
  russia: p({ id: 'russia', aggression: 0.7, buildWeights: { barracks: 1.5, farm: 1.2 }, interests: ['KAZ-', 'UZB-', 'TKM-', 'POL-', 'TUR-', 'CHN-', 'AFG-'], rivals: ['GBR', 'TUR'] }),
  prussia: p({ id: 'prussia', aggression: 0.6, buildWeights: { armsFactory: 1.5, barracks: 1.5, university: 1.3, railway: 1.3 }, interests: ['DEU-', 'POL-', 'DNK-'], rivals: ['AUS', 'FRA', 'DEN'] }),
  austria: p({ id: 'austria', aggression: 0.45, buildWeights: { fort: 1.3 }, interests: ['ITA-', 'DEU-', 'SRB-', 'ROU-'], rivals: ['PRU', 'SAR', 'RUS'] }),
  france: p({ id: 'france', aggression: 0.55, buildWeights: { luxuryWorkshop: 1.5 }, interests: ['DEU-', 'BEL-', 'ITA-', 'DZA-', 'ESP-'], rivals: ['GBR', 'PRU'] }),
  ottoman: p({ id: 'ottoman', aggression: 0.4, buildWeights: { fort: 1.5 }, interests: ['EGY-', 'GRC-', 'SRB-', 'ROU-', 'BGR-'], rivals: ['RUS'] }),
  usa: p({ id: 'usa', aggression: 0.6, buildWeights: { railway: 1.5, farm: 1.2 }, interests: ['MEX-', 'CAN-', 'USA-'], rivals: ['MEX', 'GBR'] }),
  qing: p({ id: 'qing', aggression: 0.3, buildWeights: { farm: 1.2 }, interests: ['CHN-', 'MNG-', 'KOR-'], rivals: ['GBR', 'JAP', 'RUS'] }),
  japan: p({ id: 'japan', aggression: 0.5, buildWeights: { shipyard: 1.5, university: 1.3 }, interests: ['KOR-', 'CHN-', 'TWN-'], rivals: ['CHI', 'RUS'] }),
};

export function personalityOf(id: string): Personality {
  return PERSONALITIES[id] ?? PERSONALITIES.default;
}
