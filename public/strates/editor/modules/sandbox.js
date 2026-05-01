import { state } from './state.js'
import { GRID, SHALLOW_WATER_LEVEL } from './constants.js'
import {
  addResearchHouse, addFoyer, addHouse, addBigHouse, addObservatory,
  isCellOccupied
} from './placements.js'
import { refreshToolButtons } from './interaction.js'
import { refreshHUD, refreshTechsPanel } from './hud.js'

// ============================================================================
// Mode sandbox : ?mode=sandbox dans l'URL
// Toutes les techs débloquées, ressources max, bâtiments clés placés.
// ============================================================================

export function isSandboxMode() {
  try {
    return new URLSearchParams(window.location.search).get('mode') === 'sandbox'
  } catch (_) { return false }
}

function tryPlace(fn, ox, oz) {
  const spawn = state.spawn
  if (!spawn) return false
  for (const [dx, dz] of [[ox,oz],[ox+1,oz],[ox,oz+1],[ox-1,oz],[ox,oz-1],[ox+2,oz],[ox,oz+2]]) {
    const x = Math.max(1, Math.min(GRID - 2, spawn.x + dx))
    const z = Math.max(1, Math.min(GRID - 2, spawn.z + dz))
    if (isCellOccupied(x, z)) continue
    if (state.cellTop[z * GRID + x] <= SHALLOW_WATER_LEVEL) continue
    const result = fn(x, z)
    if (result !== false && result !== null) return true
  }
  return false
}

export function activateSandbox() {
  // 1. Débloquer toutes les techs directement (bypass prérequis)
  for (const id of Object.keys(state.techs)) {
    const t = state.techs[id]
    if (!t.unlocked) {
      t.unlocked = true
      t.progress = (typeof t.cost === 'number') ? t.cost : 0
    }
  }

  // 2. Ressources et stocks max
  state.researchPoints = 999
  if (state.resources) {
    state.resources.wood    = 500
    state.resources.stone   = 500
    state.resources.berries = 200
    if (state.resources.food != null) state.resources.food = 200
  }
  if (state.stocks) {
    for (const k of Object.keys(state.stocks)) {
      if (typeof state.stocks[k] === 'number') state.stocks[k] = 99
    }
  }

  // 3. Bâtiments clés autour du spawn
  if (!state.researchHouses || state.researchHouses.length === 0)
    tryPlace(addResearchHouse, 4, 0)
  if (!state.foyers || state.foyers.length === 0)
    tryPlace(addFoyer, -4, 0)
  if (!state.houses || state.houses.length < 3) {
    tryPlace(addHouse, 4, 4)
    tryPlace(addHouse, -4, 4)
  }
  if (!state.bigHouses || state.bigHouses.length === 0)
    tryPlace(addBigHouse, 6, -2)
  if (!state.observatories || state.observatories.length === 0)
    tryPlace(addObservatory, -6, -2)

  // 4. Rafraîchir l'UI
  refreshToolButtons()
  refreshHUD()
  try { refreshTechsPanel() } catch (_) {}

  // 5. Bandeau visuel sandbox
  const banner = document.createElement('div')
  banner.style.cssText = [
    'position:fixed', 'top:0', 'left:50%', 'transform:translateX(-50%)',
    'background:#c8860a', 'color:#111', 'padding:2px 18px',
    'font:700 11px monospace', 'z-index:9999',
    'border-radius:0 0 8px 8px', 'letter-spacing:1.5px',
    'pointer-events:none'
  ].join(';')
  banner.textContent = 'SANDBOX'
  document.body.appendChild(banner)

  console.info('[sandbox] Techs débloquées :', Object.keys(state.techs).length,
    '| Hutte du Sage :', state.researchHouses?.length ?? 0)
}
