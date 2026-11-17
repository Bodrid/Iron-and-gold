// Power blocs: a major power leads, members (and everyone's puppets) share the principles' buffs.
import { BLOC_TYPES, BLOC_TYPE_IDS, PRINCIPLES, PRINCIPLE_IDS, type BlocType, type PrincipleId } from '../content/blocs';
import { personalityOf } from '../content/personalities';
import { BALANCE } from './balance';
import { TICKS_PER_DAY } from './calendar';
import { effectSources } from './mods';
import { handlers, systems } from './registry';
import { atWar } from './war';
import { sharesBorder } from './combat';
import { joinerHooks } from './diplomacy/plays';
import { demandHooks } from './diplomacy/demands';
import { changeRelation, relation, relationPairHooks } from './diplomacy/relations';
import { tradeHooks } from './naval/trade';
import { computeScores } from './victory';
import type { Bloc, Command, CountryId, GameState, SimEvent } from './types';

const B = BALANCE.blocs;
const YEAR = 365 * TICKS_PER_DAY;

/** The bloc a country belongs to: as leader, as member, or through its overlord. */
export function blocOf(state: GameState, c: CountryId): Bloc | undefined {
  const x = state.countries[c];
  if (!x?.alive) return undefined;
  const own = state.blocs.find(b => b.leader === c || b.members.includes(c));
  if (own) return own;
  return x.overlord ? state.blocs.find(b => b.leader === x.overlord || b.members.includes(x.overlord)) : undefined;
}
export const sameBloc = (state: GameState, a: CountryId, b: CountryId) => { const x = blocOf(state, a); return !!x && x === blocOf(state, b); };
export const hasPrinciple = (b: Bloc | undefined, p: PrincipleId) => !!b && b.principles.includes(p);

/** Everyone in the bloc: leader, members and their puppets. */
export function blocCountries(state: GameState, b: Bloc): CountryId[] {
  const core = [b.leader, ...b.members];
  const out = [...core];
  for (const c of state.countries) if (c.alive && c.overlord && core.includes(c.overlord) && !out.includes(c.id)) out.push(c.id);
  return out.filter(id => state.countries[id].alive);
}

export function isMajor(state: GameState, c: CountryId): boolean {
  if (state.countries[c].population >= B.MAJOR_POPULATION) return true;
  return computeScores(state).slice(0, B.MAJOR_RANK).some(r => r.country === c);
}

export function foundCheck(state: GameState, c: CountryId, type: BlocType, picks: PrincipleId[]): string | null {
  const x = state.countries[c];
  if (!BLOC_TYPE_IDS.includes(type)) return 'badType';
  if (x.overlord) return 'puppet';
  if (blocOf(state, c)) return 'inBloc';
  if (!isMajor(state, c)) return 'notMajor';
  const all = principlesFor(type, picks);
  if (!all) return 'badPrinciples';
  if (x.money < B.FOUND_COST) return 'cantAfford';
  return null;
}

/** The type's fixed principle plus 1–2 different picks (0 picks allowed: just the fixed one). */
function principlesFor(type: BlocType, picks: PrincipleId[]): PrincipleId[] | null {
  if (!Array.isArray(picks) || picks.length > B.MAX_PICKS) return null;
  const fixed = BLOC_TYPES[type].fixed;
  const out: PrincipleId[] = [fixed];
  for (const p of picks) {
    if (!PRINCIPLE_IDS.includes(p) || out.includes(p)) return null;
    out.push(p);
  }
  return out;
}

export function inviteCheck(state: GameState, leader: CountryId, target: CountryId): string | null {
  const b = state.blocs.find(x => x.leader === leader);
  if (!b) return 'notLeader';
  const t = state.countries[target];
  if (!t?.alive || target <= 0 || target === leader) return 'no such country';
  if (t.overlord) return 'targetIsPuppet';
  if (blocOf(state, target)) return 'targetInBloc';
  if (atWar(state, leader, target)) return 'atWar';
  if (relation(state, leader, target) < B.INVITE_MIN_RELATION) return 'needsNeutral';
  if (state.blocOffers.some(o => o.from === leader && o.to === target)) return 'alreadyOffered';
  return null;
}

/** How an AI answers an invitation (the AI module may refine this). */
export const blocPolicy = {
  accepts(state: GameState, ai: CountryId, b: Bloc): boolean {
    const rel = relation(state, ai, b.leader);
    const me = state.countries[ai], lead = state.countries[b.leader];
    const rivals = personalityOf(me.personality).rivals;
    if (rivals.includes(lead.tag)) return false;
    // A great power doesn't take orders lightly.
    if (isMajor(state, ai)) return rel >= B.AI_MAJOR_JOIN_RELATION;
    const sharedRival = rivals.some(t => personalityOf(lead.personality).rivals.includes(t));
    // Or: a much stronger neighbour that shares our enemies.
    return rel >= B.AI_JOIN_RELATION || (rel >= 0 && lead.troops >= me.troops * 3 && sharedRival && sharesBorder(state, ai, b.leader));
  },
};

