// Applying demands won in a play or a peace deal.
import { DEMAND_INFAMY } from '../../content/diplomacy';
import { getStateTiles } from '../../map/stateTiles';
import { BALANCE } from '../balance';
import { TICKS_PER_DAY } from '../calendar';
import { setTile } from '../control';
import { systems } from '../registry';
import type { CountryId, Demand, GameState, SimEvent } from '../types';
import { addInfamy } from './infamy';
import { hasTreaty, sign } from './treaties';

const D = BALANCE.diplomacy;

/** Hooks for puppets (Task 7 replaces this simple version). */
export const subjectHooks = {
  makePuppet: (state: GameState, overlord: CountryId, puppet: CountryId, _events: SimEvent[]) => { state.countries[puppet].overlord = overlord; },
};

/** Applies what still makes sense; returns the demands actually applied. Stale ones (state no longer theirs…) are skipped. */
export function applyDemands(state: GameState, winner: CountryId, loser: CountryId, demands: Demand[], events: SimEvent[], changed: number[]): Demand[] {
  const done: Demand[] = [];
  for (const d of demands) {
    if (!state.countries[loser].alive || !state.countries[winner].alive) break;
    if (d.kind === 'state') {
      if (state.states[d.state]?.owner !== loser) continue;
      for (const t of getStateTiles(state.map, d.state)) if (state.owner[t] === loser) setTile(state, t, winner, winner, changed);
    } else if (d.kind === 'puppet') {
      // No chains: a winner that is itself a puppet can't take puppets.
      if (state.countries[loser].overlord || state.countries[winner].overlord) continue;
      subjectHooks.makePuppet(state, winner, loser, events);
    } else if (d.kind === 'openMarket') {
      if (hasTreaty(state, winner, loser, 'tradeAgreement')) continue;
      sign(state, winner, loser, 'tradeAgreement', events);
    } else if (d.kind === 'reparations') {
      state.reparations.push({ from: loser, to: winner, until: state.tick + D.REPARATIONS_YEARS * 365 * TICKS_PER_DAY });
    }
    addInfamy(state, winner, DEMAND_INFAMY[d.kind]);
    done.push(d);
  }
  return done;
}

systems.month.push(state => {
  state.reparations = state.reparations.filter(r => r.until > state.tick && state.countries[r.from].alive && state.countries[r.to].alive);
  for (const r of state.reparations) {
    const from = state.countries[r.from], to = state.countries[r.to];
    const pay = Math.max(0, from.income) * D.REPARATIONS_SHARE + from.gdp / 12 * 0.01;
    from.money -= pay; from.income -= pay; to.money += pay; to.income += pay;
  }
});
