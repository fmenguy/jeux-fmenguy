import * as THREE from 'three'
import { GRID } from './constants.js'
import { state } from './state.js'
import { topVoxelIndex, colorForLayer, surfaceColor } from './terrain.js'

// ============================================================================
// Cycle de saisons
// 4 saisons de 120 s chacune = 8 min par cycle complet.
// Chaque saison a un "tint" (Color multiplicatif) applique sur les voxels top
// des biomes saisonniers (grass, forest, snow, sand dans une moindre mesure).
// Transition lineaire entre saisons sur les 20 dernieres secondes.
// ============================================================================

const SEASON_DURATION = 600 // secondes par saison (10 min = 40 min par cycle complet)
const TRANSITION = 40       // secondes de lerp vers la saison suivante
const _FERTILE_TINT = new THREE.Color(0xd4a843)

export const SEASONS = [
  {
    id: 'spring',
    name: 'printemps',
    // tint multiplicatif sur la couleur de base
    tint: new THREE.Color('#cbe8b4'),
    // modifiant les biomes top
    grassTopMul: new THREE.Color(1.02, 1.10, 0.95), // plus vif, legerement plus vert
    forestTopMul: new THREE.Color(1.00, 1.08, 0.92),
    snowTopMul: new THREE.Color(1.00, 1.00, 1.00),
    sandTopMul: new THREE.Color(1.00, 1.00, 1.00),
    fieldMul: new THREE.Color(0.85, 1.05, 0.75), // champs vert tendre
    skyTint: new THREE.Color('#f5f0e6'),
    density: { flowers: 1.0, leaves: 1.0, snow: 0.2 }
  },
  {
    id: 'summer',
    name: 'ete',
    tint: new THREE.Color('#fff3b8'),
    grassTopMul: new THREE.Color(1.05, 1.02, 0.80),  // vert sature doux doree
    forestTopMul: new THREE.Color(1.00, 0.98, 0.80),
    snowTopMul: new THREE.Color(1.00, 0.98, 0.94),   // neige qui fond legerement
    sandTopMul: new THREE.Color(1.05, 1.02, 0.95),
    fieldMul: new THREE.Color(1.05, 1.00, 0.75), // champs dore
    skyTint: new THREE.Color('#fff4d0'),
    density: { flowers: 0.6, leaves: 1.0, snow: 0.1 }
  },
  {
    id: 'autumn',
    name: 'automne',
    tint: new THREE.Color('#e8b87a'),
    grassTopMul: new THREE.Color(1.02, 0.90, 0.72), // bronze
    forestTopMul: new THREE.Color(1.25, 0.85, 0.55),  // feuilles rousses
    snowTopMul: new THREE.Color(1.00, 0.96, 0.92),
    sandTopMul: new THREE.Color(1.00, 0.95, 0.85),
    fieldMul: new THREE.Color(0.95, 0.78, 0.50), // champs moisson
    skyTint: new THREE.Color('#f0d8a8'),
    density: { flowers: 0.3, leaves: 0.7, snow: 0.15 }
  },
  {
    id: 'winter',
    name: 'hiver',
    tint: new THREE.Color('#c8d4e0'),
    grassTopMul: new THREE.Color(0.90, 0.95, 0.98), // herbe ternie
    forestTopMul: new THREE.Color(0.85, 0.90, 0.95),
    snowTopMul: new THREE.Color(1.02, 1.03, 1.05),
    sandTopMul: new THREE.Color(0.95, 0.95, 1.00),
    fieldMul: new THREE.Color(0.80, 0.85, 0.90), // champs au repos
    skyTint: new THREE.Color('#dde4ed'),
    density: { flowers: 0.0, leaves: 0.2, snow: 1.0 }
  }
]

// Etat global saison (dans state pour etre sauvegarde)
if (state.season == null) {
  state.season = {
    idx: 0,              // index saison courante
    elapsed: 0,          // secondes ecoulees dans la saison courante
    cyclesDone: 0,       // cycles de 4 saisons completes
    year: 1,             // annee affichee dans le HUD (commence a 1)
    justChangedSeason: null  // id de la nouvelle saison, lu par speech.js puis remis a null
  }
}

let repaintAccum = 0
const REPAINT_INTERVAL = 0.25 // Lot B perf : chunker toutes les 250 ms (~8 appels = 2 s pour un cycle complet)

const tmpCol = new THREE.Color()
const tmpColB = new THREE.Color()

function lerpColor(out, a, b, t) {
  out.r = a.r + (b.r - a.r) * t
  out.g = a.g + (b.g - a.g) * t
  out.b = a.b + (b.b - a.b) * t
  return out
}

function currentBlend(out, propName) {
  const s = state.season
  const cur = SEASONS[s.idx]
  const nxt = SEASONS[(s.idx + 1) % SEASONS.length]
  const tLeft = SEASON_DURATION - s.elapsed
  let t = 0
  if (tLeft < TRANSITION) t = 1 - tLeft / TRANSITION
  return lerpColor(out, cur[propName], nxt[propName], t)
}

export function currentSeason() {
  const s = state.season
  return {
    id: SEASONS[s.idx].id,
    name: SEASONS[s.idx].name,
    progress: s.elapsed / SEASON_DURATION,
    next: SEASONS[(s.idx + 1) % SEASONS.length].name
  }
}