function join(state: GameState, b: Bloc, c: CountryId, events: SimEvent[]): void {
  if (!b.members.includes(c)) b.members.push(c);
  state.blocOffers = state.blocOffers.filter(o => o.to !== c);
  events.push({ type: 'blocJoined', country: c, leader: b.leader });
}

export function addToBloc(state: GameState, leader: CountryId, c: CountryId, events: SimEvent[]): boolean {
  const b = state.blocs.find(x => x.leader === leader);
  if (!b || blocOf(state, c) || state.countries[c].overlord) return false;
  join(state, b, c, events);
  return true;
}

function dissolve(state: GameState, b: Bloc, events: SimEvent[]): void {
  state.blocs = state.blocs.filter(x => x !== b);
  state.blocOffers = state.blocOffers.filter(o => o.from !== b.leader);
  events.push({ type: 'blocDissolved', leader: b.leader });
}

/** Daily upkeep: dead or puppeted members leave; a fallen leader hands over to the strongest member. */
export function blocDay(state: GameState, events: SimEvent[]): void {
  state.blocOffers = state.blocOffers.filter(o => state.tick - o.tick <= B.OFFER_DAYS * TICKS_PER_DAY && state.countries[o.from].alive && state.countries[o.to].alive);
  for (const b of state.blocs.slice()) {
    b.members = b.members.filter(m => state.countries[m].alive && !state.countries[m].overlord);
    const leader = state.countries[b.leader];
    if (leader.alive && !leader.overlord) continue;
    const heir = [...b.members].sort((x, y) => state.countries[y].troops - state.countries[x].troops || x - y)[0];
    if (!heir) { dissolve(state, b, events); continue; }
    const old = b.leader;
    b.leader = heir;
    b.members = b.members.filter(m => m !== heir);
    state.blocOffers = state.blocOffers.filter(o => o.from !== old);
    events.push({ type: 'blocLeaderChanged', from: old, to: heir });
  }
}

/** Imperial tribute: members (not puppets, who already pay their overlord) pay a share of positive income to the leader. */
export function blocMonth(state: GameState): void {
  for (const b of state.blocs) {
    if (!hasPrinciple(b, 'imperialTribute')) continue;
    const leader = state.countries[b.leader];
    for (const m of b.members) {
      const c = state.countries[m];
      const pay = Math.max(0, c.income) * B.TRIBUTE;
      c.money -= pay; c.income -= pay; leader.money += pay; leader.income += pay;
    }
  }
}

// The joinBloc demand: the initiator must lead a bloc, the target must be free to join.
demandHooks.joinBlocCheck = (state, initiator, target) => {
  if (!state.blocs.some(b => b.leader === initiator)) return 'noBloc';
  if (blocOf(state, target)) return 'targetInBloc';
  return null;
};
demandHooks.joinBloc = (state, leader, c, events) => addToBloc(state, leader, c, events);

// ---- wiring ----
effectSources.push({
  sig: (state, c) => { const b = blocOf(state, c.id); return b ? `${b.id}:${b.leader === c.id ? 'L' : 'M'}:${b.principles.join(',')}` : ''; },
  effects: (state, c) => {
    const b = blocOf(state, c.id);
    if (!b) return [];
    const lead = b.leader === c.id;
    return b.principles.map(p => (lead ? PRINCIPLES[p].leader : PRINCIPLES[p].member));
  },
});

// Free Trade Area: bonus on trade inside the bloc, which no embargo can stop.
const baseBlocked = tradeHooks.blocked, baseBonus = tradeHooks.bonus;
tradeHooks.blocked = (state, a, b) => {
  const x = blocOf(state, a);
  if (x && hasPrinciple(x, 'freeTradeArea') && x === blocOf(state, b)) return false;
  return baseBlocked(state, a, b);
};
tradeHooks.bonus = (state, a, b) => {
  const x = blocOf(state, a);
  return baseBonus(state, a, b) + (x && hasPrinciple(x, 'freeTradeArea') && x === blocOf(state, b) ? B.FREE_TRADE_BONUS : 0);
};

// Common Defence: when a play targets a member, the rest of the bloc defends it.
joinerHooks.push((state, initiator, target) => {
  const b = blocOf(state, target);
  if (!b || !hasPrinciple(b, 'commonDefence') || blocOf(state, initiator) === b) return [];
  return blocCountries(state, b).filter(c => c !== target);
});

