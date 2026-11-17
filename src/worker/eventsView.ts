// The player's event cards, recent history and decisions (formable nations), in plain words.
import { describeOption, type Names } from '../content/events/describe';
import { FORMABLES } from '../content/formables';
import { TICKS_PER_DAY, dateAtTick, formatDate } from '../sim/calendar';
import { BALANCE } from '../sim/balance';
import { eventById } from '../content/events';
import { coreShare, coreStates, formCheck } from '../sim/nations';
import type { CountryId, GameState } from '../sim/types';
import type { EventsView } from './protocol';

export function eventNames(state: GameState): Names {
  return {
    country: tag => state.countries.find(c => c.alive && c.tag === tag)?.name ?? FORMABLES.find(f => f.tag === tag)?.name ?? tag,
    state: key => state.map.states.find(s => s.key === key)?.name ?? key,
    money: n => (n >= 1e6 ? `£${(n / 1e6).toFixed(1)}M` : `£${Math.round(n / 1000)}k`),
  };
}

export function eventsView(state: GameState, me: CountryId): EventsView {
  const names = eventNames(state);
  const c = state.countries[me];
  return {
    pending: state.pendingEvents.filter(p => p.country === me).flatMap(p => {
      const def = eventById(p.event);
      if (!def) return [];
      return [{ id: p.id, title: def.title, text: def.text, daysLeft: Math.max(0, Math.ceil(BALANCE.events.CARD_DAYS - (state.tick - p.tick) / TICKS_PER_DAY)),
        options: def.options.map(o => ({ label: o.label, effects: describeOption(o.effects, names) })) }];
    }),
    history: state.eventLog.filter(l => l.country === me).slice(-20).reverse().map(l => {
      const def = eventById(l.event);
      return { title: def?.title ?? l.event, choice: def?.options[l.option]?.label ?? '', date: formatDate(dateAtTick(state.startDate, l.tick)) };
    }),
    decisions: FORMABLES.filter(f => f.from.includes(c.tag)).map(f => {
      const total = coreStates(state, f).length;
      return { tag: f.tag, name: f.name, description: f.description, owned: Math.round(coreShare(state, me, f) * total), total, needed: Math.ceil(f.share * total), check: formCheck(state, me, f.tag) };
    }),
  };
}
