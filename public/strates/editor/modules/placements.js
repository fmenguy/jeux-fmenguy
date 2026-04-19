import * as THREE from 'three'
import {
  GRID, SHALLOW_WATER_LEVEL, MAX_TREES, MAX_ROCKS, MAX_ORES, MAX_CRYSTALS,
  MAX_BUSHES, MAX_BUSH_LEAVES, MAX_BUSH_BERRIES, BERRIES_PER_BUSH, ORE_TYPES
} from './constants.js'
import { state } from './state.js'
import { prng } from './rng.js'
import { scene, tmpObj, tmpColor } from './scene.js'
import { findApproach } from './pathfind.js'

// ============================================================================
// Arbres (trunk + leaf InstancedMesh)
// ============================================================================
const trunkGeo = new THREE.BoxGeometry(0.35, 1.0, 0.35)
trunkGeo.translate(0, 0.5, 0)
const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6b4a2b, roughness: 0.95, flatShading: true })
export const trunkMesh = new THREE.InstancedMesh(trunkGeo, trunkMat, MAX_TREES)
trunkMesh.castShadow = true
trunkMesh.receiveShadow = true
trunkMesh.count = 0
trunkMesh.frustumCulled = false
scene.add(trunkMesh)

const leafGeo = new THREE.ConeGeometry(0.95, 2.6, 6)
leafGeo.translate(0, 2.2, 0)
const leafMat = new THREE.MeshStandardMaterial({ color: 0x4a8a3a, roughness: 0.85, flatShading: true })
export const leafMesh = new THREE.InstancedMesh(leafGeo, leafMat, MAX_TREES)
leafMesh.castShadow = true
leafMesh.receiveShadow = true
leafMesh.count = 0
leafMesh.frustumCulled = false
leafMesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(MAX_TREES * 3), 3)
scene.add(leafMesh)

export function addTree(gx, gz) {
  if (state.trees.length >= MAX_TREES) return
  const top = state.cellTop[gz * GRID + gx]
  if (top <= SHALLOW_WATER_LEVEL) return
  const rng = prng.rng
  const jx = (rng() - 0.5) * 0.6
  const jz = (rng() - 0.5) * 0.6
  const scale = 0.8 + rng() * 0.5
  const rot = rng() * Math.PI * 2
  const i = state.trees.length
  tmpObj.position.set(gx + 0.5 + jx, top, gz + 0.5 + jz)
  tmpObj.rotation.set(0, rot, 0)
  tmpObj.scale.setScalar(scale)
  tmpObj.updateMatrix()
  trunkMesh.setMatrixAt(i, tmpObj.matrix)
  leafMesh.setMatrixAt(i, tmpObj.matrix)
  tmpColor.setHSL(0.28 + (rng() - 0.5) * 0.06, 0.5 + rng() * 0.15, 0.32 + rng() * 0.1)
  leafMesh.setColorAt(i, tmpColor)
  trunkMesh.count = i + 1
  leafMesh.count = i + 1
  trunkMesh.instanceMatrix.needsUpdate = true
  leafMesh.instanceMatrix.needsUpdate = true
  if (leafMesh.instanceColor) leafMesh.instanceColor.needsUpdate = true
  state.trees.push({ x: gx, z: gz })
}

export function removeTreesIn(cells) {
  if (!state.trees.length) return
  const cellSet = new Set(cells.map(c => c.z * GRID + c.x))
  const kept = state.trees.filter(t => !cellSet.has(t.z * GRID + t.x))
  if (kept.length === state.trees.length) return
  state.trees.length = 0
  trunkMesh.count = 0; leafMesh.count = 0
  for (const t of kept) addTree(t.x, t.z)
}

// ============================================================================
// Rochers : tas de 2 a 3 cailloux ramasses au sol (chaque rocher consomme
// jusqu'a 3 instances dans l'InstancedMesh, d'ou la capacite x3).
// ============================================================================
const ROCK_INSTANCE_CAP = MAX_ROCKS * 3
const rockGeo = new THREE.BoxGeometry(0.55, 0.45, 0.55)
rockGeo.translate(0, 0.225, 0)
const rockMatInst = new THREE.MeshStandardMaterial({ color: 0xa0998e, roughness: 0.95, flatShading: true })
export const rockMesh = new THREE.InstancedMesh(rockGeo, rockMatInst, ROCK_INSTANCE_CAP)
rockMesh.castShadow = true
rockMesh.receiveShadow = true
rockMesh.count = 0
rockMesh.frustumCulled = false
rockMesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(ROCK_INSTANCE_CAP * 3), 3)
scene.add(rockMesh)

