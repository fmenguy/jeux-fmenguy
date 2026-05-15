/* ============================================
   AELINDRA · data/abilities.ts
   Toutes les capacités du jeu
   ============================================ */

import type { Ability } from './types';

export const ABILITIES: Record<string, Ability> = {
  // GUERRIER
  frappe_lourde:    { name: 'Frappe Lourde',    icon: '⚔️', desc: 'ATK × 1.6. Chance de renverser 1 tour.',       tags: ['dmg', 'debuff'], lvlReq: 1, apCost: 2 },
  tourbillon:       { name: 'Tourbillon',        icon: '🔄', desc: 'Frappe tous les ennemis adjacents. ATK × 0.9.', tags: ['dmg'],            lvlReq: 3, apCost: 2 },
  endurance:        { name: 'Endurance',         icon: '💪', desc: 'Passive : réduit les dégâts reçus de 10%.',     tags: ['passive'],        lvlReq: 1, apCost: 0 },
  assaut:           { name: 'Assaut',            icon: '⚡', desc: 'Déplacement 3 cases + attaque immédiate.',      tags: ['dmg'],            lvlReq: 5, apCost: 3 },
  // ARCHÈRE
  tir_precis:       { name: 'Tir Précis',        icon: '🏹', desc: 'ATK × 1.4. Utilise 1 flèche.',                 tags: ['dmg'],            lvlReq: 1, apCost: 2 },
  pluie_fleches:    { name: 'Pluie de Flèches',  icon: '🌧️', desc: 'Zone 2×2, 3 cibles max. Utilise 2 flèches.',   tags: ['dmg'],            lvlReq: 3, apCost: 2 },
  esquive:          { name: 'Esquive',           icon: '💨', desc: 'Passive : 20% esquive attaque physique.',       tags: ['passive'],        lvlReq: 1, apCost: 0 },
  point_faible:     { name: 'Point Faible',      icon: '🎯', desc: '+30% dégâts sur cible pendant 2 tours.',        tags: ['debuff'],         lvlReq: 6, apCost: 1 },
  // MAGE
  fleche_arcane:    { name: 'Flèche Arcane',     icon: '⭐', desc: 'MAG × 1.3. Portée 4.',                         tags: ['dmg'],            lvlReq: 1, apCost: 2 },
  bouclier_magique: { name: 'Bouclier Magique',  icon: '🔮', desc: 'Absorbe MAG × 0.8 dégâts.',                    tags: ['buff'],           lvlReq: 2, apCost: 2 },
  explosion:        { name: 'Explosion',         icon: '✨', desc: 'Zone 3×3. MAG × 1.1 par cible.',               tags: ['dmg'],            lvlReq: 4, apCost: 2 },
  meteorite:        { name: 'Météorite',         icon: '💥', desc: 'Zone 4×4. MAG × 2. Rechargé 3 tours.',         tags: ['dmg'],            lvlReq: 8, apCost: 3 },
  // PROTECTEUR
  provocation:      { name: 'Provocation',       icon: '🛡️', desc: 'Force les ennemis adj. à attaquer le tank.',   tags: ['buff', 'debuff'], lvlReq: 1, apCost: 1 },
  forteresse:       { name: 'Forteresse',        icon: '🏰', desc: 'DEF +40% ce tour. Immobile.',                  tags: ['buff'],           lvlReq: 3, apCost: 1 },
  sacrifice:        { name: 'Sacrifice',         icon: '💖', desc: "Absorbe les dégâts d'un allié adj. 1×/tour.",  tags: ['buff'],           lvlReq: 5, apCost: 0 },
  riposte:          { name: 'Riposte',           icon: '⚔️', desc: 'Passive : renvoie 30% des dégâts reçus.',      tags: ['passive'],        lvlReq: 7, apCost: 0 },
};
