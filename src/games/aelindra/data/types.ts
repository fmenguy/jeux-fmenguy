/* ============================================
   AELINDRA · data/types.ts
   Toutes les interfaces TypeScript du jeu
   ============================================ */

export type Rarity = 'common' | 'rare' | 'epic' | 'legendary';

export type Spec =
  | 'guerrier'
  | 'archer'
  | 'offensive'
  | 'guardian'
  | 'spy'
  | 'healer'
  | 'explorer'
  | 'bard'
  | 'entrave'
  | 'monk';

export interface Stats {
  hp: number;
  mp: number;
  atk: number;
  mag: number;
  def: number;
  res: number;
  vit: number;
  crit: number;
  range?: number;
}

export interface Growth {
  hp: number;
  mp: number;
  atk: number;
  mag: number;
  def: number;
  res: number;
  vit: number;
  crit: number;
}

export interface Weapon {
  id: string;
  name: string;
  emoji: string;
  atk?: number;
  mag?: number;
  defBonus?: number;
  atkBonus?: number;
  range?: number;
  twoHand?: boolean;
  minRange?: number;
  type?: string;
  ammo?: number;
}

export interface Item {
  id: string;
  name: string;
  emoji: string;
  type: string;
  rarity: Rarity;
  stat: string;
  price: number;
  twoHand?: boolean;
  requiresAmmo?: boolean;
  isAmmo?: boolean;
}

export interface EquippedSlots {
  head: string | null;
  body: string | null;
  weapon: string | null;
  offhand: string | null;
}

export interface Hero {
  id: string;
  name: string;
  race: string;
  class: string;
  spec: Spec;
  rarity: Rarity;
  emoji: string;
  imagePath: string;
  desc: string;
  baseStats: Stats;
  growth: Growth;
  weapon: Weapon;
  offhand?: Weapon;
  equipped: EquippedSlots;
  abilities: string[];
  level?: number;
  xp?: number;
  weight?: number;
}

export interface Enemy {
  id?: string;
  name: string;
  emoji: string;
  hp: number;
  atk: number;
  def: number;
  mag?: number;
  res?: number;
  range: number;
  ap: number;
  xpReward: number;
  isBoss?: boolean;
  tags?: string[];
  resistance?: string;
}

export interface Ability {
  id?: string;
  name: string;
  icon: string;
  desc: string;
  tags: string[];
  lvlReq: number;
  apCost: number;
  mpCost?: number;
}

export interface GridSize {
  cols: number;
  rows: number;
  tile: number;
}

export interface EnemyPlacement {
  type: string;
  pos: { x: number; y: number };
}

export interface FloorReward {
  gold?: number;
  orbs?: number;
  xp?: number;
  special?: string;
}

export interface Floor {
  id?: string;
  n?: number;
  name: string;
  depth: string;
  desc?: string;
  enemies: string | EnemyPlacement[];
  reward: FloorReward;
  heroGift?: string | null;
  isBoss?: boolean;
  dungeonId?: string;
  floorIdx?: number;
  gridSize?: GridSize;
}

export interface Dungeon {
  id: string;
  name: string;
  icon: string;
  levels: number;
  minTeamLevel: number;
  depth: string;
  description: string;
}

export interface MissionReward {
  orbs?: number;
  gold?: number;
  xp?: number;
}

export interface Mission {
  id: string;
  name: string;
  desc: string;
  reward: MissionReward;
  total: number;
  bonusLabel?: string | null;
}
