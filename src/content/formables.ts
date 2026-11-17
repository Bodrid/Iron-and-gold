// Nations that can be proclaimed by uniting their lands.
export interface FormableDef {
  tag: string; name: string; color: number;
  /** Countries that may form it. */ from: string[];
  /** State-key prefixes or keys that make up the nation. */ cores: string[];
  /** Share of the core states the founder must own. */ share: number;
  description: string;
}

export const FORMABLES: FormableDef[] = [
  { tag: 'GER', name: 'Germany', color: 0x4a4f5c, from: ['PRU', 'AUS', 'BAV', 'SAX', 'HAN', 'WUR', 'HES'], cores: ['DEU-'], share: 0.75,
    description: 'Unite the German states under one crown.' },
  { tag: 'ITA', name: 'Italy', color: 0x4e9a5b, from: ['SAR', 'SIC', 'PAP', 'TUS'], cores: ['ITA-'], share: 0.75,
    description: 'Make Italy one nation, from the Alps to Sicily.' },
];
export const formableByTag = (tag: string): FormableDef | undefined => FORMABLES.find(f => f.tag === tag);
