/* ============================================
   AELINDRA · data/dungeons.ts
   Donjons, étages et configurations ennemis
   ============================================ */

import type { Floor, EnemyPlacement, Dungeon } from './types';

// Tailles de grille par catégorie
const GRID_TUTO   = { cols: 3, rows: 8, tile: 72 } as const;
const GRID_STD    = { cols: 4, rows: 7, tile: 54 } as const;
const GRID_SHADOW = { cols: 5, rows: 8, tile: 44 } as const;

export const TUTO_FLOORS: Floor[] = [
  {
    n: 1, name: 'Entrée du Gouffre', depth: '0m',
    desc: 'Rats des cavernes et gobelins. Initiation aux mécaniques de base.',
    enemies: '2× Rat des Cavernes, 1× Gobelin',
    heroGift: 'dain',
    reward: { gold: 30, orbs: 5 },
    gridSize: GRID_TUTO,
  },
  {
    n: 2, name: 'La Galerie Effondrée', depth: '−50m',
    desc: 'Archers gobelins postés en hauteur. La portée est déterminante.',
    enemies: '3× Archer Gobelin',
    heroGift: 'aeris',
    reward: { gold: 40, orbs: 8 },
    gridSize: GRID_TUTO,
  },
  {
    n: 3, name: 'Caverne Enflammée', depth: '−120m',
    desc: 'Golems de glace résistants aux armes physiques. La magie de feu est nécessaire.',
    enemies: '2× Golem de Glace, 1× Troll',
    heroGift: 'sylva',
    reward: { gold: 60, orbs: 10 },
    gridSize: GRID_TUTO,
  },
  {
    n: 4, name: 'Salle du Titan', depth: '−200m',
    desc: "Un Titan brutal. Sans protecteur pour absorber les coups, l'équipe s'effondre.",
    enemies: '1× Titan Souterrain, 2× Serviteurs',
    heroGift: 'borin',
    reward: { gold: 80, orbs: 12 },
    gridSize: GRID_TUTO,
  },
  {
    n: 5, name: 'Cœur des Profondeurs', depth: '−300m',
    desc: 'Le Gardien Abyssal. Utilise les 4 héros en parfaite synergie pour le vaincre.',
    enemies: '1× Gardien Abyssal, 3× Ombres',
    heroGift: null,
    reward: { gold: 150, orbs: 30, special: '+ Accès aventuriers légendaires' },
    isBoss: true,
    gridSize: GRID_SHADOW,
  },
];

export const POST_TUTO_DUNGEONS = [
  {
    id: 'foret',
    name: 'La Forêt Maudite',
    emoji: '🌲',
    desc: 'Ennemis sylvestres. Armes spéciales recommandées.',
    floors: 8,
    unlockAfterFloor: 1,
    reward: 'Or + Équipements',
  },
  {
    id: 'mines',
    name: 'Mines de Fer Noir',
    emoji: '⛏️',
    desc: 'Golems et nains corrompus. Lourde résistance physique.',
    floors: 10,
    unlockAfterFloor: 2,
    reward: 'Or ++ + Objets rares',
  },
  {
    id: 'tour',
    name: 'Tour des Ombres',
    emoji: '🗼',
    desc: 'Nécromanciens et spectres. La magie est clé.',
    floors: 12,
    unlockAfterFloor: 3,
    reward: 'Orbes + Objets épiques',
  },
] as const;

export const FLOOR_ENEMY_CONFIGS: Record<number, EnemyPlacement[]> = {
  1: [{ type: 'rat', pos: { x: 0, y: 0 } }, { type: 'rat', pos: { x: 2, y: 0 } }, { type: 'gobelin', pos: { x: 1, y: 1 } }],
  2: [{ type: 'archer_gob', pos: { x: 0, y: 0 } }, { type: 'archer_gob', pos: { x: 1, y: 0 } }, { type: 'archer_gob', pos: { x: 2, y: 0 } }],
  3: [{ type: 'golem_glace', pos: { x: 0, y: 0 } }, { type: 'golem_glace', pos: { x: 2, y: 0 } }, { type: 'troll', pos: { x: 1, y: 1 } }],
  4: [{ type: 'titan', pos: { x: 1, y: 0 } }, { type: 'serviteur', pos: { x: 0, y: 1 } }, { type: 'serviteur', pos: { x: 2, y: 1 } }],
  5: [{ type: 'gardien', pos: { x: 1, y: 0 } }, { type: 'ombre', pos: { x: 0, y: 0 } }, { type: 'ombre', pos: { x: 2, y: 0 } }, { type: 'ombre', pos: { x: 1, y: 2 } }],
};

