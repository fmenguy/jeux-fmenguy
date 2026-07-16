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
    cardId: 'arc_galdor',
    name: 'Galdor',
    role: 'Nain, ingénieur de l\'Éclatmaris',
    faction: 'Nain',
    saga: 'Tome 2',
    glyph: '⚒',
    bio: [
      "Nain de courte taille à la crête noire au-dessus d'une barbe tressée, portant un gilet de cuir à rivets, un marteau court dans la main droite.",
      "Il a construit l'Éclatmaris de ses mains : six cents mètres de cloisons soudées. À sa ceinture, l'armature de communication longue portée qu'il a fabriquée lui-même (trois témoins rouges alignés).",
      "Présent dès le Tome 1 : machine de transfert magie/électricité, équipe spatiale, premier Achronaute avec Lilia.",
      "Insensible à la télépathie : sa pensée est d'une autre texture. Marié depuis 150 ans, huit enfants nains restés sur Achronia.",
      "Il sent les choses qui se rapprochent avant que les yeux ne les voient.",
    ],
    link: { label: 'Tome 2 chapitre 4 · Sandara', url: 'https://elfes.fmenguy.fr/tome2/' },
  },
  {
    cardId: 'arc_naelia',
    name: 'Naelia',
    role: 'Elfe érudite de Valandor',
    faction: 'Elfe',
    saga: 'Tome 2',
    glyph: '✨',
    bio: [
      "Elfe érudite de Valandor, six cents ans. Traits asiatiques, cheveux noirs, robe verte brodée d'or.",
      "Elle porte un astrolabe compact qui lit les champs d'énergie, et maîtrise la magie elfique ancienne.",
      "Sur Sandara, elle pose la paume entière sur la colonne vélanthie et en ressort, après une transe violente, porteuse des onze coordonnées des autres dépôts.",
      "Elle sent avant de comprendre, parle peu, répond de biais, et trouve beau ce qui inquiète.",
    ],
    link: { label: 'Tome 2', url: 'https://elfes.fmenguy.fr/tome2/' },
  },
  {
    cardId: 'rem_kahor',
    name: 'Kahor',
    role: 'Gardien de la balise de Sandara',
    faction: 'Neutre',
    saga: 'Tome 2',
    glyph: '🦎',
    bio: [
      "Grand reptile qui pense. Écailles vert sombre ternies, crocs inégaux cassés, yeux ambrés fendus, posture de lézard au soleil.",
      "Il garde l'entrée de la balise depuis plus de trois mille ans, et parle à voix haute avec un accent rauque.",
      "Il échange le passage vers la balise contre des histoires : Lilia paie avec Zandoria et Arin, Naelia avec son enfance à la tour des Comptes de Valandor.",
      "Il en sait plus qu'il ne dit sur les Vélanthis, ceux que les Sandiar appellent « les ressemblants ».",
    ],
    link: { label: 'Tome 2 chapitres 4-6', url: 'https://elfes.fmenguy.fr/tome2/' },
  },
  {
    cardId: 'rem_trago',
    name: 'Trago',
    role: 'Nain restaurateur d\'artefacts, neveu de Galdor',
    faction: 'Nain',
    saga: 'Tome 2',
    glyph: '⚒',
    bio: [
      "Nain restaurateur d'artefacts, neveu de Galdor, qu'il connaît depuis la cité naine d'Achronia.",
      "Il voyage à bord du vaisseau colon de la flotte, où il s'occupe des artefacts nains de terraformation embarqués.",
    ],
    link: { label: 'Tome 2', url: 'https://elfes.fmenguy.fr/tome2/' },
  },
  {
    cardId: 'arc_pretresse',
    name: 'Prêtresse de l\'eau',
    role: 'Gardienne de la balise, guide des Sandiar',
    faction: 'Humaine de Sandara',
    saga: 'Tome 2',
    glyph: '💧',
    bio: [
      "Humaine sandarienne, gardienne de la balise de mère en fille, au cœur d'une théocratie douce.",
      "Robe pâle bleutée superposée, collier de coquillages, scarifications fines autour des yeux, spirale d'ocre rouge au front.",
      "Télépathe : elle parle « derrière l'oreille » aux elfes. Galdor, lui, ne l'entend pas.",
      "Son peuple, les Sandiar, descend des 814 humains déposés par les Vélanthis il y a 3412 cycles.",
    ],
    link: { label: 'Tome 2 chapitre 4 · Sandara', url: 'https://elfes.fmenguy.fr/tome2/' },
  },
];