// Members like each other a little more.
relationPairHooks.push((state, add) => {
  for (const b of state.blocs) {
    const all = [b.leader, ...b.members];
    for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++) add(all[i], all[j], B.MEMBER_RELATION);
  }
});

handlers.foundBloc = (state, cmd: Extract<Command, { type: 'foundBloc' }>, events) => {
  const bad = foundCheck(state, cmd.country, cmd.blocType, cmd.principles);
  if (bad) return bad;
  state.countries[cmd.country].money -= B.FOUND_COST;
  state.blocs.push({ id: state.nextId++, leader: cmd.country, type: cmd.blocType, principles: principlesFor(cmd.blocType, cmd.principles)!, members: [], founded: state.tick, principlesSet: state.tick });
  events.push({ type: 'blocFounded', leader: cmd.country, blocType: cmd.blocType });
  return null;
};
handlers.inviteToBloc = (state, cmd: Extract<Command, { type: 'inviteToBloc' }>, events) => {
  const bad = inviteCheck(state, cmd.country, cmd.target);
  if (bad) return bad;
  const b = state.blocs.find(x => x.leader === cmd.country)!;
  if (state.countries[cmd.target].isPlayer) {
    state.blocOffers.push({ from: cmd.country, to: cmd.target, tick: state.tick });
    events.push({ type: 'blocInvited', from: cmd.country, to: cmd.target });
  } else if (blocPolicy.accepts(state, cmd.target, b)) join(state, b, cmd.target, events);
  else events.push({ type: 'blocRefused', from: cmd.country, to: cmd.target });
  return null;
};
handlers.respondBlocInvite = (state, cmd: Extract<Command, { type: 'respondBlocInvite' }>, events) => {
  const offer = state.blocOffers.find(o => o.from === cmd.from && o.to === cmd.country);
  if (!offer) return 'no such offer';
  state.blocOffers = state.blocOffers.filter(o => o !== offer);
  const b = state.blocs.find(x => x.leader === cmd.from);
  if (!b) return 'no such bloc';
  if (!cmd.accept) { events.push({ type: 'blocRefused', from: cmd.from, to: cmd.country }); return null; }
  if (blocOf(state, cmd.country)) return 'inBloc';
  if (state.countries[cmd.country].overlord) return 'puppet';
  join(state, b, cmd.country, events);
  return null;
};
handlers.askToJoinBloc = (state, cmd: Extract<Command, { type: 'askToJoinBloc' }>, events) => {
  const b = state.blocs.find(x => x.leader === cmd.leader);
  if (!b) return 'no such bloc';
  const me = state.countries[cmd.country];
  if (me.overlord) return 'puppet';
  if (blocOf(state, cmd.country)) return 'inBloc';
  if (atWar(state, cmd.country, cmd.leader)) return 'atWar';
  const leader = state.countries[cmd.leader];
  if (leader.isPlayer) return 'askThePlayer';   // the player invites; AI requests to the player aren't modelled
  if (relation(state, cmd.leader, cmd.country) < B.INVITE_MIN_RELATION) return 'needsNeutral';
  join(state, b, cmd.country, events);
  return null;
};
handlers.leaveBloc = (state, cmd: Extract<Command, { type: 'leaveBloc' }>, events) => {
  const b = state.blocs.find(x => x.leader === cmd.country);
  if (b) { dissolve(state, b, events); return null; }
  const m = state.blocs.find(x => x.members.includes(cmd.country));
  if (!m) return state.countries[cmd.country].overlord ? 'puppet' : 'notInBloc';
  m.members = m.members.filter(x => x !== cmd.country);
  changeRelation(state, cmd.country, m.leader, B.LEAVE_RELATION);
  events.push({ type: 'blocLeft', country: cmd.country, leader: m.leader });
  return null;
};
handlers.expelFromBloc = (state, cmd: Extract<Command, { type: 'expelFromBloc' }>, events) => {
  const b = state.blocs.find(x => x.leader === cmd.country);
  if (!b) return 'notLeader';
  if (!b.members.includes(cmd.target)) return 'notMember';
  b.members = b.members.filter(x => x !== cmd.target);
  changeRelation(state, cmd.country, cmd.target, B.LEAVE_RELATION);
  events.push({ type: 'blocLeft', country: cmd.target, leader: cmd.country });
  return null;
};
handlers.setPrinciples = (state, cmd: Extract<Command, { type: 'setPrinciples' }>) => {
  const b = state.blocs.find(x => x.leader === cmd.country);
  if (!b) return 'notLeader';
  if (state.tick - b.principlesSet < YEAR) return 'tooSoon';
  const all = principlesFor(b.type, cmd.principles);
  if (!all) return 'badPrinciples';
  b.principles = all;
  b.principlesSet = state.tick;
  return null;
};

systems.day.push((state, events) => blocDay(state, events));
systems.month.push(state => blocMonth(state));
