/* ============================================
   AELINDRA · state/persistence.ts
   Sauvegarde et chargement localStorage
   ============================================ */

import type { GameState, PersistedGameState } from './types';
import type { MissionProgress } from '../logic/missions';
import { MAIN_MISSIONS, DAILY_MISSIONS } from '../data/missions';

export const SAVE_KEY = 'aelindra_save';

const PERSISTED_KEYS: Array<keyof PersistedGameState> = [
  'playerName',
  'gold',
  'orbs',
  'tutoFloor',
  'tutoComplete',
  'dungeonProgress',
  'team',
  'collection',
  'inventory',
  'pity',
  'missionProgress',
];

function migrateMissionProgress(
  raw: Record<string, Partial<MissionProgress>> | undefined,
): Record<string, MissionProgress> {
  const out: Record<string, MissionProgress> = {};
  const ensure = (id: string, isDaily: boolean): MissionProgress => {
    const src = raw?.[id] ?? {};
    const progress = typeof src.progress === 'number' ? src.progress : 0;
    const totalMission =
      [...MAIN_MISSIONS, ...DAILY_MISSIONS].find(m => m.id === id)?.total ?? 1;
    const done = typeof src.done === 'boolean' ? src.done : progress >= totalMission;
    const claimed = typeof src.claimed === 'boolean' ? src.claimed : false;
    if (isDaily) {
      return {
        progress,
        done,
        claimed,
        lastReset: typeof src.lastReset === 'string' ? src.lastReset : '',
      };
    }
    return { progress, done, claimed };
  };

  for (const m of MAIN_MISSIONS) out[m.id] = ensure(m.id, false);
  for (const m of DAILY_MISSIONS) out[m.id] = ensure(m.id, true);
  return out;
}

export function loadSavedState(): Partial<PersistedGameState> | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PersistedGameState>;

    // Migration des champs manquants
    const migrated: Partial<PersistedGameState> = { ...parsed };

    if (!migrated.dungeonProgress) {
      migrated.dungeonProgress = { foret: 0, mines: 0, tour: 0 };
    }
    if (!Array.isArray(migrated.team)) migrated.team = [];
    if (!Array.isArray(migrated.collection)) migrated.collection = [];
    if (!Array.isArray(migrated.inventory)) migrated.inventory = [];
    if (typeof migrated.pity !== 'number') migrated.pity = 0;
    if (typeof migrated.gold !== 'number') migrated.gold = 120;
    if (typeof migrated.orbs !== 'number') migrated.orbs = 15;
    if (typeof migrated.tutoFloor !== 'number') migrated.tutoFloor = 0;
    if (typeof migrated.tutoComplete !== 'boolean') migrated.tutoComplete = false;
    if (typeof migrated.playerName !== 'string' || !migrated.playerName) {
      migrated.playerName = 'Aventurier';
    }

    migrated.missionProgress = migrateMissionProgress(
      parsed.missionProgress as Record<string, Partial<MissionProgress>> | undefined,
    );

    return migrated;
  } catch (err) {
    console.warn('Aelindra: chargement impossible', err);
    return null;
  }
}

export function saveState(state: GameState): void {
  if (typeof window === 'undefined') return;
  try {
    const toSave: Partial<PersistedGameState> = {};
    for (const key of PERSISTED_KEYS) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (toSave as any)[key] = state[key];
    }
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(toSave));
  } catch (err) {
    console.warn('Aelindra: sauvegarde impossible', err);
  }
}

export function clearSavedState(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(SAVE_KEY);
  } catch {
    // ignore
  }
}
