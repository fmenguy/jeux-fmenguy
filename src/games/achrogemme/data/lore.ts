/**
 * Codex Achrogemme : biographies des personnages du roman.
 *
 * ⚠️ RÈGLE ABSOLUE : TOUT ce qui est ici doit provenir DIRECTEMENT du canon de
 * l'auteur (page personnages du Tome 1, chapitres du Tome 2). Aucune extrapolation,
 * aucune déduction implicite, aucune relation familiale non écrite explicitement.
 *
 * Source canon Tome 1 : C:/Users/François/Documents/BLOG/Histoires/histoire-elfes/src/pages/personnages.astro
 * Source canon Tome 2 : C:/Users/François/Documents/BLOG/Histoires/histoire-elfes/src/content/tome2/*.md
 */

export interface LoreEntry {
  cardId: string;
  name: string;
  role: string;
  faction: string;
  saga: 'Tome 1' | 'Tome 2' | 'Avant le récit';
  glyph: string;
  bio: string[];
  link?: { label: string; url: string };
}

export const LORE: LoreEntry[] = [
  {
    cardId: 'syl_lilia',
    name: 'Lilia',
    role: 'Protagoniste, petite sœur, elfe exploratrice',
    faction: 'Elfe',
    saga: 'Tome 1',
    glyph: '🏹',
    bio: [
      "La véritable héroïne du Tome 1. Petite sœur curieuse et intrépide, Lilia rêve de découvrir le monde au-delà de la forêt elfique.",
      "Sa quête des fragments d'héritage des elfes la mènera des grottes d'Achronia jusqu'aux lunes de Jupiter.",
      "Cheveux verts, yeux bleus, armure légère en cuir et soie blanche ornée de motifs elfiques.",
      "Apparition : chapitre 1, La grotte et le cristal. Âge : 8 ans elfes (11 humains) au début, 212 ans elfes (20 humains) à la fin du Tome 1.",
    ],
    link: { label: 'Tome 1', url: 'https://elfes.fmenguy.fr/' },
  },
  {
    cardId: 'rem_amelie',
    name: 'Amélie',
    role: 'Protagoniste, grande sœur, elfe d\'Achronia',
    faction: 'Elfe',
    saga: 'Tome 1',
    glyph: '🛡️',
    bio: [
      "Grande sœur de Lilia, Amélie est une elfe protectrice et courageuse.",
      "Portant une imposante armure dorée, elle accompagne sa sœur depuis la première exploration des grottes de cristal.",
      "Elle deviendra la mère de Sylvie avec Skarn, son mari humain. Grande, athlétique et intelligente, c'est le pilier de la famille.",
      "Apparition : chapitre 1. Âge : 80 ans elfes (15 humains) au début, 284 ans elfes (21 humains) à la fin du Tome 1.",
    ],
    link: { label: 'Tome 1', url: 'https://elfes.fmenguy.fr/' },
  },
  {
    cardId: 'arc_sylvie',
    name: 'Sylvie',
    role: 'Protagoniste, haute-elfe, fille d\'Amélie et Skarn',
    faction: 'Haute-elfe',
    saga: 'Tome 2',
    glyph: '🧝‍♀️',
    bio: [
      "Fille de l'humain Skarn et de l'elfe Amélie, Sylvie est la première haute-elfe métisse de deux mondes.",
      "Née au chapitre 12 du Tome 1, elle grandit entre Achronia et Terrania.",
      "Dotée d'un pouvoir de régénération rapide qui la rend quasi immortelle, son éveil magique au chapitre 13 marque un tournant dans l'histoire.",
      "C'est elle qui portera le flambeau de l'aventure dans le Tome 2.",
    ],
    link: { label: 'Tome 2', url: 'https://elfes.fmenguy.fr/tome2/' },
  },
  {
    cardId: 'rem_skarn',
    name: 'Skarn',
    role: 'Allié, humain, mari d\'Amélie',
    faction: 'Humain',
    saga: 'Tome 1',
    glyph: '⚔',
    bio: [
      "Skarn est un humain courageux qui tombera amoureux de l'elfe Amélie malgré la différence de longévité entre leurs espèces.",
      "Père de Sylvie, il incarne le lien entre les mondes humain et elfique.",
      "Il meurt de vieillesse, destin tragique mais naturel d'un humain dans un monde d'elfes (chapitre 17).",
      "Skarn est aussi le pseudo de l'auteur dans le jeu Dofus, auquel il a joué pendant presque 20 ans (2004-2020). Un hommage intégré à l'histoire.",
      "Apparition : chapitre 6, Conflits aux portes de la faille. Âge : 30 ans au début, 85 ans à la fin (décédé).",
    ],
    link: { label: 'Tome 1', url: 'https://elfes.fmenguy.fr/' },
  },
  {
    cardId: 'arc_aldarian',
    name: 'Aldarian',
    role: 'Allié, roi elfe d\'Achronia',
    faction: 'Elfe',
    saga: 'Tome 1',
    glyph: '🧙',
    bio: [
      "Roi des elfes d'Achronia, Aldarian est un souverain sage et mesuré.",
      "Il guide son peuple à travers les bouleversements causés par les failles dimensionnelles et la découverte des mondes parallèles.",
      "Apparition : chapitre 9, Entre science et magie. Âge : 270 ans elfes (21 humains) au début, 351 ans elfes (23 humains) à la fin du Tome 1.",
    ],
    link: { label: 'Tome 1', url: 'https://elfes.fmenguy.fr/' },
  },
  {
    cardId: 'rem_throrin',
    name: 'Throrin',
    role: 'Allié, roi des Nains d\'Achronia',
    faction: 'Nain',
    saga: 'Tome 1',
    glyph: '⚒',
    bio: [
      "Roi des Nains d'Achronia, Throrin est un souverain chaleureux à la barbe luxuriante et aux yeux pétillants de malice.",
      "Avant de monter sur le trône, il a longtemps parcouru les routes avec sa bande de guerriers, dont Dûrin, Bjorn et le magicien Eldor, qu'il garde à ses côtés.",
      "Ami fidèle d'Amélie et de Lilia, il met les forges et les armées naines au service des alliances entre peuples, de la quête des fragments d'héritage jusqu'aux expéditions interdimensionnelles.",
      "Apparition : chapitre 7, Le retour inattendu. Âge : 350 ans.",
    ],
    link: { label: 'Tome 1', url: 'https://elfes.fmenguy.fr/' },
  },
  {
    cardId: 'syl_galdor',
    name: 'Galdor',
    role: 'Nain, technicien et bras droit de l\'équipage de l\'Éclatmaris',
    faction: 'Nain',
    saga: 'Tome 2',
    glyph: '⚒',
    bio: [
      "Nain de courte taille à la crête noire au-dessus d'une barbe tressée, portant un gilet de cuir à rivets, un marteau court dans la main droite.",
      "À sa ceinture, l'armature de communication longue portée qu'il a fabriquée lui-même (trois témoins rouges alignés).",
      "Membre de l'équipage de l'Éclatmaris dans le Tome 2. Il ferme la marche dans les expéditions ; il compense ses jambes courtes en ne s'arrêtant jamais.",
      "Il sent les choses qui se rapprochent avant que les yeux ne les voient.",
      "⚠️ Note : sa carte dans Achrogemme est actuellement en classe Sylvestre, ce qui contredit le canon (Galdor est Nain et technicien). À corriger.",
    ],
    link: { label: 'Tome 2 chapitre 4 · Sandara', url: 'https://elfes.fmenguy.fr/tome2/' },
  },
];
