import type {
  CardDef,
  CardInstance,
  ClasseId,
  GameState,
  LaneIndex,
  LaneSlots,
  PlayerState,
  Side,
  SlotIndex,
} from '../state/types';
import { CARD_INDEX, CARDS } from '../data/cards';
import { CHAMPIONS } from '../data/champions';
import { CLASSES, LANE_TO_CLASSE } from '../data/classes';
import {
  hasCharge,
  hasDoubleStrike,
  hasGarde,
  hasRiposte,
  paBonusOfBoard,
  passiveValue,
  pierceValue,
  effectsByTrigger,
} from './effects';
import { buildDeckFromCollection } from '../data/collection';
import {
  computeActiveSynergies,
  refreshSynergies,
  synergyAtqBonus,
  synergyChampionPvBonus,
  synergyHasGarde,
  synergyPaBonus,
  synergyPvBonus,
} from './synergies';

const HAND_LIMIT = 5;
const PA_CAP = 8;
const STARTING_HP = 25;
const HP_CAP = 40;

let _seq = 0;
function nextId(prefix: string): string {
  _seq += 1;
  return `${prefix}_${_seq}`;
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const AI_STARTER_DECK: string[] = [
  'syl_eclaireur', 'syl_eclaireur', 'syl_archer', 'syl_archer_exp',
  'syl_chasseresse', 'syl_rodeur', 'syl_druide',
  'arc_novice', 'arc_apprenti', 'arc_sentinelle', 'arc_erudit',
  'arc_meditant', 'arc_runiste_nain',
  'rem_milicien', 'rem_garde_nain', 'rem_sentinelle_elfe', 'rem_marteau',
  'rem_maraudeur',
  'sort_souffle', 'sort_volee', 'sort_runes',
];

export function buildAiStarterDeck(): string[] {
  return shuffle(AI_STARTER_DECK);
}

export function buildPlayerDeck(): string[] {
  const fromColl = buildDeckFromCollection(28);
  if (fromColl.length >= 12) return shuffle(fromColl);
  return shuffle(AI_STARTER_DECK);
}

export function buildStarterDeck(): string[] {
  return buildAiStarterDeck();
}

function emptyLanes(): LaneSlots {
  return [
    [null, null, null],
    [null, null, null],
    [null, null, null],
  ];
}

function makePlayerState(championId: string, isPlayer: boolean): PlayerState {
  const champion = CHAMPIONS[championId];
  return {
    champion,
    hp: STARTING_HP,
    hpMax: STARTING_HP,
    paMax: 1,
    pa: 1,
    deck: isPlayer ? buildPlayerDeck() : buildAiStarterDeck(),
    hand: [],
    discard: [],
    lanes: emptyLanes(),
    activeSynergies: [],
    unlockedElites: [],
  };
}

export function createInitialState(opponentId: string = 'sylvie'): GameState {
  const player = makePlayerState('joueur', true);
  const ai = makePlayerState(opponentId, false);
  const state: GameState = {
    turn: 1,
    phase: 'player',
    active: 'player',
    player,
    ai,
    winner: null,
    log: [{ turn: 0, text: 'Achrogemme · une partie commence. Les Gemmes s\'éveillent.' }],
    pendingSelection: null,
  };
  drawTo(state.player, HAND_LIMIT);
  drawTo(state.ai, HAND_LIMIT);
  refreshSynergies(state);
  return state;
}

export function drawTo(p: PlayerState, limit: number) {
  while (p.hand.length < limit) {
    if (p.deck.length === 0) {
      if (p.discard.length === 0) return;
      p.deck = shuffle(p.discard);
      p.discard = [];
    }
    const defId = p.deck.shift()!;
    const def = CARD_INDEX[defId];
    if (!def) continue;
    p.hand.push(makeInstance(def));
  }
}

function makeInstance(def: CardDef): CardInstance {
  return {
    instId: nextId('c'),
    defId: def.id,
    pv: def.pv ?? 0,
    pvMax: def.pv ?? 0,
    atq: def.atq ?? 0,
    paBonus: def.paBonus ?? 0,
    turnsOnBoard: 0,
    exhausted: false,
    buffs: { atq: 0, pv: 0 },
    tagsExtra: [],
  };
}

export function allowedLane(def: CardDef): LaneIndex | null {
  if (def.kind !== 'personnage' || !def.classe) return null;
  return CLASSES[def.classe].laneIndex;
}

export function findEmptySlot(lane: [CardInstance | null, CardInstance | null, CardInstance | null]): SlotIndex | null {
  for (let s = 0; s < 3; s += 1) {
    if (lane[s] === null) return s as SlotIndex;
  }
  return null;
}

export interface PlayResult { ok: boolean; reason?: string; }

export function playCharacter(
  state: GameState,
  side: Side,
  handInstId: string,
  slot: SlotIndex,
): PlayResult {
  const p = state[side];
  const card = p.hand.find((c) => c.instId === handInstId);
  if (!card) return { ok: false, reason: 'Carte introuvable.' };
  const def = CARD_INDEX[card.defId];
  if (!def || def.kind !== 'personnage' || !def.classe) return { ok: false, reason: 'Pas un personnage.' };
  const lane = allowedLane(def);
  if (lane === null) return { ok: false, reason: 'Pas de Marche valide.' };
  if (p.pa < def.cost) return { ok: false, reason: 'Pas assez de Gemmes.' };
  if (p.lanes[lane][slot] !== null) return { ok: false, reason: 'Slot occupé.' };

  p.pa -= def.cost;
  p.hand = p.hand.filter((c) => c.instId !== handInstId);
  card.turnsOnBoard = 0;
  p.lanes[lane][slot] = card;

  for (const e of effectsByTrigger(card, 'on_play')) {
    if (e.kind === 'draw_on_play') {
      drawTo(p, p.hand.length + e.amount);
    }
  }

  refreshSynergies(state);
  recomputePaMax(state, side);
  pushLog(state, `${labelSide(side)} pose ${def.name} en ${CLASSES[def.classe].name} (slot ${slot + 1}).`, 'pose');
  return { ok: true };
}

export function playSortilege(
  state: GameState,
  side: Side,
  handInstId: string,
  target?: { kind: 'enemy_unit'; lane: LaneIndex; slot: SlotIndex } | { kind: 'enemy_lane'; lane: LaneIndex } | { kind: 'own_lane'; lane: LaneIndex },
): PlayResult {
  const p = state[side];
  const opp = state[other(side)];
  const card = p.hand.find((c) => c.instId === handInstId);
  if (!card) return { ok: false, reason: 'Carte introuvable.' };
  const def = CARD_INDEX[card.defId];
  if (!def || def.kind !== 'sortilege' || !def.sortilege) return { ok: false, reason: 'Pas un sortilège.' };
  if (p.pa < def.cost) return { ok: false, reason: 'Pas assez de Gemmes.' };

  const eff = def.sortilege;
  if (eff.kind === 'heal_champion') {
    p.hp = Math.min(p.hpMax, p.hp + eff.amount);
    pushLog(state, `${labelSide(side)} lance ${def.name} (+${eff.amount} PV).`, 'sort');
  } else if (eff.kind === 'kill_target') {
    if (!target || target.kind !== 'enemy_unit') return { ok: false, reason: 'Cible une unité adverse.' };
    const victim = opp.lanes[target.lane][target.slot];
    if (!victim) return { ok: false, reason: 'Slot vide.' };
    killUnit(state, other(side), target.lane, target.slot);
    pushLog(state, `${labelSide(side)} lance ${def.name} : ${CARD_INDEX[victim.defId]?.name} détruit.`, 'sort');
  } else if (eff.kind === 'damage_lane') {
    if (!target || target.kind !== 'enemy_lane') return { ok: false, reason: 'Cible une Marche adverse.' };
    const lane = opp.lanes[target.lane];
    for (let s = 0 as SlotIndex; s < 3; s = (s + 1) as SlotIndex) {
      const u = lane[s];
      if (!u) continue;
      u.pv -= eff.amount;
      if (u.pv <= 0) killUnit(state, other(side), target.lane, s);
    }
    pushLog(state, `${labelSide(side)} lance ${def.name} sur Marche adverse.`, 'sort');
  } else if (eff.kind === 'damage_champion') {
    applyDamageToChampion(state, other(side), eff.amount);
    pushLog(state, `${labelSide(side)} lance ${def.name} (${eff.amount} dégâts directs au Champion adverse).`, 'sort');
  } else if (eff.kind === 'buff_atq_lane') {
    if (!target || target.kind !== 'own_lane') return { ok: false, reason: 'Cible une de tes Marches.' };
    for (const u of p.lanes[target.lane]) {
      if (u) u.buffs.atq += eff.amount;
    }
    pushLog(state, `${labelSide(side)} lance ${def.name} (+${eff.amount} ATQ).`, 'sort');
  }

  p.pa -= def.cost;
  p.hand = p.hand.filter((c) => c.instId !== handInstId);
  p.discard.push(def.id);
  refreshSynergies(state);
  return { ok: true };
}

function killUnit(state: GameState, side: Side, lane: LaneIndex, slot: SlotIndex) {
  const p = state[side];
  const u = p.lanes[lane][slot];
  if (!u) return;
  p.discard.push(u.defId);
  p.lanes[lane][slot] = null;
  refreshSynergies(state);
  recomputePaMax(state, side);
}

function allBoardUnits(p: PlayerState): CardInstance[] {
  const out: CardInstance[] = [];
  for (let l = 0; l < 3; l += 1) {
    for (let s = 0; s < 3; s += 1) {
      const c = p.lanes[l][s];
      if (c) out.push(c);
    }
  }
  return out;
}

export function effectiveAtq(unit: CardInstance, side: PlayerState, lowHpBonus = true): number {
  const def = CARD_INDEX[unit.defId];
  if (!def) return 0;
  let a = unit.atq + unit.buffs.atq + synergyAtqBonus(side, unit);
  if (lowHpBonus) {
    for (const e of (def.effects ?? [])) {
      if (e.trigger === 'passive' && e.effect.kind === 'bonus_atq_low_hp' && side.hp < e.effect.threshold) {
        a += e.effect.bonus;
      }
    }
  }
  return Math.max(0, a);
}

export function effectivePvMax(unit: CardInstance, side: PlayerState): number {
  return unit.pvMax + unit.buffs.pv + synergyPvBonus(side, unit);
}

export function effectivePv(unit: CardInstance, side: PlayerState): number {
  return unit.pv + unit.buffs.pv + synergyPvBonus(side, unit);
}

export function hasEffectiveGarde(unit: CardInstance, side: PlayerState): boolean {
  return hasGarde(unit) || synergyHasGarde(side, unit);
}

function recomputePaMax(state: GameState, side: Side) {
  const p = state[side];
  const board = allBoardUnits(p);
  const base = Math.min(PA_CAP, state.turn);
  const boardMod = paBonusOfBoard(board);
  const synMod = synergyPaBonus(p);
  p.paMax = Math.max(1, Math.min(PA_CAP, base + boardMod + synMod));
  if (p.pa > p.paMax) p.pa = p.paMax;
}

function applyChampionPvBonusFromSynergies(state: GameState) {
  for (const side of ['player', 'ai'] as Side[]) {
    const p = state[side];
    const bonus = synergyChampionPvBonus(p);
    const newMax = STARTING_HP + bonus;
    const delta = newMax - p.hpMax;
    p.hpMax = newMax;
    if (delta > 0) p.hp = Math.min(p.hpMax, p.hp + delta);
  }
}

export function resolveCombat(state: GameState) {
  for (const side of ['player', 'ai'] as Side[]) {
    const piercing = sumPierceDamage(state[side]);
    if (piercing > 0) {
      applyDamageToChampion(state, other(side), piercing);
      pushLog(state, `Phase Tir · ${labelSide(side)} : ${piercing} dégât${piercing > 1 ? 's' : ''} de perce direct${piercing > 1 ? 's' : ''} au Champion adverse.`, 'tir');
    }
  }

  for (let l = 0 as LaneIndex; l < 3; l = (l + 1) as LaneIndex) {
    resolveLaneCombat(state, l);
  }

  for (const side of ['player', 'ai'] as Side[]) {
    let healed = 0;
    let regenLog: string[] = [];
    for (const u of allBoardUnits(state[side])) {
      for (const e of effectsByTrigger(u, 'phase_magie')) {
        if (e.kind === 'soin_champion') healed += e.amount;
        if (e.kind === 'regen') {
          const cap = effectivePvMax(u, state[side]);
          if (u.pv < cap) {
            u.pv = Math.min(cap, u.pv + e.amount);
            regenLog.push(`${CARD_INDEX[u.defId]?.name} régénère ${e.amount}`);
          }
        }
      }
    }
    if (healed > 0) {
      state[side].hp = Math.min(state[side].hpMax, state[side].hp + healed);
      pushLog(state, `Phase Magie · ${labelSide(side)} : Champion +${healed} PV.`, 'magie');
    }
    if (regenLog.length > 0) {
      pushLog(state, `Phase Magie · ${labelSide(side)} : ${regenLog.join(', ')}.`, 'magie');
    }
  }

  for (const side of ['player', 'ai'] as Side[]) {
    for (let l = 0; l < 3; l += 1) {
      for (let s = 0; s < 3; s += 1) {
        const u = state[side].lanes[l][s];
        if (u) {
          u.buffs.atq = 0;
          u.turnsOnBoard += 1;
        }
      }
    }
  }

  refreshSynergies(state);
  applyChampionPvBonusFromSynergies(state);
  recomputePaMax(state, 'player');
  recomputePaMax(state, 'ai');
  checkWinner(state);
}

function sumPierceDamage(p: PlayerState): number {
  let total = 0;
  for (let l = 0; l < 3; l += 1) {
    for (let s = 0; s < 3; s += 1) {
      const u = p.lanes[l][s];
      if (!u) continue;
      if (!hasCharge(u) && u.turnsOnBoard === 0) continue;
      total += pierceValue(u);
    }
  }
  return total;
}

function resolveLaneCombat(state: GameState, lane: LaneIndex) {
  const pAtq = sumLaneAtq(state.player, lane, false);
  const aAtq = sumLaneAtq(state.ai, lane, false);

  if (pAtq > 0 || aAtq > 0) {
    pushLog(state, `Phase Combat · ${CLASSES[LANE_TO_CLASSE[lane]].name} : Toi ${pAtq} ATQ vs Sylvie ${aAtq} ATQ.`, 'combat');
  }

  distributeDamage(state, 'ai', lane, pAtq);
  distributeDamage(state, 'player', lane, aAtq);

  for (const side of ['player', 'ai'] as Side[]) {
    for (let s = 0; s < 3; s += 1) {
      const u = state[side].lanes[lane][s];
      if (u && u.pv <= 0) {
        pushLog(state, `${CARD_INDEX[u.defId]?.name} (${labelSide(side)}) tombe.`, 'mort');
        state[side].discard.push(u.defId);
        state[side].lanes[lane][s] = null;
      }
    }
  }
  refreshSynergies(state);
  recomputePaMax(state, 'player');
  recomputePaMax(state, 'ai');
}

function sumLaneAtq(p: PlayerState, lane: LaneIndex, _withCharge: boolean): number {
  let total = 0;
  for (let s = 0; s < 3; s += 1) {
    const u = p.lanes[lane][s];
    if (!u) continue;
    if (!hasCharge(u) && u.turnsOnBoard === 0) continue;
    let a = effectiveAtq(u, p);
    if (hasDoubleStrike(u)) a *= 2;
    total += a;
  }
  return total;
}

function distributeDamage(state: GameState, targetSide: Side, lane: LaneIndex, amount: number) {
  if (amount <= 0) return;
  let remaining = amount;
  const p = state[targetSide];

  const gardes: SlotIndex[] = [];
  for (let s = 0 as SlotIndex; s < 3; s = (s + 1) as SlotIndex) {
    const u = p.lanes[lane][s];
    if (u && hasEffectiveGarde(u, p)) gardes.push(s);
  }

  if (gardes.length > 0) {
    for (const s of gardes) {
      if (remaining <= 0) return;
      const u = p.lanes[lane][s];
      if (!u) continue;
      const taken = Math.min(remaining, u.pv);
      u.pv -= taken;
      remaining -= taken;
    }
  }

  for (let s = 0 as SlotIndex; s < 3; s = (s + 1) as SlotIndex) {
    if (remaining <= 0) return;
    if (gardes.includes(s)) continue;
    const u = p.lanes[lane][s];
    if (!u) continue;
    const taken = Math.min(remaining, u.pv);
    u.pv -= taken;
    remaining -= taken;
  }

  if (remaining > 0) {
    applyDamageToChampion(state, targetSide, remaining);
    pushLog(state, `${remaining} dégât${remaining > 1 ? 's' : ''} déborde${remaining > 1 ? 'nt' : ''} sur le Champion ${labelSide(targetSide)}.`, 'debordement');
  }
}

function applyDamageToChampion(state: GameState, side: Side, amount: number) {
  if (amount <= 0) return;
  state[side].hp = Math.max(0, state[side].hp - amount);
}

function checkWinner(state: GameState) {
  if (state.player.hp <= 0 && state.ai.hp <= 0) {
    state.winner = state.player.hp < state.ai.hp ? 'ai' : 'player';
    state.phase = 'over';
  } else if (state.player.hp <= 0) {
    state.winner = 'ai';
    state.phase = 'over';
  } else if (state.ai.hp <= 0) {
    state.winner = 'player';
    state.phase = 'over';
  }
}

export function beginTurn(state: GameState, side: Side) {
  refreshSynergies(state);
  recomputePaMax(state, side);
  const p = state[side];
  p.pa = p.paMax;
  drawTo(p, HAND_LIMIT);
  grantUnlockedElites(state, side);
  state.active = side;
  state.phase = side === 'player' ? 'player' : 'ai';
}

function grantUnlockedElites(state: GameState, side: Side) {
  const p = state[side];
  for (const syn of p.activeSynergies) {
    if (syn.applied.kind !== 'unlock_elite_card') continue;
    const cardId = syn.applied.cardId;
    if (p.unlockedElites.includes(cardId)) continue;
    const def = CARD_INDEX[cardId];
    if (!def) continue;
    p.unlockedElites.push(cardId);
    p.hand.push(makeInstance(def));
    pushLog(state, `${labelSide(side)} : Trinité activée ! ${def.name} apparaît dans la main.`, 'sort');
  }
}

export function endPlayerTurn(state: GameState) {
  state.phase = 'ai';
  state.active = 'ai';
}

export function nextRound(state: GameState) {
  state.turn += 1;
  beginTurn(state, 'player');
}

export function beginAiTurn(state: GameState) {
  beginTurn(state, 'ai');
}

function other(side: Side): Side {
  return side === 'player' ? 'ai' : 'player';
}

function labelSide(side: Side): string {
  if (side === 'player') return 'Toi';
  return 'Sylvie';
}

function pushLog(state: GameState, text: string, phase?: string) {
  state.log.push({ turn: state.turn, text, phase });
  if (state.log.length > 60) state.log.shift();
}

export { CARDS, CLASSES, computeActiveSynergies };
