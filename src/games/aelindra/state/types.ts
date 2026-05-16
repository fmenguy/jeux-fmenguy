/* ============================================
   AELINDRA · state/types.ts
   Shape de l'état global du jeu (GameState)
   ============================================ */

import type { Hero } from '../data/types';
import type { CombatState } from '../logic/combat';
import type { MissionProgress } from '../logic/missions';
import type { PullResult } from '../logic/gacha';

export type ScreenId =
  | 'splash'
  | 'dungeons'
  | 'gouffre'
  | 'dungeon-floors'
  | 'combat'
  | 'market'
  | 'guild'
  | 'heroes'
  | 'hero-detail'
  | 'missions';

export interface InventoryEntry {
  itemId: string;
  quantity: number;
}

export interface ToastState {
  msg: string;
  ts: number;
}

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

export interface GameState {
  // Profil joueur
  playerName: string;

  // Monnaies
  gold: number;
  orbs: number;

  // Progression
  tutoFloor: number;
  tutoComplete: boolean;
  dungeonProgress: Record<string, number>;

  // Héros
  team: Hero[];
  collection: Hero[];

  // Inventaire
  inventory: InventoryEntry[];

  // Gacha
  pity: number;

  // Missions
  missionProgress: Record<string, MissionProgress>;

  // UI / navigation
  currentScreen: ScreenId;
  currentDungeonId: string | null;
  currentHeroDetailId: string | null;

  // Combat actif (null hors combat)
  combat: CombatState | null;

  // Toast / overlay
  toast: ToastState | null;

  // Résultats du dernier tirage (affiché dans le modal Guild)
  lastPullResults: PullResult[] | null;

  // Utilisateur connecté (transient — non persisté)
  authUser: AuthUser | null;
}

/**
 * Sous-ensemble de GameState persisté en localStorage.
 * On exclut explicitement currentScreen, combat, toast et les ids de navigation
 * (ils sont reconstruits à chaque session).
 */
export type PersistedGameState = Pick<
  GameState,
  | 'playerName'
  | 'gold'
  | 'orbs'
  | 'tutoFloor'
  | 'tutoComplete'
  | 'dungeonProgress'
  | 'team'
  | 'collection'
  | 'inventory'
  | 'pity'
  | 'missionProgress'
>;
