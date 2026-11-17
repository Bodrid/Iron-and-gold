// Advances the game by one tick. Every change to the game goes through here.
import { dateAtTick, TICKS_PER_DAY } from './calendar';
import type { Command, GameState, SimEvent, TickResult } from './types';
import { handlers, systems } from './registry';
import './systems';

function validCountry(state: GameState, id: number): boolean {
  return Number.isInteger(id) && id > 0 && id < state.countries.length && state.countries[id].alive;
}

export function applyCommand(state: GameState, cmd: Command, events: SimEvent[], changed: number[]): void {
  let reason: string | null;
  if (!cmd || typeof cmd !== 'object' || !validCountry(state, (cmd as any).country)) reason = 'unknown country';
  else {
    const h = handlers[cmd.type];
    reason = h ? h(state, cmd, events, changed) : 'unknown command';
  }
  if (reason) events.push({ type: 'rejected', command: cmd, reason });
}

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
