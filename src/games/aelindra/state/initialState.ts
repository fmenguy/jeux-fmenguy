/* ============================================
   AELINDRA · state/initialState.ts
   État par défaut au premier lancement
   ============================================ */

import type { GameState } from './types';
import type { MissionProgress } from '../logic/missions';
import { MAIN_MISSIONS, DAILY_MISSIONS } from '../data/missions';

function buildInitialMissions(): Record<string, MissionProgress> {
  const out: Record<string, MissionProgress> = {};
  for (const m of MAIN_MISSIONS) {
    out[m.id] = { progress: 0, done: false, claimed: false };
  }
  for (const m of DAILY_MISSIONS) {
    out[m.id] = { progress: 0, done: false, claimed: false, lastReset: '' };
  }
  return out;
}

export const initialState: GameState = {
  playerName: 'Aventurier',
  gold: 120,
  orbs: 15,
  tutoFloor: 0,
  tutoComplete: false,
  dungeonProgress: { foret: 0, mines: 0, tour: 0 },
  team: [],
  collection: [],
  inventory: [],
  pity: 0,
  missionProgress: buildInitialMissions(),
  currentScreen: 'splash',
  currentDungeonId: null,
  currentHeroDetailId: null,
  combat: null,
  toast: null,
  lastPullResults: null,
  authUser: null,
};
