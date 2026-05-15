/* ============================================
   AELINDRA · Game.tsx
   Composant racine : provider + routeur d'écrans
   ============================================ */

import { GameProvider, useGameState, useDispatch } from './state/GameContext';
import {
  Splash, Dungeons, Gouffre, Combat,
  Market, Guild, Heroes, HeroDetail, Missions,
} from './screens';
import type { ScreenId } from './state/types';
import { TUTO_FLOORS, FLOOR_ENEMY_CONFIGS, POST_DUNGEON_FLOORS } from './data/dungeons';
import type { EquipSlot } from './logic/equipment';

function specToIcon(spec: string | undefined): string {
  switch (spec) {
    case 'guerrier': return 'warrior';
    case 'archer':
    case 'explorer': return 'archer';
    case 'offensive': return 'mage';
    case 'guardian': return 'guardian';
    case 'spy': return 'spy';
    case 'healer': return 'healer';
    case 'monk': return 'monk';
    case 'bard': return 'bard';
    case 'entrave': return 'ensnarer';
    default: return 'warrior';
  }
}

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
      const floors = dungeonId ? POST_DUNGEON_FLOORS[dungeonId] : [];
      const cleared = dungeonId ? (state.dungeonProgress[dungeonId] ?? 0) : 0;
      // Reuse Gouffre layout pour le moment, on ajustera si besoin
      return (
        <Gouffre
          floors={floors?.map((f, i) => ({
            num: String(i + 1),
            depth: f.depth ?? '',
            name: f.name,
            desc: f.desc ?? `${f.enemies?.length ?? 0} ennemis${f.isBoss ? ' · BOSS' : ''}`,
            gift: null,
            state: (i < cleared ? 'done' : i === cleared ? 'current' : 'locked') as 'done' | 'current' | 'locked',
          }))}
          onBack={() => nav('dungeons')}
          onEnterFloor={(floorNumStr: string) => {
            if (!dungeonId) return;
            const floorIdx = parseInt(floorNumStr, 10) - 1;
            const floor = floors?.[floorIdx];
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
          onBack={() => nav('splash')}
          onBuy={(itemName: string) => {
            // Le screen retourne le nom de l'item, on cherche l'id
            // Pour l'instant on suppose qu'on a besoin de chercher dans MARKET_ITEMS
            dispatch({ type: 'BUY_ITEM', itemId: itemName, tab: 'armes' });
          }}
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

    case 'hero-detail':
      // TODO: adapter Hero vers MockHeroDetail (besoin equip/inventory/rangeLabel)
      return (
        <HeroDetail
          onBack={() => nav('heroes')}
          onUnequip={(slot: string) => {
            if (!state.currentHeroDetailId) return;
            dispatch({
              type: 'UNEQUIP_SLOT',
              heroId: state.currentHeroDetailId,
              slot: slot as EquipSlot,
            });
          }}
        />
      );

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
