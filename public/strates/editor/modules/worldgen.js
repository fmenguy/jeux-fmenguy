import {
  GRID, SHALLOW_WATER_LEVEL, STOCK_KEYS, CHIEF_NAME
} from './constants.js'
import { state } from './state.js'
import { prng, mulberry32, rebuildPerm } from './rng.js'
import { buildTerrain, repaintCellSurface } from './terrain.js'
import {
  addHouse, addTree, addRock, addOre, addBush, addResearchHouse,
  assignResearcherToBuilding, isCellOccupied, clearAllPlacements
} from './placements.js'
import { spawnColonist, clearColonists, findSpawn } from './colonist.js'
import { startNextQuest, resetQuestSig } from './quests.js'
import { scene } from './scene.js'
import { clearVegetation, buildVegetation } from './vegetation.js'

// ============================================================================
// Scene par defaut : hameau, arbres, rochers, filons, baies, champs, colons
// ============================================================================

export function populateDefaultScene() {
  state.pendingDefaultResearch = null
  state.spawn = findSpawn()
  const spawn = state.spawn
  const rng = prng.rng

  const houseOffsets = [[0, 0], [2, 1], [-2, 1]]
  for (const [ox, oz] of houseOffsets) {
    const x = Math.max(0, Math.min(GRID - 1, spawn.x + ox))
    const z = Math.max(0, Math.min(GRID - 1, spawn.z + oz))
    if (!isCellOccupied(x, z)) addHouse(x, z)
  }

  {
    const offsets = [[0, -2], [1, -2], [-1, -2], [0, -3], [2, -1]]
    for (const [ox, oz] of offsets) {
      const x = Math.max(0, Math.min(GRID - 1, spawn.x + ox))
      const z = Math.max(0, Math.min(GRID - 1, spawn.z + oz))
      if (isCellOccupied(x, z)) continue
      if (state.cellTop[z * GRID + x] <= SHALLOW_WATER_LEVEL) continue
      state.pendingDefaultResearch = { x, z }
      break
    }
  }

  let placed = 0
  const targetTrees = 55
  for (let tries = 0; tries < 3000 && placed < targetTrees; tries++) {
    const x = Math.floor(rng() * GRID)
    const z = Math.floor(rng() * GRID)
    if (state.cellBiome[z * GRID + x] !== 'forest') continue
    if (isCellOccupied(x, z)) continue
    addTree(x, z)
    placed++
    const clusterSize = 2 + Math.floor(rng() * 3)
    for (let k = 0; k < clusterSize && placed < targetTrees; k++) {
      const nx = x + Math.floor(rng() * 5) - 2
      const nz = z + Math.floor(rng() * 5) - 2
      if (nx < 0 || nz < 0 || nx >= GRID || nz >= GRID) continue
      if (state.cellBiome[nz * GRID + nx] !== 'forest') continue
      if (isCellOccupied(nx, nz)) continue
      addTree(nx, nz)
      placed++
    }
  }

  let grassTrees = 0
  const targetGrassTrees = 15
  for (let tries = 0; tries < 800 && grassTrees < targetGrassTrees; tries++) {
    const x = Math.floor(rng() * GRID)
    const z = Math.floor(rng() * GRID)
    if (state.cellBiome[z * GRID + x] !== 'grass') continue
    if (isCellOccupied(x, z)) continue
    const dh = Math.abs(x - spawn.x) + Math.abs(z - spawn.z)
    if (dh < 4) continue
    addTree(x, z)
    grassTrees++
  }

  let rocksPlaced = 0
  const targetRocks = 30
  for (let tries = 0; tries < 1500 && rocksPlaced < targetRocks; tries++) {
    const x = Math.floor(rng() * GRID)
    const z = Math.floor(rng() * GRID)
    const biome = state.cellBiome[z * GRID + x]
    if (biome !== 'rock' && biome !== 'snow' && biome !== 'grass') continue
    if (isCellOccupied(x, z)) continue
    if (biome === 'grass' && rng() > 0.25) continue
    addRock(x, z)
    rocksPlaced++
  }

  const ORE_SEEDS = ['ore-copper', 'ore-iron', 'ore-coal', 'ore-gold', 'ore-silver']
  let oresPlaced = 0
  const targetOres = 10
  for (let tries = 0; tries < 1200 && oresPlaced < targetOres; tries++) {
    const x = Math.floor(rng() * GRID)
    const z = Math.floor(rng() * GRID)
    const biome = state.cellBiome[z * GRID + x]
    if (biome !== 'rock' && biome !== 'snow') continue
    if (isCellOccupied(x, z)) continue
    const type = ORE_SEEDS[Math.floor(rng() * ORE_SEEDS.length)]
    addOre(x, z, type)
    oresPlaced++
  }

  let bushPlaced = 0
  const targetBushes = 14
  for (let tries = 0; tries < 900 && bushPlaced < targetBushes; tries++) {
    const x = Math.floor(rng() * GRID)
    const z = Math.floor(rng() * GRID)
    const biome = state.cellBiome[z * GRID + x]
    if (biome !== 'grass' && biome !== 'forest') continue
    if (isCellOccupied(x, z)) continue
    if (addBush(x, z)) bushPlaced++
  }

  const FIELD_PATCHES = [
    { cx: spawn.x + 4, cz: spawn.z + 2, w: 3, h: 2 },
    { cx: spawn.x - 5, cz: spawn.z + 3, w: 2, h: 3 },
    { cx: spawn.x + 1, cz: spawn.z + 5, w: 4, h: 2 }
  ]
  for (const patch of FIELD_PATCHES) {
    for (let dz = 0; dz < patch.h; dz++) {
      for (let dx = 0; dx < patch.w; dx++) {
        const x = patch.cx + dx
        const z = patch.cz + dz
        if (x < 0 || z < 0 || x >= GRID || z >= GRID) continue
        if (state.cellBiome[z * GRID + x] !== 'grass') continue
        if (isCellOccupied(x, z)) continue
        const k = z * GRID + x
        if (state.cellSurface[k]) continue
        state.cellSurface[k] = 'field'
        repaintCellSurface(x, z)
      }
    }
  }

  for (let i = 0; i < 5; i++) {
    const ang = (i / 5) * Math.PI * 2
    let cx = spawn.x + Math.round(Math.cos(ang) * 1.5)
    let cz = spawn.z + Math.round(Math.sin(ang) * 1.5)
    cx = Math.max(0, Math.min(GRID - 1, cx))
    cz = Math.max(0, Math.min(GRID - 1, cz))
    if (i === 0) {
      spawnColonist(cx, cz, { forceName: CHIEF_NAME, forceGender: 'M', isChief: true })
    } else {
      spawnColonist(cx, cz)
    }
  }

  if (state.pendingDefaultResearch) {
    const { x, z } = state.pendingDefaultResearch
    if (!isCellOccupied(x, z)) {
      const entry = addResearchHouse(x, z)
      if (entry) assignResearcherToBuilding(entry)
    }
    state.pendingDefaultResearch = null
  }
}

