/* ============================================
   AELINDRA · state/reducer.ts
   Reducer principal du jeu (pur, sans effet de bord)
   ============================================ */

import type { Hero, Item } from '../data/types';
import type { GameState } from './types';
import type { GameAction } from './actions';
import type { MissionProgress } from '../logic/missions';

import { initialState } from './initialState';
import {
  performPulls,
  PULL_COST_1,
  PULL_COST_10,
} from '../logic/gacha';
import {
  equipItemPure,
  unequipSlotPure,
} from '../logic/equipment';
import {
  updateMissionProgress,
  claimMissionReward,
  shouldResetDaily,
  resetDailyProgress,
} from '../logic/missions';
import {
  initCombat as initCombatLogic,
  selectUnit,
  setPendingAction,
  moveUnit,
  attackUnit,
  useAbility,
  endElfTurn,
  type CombatState,
} from '../logic/combat';

import { GUILD_POOL, STARTER_HEROES } from '../data/heroes';
import { MARKET_ITEMS } from '../data/items';
import { MAIN_MISSIONS, DAILY_MISSIONS } from '../data/missions';
import { ENEMY_TYPES } from '../data/enemies';
import { ABILITIES } from '../data/abilities';

// ============================================
// HELPERS
// ============================================

function findMission(missionId: string) {
  return [...MAIN_MISSIONS, ...DAILY_MISSIONS].find(m => m.id === missionId);
}

function findItem(itemId: string): Item | null {
  const all: Item[] = [
    ...MARKET_ITEMS.armes,
    ...MARKET_ITEMS.armures,
    ...MARKET_ITEMS.potions,
  ];
  return all.find(it => it.id === itemId) ?? null;
}

function ownedIds(state: GameState): Set<string> {
  const s = new Set<string>();
  state.team.forEach(h => s.add(h.id));
  state.collection.forEach(h => s.add(h.id));
  return s;
}

function isHeroOwned(state: GameState, heroId: string): boolean {
  return ownedIds(state).has(heroId);
}

function updateHeroInState(state: GameState, updated: Hero): GameState {
  const inTeam = state.team.some(h => h.id === updated.id);
  if (inTeam) {
    return { ...state, team: state.team.map(h => (h.id === updated.id ? updated : h)) };
  }
  return {
    ...state,
    collection: state.collection.map(h => (h.id === updated.id ? updated : h)),
  };
}

function addItemToInventory(state: GameState, itemId: string, qty = 1): GameState {
  const existing = state.inventory.find(i => i.itemId === itemId);
  if (existing) {
    return {
      ...state,
      inventory: state.inventory.map(i =>
        i.itemId === itemId ? { ...i, quantity: i.quantity + qty } : i,
      ),
    };
  }
  return {
    ...state,
    inventory: [...state.inventory, { itemId, quantity: qty }],
  };
}

function removeItemFromInventory(state: GameState, itemId: string, qty = 1): GameState {
  const existing = state.inventory.find(i => i.itemId === itemId);
  if (!existing) return state;
  if (existing.quantity > qty) {
    return {
      ...state,
      inventory: state.inventory.map(i =>
        i.itemId === itemId ? { ...i, quantity: i.quantity - qty } : i,
      ),
    };
  }
  return {
    ...state,
    inventory: state.inventory.filter(i => i.itemId !== itemId),
  };
}

function bumpMission(
  state: GameState,
  missionId: string,
  delta = 1,
): GameState {
  const mission = findMission(missionId);
  if (!mission) return state;
  const current = state.missionProgress[missionId] ?? {
    progress: 0,
    done: false,
    claimed: false,
  };
  const newProg = updateMissionProgress(current, mission, delta);
  return {
    ...state,
    missionProgress: { ...state.missionProgress, [missionId]: newProg },
  };
}

function pushToast(state: GameState, msg: string): GameState {
  return { ...state, toast: { msg, ts: Date.now() } };
}

