import type { ClasseDef, ClasseId } from '../state/types';

export const CLASSES: Record<ClasseId, ClasseDef> = {
  sylvestre: {
    id: 'sylvestre',
    name: 'Sylvestre',
    short: 'Sylv.',
    glyph: '🏹',
    color: '#4ea34a',
    laneIndex: 0,
    description: "Archers du Bois. Précision, harcèlement, tir direct.",
  },
  arcanique: {
    id: 'arcanique',
    name: 'Arcanique',
    short: 'Arc.',
    glyph: '✨',
    color: '#3b82d8',
    laneIndex: 1,
    description: "Mages des Plaines. Soin, magie, contrôle.",
  },
  rempart: {
    id: 'rempart',
    name: 'Rempart',
    short: 'Rem.',
    glyph: '⚔',
    color: '#c44a3c',
    laneIndex: 2,
    description: "Guerriers des Forteresses. Garde, endurance, brute.",
  },
};

export const LANE_TO_CLASSE: Record<0 | 1 | 2, ClasseId> = {
  0: 'sylvestre',
  1: 'arcanique',
  2: 'rempart',
};
