/* ============================================
   AELINDRA · data/items.ts
   Objets du marché
   ============================================ */

import type { Item } from './types';

export const MARKET_ITEMS: { armes: Item[]; armures: Item[]; potions: Item[] } = {
  armes: [
    { id: 'epee_courte',  name: 'Épée Courte',      emoji: '⚔️', type: 'Arme 1M · Guerrier',   rarity: 'common', stat: '+8 ATK, portée 1',        price: 80 },
    { id: 'arc_elfique',  name: 'Arc Elfique',       emoji: '🏹', type: 'Arme 2M · Archère',     rarity: 'rare',   stat: '+14 ATK, portée 5',       price: 200, twoHand: true, requiresAmmo: true },
    { id: 'hache_guerre', name: 'Hache de Guerre',   emoji: '🪓', type: 'Arme 2M · Guerrier',    rarity: 'rare',   stat: '+18 ATK, portée 1',       price: 180, twoHand: true },
    { id: 'baton_givre',  name: 'Bâton de Givre',    emoji: '❄️', type: 'Arme 2M · Mage',        rarity: 'rare',   stat: '+16 MAG, gèle 20%',       price: 220, twoHand: true },
    { id: 'carquois_run', name: 'Carquois Runique',  emoji: '🪃', type: 'Munitions · Archère',   rarity: 'common', stat: 'Flèches ×40, +5 ATK',     price: 60,  isAmmo: true },
    { id: 'dague_poison', name: 'Dague Empoisonnée', emoji: '🗡️', type: 'Arme 1M · Espion',      rarity: 'rare',   stat: '+10 ATK, poison 3 tours', price: 150 },
  ],
  armures: [
    { id: 'armure_plates',  name: 'Armure de Plates', emoji: '🥋', type: 'Corps · Guerrier',      rarity: 'rare',   stat: '+25 DEF, −5 VIT',    price: 220 },
    { id: 'robe_arcane',    name: 'Robe Arcanique',   emoji: '🧥', type: 'Corps · Mage',           rarity: 'rare',   stat: '+12 RES, +10 MP',    price: 190 },
    { id: 'cape_sylve',     name: 'Cape de Sylve',    emoji: '🧣', type: 'Corps · Archère',        rarity: 'common', stat: '+8 DEF, +6 VIT',     price: 90 },
    { id: 'egide_chene',    name: 'Égide de Chêne',  emoji: '🛡️', type: 'Bouclier · Protecteur', rarity: 'rare',   stat: '+30 DEF, absorb++',  price: 240 },
    { id: 'diademe_arcane', name: 'Diadème Arcane',  emoji: '💎', type: 'Tête · Mage',            rarity: 'rare',   stat: '+15 MAG, +8 MP',     price: 200 },
    { id: 'jambieres_fer',  name: 'Jambières de Fer', emoji: '🩱', type: 'Jambes · Guerrier',      rarity: 'common', stat: '+10 DEF, +5 PV',     price: 70 },
  ],
  potions: [
    { id: 'potion_soin',   name: 'Potion de Soin',   emoji: '🧪', type: 'Consommable', rarity: 'common', stat: 'Restaure 40 PV',     price: 30 },
    { id: 'elixir_force',  name: 'Élixir de Force',  emoji: '⚗️', type: 'Consommable', rarity: 'rare',   stat: '+20% ATK, 3 tours',  price: 80 },
    { id: 'baume_resist',  name: 'Baume Résistance', emoji: '🫙', type: 'Consommable', rarity: 'common', stat: '+15 DEF, 2 tours',   price: 40 },
    { id: 'grande_potion', name: 'Grande Potion',    emoji: '🍶', type: 'Consommable', rarity: 'rare',   stat: 'Restaure 100 PV',    price: 120 },
  ],
};
