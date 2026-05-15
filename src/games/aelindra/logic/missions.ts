/* ============================================
   AELINDRA · logic/missions.ts
   Logique de progression et reset daily des missions (pure)
   ============================================ */

import type { Mission } from '../data/types';

export interface MissionProgress {
  progress: number;
  done: boolean;
  claimed: boolean;
  lastReset?: string;
}

/**
 * Incrémente la progression d'une mission du delta donné.
 * Retourne une nouvelle MissionProgress sans muter l'originale.
 * Sans effet si la mission est déjà réclamée.
 */
export function updateMissionProgress(
  prog: MissionProgress,
  mission: Mission,
  delta: number,
): MissionProgress {
  if (prog.claimed) return { ...prog };

  const newProgress = Math.min(prog.progress + delta, mission.total);
  const done = newProgress >= mission.total;

  return { ...prog, progress: newProgress, done };
}

/**
 * Réclame la récompense d'une mission complétée.
 * Retourne la progression mise à jour + les montants de récompense.
 * Si la mission n'est pas complétée ou déjà réclamée, retourne gold/orbs à 0.
 */
export function claimMissionReward(
  prog: MissionProgress,
  mission: Mission,
): { newProg: MissionProgress; gold: number; orbs: number } {
  if (!prog.done || prog.claimed) {
    return { newProg: { ...prog }, gold: 0, orbs: 0 };
  }

  return {
    newProg: { ...prog, claimed: true },
    gold:    mission.reward.gold ?? 0,
    orbs:    mission.reward.orbs ?? 0,
  };
}

/**
 * Vérifie si une mission daily doit être réinitialisée.
 * Compare lastReset avec la date du jour (format ISO YYYY-MM-DD).
 */
export function shouldResetDaily(prog: MissionProgress): boolean {
  const today = new Date().toISOString().slice(0, 10);
  return (prog.lastReset ?? '') !== today;
}

/**
 * Retourne une MissionProgress réinitialisée pour un nouveau jour.
 * lastReset est positionné à la date du jour.
 */
export function resetDailyProgress(): MissionProgress {
  const today = new Date().toISOString().slice(0, 10);
  return { progress: 0, done: false, claimed: false, lastReset: today };
}