function placeRockChunk(i, cx, cy, cz, sx, sy, sz, rotY, g) {
  tmpObj.position.set(cx, cy, cz)
  tmpObj.rotation.set(0, rotY, 0)
  tmpObj.scale.set(sx, sy, sz)
  tmpObj.updateMatrix()
  rockMesh.setMatrixAt(i, tmpObj.matrix)
  tmpColor.setRGB(g, g * 0.98, g * 0.95)
  rockMesh.setColorAt(i, tmpColor)
}

export function addRock(gx, gz) {
  if (state.rocks.length >= MAX_ROCKS) return
  const top = state.cellTop[gz * GRID + gx]
  if (top <= SHALLOW_WATER_LEVEL) return
  const rng = prng.rng
  const baseX = gx + 0.5
  const baseZ = gz + 0.5
  const startIdx = rockMesh.count
  const chunkCount = 2 + Math.floor(rng() * 2) // 2 ou 3 cailloux
  const indices = []
  for (let k = 0; k < chunkCount; k++) {
    if (rockMesh.count >= ROCK_INSTANCE_CAP) break
    const i = rockMesh.count
    // premier caillou au centre, les suivants en satellites
    const ang = rng() * Math.PI * 2
    const dist = k === 0 ? 0 : 0.18 + rng() * 0.22
    const cx = baseX + Math.cos(ang) * dist
    const cz = baseZ + Math.sin(ang) * dist
    // tailles variees, base plus grosse, satellites plus petits
    const baseScale = k === 0 ? (0.85 + rng() * 0.35) : (0.5 + rng() * 0.35)
    const sx = baseScale
    const sz = baseScale * (0.85 + rng() * 0.3)
    const sy = baseScale * (0.55 + rng() * 0.25)
    const rotY = rng() * Math.PI * 2
    // gris clair chaleureux, legere variation
    const g = 0.55 + rng() * 0.15
    placeRockChunk(i, cx, top, cz, sx, sy, sz, rotY, g)
    rockMesh.count = i + 1
    indices.push(i)
  }
  rockMesh.instanceMatrix.needsUpdate = true
  if (rockMesh.instanceColor) rockMesh.instanceColor.needsUpdate = true
  state.rocks.push({ x: gx, z: gz, indices })
  return startIdx
}

export function removeRocksIn(cells) {
  if (!state.rocks.length) return
  const cellSet = new Set(cells.map(c => c.z * GRID + c.x))
  const kept = state.rocks.filter(r => !cellSet.has(r.z * GRID + r.x))
  if (kept.length === state.rocks.length) return
  state.rocks.length = 0
  rockMesh.count = 0
  for (const r of kept) addRock(r.x, r.z)
}

// ============================================================================
// Filons (oreRock + crystal)
// ============================================================================
const oreRockGeo = new THREE.BoxGeometry(0.7, 0.6, 0.7)
oreRockGeo.translate(0, 0.3, 0)
const oreRockMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.75, metalness: 0.25, flatShading: true })
export const oreRockMesh = new THREE.InstancedMesh(oreRockGeo, oreRockMat, MAX_ORES)
oreRockMesh.castShadow = true
oreRockMesh.receiveShadow = true
oreRockMesh.count = 0
oreRockMesh.frustumCulled = false
oreRockMesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(MAX_ORES * 3), 3)
scene.add(oreRockMesh)

const crystalGeo = new THREE.BoxGeometry(0.2, 0.3, 0.2)
crystalGeo.translate(0, 0.15, 0)
const crystalMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.35, metalness: 0.45, flatShading: true })
export const crystalMesh = new THREE.InstancedMesh(crystalGeo, crystalMat, MAX_CRYSTALS)
crystalMesh.castShadow = true
crystalMesh.count = 0
crystalMesh.frustumCulled = false
crystalMesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(MAX_CRYSTALS * 3), 3)
scene.add(crystalMesh)

