import type { AiProfile, GameState, LaneIndex, SlotIndex } from '../../state/types';
import { CARD_INDEX } from '../../data/cards';
import { AI_PROFILES } from '../../data/champions';
import {
  allowedLane,
  effectiveAtq,
  findEmptySlot,
  playCharacter,
  playSortilege,
  sortilegeCost,
} from '../engine';
import { hasCharge, hasDoubleStrike, hasTir } from '../effects';

const DEFAULT_PROFILE: AiProfile = { killScoreMin: 6, healBelow: 10, handLimit: 5, smartPlacement: false };

export function runAiTurn(state: GameState) {
  let safety = 20;
  while (safety > 0) {
    safety -= 1;
    if (state.winner) break;
    if (!takeOneAction(state)) break;
    if (state.ai.pa <= 0) break;
  }
}

/** ATQ que le joueur peut infliger sur chaque Marche au prochain combat. */
function playerLaneThreat(state: GameState): number[] {
  const threats = [0, 0, 0];
  for (let l = 0; l < 3; l += 1) {
    for (let s = 0; s < 3; s += 1) {
      const u = state.player.lanes[l][s];
      if (!u) continue;
      let a = effectiveAtq(u, state.player, state.world);
      if (hasDoubleStrike(u)) a *= 2;
      threats[l] += a;
    }
  }
  return threats;
}

function aiLaneDefense(state: GameState, lane: LaneIndex): number {
  let pv = 0;
  for (let s = 0; s < 3; s += 1) {
    const u = state.ai.lanes[lane][s];
    if (u) pv += Math.max(0, u.pv);
  }
  return pv;
}

