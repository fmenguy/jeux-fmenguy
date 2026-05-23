import type { CardInstance, GameState, LaneIndex, SlotIndex } from '../../state/types';
import { CARD_INDEX } from '../../data/cards';
import { CLASSES } from '../../data/classes';
import {
  allowedLane,
  effectiveAtq,
  findEmptySlot,
  playCharacter,
  playSortilege,
} from '../engine';
import { hasGarde, hasTir } from '../effects';

export function runAiTurn(state: GameState) {
  let safety = 16;
  while (safety > 0) {
    safety -= 1;
    if (!takeOneAction(state)) break;
    if (state.ai.pa <= 0) break;
  }
}

function takeOneAction(state: GameState): boolean {
  const ai = state.ai;
  const playable = ai.hand
    .map((c) => ({ inst: c, def: CARD_INDEX[c.defId] }))
    .filter((x) => x.def && x.def.cost <= ai.pa);
  if (playable.length === 0) return false;

  if (ai.hp < 10) {
    const heal = playable.find((x) => x.def.sortilege?.kind === 'heal_champion');
    if (heal) {
      const r = playSortilege(state, 'ai', heal.inst.instId);
      if (r.ok) return true;
    }
  }

  const kill = playable.find((x) => x.def.sortilege?.kind === 'kill_target');
  if (kill) {
    let bestTarget: { lane: LaneIndex; slot: SlotIndex; score: number } | null = null;
    for (let l = 0 as LaneIndex; l < 3; l = (l + 1) as LaneIndex) {
      for (let s = 0 as SlotIndex; s < 3; s = (s + 1) as SlotIndex) {
        const u = state.player.lanes[l][s];
        if (!u) continue;
        const score = effectiveAtq(u, state.player) * 2 + u.pv;
        if (score >= 6 && (!bestTarget || score > bestTarget.score)) {
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

  const volee = playable.find((x) => x.def.sortilege?.kind === 'damage_lane');
  if (volee) {
    let bestLane: LaneIndex | null = null;
    let bestVal = 0;
    for (let l = 0 as LaneIndex; l < 3; l = (l + 1) as LaneIndex) {
      let count = 0;
      for (let s = 0; s < 3; s += 1) {
        if (state.player.lanes[l][s] && state.player.lanes[l][s]!.pv <= 2) count += 1;
      }
      if (count >= 2 && count > bestVal) { bestLane = l; bestVal = count; }
    }
    if (bestLane !== null) {
      const r = playSortilege(state, 'ai', volee.inst.instId, { kind: 'enemy_lane', lane: bestLane });
      if (r.ok) return true;
    }
  }

  const persos = playable.filter((x) => x.def.kind === 'personnage');
  if (persos.length > 0) {
    let bestChoice: { instId: string; slot: SlotIndex; score: number } | null = null;
    for (const p of persos) {
      const lane = allowedLane(p.def);
      if (lane === null) continue;
      const slot = findEmptySlot(ai.lanes[lane]);
      if (slot === null) continue;

      const wantsFront = (p.def.pv ?? 0) >= 4 || (p.def.effects ?? []).some((e) => e.trigger === 'passive' && e.effect.kind === 'garde');
      const wantsBack = (p.def.atq ?? 0) >= 3 && (p.def.pv ?? 0) <= 3;
      let actualSlot: SlotIndex = slot;
      if (wantsFront) {
        if (ai.lanes[lane][0] === null) actualSlot = 0;
      } else if (wantsBack) {
        if (ai.lanes[lane][2] === null) actualSlot = 2;
        else if (ai.lanes[lane][1] === null) actualSlot = 1;
      }

      const score = (p.def.atq ?? 0) + (p.def.pv ?? 0) * 0.6 - p.def.cost * 0.3 + (p.def.paBonus ?? 0) * 1.5;
      if (!bestChoice || score > bestChoice.score) {
        bestChoice = { instId: p.inst.instId, slot: actualSlot, score };
      }
    }
    if (bestChoice) {
      const r = playCharacter(state, 'ai', bestChoice.instId, bestChoice.slot);
      if (r.ok) return true;
    }
  }

  const runes = playable.find((x) => x.def.sortilege?.kind === 'buff_atq_lane');
  if (runes) {
    let bestLane: LaneIndex | null = null;
    let bestAtq = 0;
    for (let l = 0 as LaneIndex; l < 3; l = (l + 1) as LaneIndex) {
      let lAtq = 0;
      for (let s = 0; s < 3; s += 1) {
        const u = ai.lanes[l][s];
        if (u && !hasTir(u)) lAtq += effectiveAtq(u, ai);
      }
      if (lAtq > bestAtq) { bestLane = l; bestAtq = lAtq; }
    }
    if (bestLane !== null) {
      const r = playSortilege(state, 'ai', runes.inst.instId, { kind: 'own_lane', lane: bestLane });
      if (r.ok) return true;
    }
  }

  return false;
}