export function addOre(gx, gz, type) {
  if (state.ores.length >= MAX_ORES) return
  const def = ORE_TYPES[type]
  if (!def) return
  const top = state.cellTop[gz * GRID + gx]
  if (top <= SHALLOW_WATER_LEVEL) return
  const rng = prng.rng
  const jx = (rng() - 0.5) * 0.25
  const jz = (rng() - 0.5) * 0.25
  const rot = rng() * Math.PI * 2
  const scale = 0.85 + rng() * 0.3

  const ri = oreRockMesh.count
  tmpObj.position.set(gx + 0.5 + jx, top, gz + 0.5 + jz)
  tmpObj.rotation.set(0, rot, 0)
  tmpObj.scale.set(scale, 0.8 + rng() * 0.5, scale)
  tmpObj.updateMatrix()
  oreRockMesh.setMatrixAt(ri, tmpObj.matrix)
  tmpColor.copy(def.rock)
  tmpColor.offsetHSL(0, 0, (rng() - 0.5) * 0.06)
  oreRockMesh.setColorAt(ri, tmpColor)
  oreRockMesh.count = ri + 1

  const nCrystals = 2 + Math.floor(rng() * 3)
  const baseY = top + 0.4
  for (let k = 0; k < nCrystals; k++) {
    const ci = crystalMesh.count
    const cx = gx + 0.5 + jx + (rng() - 0.5) * 0.4
    const cz = gz + 0.5 + jz + (rng() - 0.5) * 0.4
    const cy = baseY + (rng() - 0.5) * 0.08
    tmpObj.position.set(cx, cy, cz)
    tmpObj.rotation.set((rng() - 0.5) * 0.6, rng() * Math.PI * 2, (rng() - 0.5) * 0.6)
    const cs = 0.8 + rng() * 0.7
    tmpObj.scale.set(cs, 0.8 + rng() * 0.8, cs)
    tmpObj.updateMatrix()
    crystalMesh.setMatrixAt(ci, tmpObj.matrix)
    tmpColor.copy(def.crystal)
    tmpColor.offsetHSL(0, 0, (rng() - 0.5) * 0.05)
    crystalMesh.setColorAt(ci, tmpColor)
    crystalMesh.count = ci + 1
  }

  oreRockMesh.instanceMatrix.needsUpdate = true
  if (oreRockMesh.instanceColor) oreRockMesh.instanceColor.needsUpdate = true
  crystalMesh.instanceMatrix.needsUpdate = true
  if (crystalMesh.instanceColor) crystalMesh.instanceColor.needsUpdate = true

  state.ores.push({ x: gx, z: gz, type })
  state.cellOre[gz * GRID + gx] = type
}

export function rebuildOres(kept) {
  state.ores.length = 0
  oreRockMesh.count = 0
  crystalMesh.count = 0
  for (let i = 0; i < state.cellOre.length; i++) state.cellOre[i] = null
  for (const o of kept) addOre(o.x, o.z, o.type)
}

export function removeOresIn(cells) {
  if (!state.ores.length) return
  const cellSet = new Set(cells.map(c => c.z * GRID + c.x))
  const kept = state.ores.filter(o => !cellSet.has(o.z * GRID + o.x))
  if (kept.length === state.ores.length) return
  rebuildOres(kept.slice())
}

export function isTreeOn(x, z) {
  for (const t of state.trees) if (t.x === x && t.z === z) return true
  return false
}

// Abat un arbre et renvoie true si un arbre etait present.
export function chopTreeAt(x, z) {
  if (!isTreeOn(x, z)) return false
  removeTreesIn([{ x, z }])
  return true
}

// Extrait le filon d'une cellule et renvoie son type (ex: 'ore-gold'), ou null
// si pas de filon. Utilise par le colon quand il mine une tuile a filon.
export function extractOreAt(x, z) {
  const k = z * GRID + x
  const type = state.cellOre[k]
  if (!type) return null
  removeOresIn([{ x, z }])
  return type
}

// ============================================================================
// Buissons de baies
// ============================================================================
const bushLeafGeo = new THREE.BoxGeometry(0.25, 0.25, 0.25)
const bushLeafMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, flatShading: true })
export const bushLeafMesh = new THREE.InstancedMesh(bushLeafGeo, bushLeafMat, MAX_BUSH_LEAVES)
bushLeafMesh.castShadow = true
bushLeafMesh.receiveShadow = true
bushLeafMesh.count = 0
bushLeafMesh.frustumCulled = false
bushLeafMesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(MAX_BUSH_LEAVES * 3), 3)
scene.add(bushLeafMesh)

const bushBerryGeo = new THREE.BoxGeometry(0.12, 0.12, 0.12)
const bushBerryMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.55, flatShading: true })
export const bushBerryMesh = new THREE.InstancedMesh(bushBerryGeo, bushBerryMat, MAX_BUSH_BERRIES)
bushBerryMesh.castShadow = true
bushBerryMesh.count = 0
bushBerryMesh.frustumCulled = false
bushBerryMesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(MAX_BUSH_BERRIES * 3), 3)
scene.add(bushBerryMesh)