export function resetWorld(refreshHUD) {
  // reset des jobs et markers
  const { markers, buildMarkers } = state
  // markerGroup est un Group de scene, on retire les marker meshes depuis leur parent
  for (const [, m] of markers) if (m.parent) m.parent.remove(m)
  markers.clear()
  state.jobs.clear()
  for (const [, m] of buildMarkers) if (m.parent) m.parent.remove(m)
  buildMarkers.clear()
  state.buildJobs.clear()
  state.flashes.length = 0
  for (const k of STOCK_KEYS) state.stocks[k] = 0
  state.researchPoints = 0
  state.totalResearchSpent = 0
  for (const id in state.techs) state.techs[id].unlocked = false
  clearAllPlacements()
  clearVegetation()
  clearColonists()
  const newSeed = Math.floor(Math.random() * 0xffffff)
  prng.seedRand = mulberry32(newSeed)
  prng.rng = mulberry32(newSeed + 1)
  rebuildPerm()
  buildTerrain()
  populateDefaultScene()
  buildVegetation()
  state.season.idx = 0
  state.season.elapsed = 0
  state.lastJobTime = performance.now() / 1000
  state.resources.berries = 0
  state.resources.wood = 0
  state.resources.stone = 0
  state.gameStats.housesPlaced = 0
  state.gameStats.minesCompleted = 0
  state.gameStats.totalBerriesHarvested = 0
  state.contextBubbles.lastCategoryTriggerAt.clear()
  state.contextBubbles.lastLineByCategory.clear()
  state.contextBubbles.fieldTriggerStartAt = -1
  state.questIndex = 0
  resetQuestSig()
  startNextQuest()
  if (refreshHUD) refreshHUD()
}
