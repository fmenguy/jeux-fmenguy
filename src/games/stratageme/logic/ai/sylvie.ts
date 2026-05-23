import type { GameState, LaneIndex } from '../../state/types';
import { CARD_INDEX } from '../../data/cards';
import { playCharacter, playSortilege } from '../engine';

export function runAiTurn(state: GameState) {
  const ai = state.ai;
  let progress = true;
  let safety = 12;

  while (progress && safety > 0) {
    progress = false;
    safety -= 1;

    const playable = ai.hand
      .map((c) => ({ inst: c, def: CARD_INDEX[c.defId] }))
      .filter((x) => x.def && x.def.cost <= ai.energy);

    if (playable.length === 0) break;

    const persos = playable.filter((x) => x.def.kind === 'personnage');
    if (persos.length > 0) {
      persos.sort((a, b) => (b.def.force ?? 0) - (a.def.force ?? 0));
      const cand = persos[0];
      const emptyLanes: LaneIndex[] = ([0, 1, 2] as LaneIndex[]).filter(
        (i) => ai.lanes[i].length === 0,
      );
      if (emptyLanes.length > 0) {
        const target = pickLane(state, emptyLanes);
        const res = playCharacter(state, 'ai', cand.inst.instId, target);
        if (res.ok) {
          progress = true;
          continue;
        }
      }
    }

    if (ai.hp < 15) {
      const heal = playable.find((x) => x.def.effect?.type === 'heal');
      if (heal) {
        const res = playSortilege(state, 'ai', heal.inst.instId);
        if (res.ok) { progress = true; continue; }
      }
    }

    const buff = playable.find((x) => x.def.effect?.type === 'buff');
    if (buff) {
      const ownCard = ai.lanes.flat()[0];
      if (ownCard) {
        const res = playSortilege(state, 'ai', buff.inst.instId, {
          kind: 'own_card',
          instId: ownCard.instId,
        });
        if (res.ok) { progress = true; continue; }
      }
    }

    const kill = playable.find((x) => x.def.effect?.type === 'kill_weakest');
    if (kill) {
      const lane = ([0, 1, 2] as LaneIndex[]).find((i) => state.player.lanes[i].length > 0);
      if (lane !== undefined) {
        const res = playSortilege(state, 'ai', kill.inst.instId, {
          kind: 'enemy_lane',
          lane,
        });
        if (res.ok) { progress = true; continue; }
      }
    }
  }
}

function pickLane(state: GameState, candidates: LaneIndex[]): LaneIndex {
  let bestLane = candidates[0];
  let bestScore = -Infinity;
  for (const l of candidates) {
    const enemy = state.player.lanes[l][0];
    const score = enemy ? -1 : 1;
    if (score > bestScore) { bestScore = score; bestLane = l; }
  }
  return bestLane;
}
