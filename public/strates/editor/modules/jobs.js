import * as THREE from 'three'
import { GRID, MIN_STRATES, MAX_STRATES, SHALLOW_WATER_LEVEL, COL } from './constants.js'
import { state } from './state.js'
import { scene, tmpColor } from './scene.js'
import { topVoxelIndex } from './terrain.js'
import { canMineCell } from './tech.js'
import { isCellOccupied } from './placements.js'

// ============================================================================
// Jobs de minage et de placement
// ============================================================================

export function jobKey(x, z) { return x + ',' + z }

const markerGeo = new THREE.PlaneGeometry(0.6, 0.6)
const markerMat = new THREE.MeshBasicMaterial({ color: 0xff5544, transparent: true, opacity: 0.9, depthWrite: false })
export const markerGroup = new THREE.Group()
scene.add(markerGroup)

export function tintTopVoxel(x, z) {
  const i = topVoxelIndex(x, z)
  if (i < 0) return
  tmpColor.copy(state.origColor[i]).lerp(COL.designate, 0.65)
  state.instanced.setColorAt(i, tmpColor)
  if (state.instanced.instanceColor) state.instanced.instanceColor.needsUpdate = true
}
export function untintTopVoxel(x, z) {
  const i = topVoxelIndex(x, z)
  if (i < 0) return
  state.instanced.setColorAt(i, state.origColor[i])
  if (state.instanced.instanceColor) state.instanced.instanceColor.needsUpdate = true
}

export function addJob(x, z) {
  const k = jobKey(x, z)
  if (state.jobs.has(k)) return
  const top = state.cellTop[z * GRID + x]
  if (top <= MIN_STRATES) return
  if (top <= SHALLOW_WATER_LEVEL) return
  const gate = canMineCell(x, z)
  if (!gate.ok) {
    if (gate.reason === 'tech') state.lastBlockedMineTech = { tech: gate.requiredTech, x, z, t: performance.now() / 1000 }
    return
  }
  state.jobs.set(k, { x, z, claimedBy: null, kind: state.toolState?.tool ?? null })
  state.lastJobTime = performance.now() / 1000
  tintTopVoxel(x, z)
  const m = new THREE.Mesh(markerGeo, markerMat)
  m.position.set(x + 0.5, top + 0.8, z + 0.5)
  markerGroup.add(m)
  state.markers.set(k, m)
}

export function removeJob(x, z, completed = false) {
  const k = jobKey(x, z)
  if (!state.jobs.has(k)) return
  const j = state.jobs.get(k)
  if (j.claimedBy) {
    j.claimedBy.state = 'IDLE'
    j.claimedBy.path = null
    j.claimedBy.targetJob = null
  }
  state.jobs.delete(k)
  if (!completed) untintTopVoxel(x, z)
  const m = state.markers.get(k)
  if (m) { markerGroup.remove(m); state.markers.delete(k) }
}

export function removeAllJobsIn(cells) {
  for (const c of cells) removeJob(c.x, c.z, false)
  for (const c of cells) removeBuildJob(c.x, c.z)
}

// ---------------------------------------------------------------------------
// Build jobs
// ---------------------------------------------------------------------------


export function removeBuildJob(x, z) {
  const k = jobKey(x, z)
  if (!state.buildJobs.has(k)) return false
  const j = state.buildJobs.get(k)
  if (j.claimedBy) {
    j.claimedBy.state = 'IDLE'
    j.claimedBy.path = null
    j.claimedBy.targetBuildJob = null
  }
  state.buildJobs.delete(k)
  untintTopVoxel(x, z)
  const m = state.buildMarkers.get(k)
  if (m) { markerGroup.remove(m); state.buildMarkers.delete(k) }
  return true
}
