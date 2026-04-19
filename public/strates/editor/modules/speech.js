import {
  GRID, CONTEXT_COOLDOWN, FIELD_NO_RESEARCH_DELAY_MAX,
  SPEECH_CONTEXT_FIELD_NO_RESEARCH, SPEECH_CONTEXT_EMPTY_LAB
} from './constants.js'
import { state } from './state.js'

// ============================================================================
// Bulles contextuelles (priorite sur les bulles aleatoires)
// ============================================================================

export function pickContextLine(pool, category) {
  const last = state.contextBubbles.lastLineByCategory.get(category)
  let line, guard = 0
  do { line = pool[Math.floor(Math.random() * pool.length)]; guard++ }
  while (line === last && guard < 6 && pool.length > 1)
  state.contextBubbles.lastLineByCategory.set(category, line)
  return line
}

export function canTriggerContext(category, nowSec) {
  const last = state.contextBubbles.lastCategoryTriggerAt.get(category)
  if (last == null) return true
  return (nowSec - last) >= CONTEXT_COOLDOWN
}

export function markContextTriggered(category, nowSec) {
  state.contextBubbles.lastCategoryTriggerAt.set(category, nowSec)
}

export function countFields() {
  let f = 0
  if (!state.cellSurface) return 0
  for (let i = 0; i < state.cellSurface.length; i++) if (state.cellSurface[i] === 'field') f++
  return f
}

export function isNearField(x, z, radius = 4) {
  if (!state.cellSurface) return false
  const r = radius
  for (let dz = -r; dz <= r; dz++) {
    for (let dx = -r; dx <= r; dx++) {
      const nx = x + dx, nz = z + dz
      if (nx < 0 || nz < 0 || nx >= GRID || nz >= GRID) continue
      if (state.cellSurface[nz * GRID + nx] === 'field') return true
    }
  }
  return false
}

export function activeSpeakers() {
  let n = 0
  for (const c of state.colonists) if (c.speechTimer > 0) n++
  return n
}

export function tryTriggerContextBubble(nowSec) {
  const fieldCount = countFields()
  const hasResearch = state.researchHouses.length > 0
  const hasAssignedResearcher = state.researchHouses.some(r => r.assignedColonistId != null)

  if (fieldCount >= 2 && !hasResearch) {
    if (state.contextBubbles.fieldTriggerStartAt < 0) state.contextBubbles.fieldTriggerStartAt = nowSec
    const elapsed = nowSec - state.contextBubbles.fieldTriggerStartAt
    if (elapsed >= 0 && canTriggerContext('field-no-research', nowSec)) {
      const targetProb = Math.min(1, elapsed / FIELD_NO_RESEARCH_DELAY_MAX)
      if (Math.random() < targetProb * 0.35) {
        const candidates = []
        for (const c of state.colonists) {
          if (c.speechTimer > 0) continue
          if (c.state !== 'IDLE' && c.state !== 'MOVING') continue
          if (c.researchBuildingId != null) continue
          if (!isNearField(c.x, c.z, 5)) continue
          candidates.push(c)
        }
        if (candidates.length > 0 && activeSpeakers() < 2) {
          const speaker = candidates[Math.floor(Math.random() * candidates.length)]
          const line = pickContextLine(SPEECH_CONTEXT_FIELD_NO_RESEARCH, 'field-no-research')
          speaker.sayHint(line)
          markContextTriggered('field-no-research', nowSec)
          return true
        }
      }
    }
  } else {
    state.contextBubbles.fieldTriggerStartAt = -1
  }

  if (hasResearch && !hasAssignedResearcher) {
    if (canTriggerContext('empty-lab', nowSec) && activeSpeakers() < 2) {
      if (Math.random() < 0.25) {
        const candidates = state.colonists.filter(c => c.speechTimer <= 0 && (c.state === 'IDLE' || c.state === 'MOVING'))
        if (candidates.length > 0) {
          const speaker = candidates[Math.floor(Math.random() * candidates.length)]
          const line = pickContextLine(SPEECH_CONTEXT_EMPTY_LAB, 'empty-lab')
          speaker.sayHint(line)
          markContextTriggered('empty-lab', nowSec)
          return true
        }
      }
    }
  }
  return false
}
