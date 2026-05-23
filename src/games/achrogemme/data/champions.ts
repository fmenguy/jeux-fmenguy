import type { ChampionDef } from '../state/types';

export const CHAMPIONS: Record<string, ChampionDef> = {
  joueur: {
    id: 'joueur',
    name: 'Voyageur',
    hp: 25,
    passive: 'Bienvenue dans l\'Achrogemme.',
    difficulty: 'facile',
  },
  sylvie: {
    id: 'sylvie',
    name: 'Sylvie',
    hp: 25,
    passive: "Régénération elfique légère.",
    difficulty: 'facile',
  },
  lilia: {
    id: 'lilia',
    name: 'Lilia',
    hp: 25,
    passive: "Joueuse offensive, presse l'adversaire.",
    difficulty: 'medium',
  },
  skarn: {
    id: 'skarn',
    name: 'Skarn',
    hp: 25,
    passive: "Maître de l'Achrogemme. Anticipe deux tours.",
    difficulty: 'difficile',
  },
};
