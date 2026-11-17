// Historic coal and iron regions, matched by modern country and state name.
export interface ResourceOverride { modern: string; match: RegExp; coal?: boolean; iron?: boolean }

export const RESOURCE_OVERRIDES: ResourceOverride[] = [
  { modern: 'DEU', match: /Nordrhein|Saarland/, coal: true, iron: true },
  { modern: 'DEU', match: /Sachsen$|Saxony/, coal: true },
  { modern: 'POL', match: /Silesia|Opole/, coal: true, iron: true },
  { modern: 'GBR', match: /Wales|North East|Yorkshire|West Midlands|North West|Scotland/, coal: true, iron: true },
  { modern: 'FRA', match: /Hauts-de-France|Nord|Grand Est|Lorraine/, coal: true, iron: true },
  { modern: 'BEL', match: /Wallon|Hainaut|Liège/, coal: true, iron: true },
  { modern: 'ESP', match: /Asturias|País Vasco|Basque|Vizcaya/, coal: true, iron: true },
  { modern: 'CZE', match: /Moravskoslez|Ústecký|Plzeň/, coal: true, iron: true },
  { modern: 'UKR', match: /Donets|Luhans|Dnipro/, coal: true, iron: true },
  { modern: 'RUS', match: /Ural|Sverdlovsk|Chelyabinsk|Perm|Kemerovo/, coal: true, iron: true },
  { modern: 'SWE', match: /Norrbotten|Dalarna|Örebro/, iron: true },
  { modern: 'USA', match: /Pennsylvania|West Virginia|Ohio|Illinois|Kentucky/, coal: true },
  { modern: 'USA', match: /Minnesota|Michigan|Alabama|Pennsylvania/, iron: true },
  { modern: 'CHN', match: /Shanxi|Hebei|Liaoning|Inner Mongol|Nei Mongol/, coal: true, iron: true },
  { modern: 'IND', match: /Jharkhand|Odisha|Orissa|Chhattisgarh|West Bengal/, coal: true, iron: true },
  { modern: 'AUS', match: /New South Wales|Queensland/, coal: true },
  { modern: 'AUS', match: /Western Australia/, iron: true },
  { modern: 'ZAF', match: /Mpumalanga|Gauteng|Limpopo/, coal: true, iron: true },
  { modern: 'JPN', match: /Kyushu|Kyūshū|Hokkaido|Hokkaidō/, coal: true },
  { modern: 'BRA', match: /Minas Gerais/, iron: true },
  { modern: 'CAN', match: /Nova Scotia|Ontario/, coal: true, iron: true },
  { modern: 'AUT', match: /Steiermark|Styria/, iron: true },
];
