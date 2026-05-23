import type { ChampionDef } from '../state/types';

export const CHAMPIONS: Record<string, ChampionDef> = {
  joueur: {
    id: 'joueur',
    name: 'Voyageur',
    hp: 25,
    passive: 'Bienvenue dans le Stratagème.',
  },
  sylvie: {
    id: 'sylvie',
    name: 'Sylvie',
    hp: 25,
    passive: "Régénération elfique légère.",
  },
};
