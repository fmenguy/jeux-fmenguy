import type { WorldDef, WorldId } from '../state/types';

/**
 * Mondes du duel. Chaque partie se joue sur un monde tiré au sort,
 * qui module la magie conformément au canon du roman :
 * la magie elfique se nourrit du vivant (forte sur Achronia, faible
 * sur le désert de Sandara), et Terrania est un monde sans magie.
 */
export const WORLDS: Record<WorldId, WorldDef> = {
  achronia: {
    id: 'achronia',
    name: 'Achronia',
    glyph: '🌲',
    tagline: 'Les forêts d\'Yseldra nourrissent la magie.',
    healMod: 1,
    sortCostMod: 0,
    factionBonus: { faction: 'elfe', atq: 0, pv: 1 },
    effectsText: [
      'Soins de la phase Magie : +1',
      'Unités elfes : +1 PV (elles combattent chez elles)',
    ],
  },
  terrania: {
    id: 'terrania',
    name: 'Terrania',
    glyph: '🏙',
    tagline: 'Le monde des humains, sans magie.',
    healMod: 0,
    sortCostMod: 1,
    factionBonus: { faction: 'humain', atq: 1, pv: 0 },
    effectsText: [
      'Sortilèges : +1 Gemme (la magie y prend mal)',
      'Unités humaines : +1 ATQ (elles combattent chez elles)',
    ],
  },
  sandara: {
    id: 'sandara',
    name: 'Sandara',
    glyph: '🏜',
    tagline: 'Pas un arbre, pas d\'eau vivante où puiser.',
    healMod: -1,
    sortCostMod: 0,
    factionBonus: { faction: 'nain', atq: 0, pv: 1 },
    effectsText: [
      'Soins de la phase Magie : -1 (la magie elfique prend mal au désert)',
      'Unités naines : +1 PV (la pierre et le métal ne dépendent pas du vivant)',
    ],
  },
};

export const WORLD_IDS: WorldId[] = ['achronia', 'terrania', 'sandara'];

export function rollWorld(): WorldId {
  return WORLD_IDS[Math.floor(Math.random() * WORLD_IDS.length)];
}