const BERRY_HIDDEN = new THREE.Matrix4().makeScale(0, 0, 0)

export function addBush(gx, gz) {
  if (state.bushes.length >= MAX_BUSHES) return false
  const top = state.cellTop[gz * GRID + gx]
  if (top <= SHALLOW_WATER_LEVEL) return false
  if (isCellOccupied(gx, gz)) return false

  const rng = prng.rng
  const leafIndices = []
  const berryIndices = []
  const baseY = top
  const nLeaves = 3 + Math.floor(rng() * 3)
  const leafBase = new THREE.Color('#3d6b2d')
  for (let k = 0; k < nLeaves; k++) {
    const li = bushLeafMesh.count
    if (li >= MAX_BUSH_LEAVES) break
    const lx = gx + 0.5 + (rng() - 0.5) * 0.35
    const lz = gz + 0.5 + (rng() - 0.5) * 0.35
    const ly = baseY + 0.12 + rng() * 0.35
    tmpObj.position.set(lx, ly, lz)
    tmpObj.rotation.set(0, rng() * Math.PI * 2, 0)
    const ls = 0.8 + rng() * 0.5
    tmpObj.scale.set(ls, ls, ls)
    tmpObj.updateMatrix()
    bushLeafMesh.setMatrixAt(li, tmpObj.matrix)
    tmpColor.copy(leafBase).offsetHSL((rng() - 0.5) * 0.02, 0, (rng() - 0.5) * 0.08)
    bushLeafMesh.setColorAt(li, tmpColor)
    bushLeafMesh.count = li + 1
    leafIndices.push(li)
  }
  const berryBase = new THREE.Color('#6b2d8c')
  const nBerries = 2 + Math.floor(rng() * 3)
  const berryPositions = []
  for (let k = 0; k < nBerries; k++) {
    const bi = bushBerryMesh.count
    if (bi >= MAX_BUSH_BERRIES) break
    const bx = gx + 0.5 + (rng() - 0.5) * 0.3
    const bz = gz + 0.5 + (rng() - 0.5) * 0.3
    const by = baseY + 0.25 + rng() * 0.3
    tmpObj.position.set(bx, by, bz)
    tmpObj.rotation.set(0, 0, 0)
    tmpObj.scale.set(1, 1, 1)
    tmpObj.updateMatrix()
    bushBerryMesh.setMatrixAt(bi, tmpObj.matrix)
    tmpColor.copy(berryBase).offsetHSL((rng() - 0.5) * 0.04, (rng() - 0.5) * 0.15, (rng() - 0.5) * 0.06)
    bushBerryMesh.setColorAt(bi, tmpColor)
    bushBerryMesh.count = bi + 1
    berryIndices.push(bi)
    berryPositions.push(tmpObj.matrix.clone())
  }
  bushLeafMesh.instanceMatrix.needsUpdate = true
  if (bushLeafMesh.instanceColor) bushLeafMesh.instanceColor.needsUpdate = true
  bushBerryMesh.instanceMatrix.needsUpdate = true
  if (bushBerryMesh.instanceColor) bushBerryMesh.instanceColor.needsUpdate = true

  const bush = {
    x: gx, z: gz,
    berries: BERRIES_PER_BUSH,
    maxBerries: BERRIES_PER_BUSH,
    leafIndices,
    berryIndices,
    berryMatrices: berryPositions,
    claimedBy: null,
    regenTimer: 0
  }
  state.bushes.push(bush)
  return bush
}

export function refreshBushBerries(bush) {
  const visible = Math.min(bush.berries, bush.berryIndices.length)
  for (let k = 0; k < bush.berryIndices.length; k++) {
    const bi = bush.berryIndices[k]
    if (k < visible) {
      bushBerryMesh.setMatrixAt(bi, bush.berryMatrices[k])
    } else {
      bushBerryMesh.setMatrixAt(bi, BERRY_HIDDEN)
    }
  }
  bushBerryMesh.instanceMatrix.needsUpdate = true
}

export function removeBushesIn(cells) {
  if (!state.bushes.length) return
  const cellSet = new Set(cells.map(c => c.z * GRID + c.x))
  const kept = state.bushes.filter(b => !cellSet.has(b.z * GRID + b.x))
  if (kept.length === state.bushes.length) return
  const kp = kept.map(b => ({ x: b.x, z: b.z }))
  state.bushes.length = 0
  bushLeafMesh.count = 0
  bushBerryMesh.count = 0
  for (const b of kp) addBush(b.x, b.z)
}

