import * as THREE from 'three'

// ============================================================================
// Constantes globales du prototype Strates
// ============================================================================

export const GRID = 96
export const MAX_STRATES = 10
export const MIN_STRATES = 1
export const WATER_LEVEL = 1.0
export const SHALLOW_WATER_LEVEL = 1.6
export const EDGE_DEEP_RING = 5
export const EDGE_SHALLOW_RING = 4
export const FALLOFF_SPAN = 12
export const VOXEL = 1
export const COLONIST_SPEED = 2.0
export const WORK_DURATION = 2.0
export const MAX_STEP = 2
export const GRAVITY = 20
export const MAX_TREES = 6000
export const MAX_ROCKS = 3000
export const MAX_ORES = 3000
export const MAX_CRYSTALS = MAX_ORES * 4
export const MAX_BUSHES = 3000
export const MAX_BUSH_LEAVES = MAX_BUSHES * 5
export const MAX_BUSH_BERRIES = MAX_BUSHES * 4
export const BERRIES_PER_BUSH = 3
export const HARVEST_DURATION = 1.5
export const HARVEST_RADIUS = 8
export const BERRY_REGEN_INTERVAL = 20

// ============================================================================
// Identite des colons
// ============================================================================
export const MALE_NAMES = [
  'Antoine', 'Anthonin', 'Belkacem', 'Frédéric', 'Vincent', 'Eric',
  'Christophe', 'Alexandru', 'Gerard', 'Guillaume', 'Emeric', 'Mickaël',
  'Paul', 'Jeremy', 'Joé', 'William', 'Lucas', 'Valentin', 'Nicolas',
  'Alexis', 'François'
]
export const FEMALE_NAMES = [
  'Alexie', 'Nina', 'Catherine', 'Audrey', 'Emma', 'Alyssa', 'Hortense',
  'Margaux', 'Sophie', 'Claire', 'Julie', 'Amélie', 'Marion', 'Céline',
  'Pauline', 'Chloé', 'Manon', 'Lucie', 'Léa', 'Sarah', 'Lou'
]
export const GENDER_COLORS = { M: '#4a7fc0', F: '#d06b8e' }
export const GENDER_SYMBOLS = { M: '\u2642', F: '\u2640' }
export const CHIEF_NAME = 'François'
export const CHIEF_STAR = '\u2605'
export const CHIEF_COLOR = '#f2c94c'

// ============================================================================
// Palette couleurs terrain
// ============================================================================
export const COL = {
  grass: new THREE.Color('#7cc06a'),
  grassDark: new THREE.Color('#5ea24d'),
  forest: new THREE.Color('#3f7a3a'),
  sand: new THREE.Color('#e8cf8e'),
  sandDark: new THREE.Color('#cfb374'),
  rock: new THREE.Color('#a8a196'),
  rockDark: new THREE.Color('#8a8378'),
  snow: new THREE.Color('#f2f2ee'),
  dirt: new THREE.Color('#8c6a43'),
  field: new THREE.Color('#d9b755'),
  designate: new THREE.Color('#d6493a'),
  flash: new THREE.Color('#ffffff'),
}

// ============================================================================
// Filons
// ============================================================================
export const ORE_TYPES = {
  'ore-gold':      { label: 'or',        rock: new THREE.Color('#e8c547'), crystal: new THREE.Color('#ffe98a') },
  'ore-copper':    { label: 'cuivre',    rock: new THREE.Color('#c97a4a'), crystal: new THREE.Color('#e8a47a') },
  'ore-silver':    { label: 'argent',    rock: new THREE.Color('#d8dde0'), crystal: new THREE.Color('#f4f7f9') },
  'ore-iron':      { label: 'fer',       rock: new THREE.Color('#7d8a9a'), crystal: new THREE.Color('#b4c0cc') },
  'ore-coal':      { label: 'charbon',   rock: new THREE.Color('#2a2a2a'), crystal: new THREE.Color('#5a5a5a') },
  'ore-amethyst':  { label: 'amethyste', rock: new THREE.Color('#9b6bd6'), crystal: new THREE.Color('#c9a6ef') }
}
export const ORE_KEYS = Object.keys(ORE_TYPES)

// ============================================================================
// Stocks
// ============================================================================
export const STOCK_KEYS = ['stone', 'dirt', 'copper', 'silver', 'iron', 'coal', 'gold', 'amethyst']
export const STOCK_LABELS = {
  stone: 'pierre', dirt: 'terre',
  copper: 'cuivre', silver: 'argent', iron: 'fer',
  coal: 'charbon', gold: 'or', amethyst: 'amethyste'
}
export const ORE_TO_STOCK = {
  'ore-gold': 'gold',
  'ore-copper': 'copper',
  'ore-silver': 'silver',
  'ore-iron': 'iron',
  'ore-coal': 'coal',
  'ore-amethyst': 'amethyst'
}

