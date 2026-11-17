import type { BuildingType } from '../../content/buildingTypes';
import type { TechTree } from '../../content/techs';

export interface Personality {
  id: string;
  /** 0..1: how readily it starts wars. */ aggression: number;
  buildWeights: Partial<Record<BuildingType, number>>;
  /** State key prefixes it wants (e.g. 'DEU-'). */ interests: string[];
  /** Country tags it dislikes. */ rivals: string[];
  /** Research preference by tree (default 1.2 production, 1 military, 1 society). */ techWeights?: Partial<Record<TechTree, number>>;
}
