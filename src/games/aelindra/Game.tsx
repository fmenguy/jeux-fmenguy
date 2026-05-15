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
import { TUTO_FLOORS, FLOOR_ENEMY_CONFIGS, POST_DUNGEON_FLOORS, POST_TUTO_DUNGEONS, DUNGEONS_META } from './data/dungeons';
import { MARKET_ITEMS } from './data/items';
import { STARTER_HEROES } from './data/heroes';
import { MAIN_MISSIONS, DAILY_MISSIONS } from './data/missions';
import type { EquipSlot } from './logic/equipment';
import { specToIcon } from './components/specToIcon';

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
function toRoman(n: number): string { return ROMAN[n - 1] ?? String(n); }

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

    case 'dungeons': {
      // Construit la liste : Gouffre tuto + 3 donjons post-tuto avec leur état réel
      const tutoState = state.tutoFloor === 0 ? 'tut' : state.tutoFloor >= 5 ? 'tut' : 'tut';
      const dungeonsList = [
        {
          name: 'Le Gouffre des Origines',
          desc: 'Cinq paliers dans les profondeurs. Un héros offert à chaque descente.',
          tag: 'tag-tuto',
          tagText: 'TUTORIEL',
          new: state.tutoFloor === 0,
          icon: 'dungeon',
          floor: state.tutoFloor >= 5 ? 'Complété' : `Palier ${state.tutoFloor}/5`,
          state: tutoState as 'tut' | 'open' | 'locked',
        },
        ...POST_TUTO_DUNGEONS.map(d => {
          const locked = state.tutoFloor < d.unlockAfterFloor;
          const cleared = state.dungeonProgress[d.id] ?? 0;
          const meta = DUNGEONS_META.find(m => m.id === d.id);
          const total = meta?.levels ?? d.floors;
          return {
            name: d.name,
            desc: d.desc,
            tag: locked ? 'tag-locked' : 'tag-floor',
            tagText: locked ? 'VERROUILLÉ' : `${total} ÉTAGES`,
            new: false,
            icon: 'rune',
            floor: locked ? '—' : `${cleared} / ${total}`,
            state: (locked ? 'locked' : 'open') as 'tut' | 'open' | 'locked',
          };
        }),
      ];
      return (
        <Dungeons
          dungeons={dungeonsList}
          gold={state.gold}
          onBack={() => nav('splash')}
          onEnterDungeon={(dungeonName: string) => {
            if (dungeonName.toLowerCase().includes('gouffre')) {
              nav('gouffre');
            } else {
              const lower = dungeonName.toLowerCase();
              const id = lower.includes('forêt') || lower.includes('foret') ? 'foret'
                       : lower.includes('mines') ? 'mines'
                       : lower.includes('tour')  ? 'tour'
                       : null;
              if (id) dispatch({ type: 'OPEN_DUNGEON', dungeonId: id });
            }
          }}
        />
      );
    }

    case 'gouffre': {
      // Construit les FloorEntry à partir des vraies données + état de progression
      const tutoFloors = TUTO_FLOORS.map((f, i) => {
        const floorNum = i + 1;
        const cleared = state.tutoFloor;
        const giftHero = f.heroGift ? STARTER_HEROES.find(h => h.id === f.heroGift) : null;
        return {
          num: toRoman(floorNum),
          depth: f.depth ?? '',
          name: f.name,
          desc: f.desc ?? '',
          gift: giftHero ? `${giftHero.name} · ${giftHero.class} ${giftHero.race}` : null,
          state: (floorNum <= cleared ? 'done'
                : floorNum === cleared + 1 ? 'current'
                : 'locked') as 'done' | 'current' | 'locked',
        };
      });
      return (
        <Gouffre
          floors={tutoFloors}
          onBack={() => nav('dungeons')}
          onEnterFloor={(floorNumStr: string) => {
            // floorNumStr peut être romain ou décimal selon le composant
            const roman = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
            const idx = roman.indexOf(floorNumStr);
            const floorNum = idx >= 0 ? idx + 1 : parseInt(floorNumStr, 10);
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
    }

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

    case 'missions': {
      // Construit les listes de missions à partir du store
      const buildEntry = (m: typeof MAIN_MISSIONS[number]) => {
        const prog = state.missionProgress[m.id] ?? { progress: 0, done: false, claimed: false };
        const reward = m.reward.gold
          ? `${m.reward.gold} or${m.reward.orbs ? ` + ${m.reward.orbs} orbes` : ''}`
          : m.reward.orbs ? `${m.reward.orbs} orbes` : '—';
        return {
          name: m.name,
          reward,
          rewardBonus: m.bonusLabel ?? undefined,
          desc: m.desc,
          progress: Math.min(1, prog.progress / m.total),
          current: prog.progress,
          total: m.total,
          state: (prog.claimed ? 'claimed' : prog.done ? 'claimable' : 'active') as 'claimable' | 'claimed' | 'active',
        };
      };
      return (
        <Missions
          mainMissions={MAIN_MISSIONS.map(buildEntry)}
          dailyMissions={DAILY_MISSIONS.map(buildEntry)}
          onBack={() => nav('splash')}
          onClaim={(missionName: string) => {
            // Le composant retourne le nom, on cherche l'id
            const all = [...MAIN_MISSIONS, ...DAILY_MISSIONS];
            const mission = all.find(m => m.name === missionName);
            if (mission) dispatch({ type: 'CLAIM_MISSION', missionId: mission.id });
          }}
        />
      );
    }

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
