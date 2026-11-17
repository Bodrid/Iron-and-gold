// Advances the game by one tick. Every change to the game goes through here.
import { dateAtTick, TICKS_PER_DAY } from './calendar';
import type { Command, GameState, SimEvent, TickResult } from './types';
import { applyCommand, systems } from './registry';
import './systems';

export function step(state: GameState, commands: Command[]): TickResult {
  const events: SimEvent[] = [];
  const changed: number[] = [];
  const newDay = state.tick % TICKS_PER_DAY === 0;
  const newMonth = newDay && state.tick > 0 && dateAtTick(state.startDate, state.tick).d === 1;

  for (const cmd of commands) applyCommand(state, cmd, events, changed);
  if (newDay) for (const s of systems.ai) s(state, events, changed);
  for (const s of systems.tick) s(state, events, changed);
  if (newDay) for (const s of systems.day) s(state, events, changed);
  if (newMonth) for (const s of systems.month) s(state, events, changed);
  for (const s of systems.end) s(state, events, changed);

  state.tick++;
  return { changedTiles: changed, events, newDay, newMonth };
}