// ============================================================================
// Tech tree
// ============================================================================
export const RESEARCH_TICK = 3.0
export const ORE_TECH = {
  'ore-copper': 'pick-bronze',
  'ore-coal': 'pick-bronze',
  'ore-iron': 'pick-iron',
  'ore-silver': 'pick-iron',
  'ore-gold': 'pick-gold',
  'ore-amethyst': 'pick-gold'
}

// ============================================================================
// Selection de strate
// ============================================================================
export const STRATA_MAX = 200

// ============================================================================
// Bulles contextuelles et speech
// ============================================================================
export const SPEECH_LINES = [
  "Qu'est-ce qu'on fait ?",
  "Il fait beau ici.",
  "Je me sens utile a rien.",
  "On attend quoi au juste ?",
  "Regarde, un oiseau.",
  "J'ai un peu faim.",
  "Bon, et maintenant ?",
  "Je commence a m'ennuyer.",
  "Tu crois qu'il va pleuvoir ?",
  "On pourrait construire quelque chose.",
  "Je vais faire un tour.",
  "Quelqu'un a vu le chef ?",
  "Ca pousse bien par ici.",
  "J'aime bien cet endroit.",
  "Je prends racine la.",
  "Joli panorama.",
  "Mes pieds me font mal.",
  "On va camper ici ?",
  "Un peu de musique, non ?",
  "J'ai oublie mon chapeau.",
  "C'est loin, le prochain age ?",
  "On devrait construire quelque chose.",
  "J'ai reve qu'on avait une forge.",
  "C'est quand le repas ?",
  "Y'a quelqu'un qui sait faire du pain ?",
  "Je cherche une bonne raison de bouger.",
  "Le sol est dur par ici.",
  "Toi tu travailles ou tu flanes ?",
  "T'as vu comme le soleil est bas ?"
]

export const SPEECH_LINES_BY_NAME = {
  'François': [
    "Claude m'aide beaucoup en ce moment.",
    "Encore plein d'idees en tete.",
    "C'est quand que je reprends l'escalade ?",
    "Je bosse sur FDA en ce moment.",
    "Je bosse sur Strates en ce moment.",
    "Je suis en train de faire des images.",
    "J'ecris une histoire.",
    "Attends je reviens, je cuisine.",
    "J'ai plein d'idees mais pas assez de quota.",
    "Il faudrait que je dorme plus tot.",
    "Bon, encore une derniere modif.",
  ],
  'Frédéric': [
    "Tu as mis ta carte a jour ?",
    "T'as pousse sur main ?",
    "Je check ca demain.",
    "Attends, faut que je relise le ticket.",
    "C'est en prod ?",
  ],
  'Belkacem': [
    "Pause cafe ?",
    "T'as mange ce midi ?",
    "Reunion dans 5 minutes.",
    "Je suis en tele-travail aujourd'hui.",
    "Le wifi tient pas ici.",
  ],
  'Antoine': [
    "Bref.",
    "Non mais attends.",
    "Chu en train de reflechir.",
    "C'est quoi le plan ?",
  ],
  'Vincent': [
    "J'ai une idee, mais je sais pas si c'est bon.",
    "On teste et on voit.",
    "C'est pas si complique en fait.",
  ],
  'Gerard': [
    "De mon temps on faisait ca differemment.",
    "J'ai vu pire.",
    "Ca marche, non ?",
  ],
  'Lou': [
    "J'ai un mauvais feeling.",
    "Ca va aller, je pense.",
    "Quelqu'un a un plan B ?",
  ],
  'Sophie': [
    "On pourrait aussi essayer autrement.",
    "Moi j'aurais fait ca a gauche.",
    "C'est propre comme endroit.",
  ],
  'Pauline': [
    "Je note ca quelque part.",
    "On fait une retrospective ?",
    "Bonne ambiance quand meme.",
  ],
  'Lucie': [
    "Je suis fatiguee mais ca va.",
    "On arrete a quelle heure ?",
    "Quelqu'un a du the ?",
  ],
}
export const SPEECH_LINES_INSISTENT = [
  "Tu dors ou quoi ?",
  "Allez, du boulot !",
  "Bouge, patron !",
  "On va moisir la.",
  "Tu nous as oublies ?",
  "Donne nous quelque chose a faire."
]
export const SPEECH_CONTEXT_SEASON = {
  spring: [
    "Ca sent bon le printemps !",
    "Regardez, les fleurs reviennent.",
    "Enfin le soleil !",
    "C'est le moment de planter.",
    "L'hiver est fini, ouf.",
    "Ca pousse bien en ce moment.",
    "J'adore cette periode de l'annee.",
  ],
  summer: [
    "Il fait chaud aujourd'hui...",
    "J'aurais bien besoin d'eau.",
    "L'ete deja, comme c'est passe vite.",
    "Ca pousse bien avec ce soleil.",
    "Plein soleil, parfait pour bosser.",
    "Je fonds dans mes habits.",
    "L'ombre des arbres ca fait du bien.",
  ],
  autumn: [
    "Les feuilles changent de couleur.",
    "Ca sent l'automne.",
    "Faudrait stocker pour l'hiver.",
    "Le vent se leve.",
    "J'espere qu'on a assez de reserves.",
    "L'air est frais ce matin.",
    "Joli, toutes ces couleurs.",
  ],
  winter: [
    "Brrr, il fait froid.",
    "Ma cape ne suffit plus.",
    "On se les gele ici !",
    "Je vois mon souffle.",
    "L'hiver sera long, j'espere qu'on a du stock.",
    "Je reste pas dehors longtemps.",
    "Au moins c'est calme.",
  ]
}