export function getDensity(key) {
  const s = state.season
  const cur = SEASONS[s.idx].density[key] || 0
  const nxt = SEASONS[(s.idx + 1) % SEASONS.length].density[key] || 0
  const tLeft = SEASON_DURATION - s.elapsed
  let t = 0
  if (tLeft < TRANSITION) t = 1 - tLeft / TRANSITION
  return cur + (nxt - cur) * t
}

// applique un tint multiplicatif sur une Color existante (mutation)
export function tintBiomeTop(col, biome) {
  let mul
  if (biome === 'grass') mul = tmpColB.copy(SEASONS[state.season.idx].grassTopMul)
  else if (biome === 'forest') mul = tmpColB.copy(SEASONS[state.season.idx].forestTopMul)
  else if (biome === 'snow') mul = tmpColB.copy(SEASONS[state.season.idx].snowTopMul)
  else if (biome === 'sand') mul = tmpColB.copy(SEASONS[state.season.idx].sandTopMul)
  else return col
  // lerp vers la saison suivante
  const s = state.season
  const tLeft = SEASON_DURATION - s.elapsed
  if (tLeft < TRANSITION) {
    const t = 1 - tLeft / TRANSITION
    const nxt = SEASONS[(s.idx + 1) % SEASONS.length]
    let nxtMul
    if (biome === 'grass') nxtMul = nxt.grassTopMul
    else if (biome === 'forest') nxtMul = nxt.forestTopMul
    else if (biome === 'snow') nxtMul = nxt.snowTopMul
    else if (biome === 'sand') nxtMul = nxt.sandTopMul
    mul.r = mul.r + (nxtMul.r - mul.r) * t
    mul.g = mul.g + (nxtMul.g - mul.g) * t
    mul.b = mul.b + (nxtMul.b - mul.b) * t
  }
  col.r *= mul.r
  col.g *= mul.g
  col.b *= mul.b
  return col
}

export function tintField(col) {
  const s = state.season
  const cur = SEASONS[s.idx].fieldMul
  const nxt = SEASONS[(s.idx + 1) % SEASONS.length].fieldMul
  const tLeft = SEASON_DURATION - s.elapsed
  let t = 0
  if (tLeft < TRANSITION) t = 1 - tLeft / TRANSITION
  col.r *= cur.r + (nxt.r - cur.r) * t
  col.g *= cur.g + (nxt.g - cur.g) * t
  col.b *= cur.b + (nxt.b - cur.b) * t
  return col
}

// Lot B perf : le repaint couvre GRID*GRID = 9216 cellules. Faire tout en une
// passe toutes les 2s provoque un micro-freeze visible. On chunke en traitant
// un petit budget de cellules par appel, avec un index persistant qui boucle
// sur le terrain. Quand l'index atteint la fin, le cycle complet est termine.
let _repaintIdx = 0
const REPAINT_CHUNK = 3000 // cellules par appel, environ 22 appels pour couvrir 256x256

function repaintSaisonTerrainChunk() {
  if (!state.instanced || !state.cellBiome) return
  const total = GRID * GRID
  const end = Math.min(_repaintIdx + REPAINT_CHUNK, total)
  let touched = false
  for (let idx = _repaintIdx; idx < end; idx++) {
    const biome = state.cellBiome[idx]
    if (biome !== 'grass' && biome !== 'forest' && biome !== 'snow' && biome !== 'sand') continue
    const top = state.cellTop[idx]
    if (top <= 0) continue
    const x = idx % GRID
    const z = (idx / GRID) | 0
    const topIdx = topVoxelIndex(x, z)
    if (topIdx < 0) continue
    // base color selon biome + surface
    const base = colorForLayer(biome, top - 1, top)
    const surface = state.cellSurface[idx]
    const c = surfaceColor(surface, base)
    tmpCol.copy(c)
    if (surface === 'field') {
      tintField(tmpCol)
      if (x % 2 === 0) tmpCol.offsetHSL(0, 0, -0.04)
    } else {
      tintBiomeTop(tmpCol, biome)
      // micro jitter de position conserve
      const jitter = (Math.sin(x * 12.9898 + z * 78.233) * 43758.5453) % 1
      const j = 0.06 * (jitter - Math.floor(jitter) - 0.5)
      tmpCol.offsetHSL(0, 0, j)
      if (state.cellFertile && state.cellFertile[idx]) tmpCol.lerp(_FERTILE_TINT, 0.55)
    }
    state.instanced.setColorAt(topIdx, tmpCol)
    state.origColor[topIdx].copy(tmpCol)
    touched = true
  }
  _repaintIdx = end >= total ? 0 : end
  if (touched && state.instanced.instanceColor) state.instanced.instanceColor.needsUpdate = true
}

export function tickSeasons(dt) {
  const s = state.season
  s.elapsed += dt
  if (s.elapsed >= SEASON_DURATION) {
    s.elapsed -= SEASON_DURATION
    s.idx = (s.idx + 1) % SEASONS.length
    if (s.idx === 0) { s.cyclesDone++; s.year = s.cyclesDone + 1 }
    s.justChangedSeason = SEASONS[s.idx].id
    // Lot B perf : on relance un cycle complet depuis le debut, par chunks.
    _repaintIdx = 0
    repaintAccum = REPAINT_INTERVAL // force repaint immediat du premier chunk
  }
  repaintAccum += dt
  if (repaintAccum >= REPAINT_INTERVAL) {
    repaintAccum = 0
    repaintSaisonTerrainChunk()
  }
}

// force le repaint complet (utile au chargement d'une sauvegarde)
export function forceSeasonRepaint() {
  _repaintIdx = 0
  repaintAccum = REPAINT_INTERVAL * 2
}
