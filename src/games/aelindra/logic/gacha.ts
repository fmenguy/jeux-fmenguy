/* ============================================
   AELINDRA · logic/gacha.ts
   Logique de tirage à la guilde (pure, sans mutation d'état)
   ============================================ */

import type { Hero } from '../data/types';

// Coûts exportés pour usage dans l'UI
export const PULL_COST_1  = 10;
export const PULL_COST_10 = 90;

// Seuil pity codé en dur : épique/légendaire garanti tous les 50 tirages
export const PITY_THRESHOLD = 50;

export interface PullResult {
  hero: Hero;
  isNew: boolean;
  isDuplicate?: boolean;
  xpGained?: number;
  leveledUp?: boolean;
  newLevel?: number;
}

/**
 * Tire un aventurier depuis le pool par tirage pondéré.
 * Si forceEpic est vrai, tire uniquement parmi les raretés epic/legendary.
 */
export function rollAdventurer(pool: Hero[], forceEpic = false): Hero {
  if (forceEpic) {
    const epics = pool.filter(h => h.rarity === 'epic' || h.rarity === 'legendary');
    const picked = epics[Math.floor(Math.random() * epics.length)];
    return { ...picked };
  }

  const total = pool.reduce((sum, h) => sum + (h.weight ?? 1), 0);
  let r = Math.random() * total;
  for (const h of pool) {
    r -= h.weight ?? 1;
    if (r <= 0) return { ...h };
  }
  return { ...pool[0] };
}

/**
 * Effectue n tirages avec gestion du pity.
 * Ne dépense pas d'orbes (responsabilité de l'appelant).
 *
 * @param pool       Pool de héros disponibles
 * @param n          Nombre de tirages (1 ou 10)
 * @param currentPity Valeur pity actuelle
 * @param ownedIds   Ids des héros déjà possédés
 * @returns results : tableau des tirages avec flag isNew, newPity : pity après les tirages
 */
export function performPulls(
  pool: Hero[],
  n: number,
  currentPity: number,
  ownedIds: Set<string>,
): { results: PullResult[]; newPity: number } {
  const results: PullResult[] = [];
  let pity = currentPity;

  for (let i = 0; i < n; i++) {
    pity++;
    const forced = pity >= PITY_THRESHOLD;
    if (forced) pity = 0;
    const hero = rollAdventurer(pool, forced);
    results.push({ hero, isNew: !ownedIds.has(hero.id) });
  }

  return { results, newPity: pity };
}
