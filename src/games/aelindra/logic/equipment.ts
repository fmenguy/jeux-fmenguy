/* ============================================
   AELINDRA · logic/equipment.ts
   Logique d'équipement (pure, sans mutation d'état)
   ============================================ */

import type { Hero, Item } from '../data/types';

export type EquipSlot = 'weapon' | 'body' | 'head' | 'offhand';

/**
 * Détermine le slot d'équipement d'un item d'après son type.
 * Les types du marché ressemblent à "Arme 1M · Guerrier", "Corps · Mage", etc.
 * Retourne null si l'item n'est pas équipable (consommable, etc.).
 */
export function getItemSlot(item: Item): EquipSlot | null {
  const t = (item.type ?? '').toLowerCase();
  if (t.startsWith('arme') || t.startsWith('munitions')) return 'weapon';
  if (t.startsWith('corps') || t.startsWith('jambes'))    return 'body';
  if (t.startsWith('tête') || t.startsWith('casque'))     return 'head';
  if (t.startsWith('bouclier') || t.startsWith('offhand')) return 'offhand';
  return null;
}

/**
 * Équipe un item sur un héros.
 * Retourne une copie du héros avec le slot mis à jour.
 * Si le slot était déjà occupé, retourne l'id de l'ancien item via unequippedItemId
 * (l'appelant est responsable de le remettre dans l'inventaire).
 */
export function equipItemPure(
  hero: Hero,
  item: Item,
): { hero: Hero; unequippedItemId: string | null } {
  const slot = getItemSlot(item);
  if (!slot) return { hero: { ...hero }, unequippedItemId: null };

  const currentEquipped = hero.equipped ?? { head: null, body: null, weapon: null, offhand: null };
  const unequippedItemId = currentEquipped[slot] ?? null;

  const updatedHero: Hero = {
    ...hero,
    equipped: {
      ...currentEquipped,
      [slot]: item.id,
    },
  };

  return { hero: updatedHero, unequippedItemId };
}

/**
 * Déséquipe le slot indiqué d'un héros.
 * Retourne une copie du héros avec le slot vidé.
 * Retourne l'id de l'item retiré via unequippedItemId (null si le slot était vide).
 */
export function unequipSlotPure(
  hero: Hero,
  slot: EquipSlot,
): { hero: Hero; unequippedItemId: string | null } {
  const currentEquipped = hero.equipped ?? { head: null, body: null, weapon: null, offhand: null };
  const unequippedItemId = currentEquipped[slot] ?? null;

  const updatedHero: Hero = {
    ...hero,
    equipped: {
      ...currentEquipped,
      [slot]: null,
    },
  };

  return { hero: updatedHero, unequippedItemId };
}
