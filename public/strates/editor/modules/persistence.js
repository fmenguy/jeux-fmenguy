import { GRID, STOCK_KEYS } from './constants.js'
import { state } from './state.js'
import { rebuildTerrainFromState, repaintCellSurface, computeFertileCells } from './terrain.js'
import {
  addTree, addRock, addOre, addBush, addHouse, addResearchHouse,
  addManorFromSave, addBigHouseFromSave, clearAllPlacements, isCellOccupied, addObservatory,
  addCairn, addWheatField, addDeer, applyFogToAllVegetation, updateFieldMesh
} from './placements.js'
import { spawnColonist, clearColonists } from './colonist.js'
import { scene } from './scene.js'
import { resetQuestSig, startNextQuest } from './quests.js'
import { clearVegetation } from './vegetation.js'

// ============================================================================
// Persistance localStorage. Slots : 'auto' (ecrase en continu) + 1..5 manuels.
// ============================================================================

const STORAGE_KEY_PREFIX = 'strates-save-'
const SAVE_VERSION = 2
export const MANUAL_SLOT_COUNT = 5

// ---------------- codec base64 pour TypedArray ----------------
// Les arrays terrain (heightmap Float32, cellTop Int16, etc.) sont volumineux
// (GRID*GRID = 65536 cellules). Sérialisés en JSON brut, ils explosent le quota
// localStorage (~5-10 Mo). On les encode en base64 (1 char par octet) pour
// diviser la taille par 5 à 10.

function typedArrayToB64(arr) {
  if (!arr) return null
  const bytes = new Uint8Array(arr.buffer, arr.byteOffset, arr.byteLength)
  // Chunked pour éviter "Maximum call stack size exceeded" sur grands buffers.
  let binary = ''
  const CHUNK = 0x8000
  for (let i = 0; i < bytes.length; i += CHUNK) {
    const slice = bytes.subarray(i, Math.min(i + CHUNK, bytes.length))
    binary += String.fromCharCode.apply(null, slice)
  }
  return btoa(binary)
}

function b64ToTypedArray(b64, Ctor) {
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new Ctor(bytes.buffer, bytes.byteOffset, bytes.byteLength / Ctor.BYTES_PER_ELEMENT)
}

// Dictionnaire des biomes (string -> uint8). 0 = null/inconnu.
const BIOME_DICT = ['', 'grass', 'forest', 'sand', 'water', 'rock', 'snow', 'dirt', 'meadow', 'beach', 'mountain', 'tundra', 'desert', 'swamp']

function cellBiomeToB64(arr) {
  if (!arr) return null
  const idx = new Uint8Array(arr.length)
  for (let i = 0; i < arr.length; i++) {
    const v = arr[i]
    if (v == null || v === '') { idx[i] = 0; continue }
    const k = BIOME_DICT.indexOf(v)
    idx[i] = (k >= 0) ? k : 0
  }
  return typedArrayToB64(idx)
}

function b64ToCellBiome(b64, fallbackArr) {
  if (!b64) return fallbackArr ? fallbackArr.slice() : []
  const idx = b64ToTypedArray(b64, Uint8Array)
  const out = new Array(idx.length)
  for (let i = 0; i < idx.length; i++) {
    const k = idx[i]
    out[i] = (k > 0 && k < BIOME_DICT.length) ? BIOME_DICT[k] : null
  }
  return out
}

export function listSlots() {
  const out = []
  for (let i = 1; i <= MANUAL_SLOT_COUNT; i++) {
    const raw = localStorage.getItem(STORAGE_KEY_PREFIX + i)
    if (!raw) { out.push({ index: i, data: null }); continue }
    try {
      const data = JSON.parse(raw)
      out.push({ index: i, meta: { savedAt: data.savedAt, cyclesDone: data.season ? data.season.cyclesDone : 0, colonists: (data.colonists || []).length } })
    } catch (e) {
      out.push({ index: i, corrupted: true })
    }
  }
  return out
}

export function hasSave(slot = 'auto') {
  return !!localStorage.getItem(STORAGE_KEY_PREFIX + slot)
}

export function deleteSave(slot = 'auto') {
  localStorage.removeItem(STORAGE_KEY_PREFIX + slot)
}

