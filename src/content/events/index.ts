// Every history event. Each file holds the chains for a start date; the engine reads this list.
import type { EventDef } from './types';
import { EVENTS_1836 } from './1836';
import { EVENTS_1776 } from './1776';

export const EVENTS: EventDef[] = [...EVENTS_1776, ...EVENTS_1836];
export const eventById = (id: string): EventDef | undefined => EVENTS.find(e => e.id === id);
