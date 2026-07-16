import type { AiProfile, ChampionDef } from '../state/types';

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
    passive: 'Régénération elfique : +1 PV par tour quand elle est sous 15 PV.',
    difficulty: 'facile',
  },
  lilia: {
    id: 'lilia',
    name: 'Lilia',
    hp: 25,
    passive: 'Tir légendaire : ses unités avec Perce gagnent Perce +1 et +1 ATQ.',
    difficulty: 'medium',
  },
  skarn: {
    id: 'skarn',
    name: 'Skarn',
    hp: 25,
    passive: 'Maître de l\'Achrogemme : 6 cartes en main, +1 Gemme max d\'avance.',
    difficulty: 'difficile',
  },
};

/** Profils de jeu des IA. Plus l'adversaire est fort, plus il joue juste. */
export const AI_PROFILES: Record<string, AiProfile> = {
  sylvie: { killScoreMin: 6, healBelow: 10, handLimit: 5, smartPlacement: false },
  lilia: { killScoreMin: 6, healBelow: 10, handLimit: 5, smartPlacement: true },
  skarn: { killScoreMin: 7, healBelow: 12, handLimit: 6, smartPlacement: true },
};

/** Deck de Sylvie : équilibré, tel que Skarn le lui a appris. */
const SYLVIE_DECK: string[] = [
  'syl_eclaireur', 'syl_eclaireur', 'syl_archer', 'syl_archer_exp',
  'syl_chasseresse', 'syl_rodeur', 'syl_druide',
  'arc_novice', 'arc_apprenti', 'arc_sentinelle', 'arc_erudit',
  'arc_meditant', 'arc_runiste_nain',
  'rem_milicien', 'rem_garde_nain', 'rem_sentinelle_elfe', 'rem_marteau',
  'rem_maraudeur',
  'sort_souffle', 'sort_volee', 'sort_runes',
];

/** Deck de Lilia : le squelette de Sylvie, affûté par l'expérience
    (un espion nain, un gardien des grottes qu'elle connaît bien). */
const LILIA_DECK: string[] = [
  'syl_eclaireur', 'syl_grimnir', 'syl_archer', 'syl_archer_exp',
  'syl_chasseresse', 'syl_rodeur', 'syl_druide',
  'arc_novice', 'arc_apprenti', 'arc_sentinelle', 'arc_erudit',
  'arc_meditant', 'arc_runiste_nain',
  'rem_creature_grottes', 'rem_garde_nain', 'rem_sentinelle_elfe', 'rem_marteau',
  'rem_maraudeur',
  'sort_souffle', 'sort_volee', 'sort_embuscade',
];

/** Deck de Skarn : les alliances d'Achronia, gros finisseurs et Trinités. */
const SKARN_DECK: string[] = [
  'syl_archer', 'syl_archer_exp', 'syl_chasseresse', 'syl_grimnir',
  'arc_apprenti', 'arc_erudit', 'arc_runiste_nain', 'arc_solene', 'arc_eldor',
  'arc_doyen',
  'rem_garde_nain', 'rem_guerrier_fort', 'rem_bjorn', 'rem_trago',
  'rem_tonnerre', 'rem_maraudeur', 'rem_wulfric', 'rem_krotork',
  'sort_souffle', 'sort_embuscade', 'sort_runes', 'sort_resonance',
  'sort_mobius', 'sort_arc_lilia',
];

export const AI_DECKS: Record<string, string[]> = {
  sylvie: SYLVIE_DECK,
  lilia: LILIA_DECK,
  skarn: SKARN_DECK,
};

/** Nombre de victoires nécessaires pour débloquer chaque adversaire. */
export const OPPONENT_UNLOCK_WINS: Record<string, number> = {
  sylvie: 0,
  lilia: 2,
  skarn: 5,
};

export const OPPONENT_ORDER: string[] = ['sylvie', 'lilia', 'skarn'];