export const SPEECH_CONTEXT_FIELD_NO_RESEARCH = [
  "Il me faut une houe pour cultiver.",
  "Comment on fait pour manger du pain sans outil ?",
  "Ces champs ne donneront rien sans une houe.",
  "On devrait construire une hutte de recherche.",
  "Sans outils, ces champs sont juste de la terre retournee.",
  "Faut qu'on trouve comment faire une houe.",
  "Le savant pourrait nous aider, si on en avait un."
]
export const SPEECH_CONTEXT_EMPTY_LAB = [
  "Le laboratoire est vide.",
  "Qui va faire la recherche ?",
  "La hutte du sage attend un chercheur."
]
export const CONTEXT_COOLDOWN = 45
export const FIELD_NO_RESEARCH_DELAY_MAX = 30

export const TECH_BUBBLE_LINES = {
  'axe-stone': [
    "Il nous faudrait une hache pour cet arbre.",
    "Sans hache, je ne peux pas l'abattre.",
    "Taille-moi une hache en pierre avant."
  ],
  'pick-stone': [
    "Il nous faudrait une pioche en pierre.",
    "Je ne peux pas casser ca sans une meilleure pioche.",
    "Sans pioche en pierre, on ne fait rien de ces rochers."
  ],
  'pick-bronze': [
    "Faut inventer la pioche en bronze d'abord.",
    "Je ne peux pas extraire ca, pas assez d'outils."
  ],
  'pick-iron': [
    "Il nous faudrait une pioche en fer.",
    "Sans fer, on casse notre outil dessus."
  ],
  'pick-gold': [
    "Cet or attend qu'on invente la pioche en or.",
    "L'amethyste nous resiste tant qu'on n'a pas mieux."
  ]
}
export const TECH_BUBBLE_COOLDOWN = 60

// ============================================================================
// Camera ZQSD/WASD
// ============================================================================
export const CAMERA_KEY_FORWARD = new Set(['z', 'Z', 'w', 'W'])
export const CAMERA_KEY_BACKWARD = new Set(['s', 'S'])
export const CAMERA_KEY_LEFT = new Set(['q', 'Q'])
export const CAMERA_KEY_RIGHT = new Set(['d', 'D'])
export const CAMERA_KEY_ROTATE_LEFT  = new Set(['a', 'A'])
export const CAMERA_KEY_ROTATE_RIGHT = new Set(['e', 'E'])

// ============================================================================
// Quetes (definitions statiques, check() injecte par quests.js)
// ============================================================================
export const QUEST_DEFS_BASE = [
  { id: 'q-berries-5',  title: 'Récolter 5 baies',            target: 5,  color: '#8c5cc4', checkKey: 'berries' },
  { id: 'q-mine-10',    title: 'Miner 10 blocs de pierre',    target: 10, color: '#a8a196', checkKey: 'minesCompleted' },
  { id: 'q-house-2',    title: 'Poser une deuxième maison',   target: 2,  color: '#c97a4a', checkKey: 'housesPlaced' },
  { id: 'q-colons-8',   title: 'Avoir 8 colons en vie',       target: 8,  color: '#ffb070', checkKey: 'colonistsCount' },
  { id: 'q-berries-20', title: 'Récolter 20 baies au total',  target: 20, color: '#6b2d8c', checkKey: 'totalBerriesHarvested' }
]
