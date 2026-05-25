export interface LoreEntry {
  cardId: string;
  name: string;
  role: string;
  faction: 'Elfe' | 'Humain' | 'Nain';
  saga: 'Tome 1' | 'Tome 2' | 'Avant le récit';
  glyph: string;
  bio: string[];
  link?: { label: string; url: string };
}

export const LORE: LoreEntry[] = [
  {
    cardId: 'syl_lilia',
    name: 'Lilia',
    role: 'Exploratrice elfe',
    faction: 'Elfe',
    saga: 'Tome 1',
    glyph: '👸',
    bio: [
      "Fille du roi Aldarian, princesse d'Achronia, mais elle s'ennuie ferme à la cour. Lilia préfère les forêts, l'arc, et les chevauchées de nuit.",
      "Dans le Tome 2, elle s'embarque clandestinement à bord de l'Éclatmaris pour suivre Sylvie. Elle apprend les manières de Terre à coup de bourdes joyeuses.",
      "Tante de Sylvie (sœur de sa mère Amélie), elle joue le rôle de grande sœur turbulente. Au Stratagème, elle pioche vite et tire vrai.",
    ],
    link: { label: 'Tome 1', url: 'https://elfes.fmenguy.fr/' },
  },
  {
    cardId: 'arc_aldarian',
    name: 'Aldarian',
    role: 'Roi elfe d\'Achronia',
    faction: 'Elfe',
    saga: 'Tome 1',
    glyph: '🧙',
    bio: [
      "Roi sage et patient du royaume d'Achronia. Lit dans les runes et les silences.",
      "Père de Lilia, beau-père d'Amélie, grand-père de Sylvie. Veille sur les Trois Marches depuis sa tour.",
      "Au Stratagème, ses sortilèges de soin lui permettent de durer là où les guerriers tombent.",
    ],
    link: { label: 'Tome 1', url: 'https://elfes.fmenguy.fr/' },
  },
  {
    cardId: 'rem_throrin',
    name: 'Throrin',
    role: 'Roi des Nains',
    faction: 'Nain',
    saga: 'Tome 1',
    glyph: '⚒',
    bio: [
      "Roi nain joyeux, forgeron émérite, qui rit fort et tape encore plus fort.",
      "Allié de longue date d'Aldarian, il scelle l'alliance entre les Trois Marches contre les hordes orcs du Nord.",
      "Au Stratagème, il combine Charge et Garde : il frappe dès qu'il entre et il encaisse pour les siens.",
    ],
    link: { label: 'Tome 1', url: 'https://elfes.fmenguy.fr/' },
  },
  {
    cardId: 'rem_amelie',
    name: 'Amélie',
    role: 'Guerrière en armure dorée',
    faction: 'Humain',
    saga: 'Tome 1',
    glyph: '🛡️',
    bio: [
      "Mère de Sylvie, épouse de Skarn. Humaine, mais devenue reine du cœur d'Aldarian après son union avec un humain de Terre.",
      "Protectrice acharnée. Son armure dorée s'illumine quand sa famille est en danger.",
      "Au Stratagème, elle frappe deux fois plus fort quand le Champion est en danger : +2 ATQ sous 15 PV.",
    ],
    link: { label: 'Tome 1', url: 'https://elfes.fmenguy.fr/' },
  },
  {
    cardId: 'arc_sylvie',
    name: 'Sylvie',
    role: 'Première haute-elfe métisse',
    faction: 'Elfe',
    saga: 'Tome 2',
    glyph: '🧝‍♀️',
    bio: [
      "Née de Skarn (humain de Terre) et Amélie (humaine adoptée par les Elfes), Sylvie est la première métisse haute-elfe de l'histoire d'Achronia.",
      "Sa physiologie unique lui confère une régénération cellulaire impossible chez les autres elfes.",
      "Dans le Tome 2, elle pilote l'Éclatmaris vers Proxima Centauri pour une mission qui durera neuf années.",
      "Au Stratagème, elle se régénère seule et soigne son Champion à chaque tour. Elle joue ce jeu chaque soir à bord du vaisseau, en mémoire de son père.",
    ],
    link: { label: 'Tome 2', url: 'https://elfes.fmenguy.fr/tome2' },
  },
  {
    cardId: 'rem_skarn',
    name: 'Skarn',
    role: 'Géologue humain, père de Sylvie',
    faction: 'Humain',
    saga: 'Avant le récit',
    glyph: '⚔',
    bio: [
      "Géologue terrien venu sur Achronia par un portail dimensionnel. Tomba amoureux d'Amélie.",
      "Pratiquait le Stratagème comme un maître. C'est lui qui apprit le jeu à Sylvie. Décédé peu avant le Tome 1.",
      "Au Stratagème, sa carte porte sa devise : « Charge, et ne regarde pas en arrière. »",
    ],
    link: { label: 'Tome 2', url: 'https://elfes.fmenguy.fr/tome2' },
  },
  {
    cardId: 'syl_galdor',
    name: 'Galdor',
    role: 'Vieil ami elfe de Sylvie',
    faction: 'Elfe',
    saga: 'Tome 2',
    glyph: '🏹',
    bio: [
      "Ranger elfe, complice fidèle de Sylvie depuis l'enfance.",
      "Dans le Tome 2, il fait partie de l'équipage de l'Éclatmaris. Il assure les longues veilles et garde la salle d'équipage propre.",
      "Au Stratagème, Galdor a une Perce 2 redoutable : il vise les points faibles.",
    ],
    link: { label: 'Tome 2', url: 'https://elfes.fmenguy.fr/tome2' },
  },
];