// Sweep des flags de tutoriels dans localStorage. Appele uniquement sur
// "Nouvelle partie" (pas sur un simple reload de save), pour que tous les
// tutos (principal, chercheur, interface, constructeur, etc.) rejouent.
// Ne touche pas aux saves ni aux preferences user.
export function resetTutorialFlags() {
  try {
    const toRemove = []
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (!k) continue
      if (!k.startsWith('strates.')) continue
      if (!/tuto/i.test(k)) continue
      toRemove.push(k)
    }
    for (const k of toRemove) localStorage.removeItem(k)
  } catch (e) {}
}

export function saveGame(slot = 'auto') {
  if (!state.cellTop) return false
  // Wrap complet : si serializeSnapshot ou JSON.stringify throw (champ
  // récemment ajouté qui contient un objet circulaire ou Map non sérialisable
  // par exemple), on logge et on retourne false sans crasher l UI.
  try {
    const snap = serializeSnapshot()
    const json = JSON.stringify(snap)
    if (typeof console !== 'undefined' && console.debug) {
      console.debug('[strates] save slot=' + slot + ' size=' + (json.length / 1024).toFixed(1) + ' KB')
    }
    localStorage.setItem(STORAGE_KEY_PREFIX + slot, json)
    return true
  } catch (e) {
    console.error('[strates] saveGame failed for slot=' + slot, e)
    return false
  }
}

export function loadGame(slot = 'auto') {
  const raw = localStorage.getItem(STORAGE_KEY_PREFIX + slot)
  if (!raw) return false
  try {
    const data = JSON.parse(raw)
    // v1 (arrays JSON bruts) et v2 (typed arrays base64) sont supportés au load.
    if (!data || (data.version !== 1 && data.version !== 2)) return false
    applySnapshot(data)
    return true
  } catch (e) {
    console.warn('Strates load failed', e)
    return false
  }
}

export function getSaveMeta(slot = 'auto') {
  const raw = localStorage.getItem(STORAGE_KEY_PREFIX + slot)
  if (!raw) return null
  try {
    const data = JSON.parse(raw)
    return { savedAt: data.savedAt, version: data.version }
  } catch (e) {
    return null
  }
}

// ---------------- serialization ----------------

function serializeSnapshot() {
  return {
    version: SAVE_VERSION,
    savedAt: Date.now(),
    terrain: {
      heightmap_b64: typedArrayToB64(state.heightmap),
      biomeNoise_b64: typedArrayToB64(state.biomeNoise),
      cellTop_b64: typedArrayToB64(state.cellTop),
      cellFertile_b64: state.cellFertile ? typedArrayToB64(state.cellFertile) : null,
      cellBiome_b64: cellBiomeToB64(state.cellBiome),
      cellSurface: state.cellSurface.slice(),
      cellOre: state.cellOre.slice()
    },
    trees: state.trees.map(t => ({ x: t.x, z: t.z })),
    rocks: state.rocks.map(r => ({ x: r.x, z: r.z })),
    ores: state.ores.map(o => ({ x: o.x, z: o.z, type: o.type })),
    bushes: state.bushes.map(b => ({
      x: b.x, z: b.z,
      berries: b.berries,
      maxBerries: b.maxBerries,
      regenTimer: b.regenTimer
    })),
    houses: state.houses.map(h => ({ x: h.x, z: h.z })),
    manors: state.manors.map(m => ({ x: m.x, z: m.z })),
    bigHouses: (state.bigHouses || []).map(b => ({ x: b.x, z: b.z })),
    wheatFields: (state.wheatFields || []).map(f => ({
      x: f.x, z: f.z, grain: f.grain || 0,
      growthStage: f.growthStage || 'dirt',
      growthProgress: typeof f.growthProgress === 'number' ? f.growthProgress : 0
    })),
    researchHouses: state.researchHouses.map(r => ({
      x: r.x, z: r.z, id: r.id,
      assignedColonistIds: Array.isArray(r.assignedColonistIds) ? r.assignedColonistIds.slice() : []
    })),
    researchBuildingNextId: state.researchBuildingNextId,
    colonists: state.colonists.map(c => ({
      id: c.id,
      name: c.name,
      gender: c.gender,
      isChief: c.isChief,
      x: c.x, z: c.z,
      tx: c.tx, tz: c.tz, ty: c.ty,
      state: (c.state === 'WORKING' || c.state === 'MOVING') ? 'IDLE' : c.state,
      researchBuildingId: c.researchBuildingId,
      favorite: !!c.favorite,
      isStar: !!c.isStar,
      hp: c.hp, mor: c.mor, faim: c.faim,
      age: c.age, skills: c.skills || {},
      profession: c.profession ?? null
    })),
    spawn: state.spawn ? { x: state.spawn.x, z: state.spawn.z } : null,
    jobs: Array.from(state.jobs.keys()),
    buildJobs: Array.from(state.buildJobs.keys()),
    stocks: { ...state.stocks },
    techs: Object.fromEntries(
      Object.entries(state.techs).map(([k, v]) => [k, !!v.unlocked])
    ),
    researchPoints: state.researchPoints,
    researchTickAccum: state.researchTickAccum,
    // Lot B : file de recherche
    researchQueue: Array.isArray(state.researchQueue) ? state.researchQueue.slice() : [],
    activeResearch: state.activeResearch
      ? { id: state.activeResearch.id, progress: state.activeResearch.progress || 0 }
      : null,
    totalResearchSpent: state.totalResearchSpent || 0,
    nightPoints: state.nightPoints || 0,
    isNight: !!state.isNight,
    observatories: (state.observatories || []).map(o => ({ x: o.x, z: o.z })),
    resources: { ...state.resources },
    gameStats: { ...state.gameStats },
    questsCompleted: (state.questsCompleted || []).map(q => ({ id: q.id, title: q.title })),
    questsActiveIds: (state.questsActive || []).map(q => q.id),
    season: { idx: state.season.idx, elapsed: state.season.elapsed, cyclesDone: state.season.cyclesDone, year: state.season.year ?? 1 },
    cellRevealed_b64: state.cellRevealed ? typedArrayToB64(state.cellRevealed) : null,
    currentAge: state.currentAge || 1,
    ageUnlockedAt: state.ageUnlockedAt || { 1: Date.now() },
    achievements: Array.isArray(state.achievements) ? state.achievements.slice() : [],
    cairns: (state.cairns || []).map(c => ({ x: c.x, z: c.z })),
    deers: (state.deers || []).map(d => ({ x: d.x, z: d.z }))
  }
}

