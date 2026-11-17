// Building a country record (at game start, or when rebels rise mid-game).
import { BASE_PRICE, emptyGoods } from '../content/goods';
import { DEFAULT_LAWS } from '../content/laws';
import { emptyGroups } from './politics';
import type { Country, CountryDef } from './types';

export function placeholderCountry(): Country {
  return makeCountry(0, { tag: '---', name: 'Unclaimed', color: 0x808080, capital: '', population: 0, money: 0 }, 0, false, 'normal');
}

export function makeCountry(id: number, def: CountryDef, capitalState: number, isPlayer: boolean, difficulty: Country['difficulty']): Country {
  return {
    id, tag: def.tag, name: def.name, color: def.color, alive: id !== 0, isPlayer, capitalState, difficulty,
    personality: def.personality ?? 'default', troops: 0, maxTroops: 0, money: def.money,
    stockpile: emptyGoods(), prices: { ...BASE_PRICE }, produced: emptyGoods(), demanded: emptyGoods(),
    gdp: 0, income: 0, sol: 10, literacy: 0.1, researchPoints: 0, researchRate: 0, techs: [], researching: null, researchQueue: [], laws: { ...DEFAULT_LAWS }, enacting: null, groups: emptyGroups(), lastDefeat: 0, tradeIncome: 0, infamy: 0, overlord: 0, puppetSince: 0, tiles: 0, controlled: 0, population: 0, history: [],
  };
}

