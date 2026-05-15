/* ============================================
   AELINDRA · logic/xp.ts
   Calcul XP et level-up (pur, sans mutation d'état)
   ============================================ */

import type { Hero } from '../data/types';

/**
 * Retourne le seuil d'XP nécessaire pour passer du niveau `level` au suivant.
 * Formule : 1000 * 1.28^(level - 1)
 */
export function getXpCap(level: number): number {
  return Math.round(1000 * Math.pow(1.28, level - 1));
}

/**
 * Ajoute `amount` XP à un héros et gère les montées de niveau en cascade.
 * Retourne une copie du héros mis à jour ainsi que les infos de level-up.
 *
 * @param hero   Héros cible (non muté)
 * @param amount XP à ajouter
 * @returns hero       : copie mise à jour du héros
 *          leveledUp  : true si au moins un niveau a été gagné
 *          newLevel   : niveau final après l'ajout d'XP
 */
export function addXpPure(
  hero: Hero,
  amount: number,
): { hero: Hero; leveledUp: boolean; newLevel: number } {
  let xp    = (hero.xp    ?? 0) + amount;
  let level = (hero.level ?? 1);
  let leveledUp = false;

  while (xp >= getXpCap(level)) {
    xp -= getXpCap(level);
    level++;
    leveledUp = true;
  }

  return {
    hero:      { ...hero, xp, level },
    leveledUp,
    newLevel:  level,
  };
}
