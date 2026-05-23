export type Side = 'player' | 'ai';
export type LaneIndex = 0 | 1 | 2;

export type CardKind = 'personnage' | 'sortilege';

export interface CardDef {
  id: string;
  name: string;
  kind: CardKind;
  cost: number;
  force?: number;
  text: string;
  lore?: string;
  faction?: 'elfe' | 'humain' | 'nain' | 'neutre';
  rarity?: 'commun' | 'rare' | 'legendaire';
  effect?: SortEffect;
  power?: PerseEffect;
}

export type SortEffect =
  | { type: 'heal'; amount: number }
  | { type: 'buff'; amount: number; targetSelf: true }
  | { type: 'kill_weakest'; lane: 'any' };

export type PerseEffect =
  | { type: 'draw_on_play'; amount: number }
  | { type: 'bonus_when_low_hp'; threshold: number; bonus: number };

export interface CardInstance {
  instId: string;
  defId: string;
  exhausted?: boolean;
  turnsOnBoard: number;
  buff: number;
}

export interface ChampionDef {
  id: string;
  name: string;
  hp: number;
  passive: string;
  portrait?: string;
}

export interface ThreatDef {
  id: string;
  name: string;
  force: number;
  reward: number;
  bonus?: 'draw' | 'energy';
  lore?: string;
}

export interface ThreatInstance {
  instId: string;
  defId: string;
}

export interface PlayerState {
  champion: ChampionDef;
  hp: number;
  energyMax: number;
  energy: number;
  deck: string[];
  hand: CardInstance[];
  discard: string[];
  lanes: [CardInstance[], CardInstance[], CardInstance[]];
  cristaux: number;
}

export type Phase = 'player' | 'ai' | 'resolve' | 'over';

export interface LogEntry {
  turn: number;
  text: string;
}

export interface GameState {
  turn: number;
  phase: Phase;
  active: Side;
  player: PlayerState;
  ai: PlayerState;
  threats: [ThreatInstance | null, ThreatInstance | null];
  winner: Side | null;
  log: LogEntry[];
  pendingTargeting: PendingTargeting | null;
}

export interface PendingTargeting {
  side: Side;
  handInstId: string;
  defId: string;
  needs: 'enemy_lane_card' | 'own_lane_card' | 'lane' | 'threat';
}
