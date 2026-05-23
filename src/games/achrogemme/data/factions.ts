import type { FactionDef, FactionId } from '../state/types';

export const FACTIONS: Record<FactionId, FactionDef> = {
  elfe: {
    id: 'elfe',
    name: 'Elfe',
    glyph: '☘',
    description: "Peuple d'Achronia. Agile, ancien, élégant.",
  },
  nain: {
    id: 'nain',
    name: 'Nain',
    glyph: '⚒',
    description: "Forgerons des montagnes. Robuste et tenace.",
  },
  humain: {
    id: 'humain',
    name: 'Humain',
    glyph: '⚜',
    description: "Royaumes mortels. Polyvalents, opportunistes.",
  },
  neutre: {
    id: 'neutre',
    name: 'Neutre',
    glyph: '◇',
    description: "Sans faction.",
  },
};
