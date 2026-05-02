import * as THREE from 'three'

// ============================================================================
// Constantes globales du prototype Strates
// ============================================================================

export const GRID = 128
export const MAX_STRATES = 10
export const MIN_STRATES = 1
export const WATER_LEVEL = 1.0
export const SHALLOW_WATER_LEVEL = 1.6
export const EDGE_DEEP_RING = 5
export const EDGE_SHALLOW_RING = 4
export const FALLOFF_SPAN = 16
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
  water: new THREE.Color('#5b9ec9'),
  waterDark: new THREE.Color('#2a5a85'),
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
export const STOCK_KEYS = ['stone', 'dirt', 'copper', 'silver', 'iron', 'coal', 'gold', 'amethyst', 'grain']
export const STOCK_LABELS = {
  stone: 'pierre', dirt: 'terre',
  copper: 'cuivre', silver: 'argent', iron: 'fer',
  coal: 'charbon', gold: 'or', amethyst: 'amethyste',
  grain: 'grain'
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
// Bulles contextuelles et speech (cooldowns uniquement, données dans data/speech.json)
// ============================================================================
export const CONTEXT_COOLDOWN = 45
export const FIELD_NO_RESEARCH_DELAY_MAX = 30
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

// Quetes definies dans data/quests.json, importées via gamedata.js
