// Real straits that are narrower than a map tile: cut open as sea so ships can pass.
export interface Strait { name: string; path: [number, number][] /* lon, lat */ }

export const STRAITS: Strait[] = [
  { name: 'Dardanelles', path: [[26.15, 40.05], [26.45, 40.2], [26.7, 40.4]] },
  { name: 'Bosphorus', path: [[28.98, 41.0], [29.05, 41.12], [29.12, 41.23]] },
  { name: 'Kerch Strait', path: [[36.55, 45.2], [36.6, 45.45]] },
  { name: 'Øresund', path: [[12.65, 55.55], [12.7, 55.85], [12.6, 56.1]] },
  { name: 'Strait of Gibraltar', path: [[-5.8, 35.95], [-5.6, 35.97], [-5.35, 36.0]] },
  { name: 'Strait of Messina', path: [[15.62, 38.05], [15.65, 38.25]] },
  { name: 'Bab-el-Mandeb', path: [[43.3, 12.4], [43.45, 12.7]] },
  { name: 'Strait of Hormuz', path: [[56.2, 26.3], [56.45, 26.6]] },
  { name: 'Great Belt', path: [[10.95, 55.2], [11.05, 55.6]] },
];
