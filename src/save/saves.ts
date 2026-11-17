export type SaveSlot = 'auto' | 'background' | '1' | '2' | '3';

export interface SaveMeta { slot: SaveSlot; version: number; savedAt: number; countryTag: string; countryName: string; date: string; difficulty: string; difficultyLabel: string; startId: string }

/** Saved games, newest first. (Filled in with IndexedDB storage.) */
export async function listSaves(): Promise<SaveMeta[]> { return []; }
