export type KeyAction = 'pause' | 'speed1' | 'speed2' | 'speed3' | 'tabBuild' | 'tabArmy' | 'tabTrade' | 'tabDiplomacy' | 'tabResearch' | 'tabBloc' | 'tabNation' | 'close' | 'panUp' | 'panDown' | 'panLeft' | 'panRight';

const MAP: Record<string, KeyAction> = {
  ' ': 'pause', '1': 'speed1', '2': 'speed2', '3': 'speed3', b: 'tabBuild', a: 'tabArmy', t: 'tabTrade', d: 'tabDiplomacy', r: 'tabResearch', p: 'tabBloc', n: 'tabNation', escape: 'close',
  w: 'panUp', s: 'panDown', arrowup: 'panUp', arrowdown: 'panDown', arrowleft: 'panLeft', arrowright: 'panRight',
};

export function keyAction(e: { key: string; shiftKey: boolean }): KeyAction | null {
  return MAP[e.key.toLowerCase()] ?? null;
}