function takeOneAction(state: GameState): boolean {
  const ai = state.ai;
  const profile = AI_PROFILES[ai.champion.id] ?? DEFAULT_PROFILE;
  const playable = ai.hand
    .map((c) => ({ inst: c, def: CARD_INDEX[c.defId] }))
    .filter((x) => x.def && (x.def.kind === 'personnage'
      ? x.def.cost <= ai.pa
      : sortilegeCost(state, x.def) <= ai.pa));
  if (playable.length === 0) return false;

  // 1. Létal : un sort de dégâts directs qui achève le joueur passe avant tout.
  const burns = playable.filter((x) => x.def.sortilege?.kind === 'damage_champion');
  for (const b of burns) {
    const amount = b.def.sortilege?.kind === 'damage_champion' ? b.def.sortilege.amount : 0;
    if (amount >= state.player.hp) {
      const r = playSortilege(state, 'ai', b.inst.instId);
      if (r.ok) return true;
    }
  }

  // 2. Se soigner en urgence.
  if (ai.hp < profile.healBelow) {
    const heal = playable.find((x) => x.def.sortilege?.kind === 'heal_champion');
    if (heal) {
      const r = playSortilege(state, 'ai', heal.inst.instId);
      if (r.ok) return true;
    }
  }

  // 3. Économie : +1 Gemme max, mais seulement tôt ou avec du surplus.
  const ramp = playable.find((x) => x.def.sortilege?.kind === 'gain_pa_max');
  if (ramp && (state.turn <= 3 || ai.pa >= sortilegeCost(state, ramp.def) + 2)) {
    const r = playSortilege(state, 'ai', ramp.inst.instId);
    if (r.ok) return true;
  }

  // 4. Développer le plateau d'abord : poser un personnage.
  const persos = playable.filter((x) => x.def.kind === 'personnage');
  if (persos.length > 0) {
    const threats = profile.smartPlacement ? playerLaneThreat(state) : [0, 0, 0];
    let bestChoice: { instId: string; slot: SlotIndex; score: number } | null = null;
    for (const p of persos) {
      const lane = allowedLane(p.def);
      if (lane === null) continue;
      const slot = findEmptySlot(ai.lanes[lane]);
      if (slot === null) continue;

      const isTank = (p.def.pv ?? 0) >= 4 || (p.def.effects ?? []).some((e) => e.trigger === 'passive' && e.effect.kind === 'garde');
      const wantsBack = (p.def.atq ?? 0) >= 3 && (p.def.pv ?? 0) <= 3;
      let actualSlot: SlotIndex = slot;
      if (isTank) {
        if (ai.lanes[lane][0] === null) actualSlot = 0;
      } else if (wantsBack) {
        if (ai.lanes[lane][2] === null) actualSlot = 2;
        else if (ai.lanes[lane][1] === null) actualSlot = 1;
      }

      let score = (p.def.atq ?? 0) + (p.def.pv ?? 0) * 0.6 - p.def.cost * 0.3 + (p.def.paBonus ?? 0) * 1.5;
      // Défendre une Marche menacée et dégarnie compte double.
      if (profile.smartPlacement && isTank && threats[lane] > aiLaneDefense(state, lane)) {
        score += threats[lane] * 0.6;
      }
      if (!bestChoice || score > bestChoice.score) {
        bestChoice = { instId: p.inst.instId, slot: actualSlot, score };
      }
    }
    if (bestChoice) {
      const r = playCharacter(state, 'ai', bestChoice.instId, bestChoice.slot);
      if (r.ok) return true;
    }
  }

  // 5. Embuscade sur une cible qui en vaut la peine.
  const kill = playable.find((x) => x.def.sortilege?.kind === 'kill_target');
  if (kill) {
    let bestTarget: { lane: LaneIndex; slot: SlotIndex; score: number } | null = null;
    for (let l = 0 as LaneIndex; l < 3; l = (l + 1) as LaneIndex) {
      for (let s = 0 as SlotIndex; s < 3; s = (s + 1) as SlotIndex) {
        const u = state.player.lanes[l][s];
        if (!u) continue;
        const score = effectiveAtq(u, state.player, state.world) * 2 + u.pv;
        if (score >= profile.killScoreMin && (!bestTarget || score > bestTarget.score)) {
          bestTarget = { lane: l, slot: s, score };
        }
      }
    }
    if (bestTarget) {
      const r = playSortilege(state, 'ai', kill.inst.instId, {
        kind: 'enemy_unit',
        lane: bestTarget.lane,
        slot: bestTarget.slot,
      });
      if (r.ok) return true;
    }
  }

  // 6. Volée sur une Marche dense en unités fragiles.
  const volee = playable.find((x) => x.def.sortilege?.kind === 'damage_lane');
  if (volee) {
    const dmg = volee.def.sortilege?.kind === 'damage_lane' ? volee.def.sortilege.amount : 2;
    let bestLane: LaneIndex | null = null;
    let bestVal = 0;
    for (let l = 0 as LaneIndex; l < 3; l = (l + 1) as LaneIndex) {
      let count = 0;
      for (let s = 0; s < 3; s += 1) {
        const u = state.player.lanes[l][s];
        if (u && u.pv <= dmg) count += 1;
      }
      if (count >= 2 && count > bestVal) { bestLane = l; bestVal = count; }
    }
    if (bestLane !== null) {
      const r = playSortilege(state, 'ai', volee.inst.instId, { kind: 'enemy_lane', lane: bestLane });
      if (r.ok) return true;
    }
  }

  // 7. Pioche si la main s'épuise.
  const draw = playable.find((x) => x.def.sortilege?.kind === 'draw_cards');
  if (draw && ai.hand.length <= 3) {
    const r = playSortilege(state, 'ai', draw.inst.instId);
    if (r.ok) return true;
  }

  // 8. Dégâts directs même sans létal, si rien de mieux à faire.
  if (burns.length > 0) {
    const r = playSortilege(state, 'ai', burns[0].inst.instId);
    if (r.ok) return true;
  }

  // 9. Runes sur la Marche qui frappe le plus fort.
  const runes = playable.find((x) => x.def.sortilege?.kind === 'buff_atq_lane');
  if (runes) {
    let bestLane: LaneIndex | null = null;
    let bestAtq = 0;
    for (let l = 0 as LaneIndex; l < 3; l = (l + 1) as LaneIndex) {
      let lAtq = 0;
      for (let s = 0; s < 3; s += 1) {
        const u = ai.lanes[l][s];
        if (u && !hasTir(u) && (hasCharge(u) || u.turnsOnBoard > 0)) lAtq += effectiveAtq(u, ai, state.world);
      }
      if (lAtq > bestAtq) { bestLane = l; bestAtq = lAtq; }
    }
    if (bestLane !== null && bestAtq >= 3) {
      const r = playSortilege(state, 'ai', runes.inst.instId, { kind: 'own_lane', lane: bestLane });
      if (r.ok) return true;
    }
  }

  // 10. Pioche de confort si la Gemme est là et rien d'autre à jouer.
  if (draw) {
    const r = playSortilege(state, 'ai', draw.inst.instId);
    if (r.ok) return true;
  }

  return false;
}
