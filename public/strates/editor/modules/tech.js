import { GRID, ORE_TECH, TECH_BUBBLE_LINES, TECH_BUBBLE_COOLDOWN } from './constants.js'
import { state } from './state.js'

// ============================================================================
// Tech tree, gating de minage, bulles "tech bloque"
// ============================================================================

export function techUnlocked(id) { return !!(state.techs[id] && state.techs[id].unlocked) }

function hasTreeAt(x, z) {
  for (const t of state.trees) if (t.x === x && t.z === z) return true
  return false
}

export function canMineCell(x, z) {
  if (x < 0 || z < 0 || x >= GRID || z >= GRID) return { ok: false, reason: 'hors-carte', requiredTech: null }
  const biome = state.cellBiome[z * GRID + x]
  // arbre present : requiert hache
  if (hasTreeAt(x, z)) {
    if (!techUnlocked('axe-stone')) return { ok: false, reason: 'tech', requiredTech: 'axe-stone' }
    return { ok: true, reason: null, requiredTech: null }
  }
  const oreType = state.cellOre ? state.cellOre[z * GRID + x] : null
  if (oreType) {
    const req = ORE_TECH[oreType]
    if (req && !techUnlocked(req)) return { ok: false, reason: 'tech', requiredTech: req }
  }
  if (biome === 'rock' || biome === 'snow') {
    if (!techUnlocked('pick-stone')) return { ok: false, reason: 'tech', requiredTech: 'pick-stone' }
  }
  return { ok: true, reason: null, requiredTech: null }
}

// refreshTechsPanel sera rattache par hud.js (DOM), laisse ici pour cohesion
export function unlockTech(id, refreshTechsPanel) {
  const t = state.techs[id]
  if (!t || t.unlocked) return
  if (t.req && !state.techs[t.req].unlocked) return
  if (state.researchPoints < t.cost) return
  state.researchPoints -= t.cost
  t.unlocked = true
  if (refreshTechsPanel) refreshTechsPanel()
  const el = document.getElementById('tech-' + id)
  if (el) { el.classList.add('flash'); setTimeout(() => el.classList.remove('flash'), 800) }
}

export function tryBlockedTechBubble(nowSec) {
  if (!state.lastBlockedMineTech) return false
  if (nowSec - state.lastBlockedMineTech.t > 5) { state.lastBlockedMineTech = null; return false }
  const tech = state.lastBlockedMineTech.tech
  const lastAt = state.lastTechBubbleByTech.get(tech) || -Infinity
  if (nowSec - lastAt < TECH_BUBBLE_COOLDOWN) return false
  const pool = TECH_BUBBLE_LINES[tech]
  if (!pool) return false
  const bx = state.lastBlockedMineTech.x
  const bz = state.lastBlockedMineTech.z
  let best = null, bestD = Infinity
  for (const c of state.colonists) {
    if (c.speechTimer > 0) continue
    if (c.state !== 'IDLE' && c.state !== 'MOVING') continue
    const d = Math.abs(c.x - bx) + Math.abs(c.z - bz)
    if (d < bestD) { bestD = d; best = c }
  }
  if (!best || bestD > 12) return false
  const line = pool[Math.floor(Math.random() * pool.length)]
  best.sayHint(line)
  state.lastTechBubbleByTech.set(tech, nowSec)
  state.lastBlockedMineTech = null
  return true
}
