/* ============================================
   AELINDRA · state/actions.ts
   Actions discriminées du reducer
   ============================================ */

import type { Hero, Floor } from '../data/types';
import type { PendingAction } from '../logic/combat';
import type { EquipSlot } from '../logic/equipment';
import type { GameState, ScreenId, AuthUser } from './types';

export type GameAction =
  // Profil / navigation
  | { type: 'SET_PLAYER_NAME'; name: string }
  | { type: 'NAVIGATE'; screen: ScreenId }
  | { type: 'OPEN_DUNGEON'; dungeonId: string }
  | { type: 'OPEN_HERO_DETAIL'; heroId: string }

  // Économie
  | { type: 'ADD_GOLD'; amount: number }
  | { type: 'ADD_ORBS'; amount: number }
  | { type: 'SPEND_GOLD'; amount: number }
  | { type: 'SPEND_ORBS'; amount: number }

  // Héros
  | { type: 'ADD_TO_TEAM'; hero: Hero }
  | { type: 'ADD_TO_COLLECTION'; hero: Hero }
  | { type: 'MOVE_TO_TEAM'; heroId: string }
  | { type: 'MOVE_TO_COLLECTION'; heroId: string }

  // Gacha
  | { type: 'PERFORM_PULLS'; count: 1 | 10 }
  | { type: 'CLEAR_PULL_RESULTS' }

  // Marché
  | { type: 'BUY_ITEM'; itemId: string; tab: 'armes' | 'armures' | 'potions' }

  // Équipement
  | { type: 'EQUIP_ITEM'; heroId: string; itemId: string }
  | { type: 'UNEQUIP_SLOT'; heroId: string; slot: EquipSlot }

  // Missions
  | { type: 'UPDATE_MISSION'; missionId: string; delta?: number }
  | { type: 'CLAIM_MISSION'; missionId: string }
  | { type: 'RESET_DAILY_MISSIONS' }

  // Donjon / tuto
  | { type: 'ADVANCE_TUTO_FLOOR'; floorNum: number }
  | { type: 'ADVANCE_DUNGEON_FLOOR'; dungeonId: string; floorIdx: number }

  // Combat
  | { type: 'INIT_COMBAT'; floorConfig: Floor }
  | { type: 'COMBAT_TILE_CLICK'; x: number; y: number }
  | { type: 'COMBAT_SELECT_UNIT'; unitId: string }
  | { type: 'COMBAT_SET_ACTION'; action: PendingAction | null }
  | { type: 'COMBAT_END_TURN' }
  | { type: 'COMBAT_GRANT_VICTORY' }
  | { type: 'COMBAT_END' }

  // Toast
  | { type: 'SHOW_TOAST'; msg: string }
  | { type: 'HIDE_TOAST' }

  // Auth
  | { type: 'SET_AUTH_USER'; user: AuthUser | null }

  // Persistence
  | { type: 'LOAD_STATE'; state: GameState }
  | { type: 'RESET_GAME' };
