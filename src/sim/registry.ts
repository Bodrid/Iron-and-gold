// Command handlers and systems register here; step() runs them. Kept separate from step.ts to avoid import cycles.
import type { Command, GameState, SimEvent } from './types';

export type CommandHandler = (state: GameState, cmd: any, events: SimEvent[], changed: number[]) => string | null;
export type System = (state: GameState, events: SimEvent[], changed: number[]) => void;

/** Handlers return null on success or a rejection reason. */
export const handlers: Partial<Record<Command['type'], CommandHandler>> = {};
/** Systems run in this order each tick: ai (new day), tick, day, month, end. */
export const systems = { ai: [] as System[], tick: [] as System[], day: [] as System[], month: [] as System[], end: [] as System[] };
