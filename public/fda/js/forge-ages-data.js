// FDA · Registre des ages tardifs (5 a 8).
//
// Ce fichier est du CONTENU pur, sans logique. C'est le document de design
// vivant : ajouter un batiment, une ressource ou un metier se fait ici et
// nulle part ailleurs. Le moteur (forge-ages.js) s'occupe du reste.
//
// Il est ecrit pour se transposer directement dans les techtree.json /
// buildings.json / jobs.json du jeu voxel Strates, dont les ages 5 a 8 sont
// encore vides.
//
// REGLES DU REGISTRE
//  . Les ids sont en anglais camelCase, les noms affiches en francais.
//  . Un age possede exactement UN batiment portant unlocksAge : le batiment de
//    seuil. Le construire fait entrer dans l'age. Il ne doit couter que des
//    ressources deja disponibles a la fin de l'age precedent, sinon le jeu se
//    bloque.
//  . produces et consumes sont exprimes par seconde et par exemplaire.
//  . Un batiment ne produit que si TOUTES ses consommations sont couvertes.
//  . Les effets speciaux reconnus par le moteur :
//      globalProduction   : +x sur toute la production industrielle
//      researchMultiplier : +x sur la production de savoir
//      buildingSlots      : +x batiments autorises par village
//      populationCap      : +x habitants autorises par village
//      autoCraftTools     : fabrique x manteaux ou remedes par seconde
//      endgame            : declenche la fin de partie
//
// Ressources core disponibles (definies dans forge-game.js) : berries, wood,
// stone, water, meat, fibers, metals, herbs, wheat, flour, bread.

export const AGE_STEAM = 'Âge de la Vapeur';
export const AGE_MACHINES = 'Âge des Machines';
export const AGE_ATOM = 'Âge de l’Atome';
export const AGE_STARS = 'Âge des Étoiles';