export const POST_DUNGEON_FLOORS: Record<string, Floor[]> = {
  foret: [
    {
      id: 'foret_1',
      name: 'Lisière Maudite',
      depth: '-500m',
      dungeonId: 'foret',
      enemies: [
        { type: 'wolf_dark', pos: { x: 0, y: 0 } },
        { type: 'wolf_dark', pos: { x: 2, y: 0 } },
        { type: 'dark_elf', pos: { x: 1, y: 1 } },
      ],
      reward: { gold: 40, orbs: 1, xp: 60 },
      isBoss: false,
      gridSize: GRID_STD,
    },
    {
      id: 'foret_2',
      name: 'Sous-bois Empoisonné',
      depth: '-600m',
      dungeonId: 'foret',
      enemies: [
        { type: 'giant_spider', pos: { x: 0, y: 0 } },
        { type: 'giant_spider', pos: { x: 2, y: 0 } },
        { type: 'corrupt_druid', pos: { x: 1, y: 1 } },
      ],
      reward: { gold: 60, orbs: 1, xp: 80 },
      isBoss: false,
      gridSize: GRID_STD,
    },
    {
      id: 'foret_3',
      name: 'Clairière Noire',
      depth: '-700m',
      dungeonId: 'foret',
      enemies: [
        { type: 'dark_elf', pos: { x: 0, y: 0 } },
        { type: 'dark_elf', pos: { x: 2, y: 0 } },
        { type: 'giant_spider', pos: { x: 1, y: 1 } },
        { type: 'corrupt_druid', pos: { x: 1, y: 2 } },
      ],
      reward: { gold: 80, orbs: 2, xp: 100 },
      isBoss: false,
      gridSize: GRID_STD,
    },
    {
      id: 'foret_4',
      name: 'Trône de la Forêt',
      depth: '-800m',
      dungeonId: 'foret',
      enemies: [
        { type: 'forest_lord', pos: { x: 1, y: 0 } },
        { type: 'wolf_dark', pos: { x: 0, y: 1 } },
        { type: 'wolf_dark', pos: { x: 2, y: 1 } },
      ],
      reward: { gold: 150, orbs: 5, xp: 200 },
      isBoss: true,
      gridSize: GRID_SHADOW,
    },
  ],
  mines: [
    {
      id: 'mines_1',
      name: 'Galerie Effondrée',
      depth: '-800m',
      dungeonId: 'mines',
      enemies: [
        { type: 'mine_spectre', pos: { x: 0, y: 0 } },
        { type: 'mine_spectre', pos: { x: 2, y: 0 } },
        { type: 'iron_golem', pos: { x: 1, y: 1 } },
      ],
      reward: { gold: 70, orbs: 1, xp: 90 },
      isBoss: false,
      gridSize: GRID_STD,
    },
    {
      id: 'mines_2',
      name: 'Forge Abandonnée',
      depth: '-900m',
      dungeonId: 'mines',
      enemies: [
        { type: 'berserk_dwarf', pos: { x: 0, y: 0 } },
        { type: 'berserk_dwarf', pos: { x: 2, y: 0 } },
        { type: 'iron_golem', pos: { x: 1, y: 1 } },
      ],
      reward: { gold: 90, orbs: 2, xp: 110 },
      isBoss: false,
      gridSize: GRID_STD,
    },
    {
      id: 'mines_3',
      name: 'Puits Sans Fond',
      depth: '-1000m',
      dungeonId: 'mines',
      enemies: [
        { type: 'cave_troll', pos: { x: 1, y: 0 } },
        { type: 'berserk_dwarf', pos: { x: 0, y: 1 } },
        { type: 'berserk_dwarf', pos: { x: 2, y: 1 } },
        { type: 'mine_spectre', pos: { x: 1, y: 2 } },
      ],
      reward: { gold: 110, orbs: 2, xp: 130 },
      isBoss: false,
      gridSize: GRID_STD,
    },
    {
      id: 'mines_4',
      name: 'Coeur de la Mine',
      depth: '-1200m',
      dungeonId: 'mines',
      enemies: [
        { type: 'forge_master', pos: { x: 1, y: 0 } },
        { type: 'cave_troll', pos: { x: 0, y: 1 } },
        { type: 'iron_golem', pos: { x: 2, y: 1 } },
      ],
      reward: { gold: 200, orbs: 6, xp: 250 },
      isBoss: true,
      gridSize: GRID_SHADOW,
    },
  ],
  tour: [
    {
      id: 'tour_1',
      name: "Crypte de l'Entrée",
      depth: '-1200m',
      dungeonId: 'tour',
      enemies: [
        { type: 'skeleton', pos: { x: 0, y: 0 } },
        { type: 'skeleton', pos: { x: 1, y: 0 } },
        { type: 'skeleton', pos: { x: 2, y: 0 } },
        { type: 'spectre', pos: { x: 1, y: 1 } },
      ],
      reward: { gold: 80, orbs: 2, xp: 100 },
      isBoss: false,
      gridSize: GRID_SHADOW,
    },
    {
      id: 'tour_2',
      name: 'Salle des Gardiens',
      depth: '-1400m',
      dungeonId: 'tour',
      enemies: [
        { type: 'undead_knight', pos: { x: 0, y: 0 } },
        { type: 'undead_knight', pos: { x: 2, y: 0 } },
        { type: 'banshee', pos: { x: 1, y: 1 } },
      ],
      reward: { gold: 100, orbs: 2, xp: 120 },
      isBoss: false,
      gridSize: GRID_SHADOW,
    },
    {
      id: 'tour_3',
      name: 'Bibliothèque Maudite',
      depth: '-1600m',
      dungeonId: 'tour',
      enemies: [
        { type: 'undead_knight', pos: { x: 1, y: 0 } },
        { type: 'spectre', pos: { x: 0, y: 1 } },
        { type: 'spectre', pos: { x: 2, y: 1 } },
        { type: 'banshee', pos: { x: 1, y: 2 } },
      ],
      reward: { gold: 120, orbs: 3, xp: 150 },
      isBoss: false,
      gridSize: GRID_SHADOW,
    },
    {
      id: 'tour_4',
      name: 'Chambre des Rites',
      depth: '-1800m',
      dungeonId: 'tour',
      enemies: [
        { type: 'banshee', pos: { x: 1, y: 0 } },
        { type: 'banshee', pos: { x: 5, y: 0 } },
        { type: 'undead_knight', pos: { x: 2, y: 1 } },
        { type: 'undead_knight', pos: { x: 4, y: 1 } },
      ],
      reward: { gold: 150, orbs: 3, xp: 180 },
      isBoss: false,
      gridSize: GRID_SHADOW,
    },
    {
      id: 'tour_5',
      name: 'Sanctuaire de la Liche',
      depth: '-2000m',
      dungeonId: 'tour',
      enemies: [
        { type: 'lich', pos: { x: 3, y: 1 } },
        { type: 'banshee', pos: { x: 5, y: 0 } },
        { type: 'spectre', pos: { x: 1, y: 1 } },
        { type: 'spectre', pos: { x: 5, y: 2 } },
      ],
      reward: { gold: 300, orbs: 10, xp: 400 },
      isBoss: true,
      gridSize: GRID_SHADOW,
    },
  ],
};

export const DUNGEONS_META: Dungeon[] = [
  {
    id: 'foret',
    name: 'Forêt Maudite',
    icon: '🌲',
    levels: 4,
    minTeamLevel: 3,
    depth: '-500m à -800m',
    description: 'Une forêt corrompue par une magie ancienne. Ennemis sylvestres et créatures maléfiques de la nature.',
  },
  {
    id: 'mines',
    name: 'Mines de Fer Noir',
    icon: '⛏️',
    levels: 4,
    minTeamLevel: 6,
    depth: '-800m à -1200m',
    description: 'Des mines abandonnées hantées par leurs anciens ouvriers et golems défaillants.',
  },
  {
    id: 'tour',
    name: 'Tour des Ombres',
    icon: '🗼',
    levels: 5,
    minTeamLevel: 10,
    depth: '-1200m à -2000m',
    description: 'Une tour millénaire où règne une liche immortelle, gardée par des légions de morts-vivants.',
  },
];
