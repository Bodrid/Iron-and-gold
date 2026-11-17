// Plain-words text for event effects, for the event card.
import { describeEffects } from '../effects';
import { GROUPS } from '../groups';
import { LAW_BY_ID } from '../laws';
import { TECH_BY_ID } from '../techs';
import { BLOC_TYPES } from '../blocs';
import { DEMAND_NAMES } from '../diplomacy';
import type { EventEffect } from './types';

export interface Names { country: (tag: string) => string; state: (key: string) => string; money: (n: number) => string }

export function describeEffect(e: EventEffect, n: Names): string | null {
  switch (e.kind) {
    case 'money': return `${e.amount >= 0 ? '+' : '−'}${n.money(Math.abs(e.amount))}`;
    case 'incomeMonths': return e.months >= 0 ? `+${e.months} months of income` : `Pay ${-e.months} months of income`;
    case 'setLaw': return `New law: ${LAW_BY_ID[e.law]?.name ?? e.law}`;
    case 'relation': return `${n.country(e.tag)}: relations ${e.delta > 0 ? '+' : ''}${e.delta}`;
    case 'flag': case 'clearFlag': return null;
    case 'modifier': return `${e.name} for ${e.months >= 12 ? `${Math.round(e.months / 12)} year${e.months >= 24 ? 's' : ''}` : `${e.months} months`}: ${describeEffects(e.effects).join(', ')}`;
    case 'tech': return `Learn ${TECH_BY_ID[e.tech]?.name ?? e.tech}`;
    case 'troops': return `${e.share >= 0 ? '+' : ''}${Math.round(e.share * 100)}% troops`;
    case 'approval': return `${GROUPS[e.group].name}: radicalism ${e.radicalism > 0 ? '+' : ''}${e.radicalism}`;
    case 'startPlay': return `Make demands of ${n.country(e.target)}: ${e.demands.map(d => (d.kind === 'state' ? `take ${n.state(d.key)}` : DEMAND_NAMES[d.kind].toLowerCase())).join(', ')}`;
    case 'transferStates': return `${e.keys.length === 1 ? n.state(e.keys[0]) : `${e.keys.length} states`} go${e.keys.length === 1 ? 'es' : ''} to ${e.to === 'self' ? 'you' : n.country(e.to)}`;
    case 'revolt': return `The ${GROUPS[e.group].name.toLowerCase()} rise up`;
    case 'independence': return `${e.name} rises for independence in ${e.keys.length} state${e.keys.length === 1 ? '' : 's'}`;
    case 'release': return `${e.name} becomes independent`;
    case 'formNation': return `Proclaim ${n.country(e.tag)}`;
    case 'foundBloc': return `Found a ${BLOC_TYPES[e.blocType].name}`;
    case 'inviteToBloc': return `Invite ${n.country(e.tag)} into your bloc`;
  }
}

export function describeOption(effects: EventEffect[], n: Names): string[] {
  return effects.map(e => describeEffect(e, n)).filter((x): x is string => !!x);
}
