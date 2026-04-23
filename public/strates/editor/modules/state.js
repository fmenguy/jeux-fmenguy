// ============================================================================
// Etat mutable partage entre modules. Un seul objet container pour eviter les
// problemes de let exportes. Les modules font `state.xxx = ...` et `state.xxx`.
// ============================================================================

export const state = {
  // terrain
  heightmap: null,
  biomeNoise: null,
  cellTop: null,
  cellBiome: null,
  cellSurface: null,
  cellOre: null,
  instanceIndex: [],
  instanced: null,
  origColor: null,
  voxelCount: 0,
  nextFreeVoxelIdx: 0,

  // placements
  trees: [],
  rocks: [],
  ores: [],
  bushes: [],
  deers: [],
  houses: [],
  manors: [],
  researchHouses: [],
  researchBuildingNextId: 1,

  // jobs
  jobs: new Map(),
  buildJobs: new Map(),
  markers: new Map(),
  buildMarkers: new Map(),

  // ressources
  stocks: {},
  techs: {
    'axe-stone':     { name: 'Hache en pierre',   cost: 4,  req: null,           age: 'pierre', icon: 'H', tint: '#8a6a4a', unlocked: false },
    'pick-stone':    { name: 'Pioche en pierre',  cost: 5,  req: null,           age: 'pierre', icon: 'P', tint: '#9ca3af', unlocked: false },
    'pick-bronze':   { name: 'Pioche en bronze',  cost: 15, req: 'pick-stone',   age: 'bronze', icon: 'B', tint: '#b87333', unlocked: false },
    'pick-iron':     { name: 'Pioche en fer',     cost: 30, req: 'pick-bronze',  age: 'fer',    icon: 'F', tint: '#c0c5cc', unlocked: false },
    'pick-gold':     { name: 'Pioche en or',      cost: 60, req: 'pick-iron',    age: 'or',     icon: 'O', tint: '#f2c94c', unlocked: false }
  },
  researchPoints: 0,
  researchTickAccum: 0,
  // Lot B : file de recherche (SPEC v1)
  // researchQueue = IDs de techs en attente, ordonnees FIFO.
  // activeResearch = tech en cours d etude { id, progress } ou null si rien.
  // La progression est incrementee de n (nb de chercheurs) toutes les RESEARCH_TICK.
  // A la completion, unlockTech(id) est appelee et la queue avance automatiquement.
  researchQueue: [],
  activeResearch: null,
  // B19 : total cumule des points de recherche depenses (jamais decremente).
  // Utilise pour la condition Cairn au lieu du solde courant, qui peut etre
  // gele par B11 si le joueur a tout depense avant d atteindre 100.
  totalResearchSpent: 0,
  nightPoints: 0,
  isNight: false,
  observatories: [],
  resources: { berries: 0, wood: 0, stone: 0 },
  gameStats: { housesPlaced: 0, minesCompleted: 0, totalBerriesHarvested: 0 },

  // colons
  colonists: [],
  usedNames: new Set(),
  flashes: [],
  spawn: null,
  pendingDefaultResearch: null,

  // speech/context
  contextBubbles: {
    lastCategoryTriggerAt: new Map(),
    lastLineByCategory: new Map(),
    fieldTriggerStartAt: -1
  },
  lastJobTime: 0,
  lastBlockedMineTech: null,
  lastTechBubbleByTech: new Map(),

  // quests
  questIndex: 0,
  currentQuest: null,
  questCompletedAt: -1,

  // tools
  toolState: {
    tool: 'nav',
    brush: 1,
    oreType: null,
    isPainting: false,
    paintedThisStroke: new Set()
  },
  cameraKeys: new Set(),

  // Lot B : moteur comportemental
  // Les valeurs runtime par colon (needs Map, jobQueue Array, flags) vivent
  // sur l'instance Colonist. Ici on ne stocke que les caches transverses.
  needsTickAccum: 0,
  needsBuckets: null,

  // Lot D : ages et achievements
  currentAge: 1,
  ageUnlockedAt: { 1: Date.now() },
  achievements: []
}