export const LATE_AGES = [
  // ==========================================================
  // 5 · Âge de la Vapeur
  // Le charbon devient le sang de la civilisation. Il introduit le Savoir,
  // qui donne enfin un usage aux chercheurs et sert de monnaie aux ages 6 a 8.
  // ==========================================================
  {
    id: 'steam',
    name: AGE_STEAM,
    index: 5,
    icon: '⚙️',
    tone: 'steam',
    tooltip: 'Le charbon brûle, la vapeur pousse, les machines ne dorment jamais.',
    resources: [
      { id: 'coal', name: 'Charbon', icon: '⚫', max: 5000, tooltip: 'Le charbon alimente les fonderies, les machines et les centrales.' },
      { id: 'steel', name: 'Acier', icon: '🔩', max: 3000, tooltip: 'L’acier naît du métal fondu au charbon. Il bâtit tout ce qui vient après.' },
      { id: 'knowledge', name: 'Savoir', icon: '📚', max: 10000, tooltip: 'Le savoir s’accumule grâce aux chercheurs et aux universités. Il ouvre les âges suivants.' },
    ],
    buildings: [
      {
        id: 'coalMine',
        name: 'Mine de charbon',
        icon: '⛏️',
        tooltip: 'Creuse la veine noire. Premier pas hors de l’âge agricole.',
        cost: { wood: 150, stone: 100, metals: 25 },
        produces: { coal: 0.5 },
        consumes: {},
        unlocksAge: AGE_STEAM,
        effect: 'none',
        narrative: 'La première veine de charbon est ouverte. Une fumée noire monte au dessus des toits.',
      },
      {
        id: 'foundry',
        name: 'Fonderie',
        icon: '🔥',
        tooltip: 'Fond le métal au charbon pour en tirer de l’acier. S’arrête si le charbon manque.',
        cost: { wood: 120, stone: 60, metals: 20, coal: 40 },
        produces: { steel: 0.2 },
        consumes: { coal: 0.5, metals: 0.2 },
        effect: 'none',
        narrative: 'La fonderie rugit. Le métal coule, rouge, et devient acier.',
      },
      {
        id: 'steamEngine',
        name: 'Machine à vapeur',
        icon: '♨️',
        tooltip: 'Accélère toute l’industrie de 10 pour cent. Boit du charbon et de l’eau.',
        cost: { wood: 100, stone: 40, coal: 30, steel: 20 },
        produces: {},
        consumes: { coal: 0.5, water: 1 },
        effect: 'globalProduction',
        effectValue: 0.1,
        narrative: 'Le piston part, revient, repart. La machine ne se plaint jamais.',
      },
      {
        id: 'university',
        name: 'Université',
        icon: '🎓',
        tooltip: 'Produit du savoir et rend tes chercheurs enfin utiles.',
        cost: { wood: 150, stone: 80, steel: 15 },
        produces: { knowledge: 0.2 },
        consumes: {},
        effect: 'researchMultiplier',
        effectValue: 0.5,
        narrative: 'Une université ouvre ses portes. Tes chercheurs ont enfin où poser leurs livres.',
      },
    ],
    workers: [
      {
        id: 'engineer',
        name: 'Ingénieur',
        icon: '🛠️',
        tooltip: 'Un ingénieur forge de l’acier à la main et entretient les machines.',
        cost: { wood: 20, metals: 10, coal: 5 },
        produces: { steel: 0.05 },
        narrative: 'Un ingénieur rejoint la cité. Il dessine avant de bâtir.',
      },
    ],
    techItems: [
      { icon: '⛏️', label: 'Mine de charbon', checkId: 'coalMine', checkMin: 1 },
      { icon: '⚫', label: 'Charbon', checkId: 'coal', checkMin: 1 },
      { icon: '🔥', label: 'Fonderie', checkId: 'foundry', checkMin: 1 },
      { icon: '🔩', label: 'Acier', checkId: 'steel', checkMin: 1 },
      { icon: '♨️', label: 'Machine à vapeur', checkId: 'steamEngine', checkMin: 1 },
      { icon: '🎓', label: 'Université', checkId: 'university', checkMin: 1 },
      { icon: '📚', label: 'Savoir', checkId: 'knowledge', checkMin: 1 },
      { icon: '🛠️', label: 'Ingénieur', checkId: 'engineer', checkMin: 1 },
    ],
  },

  // ==========================================================
  // 6 · Âge des Machines
  // L'electricite remplace le muscle. L'Usine soulage enfin le joueur de la
  // fabrication manuelle des manteaux et des remedes.
  // ==========================================================
  {
    id: 'machines',
    name: AGE_MACHINES,
    index: 6,
    icon: '⚡',
    tone: 'electric',
    tooltip: 'La lumière ne dépend plus du soleil, et le rail rapproche les villages.',
    resources: [
      { id: 'electricity', name: 'Électricité', icon: '⚡', max: 5000, tooltip: 'L’électricité fait tourner les mines profondes, les usines et les réacteurs.' },
      { id: 'copper', name: 'Cuivre', icon: '🟤', max: 3000, tooltip: 'Le cuivre conduit le courant. Rien d’électrique ne se bâtit sans lui.' },
    ],
    buildings: [
      {
        id: 'powerPlant',
        name: 'Centrale électrique',
        icon: '🔌',
        tooltip: 'Brûle du charbon et en tire du courant. Ouvre l’Âge des Machines.',
        cost: { wood: 200, stone: 100, steel: 60, coal: 120 },
        produces: { electricity: 1.5 },
        consumes: { coal: 0.6 },
        unlocksAge: AGE_MACHINES,
        effect: 'none',
        narrative: 'La centrale s’allume. Pour la première fois, la nuit recule sans feu.',
      },
      {
        id: 'deepMine',
        name: 'Mine profonde',
        icon: '🕳️',
        tooltip: 'Descend là où la pioche ne va pas. Rapporte du cuivre et du métal.',
        cost: { wood: 150, steel: 120, copper: 0, electricity: 60 },
        produces: { copper: 0.3, metals: 0.2 },
        consumes: { electricity: 0.5 },
        effect: 'none',
        narrative: 'La mine profonde s’enfonce sous la roche. Le cuivre affleure.',
      },
      {
        id: 'factory',
        name: 'Usine',
        icon: '🏭',
        tooltip: 'Fabrique seule les manteaux et les remèdes de tes villageois. Sans courant, elle s’arrête.',
        cost: { steel: 100, copper: 80, electricity: 100 },
        produces: {},
        consumes: { electricity: 1 },
        effect: 'autoCraftTools',
        effectValue: 1,
        narrative: 'L’usine tourne. Plus personne ne coud un manteau à la main.',
      },
      {
        id: 'trainStation',
        name: 'Gare',
        icon: '🚉',
        tooltip: 'Le rail relie les villages : chacun peut accueillir 2 bâtiments de plus.',
        cost: { steel: 150, copper: 100, coal: 120 },
        produces: {},
        consumes: {},
        effect: 'buildingSlots',
        effectValue: 2,
        narrative: 'Le premier train siffle. Les villages ne sont plus des îles.',
      },
    ],
    workers: [
      {
        id: 'machinist',
        name: 'Machiniste',
        icon: '👷',
        tooltip: 'Entretient les turbines et récupère le courant perdu.',
        cost: { copper: 15, steel: 10 },
        produces: { electricity: 0.15 },
        narrative: 'Un machiniste prend son poste. Il écoute les machines comme on écoute un cheval.',
      },
    ],
    techItems: [
      { icon: '🔌', label: 'Centrale électrique', checkId: 'powerPlant', checkMin: 1 },
      { icon: '⚡', label: 'Électricité', checkId: 'electricity', checkMin: 1 },
      { icon: '🕳️', label: 'Mine profonde', checkId: 'deepMine', checkMin: 1 },
      { icon: '🟤', label: 'Cuivre', checkId: 'copper', checkMin: 1 },
      { icon: '🏭', label: 'Usine', checkId: 'factory', checkMin: 1 },
      { icon: '🚉', label: 'Gare', checkId: 'trainStation', checkMin: 1 },
      { icon: '👷', label: 'Machiniste', checkId: 'machinist', checkMin: 1 },
    ],
  },

  // ==========================================================
  // 7 · Âge de l'Atome
  // La promesse : produire sans bras. L'Automate extrait des ressources sans
  // consommer un seul villageois.
  // ==========================================================
  {
    id: 'atom',
    name: AGE_ATOM,
    index: 7,
    icon: '⚛️',
    tone: 'atom',
    tooltip: 'Une pierre jaune contient plus de feu que toutes tes forêts.',
    resources: [
      { id: 'uranium', name: 'Uranium', icon: '☢️', max: 1000, tooltip: 'L’uranium nourrit les réacteurs. Rare, lent à extraire, prodigieux.' },
    ],
    buildings: [
      {
        id: 'uraniumMine',
        name: 'Mine d’uranium',
        icon: '⛏️',
        tooltip: 'Extrait la pierre jaune. Ouvre l’Âge de l’Atome.',
        cost: { steel: 200, copper: 120, electricity: 150, knowledge: 300 },
        produces: { uranium: 0.15 },
        consumes: { electricity: 1 },
        unlocksAge: AGE_ATOM,
        effect: 'none',
        narrative: 'La pierre jaune sort de terre. On la manipule avec des pinces et du respect.',
      },
      {
        id: 'reactor',
        name: 'Réacteur nucléaire',
        icon: '☢️',
        tooltip: 'Dix centrales dans un seul bâtiment. Boit de l’uranium et beaucoup d’eau.',
        cost: { steel: 300, copper: 200, uranium: 80, knowledge: 500 },
        produces: { electricity: 15 },
        consumes: { uranium: 0.05, water: 4 },
        effect: 'none',
        narrative: 'Le réacteur diverge. La ville entière s’éclaire d’un coup.',
      },
      {
        id: 'automaton',
        name: 'Automate',
        icon: '🤖',
        tooltip: 'Extrait et forge sans aucun villageois. Fabrique aussi manteaux et remèdes.',
        cost: { steel: 400, copper: 300, electricity: 250, knowledge: 700, uranium: 30 },
        produces: { metals: 0.5, steel: 0.3, copper: 0.2 },
        consumes: { electricity: 3 },
        effect: 'autoCraftTools',
        effectValue: 2,
        narrative: 'L’automate travaille. Il ne mange pas, ne dort pas, ne se plaint pas.',
      },
      {
        id: 'metropolis',
        name: 'Métropole',
        icon: '🏙️',
        tooltip: 'Chaque village peut abriter 250 habitants de plus.',
        cost: { steel: 600, copper: 400, electricity: 400, knowledge: 1000 },
        produces: { knowledge: 0.5 },
        consumes: { electricity: 4, water: 6 },
        effect: 'populationCap',
        effectValue: 250,
        narrative: 'La métropole s’étend. On ne voit plus la campagne depuis le centre.',
      },
    ],
    workers: [
      {
        id: 'physicist',
        name: 'Physicien',
        icon: '🔬',
        tooltip: 'Perce le secret de l’atome et accélère le savoir.',
        cost: { electricity: 100, steel: 60, knowledge: 50 },
        produces: { knowledge: 0.3 },
        narrative: 'Un physicien arrive. Il pose plus de questions qu’il n’apporte de réponses.',
      },
    ],
    techItems: [
      { icon: '⛏️', label: 'Mine d’uranium', checkId: 'uraniumMine', checkMin: 1 },
      { icon: '☢️', label: 'Uranium', checkId: 'uranium', checkMin: 1 },
      { icon: '☢️', label: 'Réacteur nucléaire', checkId: 'reactor', checkMin: 1 },
      { icon: '🤖', label: 'Automate', checkId: 'automaton', checkMin: 1 },
      { icon: '🏙️', label: 'Métropole', checkId: 'metropolis', checkMin: 1 },
      { icon: '🔬', label: 'Physicien', checkId: 'physicist', checkMin: 1 },
    ],
  },

  // ==========================================================
  // 8 · Âge des Étoiles
  // Ebauche. La Fusee cloture la partie et amorce le cycle planetaire, qui
  // reste a ecrire.
  // ==========================================================
  {
    id: 'stars',
    name: AGE_STARS,
    index: 8,
    icon: '🌌',
    tone: 'cosmos',
    tooltip: 'Le ciel cesse d’être un plafond.',
    resources: [
      { id: 'fuel', name: 'Carburant', icon: '⛽', max: 20000, tooltip: 'Le carburant arrache une fusée à la Terre. Il en faut une quantité déraisonnable.' },
      { id: 'components', name: 'Composants', icon: '🧩', max: 10000, tooltip: 'Pièces de haute précision assemblées en orbite.' },
    ],
    buildings: [
      {
        id: 'controlTower',
        name: 'Tour de contrôle',
        icon: '📡',
        tooltip: 'Ouvre l’Âge des Étoiles et coordonne 3 bâtiments de plus par village.',
        cost: { steel: 500, copper: 400, uranium: 100, electricity: 300, knowledge: 1500 },
        produces: {},
        consumes: {},
        unlocksAge: AGE_STARS,
        effect: 'buildingSlots',
        effectValue: 3,
        narrative: 'La tour de contrôle scrute le ciel. Quelqu’un, en bas, commence à rêver de le quitter.',
      },
      {
        id: 'refinery',
        name: 'Raffinerie',
        icon: '🛢️',
        tooltip: 'Transforme l’eau et le courant en carburant.',
        cost: { steel: 400, copper: 200, knowledge: 800 },
        produces: { fuel: 1.5 },
        consumes: { electricity: 2, water: 3 },
        effect: 'none',
        narrative: 'La raffinerie crache sa première goutte de carburant.',
      },
      {
        id: 'orbitalStation',
        name: 'Station orbitale',
        icon: '🛰️',
        tooltip: 'Assemble des composants en apesanteur et double la recherche.',
        cost: { steel: 800, copper: 600, fuel: 1000, knowledge: 1200 },
        produces: { components: 0.5 },
        consumes: { electricity: 5, steel: 0.5 },
        effect: 'researchMultiplier',
        effectValue: 1,
        narrative: 'La station tient en orbite. D’en haut, les villages tiennent dans une main.',
      },
      {
        id: 'rocket',
        name: 'Fusée',
        icon: '🚀',
        tooltip: 'L’aboutissement. La construire met fin à la partie et ouvre le cycle planétaire.',
        cost: { fuel: 6000, components: 3000, steel: 1500, uranium: 200, knowledge: 3000 },
        produces: {},
        consumes: {},
        effect: 'endgame',
        narrative: 'La fusée est prête. Le compte à rebours commence.',
      },
    ],
    workers: [
      {
        id: 'pilot',
        name: 'Pilote',
        icon: '🧑‍🚀',
        tooltip: 'Le premier humain à regarder son monde depuis le vide.',
        cost: { fuel: 150, electricity: 50, knowledge: 100 },
        produces: { knowledge: 0.2 },
        narrative: 'Un pilote s’avance. Il a compris avant les autres qu’il ne reviendrait peut être pas.',
      },
    ],
    techItems: [
      { icon: '📡', label: 'Tour de contrôle', checkId: 'controlTower', checkMin: 1 },
      { icon: '🛢️', label: 'Raffinerie', checkId: 'refinery', checkMin: 1 },
      { icon: '⛽', label: 'Carburant', checkId: 'fuel', checkMin: 1 },
      { icon: '🛰️', label: 'Station orbitale', checkId: 'orbitalStation', checkMin: 1 },
      { icon: '🧩', label: 'Composants', checkId: 'components', checkMin: 1 },
      { icon: '🧑‍🚀', label: 'Pilote', checkId: 'pilot', checkMin: 1 },
      { icon: '🚀', label: 'Fusée', checkId: 'rocket', checkMin: 1 },
    ],
  },
];
