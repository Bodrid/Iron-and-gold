import type { BuildingType } from '../../content/buildingTypes';

export interface Personality {
  id: string;
  /** 0..1: how readily it starts wars. */ aggression: number;
  buildWeights: Partial<Record<BuildingType, number>>;
  /** State key prefixes it wants (e.g. 'DEU-'). */ interests: string[];
  /** Country tags it dislikes. */ rivals: string[];
}
