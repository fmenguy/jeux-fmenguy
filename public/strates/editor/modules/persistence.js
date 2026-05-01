import { GRID, STOCK_KEYS } from './constants.js'
import { state } from './state.js'
import { rebuildTerrainFromState, repaintCellSurface } from './terrain.js'
import {
  addTree, addRock, addOre, addBush, addHouse, addResearchHouse,
  addManorFromSave, addBigHouseFromSave, clearAllPlacements, isCellOccupied, addObservatory,
  addCairn
} from './placements.js'
import { spawnColonist, clearColonists } from './colonist.js'
import { scene } from './scene.js'
import { resetQuestSig, startNextQuest } from './quests.js'
import { clearVegetation } from './vegetation.js'

// ============================================================================
// Persistance localStorage. Slots : 'auto' (ecrase en continu) + 1..5 manuels.
// ============================================================================

const STORAGE_KEY_PREFIX = 'strates-save-'
const SAVE_VERSION = 1
export const MANUAL_SLOT_COUNT = 5

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

export function saveGame(slot = 'auto') {
  if (!state.cellTop) return false
  const snap = serializeSnapshot()
  try {
    localStorage.setItem(STORAGE_KEY_PREFIX + slot, JSON.stringify(snap))
    return true
  } catch (e) {
    console.warn('Strates save failed', e)
    return false
  }
}

export function loadGame(slot = 'auto') {
  const raw = localStorage.getItem(STORAGE_KEY_PREFIX + slot)
  if (!raw) return false
  try {
    const data = JSON.parse(raw)
    if (!data || data.version !== SAVE_VERSION) return false
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
      heightmap: Array.from(state.heightmap),
      biomeNoise: Array.from(state.biomeNoise),
      cellTop: Array.from(state.cellTop),
      cellBiome: state.cellBiome.slice(),
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
    researchHouses: state.researchHouses.map(r => ({
      x: r.x, z: r.z, id: r.id,
      assignedColonistId: r.assignedColonistId
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
      hp: c.hp, mor: c.mor, faim: c.faim,
      age: c.age, skills: c.skills || {}
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
    visited: state.visited ? Array.from(state.visited) : null,
    currentAge: state.currentAge || 1,
    ageUnlockedAt: state.ageUnlockedAt || { 1: Date.now() },
    achievements: Array.isArray(state.achievements) ? state.achievements.slice() : [],
    cairns: (state.cairns || []).map(c => ({ x: c.x, z: c.z }))
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
}

function applySnapshot(data) {
  clearEverything()

  // terrain : on reinjecte les typed arrays dans state puis on reconstruit les voxels
  state.heightmap = Float32Array.from(data.terrain.heightmap)
  state.biomeNoise = Float32Array.from(data.terrain.biomeNoise)
  state.cellTop = Int16Array.from(data.terrain.cellTop)
  state.cellBiome = data.terrain.cellBiome.slice()
  state.cellSurface = data.terrain.cellSurface.slice()
  state.cellOre = data.terrain.cellOre.slice()
  rebuildTerrainFromState()

  // applique les surfaces (champs) sur les voxels top
  for (let z = 0; z < GRID; z++) {
    for (let x = 0; x < GRID; x++) {
      if (state.cellSurface[z * GRID + x]) repaintCellSurface(x, z)
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
  for (const rh of data.researchHouses) {
    if (isCellOccupied(rh.x, rh.z)) continue
    const entry = addResearchHouse(rh.x, rh.z)
    if (entry && rh.id) {
      entry.id = rh.id
      entry.assignedColonistId = rh.assignedColonistId || null
    }
  }
  state.researchBuildingNextId = data.researchBuildingNextId || (state.researchHouses.length + 1)

  // colons
  for (const csav of (data.colonists || [])) {
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
