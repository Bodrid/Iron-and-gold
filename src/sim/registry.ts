// Command handlers and systems register here; step() runs them. Kept separate from step.ts to avoid import cycles.
import type { Command, GameState, SimEvent } from './types';

export type CommandHandler = (state: GameState, cmd: any, events: SimEvent[], changed: number[]) => string | null;
export type System = (state: GameState, events: SimEvent[], changed: number[]) => void;

/** Handlers return null on success or a rejection reason. */
export const handlers: Partial<Record<Command['type'], CommandHandler>> = {};
/** init runs once from createGame; then each tick: ai (new day), tick, day, month, end. */
export const systems = { init: [] as System[], ai: [] as System[], tick: [] as System[], day: [] as System[], month: [] as System[], end: [] as System[] };
