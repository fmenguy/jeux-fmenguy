/* ============================================
   AELINDRA · Game.tsx
   Composant racine : provider + routeur d'écrans
   ============================================ */

import { GameProvider, useGameState, useDispatch } from './state/GameContext';
import {
  Splash, Dungeons, Gouffre, Combat,
  Market, Guild, Heroes, HeroDetail, Missions,
  DungeonFloors,
} from './screens';
import type { ScreenId } from './state/types';
import { TUTO_FLOORS, FLOOR_ENEMY_CONFIGS, POST_DUNGEON_FLOORS, DUNGEONS_META } from './data/dungeons';
import { MARKET_ITEMS } from './data/items';
import type { EquipSlot } from './logic/equipment';
import { specToIcon } from './components/specToIcon';

function GameRouter() {
  const state = useGameState();
  const dispatch = useDispatch();
  const { currentScreen } = state;

  const nav = (screen: ScreenId) => dispatch({ type: 'NAVIGATE', screen });

  // Adapte Hero[] vers le shape attendu par les composants UI
  const teamForUi = state.team.map(h => ({
    id: h.id,
    name: h.name,
    icon: specToIcon(h.spec),
    rarity: h.rarity,
    lv: h.level ?? 1,
    hp: { c: h.baseStats?.hp ?? 100, m: h.baseStats?.hp ?? 100 },
    mp: { c: h.baseStats?.mp ?? 30,  m: h.baseStats?.mp ?? 30  },
    class: h.class,
    race: h.race,
  }));

  switch (currentScreen) {
    case 'splash':
      return (
        <Splash
          heroes={teamForUi}
          playerName={state.playerName}
          playerInitial={state.playerName[0]?.toUpperCase() ?? 'A'}
          gold={state.gold}
          orbs={state.orbs}
          onNavigate={(screen) => nav(screen as ScreenId)}
        />
      );

    case 'dungeons':
      return (
        <Dungeons
          gold={state.gold}
          onBack={() => nav('splash')}
          onEnterDungeon={(dungeonName: string) => {
            // Le tuto s'identifie par son nom contenant "Gouffre"
            if (dungeonName.toLowerCase().includes('gouffre')) {
              nav('gouffre');
            } else {
              // Sinon trouve l'id du donjon par nom
              const lower = dungeonName.toLowerCase();
              const id = lower.includes('foret') || lower.includes('forêt') ? 'foret'
                       : lower.includes('mines') ? 'mines'
                       : lower.includes('tour')  ? 'tour'
                       : null;
              if (id) dispatch({ type: 'OPEN_DUNGEON', dungeonId: id });
            }
          }}
        />
      );

    case 'gouffre':
      return (
        <Gouffre
          onBack={() => nav('dungeons')}
          onEnterFloor={(floorNumStr: string) => {
            const floorNum = parseInt(floorNumStr, 10);
            const floor = TUTO_FLOORS[floorNum - 1];
            if (!floor) return;
            const enemies = FLOOR_ENEMY_CONFIGS[floorNum] ?? [];
            dispatch({
              type: 'INIT_COMBAT',
              floorConfig: { ...floor, enemies, isBoss: floor.isBoss ?? false },
            });
          }}
        />
      );

    case 'dungeon-floors': {
      const dungeonId = state.currentDungeonId;
      if (!dungeonId) return <Splash onNavigate={(s) => nav(s as ScreenId)} />;
      const meta = DUNGEONS_META.find(m => m.id === dungeonId);
      const floors = POST_DUNGEON_FLOORS[dungeonId] ?? [];
      const cleared = state.dungeonProgress[dungeonId] ?? 0;
      return (
        <DungeonFloors
          dungeonId={dungeonId}
          dungeonName={meta?.name}
          dungeonDescription={meta?.description}
          dungeonDepth={meta?.depth}
          floors={floors}
          cleared={cleared}
          onBack={() => nav('dungeons')}
          onEnterFloor={(floorIdx) => {
            const floor = floors[floorIdx];
            if (!floor) return;
            dispatch({
              type: 'INIT_COMBAT',
              floorConfig: { ...floor, dungeonId, floorIdx },
            });
          }}
        />
      );
    }

    case 'combat':
      return (
        <Combat
          cols={state.combat?.gridCols ?? 3}
          rows={state.combat?.gridRows ?? 8}
          tileSize={state.combat?.floorConfig?.gridSize?.tile ?? 72}
          onEnd={() => dispatch({ type: 'COMBAT_END' })}
        />
      );

    case 'market':
      return (
        <Market
          gold={state.gold}
          items={MARKET_ITEMS}
          inventory={state.inventory}
          onBack={() => nav('splash')}
          onBuy={(itemId, tab) => dispatch({ type: 'BUY_ITEM', itemId, tab })}
        />
      );

    case 'guild':
      return (
        <Guild
          orbs={state.orbs}
          pityCount={state.pity}
          onBack={() => nav('splash')}
          onPull1={() => dispatch({ type: 'PERFORM_PULLS', count: 1 })}
          onPull10={() => dispatch({ type: 'PERFORM_PULLS', count: 10 })}
        />
      );

    case 'heroes':
      return (
        <Heroes
          heroes={teamForUi}
          onBack={() => nav('splash')}
          onSelectHero={(heroId: string) =>
            dispatch({ type: 'OPEN_HERO_DETAIL', heroId })
          }
        />
      );

    case 'hero-detail': {
      const heroDetailId = state.currentHeroDetailId;
      const heroDetail =
        state.team.find(h => h.id === heroDetailId) ??
        state.collection.find(h => h.id === heroDetailId);
      const allItems = [
        ...MARKET_ITEMS.armes,
        ...MARKET_ITEMS.armures,
        ...MARKET_ITEMS.potions,
      ];
      return (
        <HeroDetail
          hero={heroDetail}
          inventory={state.inventory}
          allItems={allItems}
          onBack={() => nav('heroes')}
          onEquip={(itemId) => {
            if (!heroDetailId) return;
            dispatch({ type: 'EQUIP_ITEM', heroId: heroDetailId, itemId });
          }}
          onUnequip={(slot: EquipSlot) => {
            if (!heroDetailId) return;
            dispatch({ type: 'UNEQUIP_SLOT', heroId: heroDetailId, slot });
          }}
        />
      );
    }

    case 'missions':
      return (
        <Missions
          onBack={() => nav('splash')}
          onClaim={(missionName: string) =>
            dispatch({ type: 'CLAIM_MISSION', missionId: missionName })
          }
        />
      );

    default:
      return <Splash onNavigate={(s) => nav(s as ScreenId)} />;
  }
}

export function Game() {
  return (
    <GameProvider>
      <GameRouter />
    </GameProvider>
  );
}
