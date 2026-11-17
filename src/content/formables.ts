// Nations that can be proclaimed by uniting their lands.
export interface FormableDef {
  tag: string; name: string; color: number;
  /** Countries that may form it. */ from: string[];
  /** State-key prefixes or keys that make up the nation. */ cores: string[];
  /** Share of the core states the founder must own. */ share: number;
  description: string;
  /** Proclaimed only by its history event (the founder already owns the lands at the start). */ eventOnly?: boolean;
}

export const FORMABLES: FormableDef[] = [
  { tag: 'GER', name: 'Germany', color: 0x4a4f5c, from: ['PRU', 'AUS', 'BAV', 'SAX', 'HAN', 'WUR', 'HES', 'PAL'], cores: ['DEU-'], share: 0.75,
    description: 'Unite the German states under one crown.' },
  { tag: 'ITA', name: 'Italy', color: 0x4e9a5b, from: ['SAR', 'SIC', 'PAP', 'TUS', 'VEN'], cores: ['ITA-'], share: 0.7,
    description: 'Make Italy one nation, from the Alps to Sicily.' },
  { tag: 'AUH', name: 'Austria-Hungary', color: 0xd8c27a, from: ['AUS'], cores: ['AUT-', 'HUN-', 'CZE-', 'SVK-', 'HRV-', 'SVN-'], share: 0.8, eventOnly: true,
    description: 'Share the crown with Hungary in a dual monarchy.' },
  { tag: 'SCA', name: 'Scandinavia', color: 0x3f6fa8, from: ['SWE', 'DEN'], cores: ['SWE-', 'NOR-', 'DNK-'], share: 0.95,
    description: 'Unite Sweden, Norway and Denmark, as in the days of the Kalmar Union.' },
  { tag: 'IND', name: 'India', color: 0xe08a3c, from: ['MUG', 'MAR', 'MYS', 'HYD', 'PUN', 'AHM', 'SND'], cores: ['IND-', 'BGD-', 'PAK-'], share: 0.6,
    description: 'Bring the subcontinent under one throne.' },
  { tag: 'ROM', name: 'Roman Empire', color: 0x8a2be2, from: ['ITA', 'TUR', 'GRE', 'BYZ'], cores: ['ITA-', 'GRC-', 'TUR-', 'ALB-', 'MKD-', 'BGR-', 'EGY-', 'TUN-', 'LBY-', 'SYR-', 'LBN-', 'ISR-', 'JOR-', 'CYP-', 'FRA-', 'ESP-', 'PRT-'], share: 0.7,
    description: 'Restore the empire of the Caesars around the Mediterranean.' },
  { tag: 'BYZ', name: 'Byzantine Empire', color: 0x9b3b8f, from: ['GRE'], cores: ['GRC-', 'TUR-', 'BGR-', 'ALB-', 'MKD-', 'CYP-'], share: 0.8,
    description: 'The Great Idea fulfilled: Constantinople Greek again.' },
  { tag: 'ROU', name: 'Romania', color: 0xd4b13c, from: ['WAL', 'MOL'], cores: ['ROU-', 'MDA-'], share: 0.45,
    description: 'Join Wallachia and Moldavia into one Romanian state.' },
  { tag: 'YUG', name: 'Yugoslavia', color: 0x5470b8, from: ['SER', 'MON'], cores: ['SRB-', 'MNE-', 'BIH-', 'HRV-', 'SVN-', 'MKD-', 'KOS-'], share: 0.7,
    description: 'One kingdom for all the South Slavs.' },
  { tag: 'GCO', name: 'Gran Colombia', color: 0xe0c040, from: ['COL', 'VNZ', 'ECU'], cores: ['COL-', 'VEN-', 'ECU-', 'PAN-'], share: 0.75,
    description: 'Bolívar’s republic, from the Caribbean to the Andes.' },
  { tag: 'PBC', name: 'Peru-Bolivian Confederation', color: 0xb5785a, from: ['PEU', 'BOL'], cores: ['PER-', 'BOL-'], share: 0.8,
    description: 'Join Peru and Bolivia, as Santa Cruz dreamed.' },
  { tag: 'PLA', name: 'United Provinces of the Río de la Plata', color: 0x7fb8e0, from: ['ARG', 'URU', 'PAR'], cores: ['ARG-', 'URY-', 'PRY-', 'BOL-'], share: 0.5,
    description: 'Restore the old viceroyalty of the River Plate.' },
  { tag: 'IBR', name: 'Iberia', color: 0xd0943a, from: ['SPA', 'POR'], cores: ['ESP-', 'PRT-'], share: 0.9,
    description: 'One crown for Spain and Portugal.' },
  { tag: 'ARA', name: 'Arabia', color: 0x4f8a3c, from: ['NEJ', 'OMN'], cores: ['SAU-', 'YEM-', 'OMN-', 'ARE-', 'QAT-', 'KWT-'], share: 0.6,
    description: 'Unite the peninsula and the Holy Cities.' },
];
export const formableByTag = (tag: string): FormableDef | undefined => FORMABLES.find(f => f.tag === tag);
