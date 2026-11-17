// Every history event. Each file holds one chain; the engine reads this list.
import type { EventDef } from './types';

export const EVENTS: EventDef[] = [];
export const eventById = (id: string): EventDef | undefined => EVENTS.find(e => e.id === id);
