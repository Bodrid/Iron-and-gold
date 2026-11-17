// Population growth by living standards, literacy, and the monthly history sample.
import { BALANCE } from './balance';
import { systems } from './registry';
import { mods, pctMult } from './mods';
import type { GameState } from './types';

const G = BALANCE.growth;

export function monthlyPopulation(state: GameState): void {
  for (const st of state.states) {
    if (!st.id) continue;
    const owner = st.owner ? state.countries[st.owner] : null;
    let rate = owner ? G.BASE_GROWTH + (G.SOL_GROWTH * (owner.sol - 10)) / 10 : G.BASE_GROWTH;
    if (owner && rate > 0) rate *= pctMult(mods(state, owner).growthPct);
    st.population = Math.max(0, st.population * (1 + rate));
  }
  for (const c of state.countries) c.population = 0;
  for (const st of state.states) if (st.id && st.owner) state.countries[st.owner].population += st.population;
  for (const c of state.countries) {
    if (!c.alive) continue;
    let uni = 0;
    for (const st of state.states) if (st.owner === c.id) for (const b of st.buildings) if (b.type === 'university') uni += b.level;
    c.literacy = Math.min(1, c.literacy + (G.BASE_LITERACY_GROWTH + (G.UNIVERSITY_LITERACY * uni) / Math.max(1, c.population / 1e6)) * pctMult(mods(state, c).literacyPct));
    c.history.push({ tick: state.tick, gdp: c.gdp, population: c.population, sol: c.sol, tiles: c.tiles, money: c.money });
    if (c.history.length > BALANCE.economy.HISTORY_MAX) c.history.shift();
  }
}

systems.month.push(state => monthlyPopulation(state));
