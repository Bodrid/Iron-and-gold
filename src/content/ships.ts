import type { Good } from '../sim/types';

export type ShipKind = 'trade' | 'warship' | 'transport';

export interface ShipDef {
  kind: ShipKind; name: string; description: string; cost: number; buildDays: number; upkeep: number;
  /** Navigation cells (8×8 tiles) per day. */ speed: number;
  strength: number; capacity: number; inputs: Partial<Record<Good, number>>;
}

export const SHIPS: Record<ShipKind, ShipDef> = {
  trade: { kind: 'trade', name: 'Trade ship', description: 'Carries a trade route’s cargo.', cost: 0, buildDays: 0, upkeep: 0, speed: 1.2, strength: 0, capacity: 0, inputs: {} },
  warship: { kind: 'warship', name: 'Warship', description: 'Raids enemy trade, escorts your own and fights other warships.', cost: 30_000, buildDays: 120, upkeep: 300, speed: 1.5, strength: 10, capacity: 0, inputs: { wood: 60, iron: 40, arms: 20 } },
  transport: { kind: 'transport', name: 'Transport', description: 'Carries up to 20,000 troops for invasions across the sea.', cost: 15_000, buildDays: 90, upkeep: 150, speed: 1.2, strength: 1, capacity: 20_000, inputs: { wood: 50 } },
};