// ============================================
// REDUCER PRINCIPAL
// ============================================

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    // ----- Profil / navigation -----
    case 'SET_PLAYER_NAME':
      return { ...state, playerName: action.name.trim() || state.playerName };

    case 'NAVIGATE':
      return { ...state, currentScreen: action.screen };

    case 'OPEN_DUNGEON':
      return {
        ...state,
        currentDungeonId: action.dungeonId,
        currentScreen: 'dungeon-floors',
      };

    case 'OPEN_HERO_DETAIL':
      return {
        ...state,
        currentHeroDetailId: action.heroId,
        currentScreen: 'hero-detail',
      };

    // ----- Économie -----
    case 'ADD_GOLD':
      return { ...state, gold: Math.max(0, state.gold + action.amount) };

    case 'ADD_ORBS':
      return { ...state, orbs: Math.max(0, state.orbs + action.amount) };

    case 'SPEND_GOLD':
      if (state.gold < action.amount) return state;
      return { ...state, gold: state.gold - action.amount };

    case 'SPEND_ORBS':
      if (state.orbs < action.amount) return state;
      return { ...state, orbs: state.orbs - action.amount };

    // ----- Héros -----
    case 'ADD_TO_TEAM': {
      if (state.team.length >= 4) return state;
      if (state.team.some(h => h.id === action.hero.id)) return state;
      const hero: Hero = { ...action.hero, level: action.hero.level ?? 1, xp: action.hero.xp ?? 0 };
      return { ...state, team: [...state.team, hero] };
    }

    case 'ADD_TO_COLLECTION': {
      if (isHeroOwned(state, action.hero.id)) return state;
      const hero: Hero = { ...action.hero, level: action.hero.level ?? 1, xp: action.hero.xp ?? 0 };
      return { ...state, collection: [...state.collection, hero] };
    }

    case 'MOVE_TO_TEAM': {
      if (state.team.length >= 4) return state;
      const hero = state.collection.find(h => h.id === action.heroId);
      if (!hero) return state;
      return {
        ...state,
        team: [...state.team, hero],
        collection: state.collection.filter(h => h.id !== action.heroId),
      };
    }

    case 'MOVE_TO_COLLECTION': {
      const hero = state.team.find(h => h.id === action.heroId);
      if (!hero) return state;
      return {
        ...state,
        collection: [...state.collection, hero],
        team: state.team.filter(h => h.id !== action.heroId),
      };
    }

    // ----- Gacha -----
    case 'PERFORM_PULLS': {
      const cost = action.count === 1 ? PULL_COST_1 : PULL_COST_10;
      if (state.orbs < cost) {
        return pushToast(state, "Pas assez d'orbes ! Complète des donjons.");
      }

      const { results, newPity } = performPulls(
        GUILD_POOL,
        action.count,
        state.pity,
        ownedIds(state),
      );

      let nextCollection = [...state.collection];
      const owned = ownedIds(state);
      for (const r of results) {
        if (!owned.has(r.hero.id)) {
          nextCollection.push({ ...r.hero, level: 1, xp: 0 });
          owned.add(r.hero.id);
        }
      }

      let next: GameState = {
        ...state,
        orbs: state.orbs - cost,
        pity: newPity,
        collection: nextCollection,
      };

      next = bumpMission(next, 'm2', action.count);
      next = bumpMission(next, 'd2', 1);

      return next;
    }

    // ----- Marché -----
    case 'BUY_ITEM': {
      const item = MARKET_ITEMS[action.tab]?.find(it => it.id === action.itemId);
      if (!item) return state;
      if (state.gold < item.price) {
        return pushToast(state, "Pas assez d'or !");
      }
      let next: GameState = { ...state, gold: state.gold - item.price };
      next = addItemToInventory(next, item.id, 1);
      next = bumpMission(next, 'd3', 1);
      return pushToast(next, `${item.name} acheté !`);
    }

    // ----- Équipement -----
    case 'EQUIP_ITEM': {
      const hero =
        state.team.find(h => h.id === action.heroId) ??
        state.collection.find(h => h.id === action.heroId);
      if (!hero) return state;

      const item = findItem(action.itemId);
      if (!item) return state;

      const invEntry = state.inventory.find(i => i.itemId === action.itemId);
      if (!invEntry) return state;

      const { hero: updatedHero, unequippedItemId } = equipItemPure(hero, item);

      let next = updateHeroInState(state, updatedHero);
      next = removeItemFromInventory(next, action.itemId, 1);
      if (unequippedItemId) {
        next = addItemToInventory(next, unequippedItemId, 1);
      }
      return next;
    }

    case 'UNEQUIP_SLOT': {
      const hero =
        state.team.find(h => h.id === action.heroId) ??
        state.collection.find(h => h.id === action.heroId);
      if (!hero) return state;

      const { hero: updatedHero, unequippedItemId } = unequipSlotPure(hero, action.slot);
      if (!unequippedItemId) return state;

      let next = updateHeroInState(state, updatedHero);
      next = addItemToInventory(next, unequippedItemId, 1);
      return next;
    }

    // ----- Missions -----
    case 'UPDATE_MISSION':
      return bumpMission(state, action.missionId, action.delta ?? 1);

    case 'CLAIM_MISSION': {
      const mission = findMission(action.missionId);
      if (!mission) return state;
      const current = state.missionProgress[action.missionId];
      if (!current) return state;
      const { newProg, gold, orbs } = claimMissionReward(current, mission);
      return {
        ...state,
        gold: state.gold + gold,
        orbs: state.orbs + orbs,
        missionProgress: { ...state.missionProgress, [action.missionId]: newProg },
      };
    }

    case 'RESET_DAILY_MISSIONS': {
      const next: Record<string, MissionProgress> = { ...state.missionProgress };
      for (const m of DAILY_MISSIONS) {
        const current = next[m.id];
        if (!current || shouldResetDaily(current)) {
          next[m.id] = resetDailyProgress();
        }
      }
      return { ...state, missionProgress: next };
    }

    // ----- Donjon / tuto -----
    case 'ADVANCE_TUTO_FLOOR': {
      const newTuto = Math.max(state.tutoFloor, action.floorNum);
      return {
        ...state,
        tutoFloor: newTuto,
        tutoComplete: state.tutoComplete || newTuto >= 5,
      };
    }

    case 'ADVANCE_DUNGEON_FLOOR': {
      const current = state.dungeonProgress[action.dungeonId] ?? 0;
      if (action.floorIdx + 1 <= current) return state;
      return {
        ...state,
        dungeonProgress: {
          ...state.dungeonProgress,
          [action.dungeonId]: action.floorIdx + 1,
        },
      };
    }

    // ----- Combat -----
    case 'INIT_COMBAT': {
      let next = state;

      // Fix : équipe vide + héros offert → on l'ajoute avant le combat
      if (next.team.length === 0 && action.floorConfig.heroGift) {
        const gift = STARTER_HEROES.find(h => h.id === action.floorConfig.heroGift);
        if (gift) {
          next = {
            ...next,
            team: [{ ...gift, level: 1, xp: 0 }],
          };
          next = pushToast(next, `${gift.name} rejoint ton équipe !`);
        }
      }

      if (next.team.length === 0) {
        return pushToast(state, 'Ton équipe est vide !');
      }

      const combat = initCombatLogic(action.floorConfig, next.team, ENEMY_TYPES);
      return {
        ...next,
        combat,
        currentScreen: 'combat',
      };
    }

    case 'COMBAT_SELECT_UNIT': {
      if (!state.combat) return state;
      return { ...state, combat: selectUnit(state.combat, action.unitId) };
    }

    case 'COMBAT_SET_ACTION': {
      if (!state.combat) return state;
      return { ...state, combat: setPendingAction(state.combat, action.action) };
    }

    case 'COMBAT_TILE_CLICK': {
      if (!state.combat || state.combat.phase !== 'elf' || state.combat.isOver) return state;
      const { selectedId, pendingAction, units } = state.combat;
      const { x, y } = action;
      const unitAtTile = units.find(u => u.hp > 0 && u.pos.x === x && u.pos.y === y) ?? null;
      const selUnit = selectedId ? units.find(u => u.instanceId === selectedId) : null;

      // Action en attente
      if (selUnit && pendingAction) {
        let resultCombat: CombatState = state.combat;
        if (pendingAction.type === 'move') {
          resultCombat = moveUnit(state.combat, selUnit.instanceId, x, y).state;
        } else if (pendingAction.type === 'attack' || pendingAction.type === 'spell') {
          if (!unitAtTile) return state;
          resultCombat = attackUnit(
            state.combat,
            selUnit.instanceId,
            x,
            y,
            ABILITIES,
          ).state;
        } else if (pendingAction.type === 'ability') {
          resultCombat = useAbility(
            state.combat,
            selUnit.instanceId,
            pendingAction.abilityId,
            x,
            y,
            ABILITIES,
          ).state;
        }
        return {
          ...state,
          combat: { ...resultCombat, pendingAction: null },
        };
      }

      // Sélection d'unité elfe
      if (unitAtTile && unitAtTile.team === 'elf') {
        return { ...state, combat: selectUnit(state.combat, unitAtTile.instanceId) };
      }
      // Désélection
      return {
        ...state,
        combat: { ...state.combat, selectedId: null, pendingAction: null },
      };
    }

    case 'COMBAT_END_TURN': {
      if (!state.combat) return state;
      const { state: next } = endElfTurn(state.combat, ABILITIES);
      return { ...state, combat: next };
    }

    case 'COMBAT_GRANT_VICTORY': {
      // Applique les récompenses du floor courant
      if (!state.combat) return state;
      const { floorConfig } = state.combat;
      let next: GameState = {
        ...state,
        gold: state.gold + (floorConfig.reward.gold ?? 0),
        orbs: state.orbs + (floorConfig.reward.orbs ?? 0),
      };

      // Héros offert
      if (floorConfig.heroGift) {
        const gift = STARTER_HEROES.find(h => h.id === floorConfig.heroGift);
        if (gift && !isHeroOwned(next, gift.id)) {
          if (next.team.length < 4) {
            next = { ...next, team: [...next.team, { ...gift, level: 1, xp: 0 }] };
          } else {
            next = { ...next, collection: [...next.collection, { ...gift, level: 1, xp: 0 }] };
          }
        }
      }

      // Progression
      if (typeof floorConfig.n === 'number') {
        next = {
          ...next,
          tutoFloor: Math.max(next.tutoFloor, floorConfig.n),
          tutoComplete: next.tutoComplete || floorConfig.n >= 5,
        };
        next = bumpMission(next, 'm1', 1);
        next = bumpMission(next, 'm4', 1);
        next = bumpMission(next, 'm5', 1);
        next = bumpMission(next, 'd1', 1);
      } else if (floorConfig.dungeonId && typeof floorConfig.floorIdx === 'number') {
        const cur = next.dungeonProgress[floorConfig.dungeonId] ?? 0;
        if (floorConfig.floorIdx + 1 > cur) {
          next = {
            ...next,
            dungeonProgress: {
              ...next.dungeonProgress,
              [floorConfig.dungeonId]: floorConfig.floorIdx + 1,
            },
          };
        }
        next = bumpMission(next, 'm1', 1);
        next = bumpMission(next, 'd1', 1);
      }

      return next;
    }

    case 'COMBAT_END':
      return { ...state, combat: null };

    // ----- Toast -----
    case 'SHOW_TOAST':
      return pushToast(state, action.msg);

    case 'HIDE_TOAST':
      return { ...state, toast: null };

    // ----- Persistence -----
    case 'LOAD_STATE':
      return action.state;

    case 'RESET_GAME':
      return { ...initialState };

    default:
      return state;
  }
}
