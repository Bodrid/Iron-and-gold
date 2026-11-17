// The six interest groups. Their clout comes from the economy; their mood from laws, living standards and wars.
export type GroupId = 'landowners' | 'industrialists' | 'workers' | 'clergy' | 'army' | 'intellectuals';
export const GROUP_IDS: GroupId[] = ['landowners', 'industrialists', 'workers', 'clergy', 'army', 'intellectuals'];

export interface GroupDef { id: GroupId; name: string; description: string; color: number }

export const GROUPS: Record<GroupId, GroupDef> = {
  landowners: { id: 'landowners', name: 'Landowners', description: 'Old nobility and big farmers. Strong where farms and forests dominate.', color: 0x8a6d3b },
  industrialists: { id: 'industrialists', name: 'Industrialists', description: 'Mill and factory owners. Grow with your industry.', color: 0x4a6fd1 },
  workers: { id: 'workers', name: 'Workers', description: 'Factory and mine labour. Care most about living standards.', color: 0xc94a4a },
  clergy: { id: 'clergy', name: 'Clergy', description: 'The church. Weaker as literacy spreads.', color: 0xd9b44a },
  army: { id: 'army', name: 'Army', description: 'The officer corps. Grows with your troops and barracks; hates losing wars.', color: 0x4f6b3a },
  intellectuals: { id: 'intellectuals', name: 'Intellectuals', description: 'Writers, scientists and students. Grow with literacy and universities.', color: 0x8a7bd1 },
};