// ---------------- application ----------------

function clearEverything() {
  for (const [, m] of state.markers) if (m.parent) m.parent.remove(m)
  state.markers.clear()
  state.jobs.clear()
  for (const [, m] of state.buildMarkers) if (m.parent) m.parent.remove(m)
  state.buildMarkers.clear()
  state.buildJobs.clear()
  state.flashes.length = 0
  for (const k of STOCK_KEYS) state.stocks[k] = 0
  state.researchPoints = 0
  state.researchTickAccum = 0
  state.researchQueue = []
  state.activeResearch = null
  state.totalResearchSpent = 0
  state.nightPoints = 0
  state.isNight = false
  for (const id in state.techs) state.techs[id].unlocked = false
  clearAllPlacements()
  clearVegetation()
  clearColonists()
  state.contextBubbles.lastCategoryTriggerAt.clear()
  state.contextBubbles.lastLineByCategory.clear()
  state.contextBubbles.fieldTriggerStartAt = -1
  state.questsAvailable = []
  state.questsActive = []
  state.questsCompleted = []
  resetQuestSig()
  // Lot D
  state.currentAge = 1
  state.ageUnlockedAt = { 1: Date.now() }
  state.achievements = []
  state.cairns = []
  state.wheatFields = []
}

function applySnapshot(data) {
  clearEverything()

  // terrain : on reinjecte les typed arrays dans state puis on reconstruit les voxels
  // v2 : base64. v1 (legacy) : arrays JSON bruts.
  const t = data.terrain
  state.heightmap = t.heightmap_b64
    ? b64ToTypedArray(t.heightmap_b64, Float32Array)
    : Float32Array.from(t.heightmap)
  state.biomeNoise = t.biomeNoise_b64
    ? b64ToTypedArray(t.biomeNoise_b64, Float32Array)
    : Float32Array.from(t.biomeNoise)
  state.cellTop = t.cellTop_b64
    ? b64ToTypedArray(t.cellTop_b64, Int16Array)
    : Int16Array.from(t.cellTop)
  if (t.cellFertile_b64) {
    state.cellFertile = b64ToTypedArray(t.cellFertile_b64, Uint8Array)
  }
  state.cellBiome = t.cellBiome_b64
    ? b64ToCellBiome(t.cellBiome_b64)
    : t.cellBiome.slice()
  state.cellSurface = t.cellSurface.slice()
  state.cellOre = t.cellOre.slice()
  rebuildTerrainFromState()
  computeFertileCells()

  // applique les surfaces (champs et teinte fertile) sur les voxels top
  for (let z = 0; z < GRID; z++) {
    for (let x = 0; x < GRID; x++) {
      const k = z * GRID + x
      if (state.cellSurface[k] || (state.cellFertile && state.cellFertile[k])) repaintCellSurface(x, z)
    }
  }

  // placements (les entites n'affectent pas cellTop, juste des meshes)
  for (const t of data.trees) if (!isCellOccupied(t.x, t.z)) addTree(t.x, t.z)
  for (const r of data.rocks) if (!isCellOccupied(r.x, r.z)) addRock(r.x, r.z)
  for (const o of data.ores) if (!isCellOccupied(o.x, o.z)) addOre(o.x, o.z, o.type)
  for (const b of data.bushes) {
    if (isCellOccupied(b.x, b.z)) continue
    const bush = addBush(b.x, b.z)
    if (bush && typeof b.berries === 'number') {
      bush.berries = b.berries
      bush.regenTimer = b.regenTimer || 0
    }
  }
  for (const h of data.houses) if (!isCellOccupied(h.x, h.z)) addHouse(h.x, h.z)
  for (const m of (data.manors || [])) addManorFromSave(m.x, m.z)
  for (const b of (data.bigHouses || [])) addBigHouseFromSave(b.x, b.z)
  if (Array.isArray(data.wheatFields)) {
    for (const f of data.wheatFields) {
      const entry = addWheatField(f.x, f.z)
      if (!entry) continue
      if (typeof f.grain === 'number') entry.grain = f.grain
      if (typeof f.growthProgress === 'number') entry.growthProgress = f.growthProgress
      // Si la save indique stage 'sprouting', swap immédiatement le mesh.
      if (f.growthStage === 'sprouting') updateFieldMesh(entry, 'sprouting')
    }
  }
  for (const rh of data.researchHouses) {
    if (isCellOccupied(rh.x, rh.z)) continue
    const entry = addResearchHouse(rh.x, rh.z)
    if (entry && rh.id) {
      entry.id = rh.id
      // Compatibilite : ancien format singulier -> nouveau tableau
      if (Array.isArray(rh.assignedColonistIds)) {
        entry.assignedColonistIds = rh.assignedColonistIds.slice()
      } else if (rh.assignedColonistId != null) {
        entry.assignedColonistIds = [rh.assignedColonistId]
      } else {
        entry.assignedColonistIds = []
      }
    }
  }
  state.researchBuildingNextId = data.researchBuildingNextId || (state.researchHouses.length + 1)

  // Lot B : tout batiment restaure depuis une sauvegarde est suppose deja
  // construit. On reset les flags de chantier ajoutes par addX() au cas ou
  // buildings.json declarerait un buildTime > 0.
  const _markBuilt = (arr) => { if (arr) for (const b of arr) { b.isUnderConstruction = false; b.constructionProgress = 1 } }
  _markBuilt(state.houses)
  _markBuilt(state.foyers)
  _markBuilt(state.bigHouses)
  _markBuilt(state.researchHouses)
  _markBuilt(state.wheatFields)

  // colons
  for (const csav of (data.colonists || [])) {
    // Lot B : migration des sauvegardes anterieures. L ancien metier
    // 'astronome' a ete fusionne dans 'chercheur' (bivalent jour/nuit).
    if (csav && csav.profession === 'astronome') csav.profession = 'chercheur'
    const c = spawnColonist(csav.x, csav.z, { restore: csav })
    if (typeof csav.tx === 'number') c.tx = csav.tx
    if (typeof csav.tz === 'number') c.tz = csav.tz
    if (typeof csav.ty === 'number') c.ty = csav.ty
    c.group.position.set(c.tx, c.ty, c.tz)
  }

  // reference spawn
  if (data.spawn) state.spawn = { x: data.spawn.x, z: data.spawn.z }

  // stocks, techs, ressources
  if (data.stocks) {
    for (const k of STOCK_KEYS) {
      if (typeof data.stocks[k] === 'number') state.stocks[k] = data.stocks[k]
    }
  }
  if (data.techs) {
    for (const [k, v] of Object.entries(data.techs)) {
      if (state.techs[k]) state.techs[k].unlocked = !!v
    }
  }
  state.researchPoints = data.researchPoints || 0
  state.researchTickAccum = data.researchTickAccum || 0
  state.researchQueue = Array.isArray(data.researchQueue) ? data.researchQueue.slice() : []
  state.activeResearch = (data.activeResearch && data.activeResearch.id)
    ? { id: data.activeResearch.id, progress: data.activeResearch.progress || 0 }
    : null
  state.totalResearchSpent = data.totalResearchSpent || 0
  state.nightPoints = data.nightPoints || 0
  state.isNight = !!data.isNight
  if (Array.isArray(data.observatories)) {
    for (const o of data.observatories) {
      if (!isCellOccupied(o.x, o.z)) addObservatory(o.x, o.z)
    }
    for (const o of state.observatories) { o.isUnderConstruction = false; o.constructionProgress = 1 }
  }
  if (data.resources) Object.assign(state.resources, data.resources)
  if (data.gameStats) Object.assign(state.gameStats, data.gameStats)

  // quetes : on redemarre a l'index sauve
  state.questsCompleted = Array.isArray(data.questsCompleted) ? data.questsCompleted : []
  state.questsActive = []
  state.questsAvailable = []
  if (data.season) {
    state.season.idx = data.season.idx || 0
    state.season.elapsed = data.season.elapsed || 0
    state.season.cyclesDone = data.season.cyclesDone || 0
    state.season.year = data.season.year ?? (data.season.cyclesDone + 1) ?? 1
  }
  // fog of war : restaurer la carte d'exploration si presente dans la save.
  // Ancien format : data.visited (valeurs 0/1/2) - migration : >= 1 = revele.
  // Nouveau format : data.cellRevealed (valeurs 0/1).
  if (typeof data.cellRevealed_b64 === 'string' && data.cellRevealed_b64) {
    const decoded = b64ToTypedArray(data.cellRevealed_b64, Uint8Array)
    state.cellRevealed = (decoded.length === GRID * GRID) ? decoded : null
  } else if (Array.isArray(data.cellRevealed) && data.cellRevealed.length === GRID * GRID) {
    state.cellRevealed = Uint8Array.from(data.cellRevealed)
  } else if (Array.isArray(data.visited) && data.visited.length === GRID * GRID) {
    state.cellRevealed = new Uint8Array(GRID * GRID)
    for (let i = 0; i < data.visited.length; i++) {
      state.cellRevealed[i] = data.visited[i] >= 1 ? 1 : 0
    }
  } else {
    state.cellRevealed = null  // sera initialise par buildTerrain()
  }
  // Lot D : ages
  state.currentAge = data.currentAge || 1
  state.ageUnlockedAt = data.ageUnlockedAt || { 1: Date.now() }
  state.achievements = Array.isArray(data.achievements) ? data.achievements.slice() : []
  // Lot D : cairns (monuments poses)
  state.cairns = []
  if (Array.isArray(data.cairns)) {
    for (const c of data.cairns) {
      addCairn(c.x, c.z)
    }
    for (const c of state.cairns) { c.isUnderConstruction = false; c.constructionProgress = 1 }
  }
  if (Array.isArray(data.deers)) {
    for (const d of data.deers) {
      addDeer(d.x, d.z)
    }
  }

  // Fog of war : repaint du terrain et de la vegetation apres restauration
  // de cellRevealed, puisque rebuildTerrainFromState ne connait pas encore
  // l etat de revelation au moment ou il tourne.
  if (state.cellRevealed) {
    for (let z = 0; z < GRID; z++) {
      for (let x = 0; x < GRID; x++) {
        repaintCellSurface(x, z)
      }
    }
    applyFogToAllVegetation()
  }

  startNextQuest()

  state.lastJobTime = performance.now() / 1000
}

// ---------------- auto-save ----------------

let autoSaveInterval = null

export function startAutoSave(intervalSec = 30) {
  stopAutoSave()
  autoSaveInterval = setInterval(() => {
    saveGame('auto')
  }, intervalSec * 1000)
  // save au dechargement de la page
  window.addEventListener('beforeunload', () => saveGame('auto'))
  // save au changement de visibilite (onglet caché)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') saveGame('auto')
  })
}

export function stopAutoSave() {
  if (autoSaveInterval != null) clearInterval(autoSaveInterval)
  autoSaveInterval = null
}