export function findNearestBush(cx, cz, maxDist) {
  let best = null, bestD = Infinity
  for (const b of state.bushes) {
    if (b.berries <= 0) continue
    if (b.claimedBy) continue
    const d = Math.abs(b.x - cx) + Math.abs(b.z - cz)
    if (d > maxDist) continue
    if (d < bestD) { bestD = d; best = b }
  }
  return best
}

// ============================================================================
// Maisons (Group Three)
// ============================================================================
function makeHouse() {
  const rng = prng.rng
  const g = new THREE.Group()
  const wallColors = [0xf2e6c9, 0xe6d2a8, 0xd9c79d]
  const roofColors = [0xb24e3a, 0xa04030, 0xc86a48]
  const wallMat = new THREE.MeshStandardMaterial({ color: wallColors[Math.floor(rng() * 3)], roughness: 0.9, flatShading: true })
  const roofMat = new THREE.MeshStandardMaterial({ color: roofColors[Math.floor(rng() * 3)], roughness: 0.85, flatShading: true })
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.0, 1.0), wallMat)
  body.position.y = 0.5; body.castShadow = true; body.receiveShadow = true
  g.add(body)
  const roof = new THREE.Mesh(new THREE.ConeGeometry(1.0, 0.9, 4), roofMat)
  roof.position.y = 1.45
  roof.rotation.y = Math.PI / 4
  roof.castShadow = true; roof.receiveShadow = true
  g.add(roof)
  const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.35, 0.18), wallMat)
  chimney.position.set(0.35, 1.5, 0.15)
  chimney.castShadow = true
  g.add(chimney)
  g.rotation.y = rng() * Math.PI * 2
  return g
}

export function addHouse(gx, gz) {
  const top = state.cellTop[gz * GRID + gx]
  if (top <= SHALLOW_WATER_LEVEL) return false
  const g = makeHouse()
  g.position.set(gx + 0.5, top, gz + 0.5)
  scene.add(g)
  state.houses.push({ x: gx, z: gz, group: g })
  return true
}

export function removeHousesIn(cells) {
  if (!state.houses.length) return
  const cellSet = new Set(cells.map(c => c.z * GRID + c.x))
  for (let i = state.houses.length - 1; i >= 0; i--) {
    if (cellSet.has(state.houses[i].z * GRID + state.houses[i].x)) {
      scene.remove(state.houses[i].group)
      state.houses[i].group.traverse(o => { if (o.material) o.material.dispose(); if (o.geometry) o.geometry.dispose() })
      state.houses.splice(i, 1)
    }
  }
}

// ============================================================================
// Batiments de recherche (toit bleu)
// ============================================================================
function makeResearchHouse() {
  const rng = prng.rng
  const g = new THREE.Group()
  const wallColors = [0xf2e6c9, 0xe6d2a8, 0xd9c79d]
  const roofColors = [0x3c7fb8, 0x3572a3, 0x4a8cc4]
  const wallMat = new THREE.MeshStandardMaterial({ color: wallColors[Math.floor(rng() * 3)], roughness: 0.9, flatShading: true })
  const roofMat = new THREE.MeshStandardMaterial({ color: roofColors[Math.floor(rng() * 3)], roughness: 0.85, flatShading: true })
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.0, 1.0), wallMat)
  body.position.y = 0.5; body.castShadow = true; body.receiveShadow = true
  g.add(body)
  const roof = new THREE.Mesh(new THREE.ConeGeometry(1.0, 0.9, 4), roofMat)
  roof.position.y = 1.45
  roof.rotation.y = Math.PI / 4
  roof.castShadow = true; roof.receiveShadow = true
  g.add(roof)
  const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.35, 0.18), wallMat)
  chimney.position.set(0.35, 1.5, 0.15)
  chimney.castShadow = true
  g.add(chimney)
  g.rotation.y = rng() * Math.PI * 2
  return g
}

export function addResearchHouse(gx, gz) {
  const top = state.cellTop[gz * GRID + gx]
  if (top <= SHALLOW_WATER_LEVEL) return null
  const g = makeResearchHouse()
  g.position.set(gx + 0.5, top, gz + 0.5)
  scene.add(g)
  const entry = { id: state.researchBuildingNextId++, x: gx, z: gz, group: g, assignedColonistId: null }
  state.researchHouses.push(entry)
  return entry
}

