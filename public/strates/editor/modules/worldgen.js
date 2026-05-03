import {
  GRID, SHALLOW_WATER_LEVEL, STOCK_KEYS, CHIEF_NAME
} from './constants.js'
import { state } from './state.js'
import { prng, mulberry32, rebuildPerm } from './rng.js'
import { buildTerrain, revealAround } from './terrain.js'
import { dlog } from './debug.js'
import {
  addHouse, addTree, addRock, addOre, addBush,
  isCellOccupied, clearAllPlacements, addDeer, applyFogToAllVegetation
} from './placements.js'
import { spawnColonist, clearColonists, findSpawn } from './colonist.js'
import { startNextQuest, resetQuestSig } from './quests.js'
import { scene } from './scene.js'
import { clearVegetation, buildVegetation } from './vegetation.js'
import { clearFog, buildFog } from './fog.js'

// ============================================================================
// Scene par defaut : hameau, arbres, rochers, filons, baies, champs, colons
// ============================================================================

export function populateDefaultScene() {
  state.pendingDefaultResearch = null
  state.spawn = findSpawn()
  const spawn = state.spawn
  const rng = prng.rng

  const houseOffsets = [[0, 0], [4, 1], [-4, 1]]
  for (const [ox, oz] of houseOffsets) {
    const x = Math.max(0, Math.min(GRID - 1, spawn.x + ox))
    const z = Math.max(0, Math.min(GRID - 1, spawn.z + oz))
    if (!isCellOccupied(x, z)) addHouse(x, z)
  }
  // Lot B : le hameau initial est suppose deja construit (les colons demarrent
  // avec un toit). On force isUnderConstruction = false sur ces maisons pour
  // ne pas declencher l etat sans-abri au tick 0 de la partie.
  for (const h of state.houses) {
    h.isUnderConstruction = false
    h.constructionProgress = 1
  }

  // Arbres en clusters denses dans les forets
  let placed = 0
  const targetTrees = 200
  for (let tries = 0; tries < 12000 && placed < targetTrees; tries++) {
    const x = Math.floor(rng() * GRID)
    const z = Math.floor(rng() * GRID)
    if (state.cellBiome[z * GRID + x] !== 'forest') continue
    if (isCellOccupied(x, z)) continue
    addTree(x, z)
    placed++
    const clusterSize = 3 + Math.floor(rng() * 4)
    for (let k = 0; k < clusterSize && placed < targetTrees; k++) {
      const nx = x + Math.floor(rng() * 7) - 3
      const nz = z + Math.floor(rng() * 7) - 3
      if (nx < 0 || nz < 0 || nx >= GRID || nz >= GRID) continue
      if (state.cellBiome[nz * GRID + nx] !== 'forest') continue
      if (isCellOccupied(nx, nz)) continue
      addTree(nx, nz)
      placed++
    }
  }

  // Arbres epars en herbe (eloignes du spawn)
  let grassTrees = 0
  const targetGrassTrees = 50
  for (let tries = 0; tries < 3000 && grassTrees < targetGrassTrees; tries++) {
    const x = Math.floor(rng() * GRID)
    const z = Math.floor(rng() * GRID)
    if (state.cellBiome[z * GRID + x] !== 'grass') continue
    if (isCellOccupied(x, z)) continue
    const dh = Math.abs(x - spawn.x) + Math.abs(z - spawn.z)
    if (dh < 6) continue
    addTree(x, z)
    grassTrees++
  }

  // Rochers decoratifs (rock, snow, transitions herbe/roche)
  let rocksPlaced = 0
  const targetRocks = 100
  for (let tries = 0; tries < 5000 && rocksPlaced < targetRocks; tries++) {
    const x = Math.floor(rng() * GRID)
    const z = Math.floor(rng() * GRID)
    const biome = state.cellBiome[z * GRID + x]
    if (biome !== 'rock' && biome !== 'snow' && biome !== 'grass') continue
    if (isCellOccupied(x, z)) continue
    if (biome === 'grass' && rng() > 0.20) continue
    addRock(x, z)
    rocksPlaced++
  }

  // Filons garantis : au moins 3 copper et 3 coal en biome rock/snow
  const guaranteedOres = [
    { type: 'ore-copper', min: 7 },
    { type: 'ore-coal',   min: 7 }
  ]
  for (const { type, min } of guaranteedOres) {
    let count = 0
    for (let tries = 0; tries < 2000 && count < min; tries++) {
      const x = Math.floor(rng() * GRID)
      const z = Math.floor(rng() * GRID)
      const biome = state.cellBiome[z * GRID + x]
      const cellTop = state.cellTop[z * GRID + x]
      const isRocky = biome === 'rock' || biome === 'snow'
      const isSurface = (biome === 'grass' || biome === 'forest') && cellTop >= 3
      if (!isRocky && !isSurface) continue
      if (isCellOccupied(x, z)) continue
      addOre(x, z, type)
      count++
    }
  }
  // Filons supplementaires varies
  const ORE_SEEDS = ['ore-copper', 'ore-iron', 'ore-coal', 'ore-gold', 'ore-silver']
  let oresPlaced = 0
  const targetOres = 20
  for (let tries = 0; tries < 4000 && oresPlaced < targetOres; tries++) {
    const x = Math.floor(rng() * GRID)
    const z = Math.floor(rng() * GRID)
    const biome = state.cellBiome[z * GRID + x]
    if (biome !== 'rock' && biome !== 'snow') continue
    if (isCellOccupied(x, z)) continue
    const type = ORE_SEEDS[Math.floor(rng() * ORE_SEEDS.length)]
    addOre(x, z, type)
    oresPlaced++
  }
  dlog('[ores] placed:', state.ores.length)

  // Buissons a baies - minimum 25 en herbe et foret
  let bushPlaced = 0
  const targetBushes = 64
  for (let tries = 0; tries < 5000 && bushPlaced < targetBushes; tries++) {
    const x = Math.floor(rng() * GRID)
    const z = Math.floor(rng() * GRID)
    const biome = state.cellBiome[z * GRID + x]
    if (biome !== 'grass' && biome !== 'forest') continue
    if (isCellOccupied(x, z)) continue
    if (addBush(x, z)) bushPlaced++
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

  // Cerfs decoratifs : 3 a 6 sur cellules herbe eloignees du spawn.
  // Bornes [2, GRID-3] pour eviter les bords (frustum, clipping, falloff).
  const deerCount = 3 + Math.floor(rng() * 4)
  let deersPlaced = 0
  const MIN_BOUND = 2
  const MAX_BOUND = GRID - 3
  const SPAN = MAX_BOUND - MIN_BOUND + 1
  for (let tries = 0; tries < 600 && deersPlaced < deerCount; tries++) {
    const x = MIN_BOUND + Math.floor(rng() * SPAN)
    const z = MIN_BOUND + Math.floor(rng() * SPAN)
    const biome = state.cellBiome[z * GRID + x]
    if (biome !== 'grass' && biome !== 'forest') continue
    if (isCellOccupied(x, z)) continue
    const dist = Math.abs(x - spawn.x) + Math.abs(z - spawn.z)
    if (dist < 4) continue  // eviter le spawn du joueur
    dlog('[deer] spawn pos vs GRID:', x, z, GRID)
    if (addDeer(x, z)) deersPlaced++
  }
  dlog('[deer] count in scene:', state.deers.length)

  // Applique le fog a toute la vegetation avant la revelation initiale.
  // Tout ce qui est hors zone revelee part en noir (group.visible = false
  // pour les GLB, couleur noire pour les InstancedMesh).
  applyFogToAllVegetation()

  // Revelation initiale : cercle de rayon 12 autour du spawn central.
  // Effectuee apres le placement de toutes les entites pour que les colons
  // voient immediatement leur zone de depart.
  const cx = Math.floor(GRID / 2), cz = Math.floor(GRID / 2)
  revealAround(cx, cz, 12)
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
  clearFog()
  buildFog()
  state.season.idx = 0
  state.season.elapsed = 0
  state.season.cyclesDone = 0
  state.season.year = 1
  state.lastJobTime = performance.now() / 1000
  state.resources.berries = 0
  state.resources.wood = 0
  state.resources.stone = 0
  state.resources.silex = 0
  state.stocks.silex = 0
  state.gameStats.housesPlaced = 0
  state.gameStats.minesCompleted = 0
  state.gameStats.totalBerriesHarvested = 0
  state.contextBubbles.lastCategoryTriggerAt.clear()
  state.contextBubbles.lastLineByCategory.clear()
  state.contextBubbles.fieldTriggerStartAt = -1
  state.questsAvailable = []
  state.questsActive = []
  state.questsCompleted = []
  resetQuestSig()
  startNextQuest()
  try { window.dispatchEvent(new CustomEvent('strates:worldReset')) } catch (e) {}
  if (refreshHUD) refreshHUD()
}
