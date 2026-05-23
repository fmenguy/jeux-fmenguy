import type {
  CardInstance,
  GameState,
  LaneIndex,
  PlayerState,
  Side,
} from '../state/types';
import { CARD_INDEX, CARDS } from '../data/cards';
import { CHAMPIONS } from '../data/champions';
import { THREATS } from '../data/threats';

const HAND_LIMIT = 5;
const ENERGY_CAP = 8;
const STARTING_HP = 25;
const STARTING_ENERGY_MAX = 1;

let _seq = 0;
function nextId(prefix: string): string {
  _seq += 1;
  return `${prefix}_${_seq}`;
}

export function buildStarterDeck(): string[] {
  const ids = [
    'eclaireur', 'eclaireur', 'eclaireur',
    'milicien', 'milicien', 'milicien',
    'archer', 'archer',
    'forgeron', 'forgeron',
    'sentinelle', 'sentinelle',
    'maraudeur',
    'lilia', 'amelie', 'throrin', 'aldarian',
    'souffle_solilys', 'runes_pulsantes', 'embuscade',
  ];
  return shuffle(ids);
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function makePlayerState(championId: string): PlayerState {
  const champion = CHAMPIONS[championId];
  return {
    champion,
    hp: STARTING_HP,
    energyMax: STARTING_ENERGY_MAX,
    energy: STARTING_ENERGY_MAX,
    deck: buildStarterDeck(),
    hand: [],
    discard: [],
    lanes: [[], [], []],
    cristaux: 0,
  };
}

export function createInitialState(): GameState {
  const player = makePlayerState('joueur');
  const ai = makePlayerState('sylvie');
  const state: GameState = {
    turn: 1,
    phase: 'player',
    active: 'player',
    player,
    ai,
    threats: [makeThreat(), makeThreat()],
    winner: null,
    log: [{ turn: 0, text: 'Stratagème · une partie commence.' }],
    pendingTargeting: null,
  };
  drawTo(state.player, HAND_LIMIT);
  drawTo(state.ai, HAND_LIMIT);
  return state;
}

function makeThreat() {
  const def = THREATS[Math.floor(Math.random() * THREATS.length)];
  return { instId: nextId('menace'), defId: def.id };
}

export function drawTo(p: PlayerState, limit: number) {
  while (p.hand.length < limit) {
    if (p.deck.length === 0) {
      if (p.discard.length === 0) return;
      p.deck = shuffle(p.discard);
      p.discard = [];
    }
    const defId = p.deck.shift()!;
    p.hand.push({
      instId: nextId('c'),
      defId,
      turnsOnBoard: 0,
      buff: 0,
    });
  }
}

export function effectiveForce(card: CardInstance, side: PlayerState): number {
  const def = CARD_INDEX[card.defId];
  if (!def || def.kind !== 'personnage') return 0;
  let f = (def.force ?? 0) + card.buff;
  if (def.power?.type === 'bonus_when_low_hp' && side.hp < def.power.threshold) {
    f += def.power.bonus;
  }
  return f;
}

export interface PlayCharacterResult {
  ok: boolean;
  reason?: string;
}

export function playCharacter(
  state: GameState,
  side: Side,
  handInstId: string,
  lane: LaneIndex,
): PlayCharacterResult {
  const p = state[side];
  const card = p.hand.find((c) => c.instId === handInstId);
  if (!card) return { ok: false, reason: 'Carte introuvable.' };
  const def = CARD_INDEX[card.defId];
  if (!def || def.kind !== 'personnage') return { ok: false, reason: 'Pas un personnage.' };
  if (p.energy < def.cost) return { ok: false, reason: 'Pas assez d\'énergie.' };
  if (p.lanes[lane].length > 0) return { ok: false, reason: 'Lane déjà occupée.' };

  p.energy -= def.cost;
  p.hand = p.hand.filter((c) => c.instId !== handInstId);
  card.turnsOnBoard = 0;
  p.lanes[lane].push(card);

  if (def.power?.type === 'draw_on_play') {
    drawTo(p, p.hand.length + def.power.amount);
  }

  pushLog(state, `${labelSide(side)} pose ${def.name} en lane ${lane + 1}.`);
  return { ok: true };
}

export function playSortilege(
  state: GameState,
  side: Side,
  handInstId: string,
  target?: { kind: 'own_card'; instId: string } | { kind: 'enemy_lane'; lane: LaneIndex },
): PlayCharacterResult {
  const p = state[side];
  const opp = state[other(side)];
  const card = p.hand.find((c) => c.instId === handInstId);
  if (!card) return { ok: false, reason: 'Carte introuvable.' };
  const def = CARD_INDEX[card.defId];
  if (!def || def.kind !== 'sortilege' || !def.effect) return { ok: false, reason: 'Pas un sortilège.' };
  if (p.energy < def.cost) return { ok: false, reason: 'Pas assez d\'énergie.' };

  const eff = def.effect;
  if (eff.type === 'heal') {
    p.hp = Math.min(STARTING_HP + 10, p.hp + eff.amount);
    pushLog(state, `${labelSide(side)} lance ${def.name} (+${eff.amount} PV).`);
  } else if (eff.type === 'buff') {
    if (!target || target.kind !== 'own_card') return { ok: false, reason: 'Cible un de tes personnages.' };
    const t = findOnBoard(p, target.instId);
    if (!t) return { ok: false, reason: 'Cible invalide.' };
    t.buff += eff.amount;
    pushLog(state, `${labelSide(side)} lance ${def.name} (+${eff.amount} Force).`);
  } else if (eff.type === 'kill_weakest') {
    if (!target || target.kind !== 'enemy_lane') return { ok: false, reason: 'Cible une lane adverse.' };
    const lane = opp.lanes[target.lane];
    if (lane.length === 0) return { ok: false, reason: 'Lane adverse vide.' };
    let weakest = lane[0];
    let weakestForce = effectiveForce(weakest, opp);
    for (const c of lane) {
      const f = effectiveForce(c, opp);
      if (f < weakestForce) {
        weakest = c;
        weakestForce = f;
      }
    }
    opp.lanes[target.lane] = lane.filter((c) => c.instId !== weakest.instId);
    opp.discard.push(weakest.defId);
    pushLog(state, `${labelSide(side)} détruit ${CARD_INDEX[weakest.defId].name}.`);
  }

  p.energy -= def.cost;
  p.hand = p.hand.filter((c) => c.instId !== handInstId);
  p.discard.push(def.id);
  return { ok: true };
}

function findOnBoard(p: PlayerState, instId: string): CardInstance | null {
  for (const lane of p.lanes) {
    const c = lane.find((x) => x.instId === instId);
    if (c) return c;
  }
  return null;
}

function laneStrongest(p: PlayerState, lane: LaneIndex): CardInstance | null {
  const cards = p.lanes[lane];
  if (cards.length === 0) return null;
  let best = cards[0];
  let bestF = effectiveForce(best, p);
  for (const c of cards) {
    const f = effectiveForce(c, p);
    if (f > bestF) { best = c; bestF = f; }
  }
  return best;
}

export function resolveCombat(state: GameState) {
  for (let i = 0 as LaneIndex; i < 3; i = (i + 1) as LaneIndex) {
    const pBest = laneStrongest(state.player, i);
    const aBest = laneStrongest(state.ai, i);
    const pF = pBest ? effectiveForce(pBest, state.player) : 0;
    const aF = aBest ? effectiveForce(aBest, state.ai) : 0;

    if (pBest && aBest) {
      if (pF > aF) {
        state.ai.hp -= (pF - aF);
        killOnLane(state.ai, i, aBest);
        pushLog(state, `Lane ${i + 1} : ${cardName(pBest)} bat ${cardName(aBest)} (${pF - aF} dégâts).`);
      } else if (aF > pF) {
        state.player.hp -= (aF - pF);
        killOnLane(state.player, i, pBest);
        pushLog(state, `Lane ${i + 1} : ${cardName(aBest)} bat ${cardName(pBest)} (${aF - pF} dégâts).`);
      } else {
        killOnLane(state.player, i, pBest);
        killOnLane(state.ai, i, aBest);
        pushLog(state, `Lane ${i + 1} : duel à égalité, les deux tombent.`);
      }
    } else if (pBest && !aBest) {
      state.ai.hp -= pF;
      pushLog(state, `Lane ${i + 1} : ${cardName(pBest)} frappe le Champion (${pF} dégâts).`);
    } else if (aBest && !pBest) {
      state.player.hp -= aF;
      pushLog(state, `Lane ${i + 1} : ${cardName(aBest)} frappe ton Champion (${aF} dégâts).`);
    }
  }

  for (const side of ['player', 'ai'] as Side[]) {
    for (let i = 0; i < 3; i += 1) {
      for (const c of state[side].lanes[i]) {
        c.buff = 0;
        c.turnsOnBoard += 1;
      }
    }
  }

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

function killOnLane(p: PlayerState, lane: LaneIndex, card: CardInstance) {
  p.lanes[lane] = p.lanes[lane].filter((c) => c.instId !== card.instId);
  p.discard.push(card.defId);
}

export function beginTurn(state: GameState, side: Side) {
  const p = state[side];
  p.energyMax = Math.min(ENERGY_CAP, p.energyMax + 1);
  p.energy = p.energyMax;
  drawTo(p, HAND_LIMIT);
  state.active = side;
  state.phase = side === 'player' ? 'player' : 'ai';
}

export function endPlayerTurn(state: GameState) {
  state.phase = 'ai';
  state.active = 'ai';
}

export function nextRound(state: GameState) {
  state.turn += 1;
  beginTurn(state, 'player');
}

function other(side: Side): Side {
  return side === 'player' ? 'ai' : 'player';
}

function labelSide(side: Side): string {
  return side === 'player' ? 'Toi' : 'Sylvie';
}

function cardName(c: CardInstance): string {
  return CARD_INDEX[c.defId]?.name ?? c.defId;
}

function pushLog(state: GameState, text: string) {
  state.log.push({ turn: state.turn, text });
  if (state.log.length > 40) state.log.shift();
}

export { CARDS };
