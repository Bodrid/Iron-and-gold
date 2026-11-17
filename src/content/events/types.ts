// History events as data: triggers (date window, conditions, mean time to happen) and options made of effects.
import type { Effects } from '../effects';
import type { GroupId } from '../groups';
import type { BlocType } from '../blocs';
import type { GameDate } from '../../sim/types';

export type Condition =
  | { kind: 'hasTech'; tech: string }
  | { kind: 'law'; law: string } | { kind: 'notLaw'; law: string }
  | { kind: 'ownsState'; key: string } | { kind: 'notOwnsState'; key: string }
  /** Owns at least `share` of the states whose key starts with any of the prefixes. */
  | { kind: 'ownsShare'; prefixes: string[]; share: number }
  | { kind: 'atWar' } | { kind: 'atWarWith'; tag: string } | { kind: 'atPeace' }
  | { kind: 'exists'; tag: string } | { kind: 'notExists'; tag: string }
  | { kind: 'flag'; flag: string; global?: boolean } | { kind: 'notFlag'; flag: string; global?: boolean }
  | { kind: 'relationAbove'; tag: string; value: number } | { kind: 'relationBelow'; tag: string; value: number }
  | { kind: 'isAI' } | { kind: 'isPuppet' } | { kind: 'notPuppet' }
  | { kind: 'groupRadical'; group: GroupId; above: number }
  | { kind: 'moneyBelow'; value: number }
  | { kind: 'inBloc' } | { kind: 'notInBloc' };

export type EventDemand = { kind: 'state'; key: string } | { kind: 'puppet' } | { kind: 'openMarket' } | { kind: 'reparations' } | { kind: 'joinBloc' };

export type EventEffect =
  | { kind: 'money'; amount: number }
  /** Money worth this many months of the country's income (negative to pay). */
  | { kind: 'incomeMonths'; months: number }
  | { kind: 'setLaw'; law: string }
  | { kind: 'relation'; tag: string; delta: number }
  | { kind: 'flag'; flag: string; global?: boolean } | { kind: 'clearFlag'; flag: string; global?: boolean }
  | { kind: 'modifier'; name: string; effects: Effects; months: number }
  | { kind: 'tech'; tech: string }
  /** Troops as a share of the troop limit (negative to lose them). */
  | { kind: 'troops'; share: number }
  | { kind: 'approval'; group: GroupId; radicalism: number }
  | { kind: 'startPlay'; target: string; demands: EventDemand[] }
  /** States (by key) move to `to` ('self' = the event's country), from whoever owns them unless `from` is set. */
  | { kind: 'transferStates'; keys: string[]; to: string; from?: string }
  | { kind: 'revolt'; group: GroupId }
  /** Rebels rise for independence holding these states (Task 2). */
  | { kind: 'independence'; tag: string; name: string; color: number; keys: string[]; group?: GroupId;
      /** Fresh troops as a share of the parent's (default from balance) and extra home defence, for famous risings. */ troops?: number; defensePct?: number; personality?: string }
  /** A new country appears peacefully on these states (Task 2). */
  | { kind: 'release'; tag: string; name: string; color: number; keys: string[] }
  | { kind: 'formNation'; tag: string }
  | { kind: 'foundBloc'; blocType: BlocType }
  | { kind: 'inviteToBloc'; tag: string };

export interface EventOption { label: string; effects: EventEffect[]; /** AI weight; the historical choice weighs most. */ ai: number; /** Weight on Hard and above, if different. */ aiHard?: number }

export interface EventDef {
  id: string; title: string; text: string;
  /** Tags it can fire for ('any' = every country; use sparingly). */ countries: string[] | 'any';
  start?: GameDate; end?: GameDate;
  /** Mean time to happen in months once possible (0 = at once). */ mtthMonths: number;
  conditions: Condition[];
  options: EventOption[];
  /** Fire again after it has fired (default: once per country). */ repeat?: boolean;
  /** Only for these start dates (default: all). */ starts?: string[];
}