export function isResearchHouseOn(x, z) {
  for (const h of state.researchHouses) if (h.x === x && h.z === z) return true
  return false
}

export function findResearchBuildingById(id) {
  for (const h of state.researchHouses) if (h.id === id) return h
  return null
}

export function assignResearcherToBuilding(building) {
  if (!building || building.assignedColonistId != null) return false
  let best = null, bestD = Infinity
  for (const c of state.colonists) {
    if (c.researchBuildingId != null) continue
    if (c.state !== 'IDLE') continue
    const d = Math.abs(c.x - building.x) + Math.abs(c.z - building.z)
    if (d < bestD) { bestD = d; best = c }
  }
  if (!best) return false
  const approach = findApproach(best.x, best.z, building.x, building.z)
  if (!approach) return false
  building.assignedColonistId = best.id
  best.researchBuildingId = building.id
  best.path = approach.path
  best.pathStep = 0
  best.state = 'MOVING'
  best.isWandering = false
  best.targetJob = null
  best.targetBush = null
  best.updateTrail()
  return true
}

export function removeResearchHousesIn(cells) {
  if (!state.researchHouses.length) return
  const cellSet = new Set(cells.map(c => c.z * GRID + c.x))
  for (let i = state.researchHouses.length - 1; i >= 0; i--) {
    const r = state.researchHouses[i]
    if (cellSet.has(r.z * GRID + r.x)) {
      for (const c of state.colonists) {
        if (c.researchBuildingId === r.id) {
          c.researchBuildingId = null
          if (c.state === 'RESEARCHING' || c.state === 'MOVING') {
            c.state = 'IDLE'
            c.path = null
            if (c.lineGeo) c.lineGeo.setFromPoints([])
          }
        }
      }
      scene.remove(r.group)
      r.group.traverse(o => { if (o.material) o.material.dispose(); if (o.geometry) o.geometry.dispose() })
      state.researchHouses.splice(i, 1)
    }
  }
}

export function clearAllResearchHouses() {
  for (const r of state.researchHouses) {
    scene.remove(r.group)
    r.group.traverse(o => { if (o.material) o.material.dispose(); if (o.geometry) o.geometry.dispose() })
  }
  state.researchHouses.length = 0
}

export function countActiveResearchers() {
  let n = 0
  for (const c of state.colonists) if (c.researchBuildingId != null && c.state === 'RESEARCHING') n++
  return n
}

export function clearAllPlacements() {
  state.trees.length = 0; trunkMesh.count = 0; leafMesh.count = 0
  state.rocks.length = 0; rockMesh.count = 0
  state.ores.length = 0; oreRockMesh.count = 0; crystalMesh.count = 0
  state.bushes.length = 0; bushLeafMesh.count = 0; bushBerryMesh.count = 0
  for (let i = 0; i < state.cellOre.length; i++) state.cellOre[i] = null
  for (const h of state.houses) {
    scene.remove(h.group)
    h.group.traverse(o => { if (o.material) o.material.dispose(); if (o.geometry) o.geometry.dispose() })
  }
  state.houses.length = 0
  clearAllResearchHouses()
}

// ============================================================================
// Helpers d'occupation
// ============================================================================
export function isCellOccupied(x, z) {
  for (const t of state.trees) if (t.x === x && t.z === z) return true
  for (const r of state.rocks) if (r.x === x && r.z === z) return true
  for (const h of state.houses) if (h.x === x && h.z === z) return true
  for (const h of state.researchHouses) if (h.x === x && h.z === z) return true
  for (const b of state.bushes) if (b.x === x && b.z === z) return true
  if (state.cellOre[z * GRID + x]) return true
  return false
}

export function isHouseOn(x, z) {
  for (const h of state.houses) if (h.x === x && h.z === z) return true
  for (const h of state.researchHouses) if (h.x === x && h.z === z) return true
  return false
}
export function isOreOn(x, z) {
  for (const o of state.ores) if (o.x === x && o.z === z) return true
  return false
}
export function isBushOn(x, z) {
  for (const b of state.bushes) if (b.x === x && b.z === z) return true
  return false
}
export function isMineBlocked(x, z) {
  // Les filons ne sont plus bloquants : on "mine" un filon pour l'extraire
  // (retire le filon, remplit le stock minerai, le voxel sous reste en place).
  // Seules les maisons et buissons restent bloquants.
  return isHouseOn(x, z) || isBushOn(x, z)
}
