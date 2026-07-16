export type Side = 'player' | 'ai';
export type LaneIndex = 0 | 1 | 2;
export type SlotIndex = 0 | 1 | 2;

export type ClasseId = 'sylvestre' | 'arcanique' | 'rempart';
export type FactionId = 'elfe' | 'nain' | 'humain' | 'neutre';
export type WorldId = 'achronia' | 'terrania' | 'sandara';

export interface WorldDef {
  id: WorldId;
  name: string;
  glyph: string;
  tagline: string;
  /** Modificateur sur les soins de la phase Magie (les deux camps). */
  healMod: number;
  /** Surcoût en Gemmes des sortilèges (monde sans magie). */
  sortCostMod: number;
  /** Bonus accordé à une faction "chez elle" sur ce monde. */
  factionBonus: { faction: FactionId; atq: number; pv: number };
  effectsText: string[];
}

export interface ClasseDef {
  id: ClasseId;
  name: string;
  short: string;
  glyph: string;
  color: string;
  laneIndex: LaneIndex;
  description: string;
}

export interface FactionDef {
  id: FactionId;
  name: string;
  glyph: string;
  description: string;
}

export type EffectTrigger =
  | 'on_play'
  | 'on_death'
  | 'phase_tir'
  | 'phase_magie'
  | 'phase_garde'
  | 'passive';

export type EffectKind =
  | { kind: 'tir' }
  | { kind: 'garde' }
  | { kind: 'soin_champion'; amount: number }
  | { kind: 'pa_bonus_perm'; amount: number }
  | { kind: 'pa_malus_perm'; amount: number }
  | { kind: 'draw_on_play'; amount: number }
  | { kind: 'bonus_atq_low_hp'; threshold: number; bonus: number }
  | { kind: 'charge' }
  | { kind: 'riposte' }
  | { kind: 'regen'; amount: number }
  | { kind: 'pierce'; amount: number }
  | { kind: 'double_strike' };

export interface CardEffect {
  trigger: EffectTrigger;
  effect: EffectKind;
}

export type CardKind = 'personnage' | 'sortilege';
export type Rarity = 'commune' | 'rare' | 'epique' | 'legendaire';
export type Saga = 'tome1' | 'tome2';

export interface CardDef {
  id: string;
  name: string;
  kind: CardKind;
  classe?: ClasseId;
  faction?: FactionId;
  cost: number;
  atq?: number;
  pv?: number;
  paBonus?: number;
  effects?: CardEffect[];
  sortilege?: SortilegeEffect;
  tags?: string[];
  rarity: Rarity;
  saga?: Saga;
  art?: string;
  glyph?: string;
  text: string;
  lore?: string;
}

export type SortilegeEffect =
  | { kind: 'heal_champion'; amount: number }
  | { kind: 'damage_lane'; amount: number }
  | { kind: 'buff_atq_lane'; amount: number }
  | { kind: 'kill_target' }
  | { kind: 'damage_champion'; amount: number }
  | { kind: 'draw_cards'; amount: number }
  | { kind: 'gain_pa_max'; amount: number };

export interface CardInstance {
  instId: string;
  defId: string;
  pv: number;
  pvMax: number;
  atq: number;
  paBonus: number;
  turnsOnBoard: number;
  exhausted: boolean;
  buffs: { atq: number; pv: number };
  tagsExtra: string[];
}

export interface SynergyDef {
  id: string;
  name: string;
  on: { kind: 'faction' | 'classe' | 'tag' | 'trinity'; value: string };
  thresholds: SynergyThreshold[];
  description: string;
}

export interface SynergyThreshold {
  count: number;
  text: string;
  apply: SynergyApply;
}

export type SynergyApply =
  | { kind: 'atq_bonus_to_matching'; amount: number }
  | { kind: 'pv_bonus_to_matching'; amount: number }
  | { kind: 'pa_bonus'; amount: number }
  | { kind: 'champion_pv_bonus'; amount: number }
  | { kind: 'champion_heal_on_round'; amount: number }
  | { kind: 'garde_to_matching' }
  | { kind: 'unlock_elite_card'; cardId: string };

export interface ActiveSynergy {
  synergyId: string;
  threshold: number;
  applied: SynergyApply;
}

export interface ChampionDef {
  id: string;
  name: string;
  hp: number;
  passive: string;
  difficulty: 'facile' | 'medium' | 'difficile';
}

/** Profil de comportement pour l'IA d'un adversaire. */
export interface AiProfile {
  /** Score minimal d'une cible pour dépenser une Embuscade. */
  killScoreMin: number;
  /** Seuil de PV sous lequel l'IA cherche à se soigner. */
  healBelow: number;
  /** Taille de main visée en début de tour. */
  handLimit: number;
  /** L'IA place ses gardes face aux Marches menaçantes. */
  smartPlacement: boolean;
}

export interface PlayerState {
  champion: ChampionDef;
  hp: number;
  hpMax: number;
  paMax: number;
  pa: number;
  /** Bonus permanent de Gemmes max acquis via sortilèges. */
  paMaxBonus: number;
  deck: string[];
  hand: CardInstance[];
  discard: string[];
  lanes: LaneSlots;
  activeSynergies: ActiveSynergy[];
  unlockedElites: string[];
}

export type LaneSlots = [
  [CardInstance | null, CardInstance | null, CardInstance | null],
  [CardInstance | null, CardInstance | null, CardInstance | null],
  [CardInstance | null, CardInstance | null, CardInstance | null],
];

export type Phase = 'player' | 'ai' | 'resolve' | 'over';

export interface LogEntry {
  turn: number;
  phase?: string;
  text: string;
}

export interface PendingSelection {
  handInstId: string;
  defId: string;
  needs: 'lane_slot';
  classe: ClasseId;
}

export interface GameState {
  turn: number;
  phase: Phase;
  active: Side;
  world: WorldId;
  player: PlayerState;
  ai: PlayerState;
  winner: Side | null;
  log: LogEntry[];
  pendingSelection: PendingSelection | null;
}
