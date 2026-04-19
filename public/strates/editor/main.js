import * as THREE from 'three'
import {
  RESEARCH_TICK, BERRY_REGEN_INTERVAL, COL
} from './modules/constants.js'
import { state } from './modules/state.js'
import { camera, controls, composer, loader } from './modules/scene.js'
import { buildTerrain, waterMat, shallowMat, topVoxelIndex } from './modules/terrain.js'
import { populateDefaultScene } from './modules/worldgen.js'
import { refreshBushBerries, countActiveResearchers, tickTreeGrowth } from './modules/placements.js'
import { tryBlockedTechBubble } from './modules/tech.js'
import { tryTriggerContextBubble } from './modules/speech.js'
import { startNextQuest, updateQuests, renderQuests } from './modules/quests.js'
import { updateCameraPan } from './modules/camera-pan.js'
import {
  refreshHUD, refreshStocksLine, refreshTechsPanel, updateDynHUD, tickFps, hudRefs
} from './modules/hud.js'
import { setTool, setBrush } from './modules/interaction.js'
import { hasSave, loadGame, startAutoSave } from './modules/persistence.js'
import { tickSeasons, currentSeason, forceSeasonRepaint } from './modules/seasons.js'
import { buildVegetation, tickVegetationSeasons } from './modules/vegetation.js'
import { initAudio, tickAudio } from './modules/audio.js'
import { buildFog, tickFog } from './modules/fog.js'
// stocks.js import initialise state.stocks[k] = 0
import './modules/stocks.js'

// ============================================================================
// Boucle principale
// ============================================================================

startNextQuest()

buildTerrain()
if (hasSave('auto') && loadGame('auto')) {
  forceSeasonRepaint()
} else {
  populateDefaultScene()
}
buildVegetation()
buildFog()
setTool('nav')
setBrush(1)
refreshHUD()
startAutoSave(30)
initAudio()

state.lastJobTime = performance.now() / 1000

const tmpColor = new THREE.Color()
const clock = new THREE.Clock()
const TARGET_FPS = 60
const FRAME_MIN_MS = 1000 / TARGET_FPS
let lastFrameMs = 0

function tick(nowMs) {
  if (nowMs == null) nowMs = performance.now()
  if (nowMs - lastFrameMs < FRAME_MIN_MS - 0.5) {
    requestAnimationFrame(tick)
    return
  }
  lastFrameMs = nowMs
  const dt = Math.min(0.1, clock.getDelta())
  const t = clock.elapsedTime
  waterMat.uniforms.uTime.value = t
  shallowMat.uniforms.uTime.value = t

  for (const [, m] of state.markers) m.lookAt(camera.position)
  for (const [, m] of state.buildMarkers) m.lookAt(camera.position)

  // generation de points de recherche
  state.researchTickAccum += dt
  if (state.researchTickAccum >= RESEARCH_TICK) {
    state.researchTickAccum -= RESEARCH_TICK
    const n = countActiveResearchers()
    if (n > 0) {
      state.researchPoints += n
      refreshTechsPanel()
    }
  }

  // flashs de minage
  for (let i = state.flashes.length - 1; i >= 0; i--) {
    const f = state.flashes[i]
    f.t += dt
    const idxV = topVoxelIndex(f.x, f.z)
    if (idxV < 0) { state.flashes.splice(i, 1); continue }
    if (f.t >= 0.3) {
      state.instanced.setColorAt(idxV, state.origColor[idxV])
      state.flashes.splice(i, 1)
    } else {
      const k = 1 - (f.t / 0.3)
      tmpColor.copy(state.origColor[idxV]).lerp(COL.flash, k)
      state.instanced.setColorAt(idxV, tmpColor)
    }
  }
  if (state.instanced.instanceColor) state.instanced.instanceColor.needsUpdate = true

  for (const c of state.colonists) c.update(dt)

  // regen des baies
  for (const b of state.bushes) {
    if (b.berries < b.maxBerries) {
      b.regenTimer += dt
      if (b.regenTimer >= BERRY_REGEN_INTERVAL) {
        b.regenTimer = 0
        b.berries = Math.min(b.maxBerries, b.berries + 1)
        refreshBushBerries(b)
      }
    }
  }

  tickSeasons(dt)
  tickVegetationSeasons(dt)
  tickTreeGrowth(dt)
  tickFog(dt)
  tickAudio()
  // HUD saison
  if (!tick._lastSeasonHUD || t - tick._lastSeasonHUD >= 1.0) {
    tick._lastSeasonHUD = t
    const sEl = document.getElementById('season-name')
    const sIcon = document.getElementById('season-icon')
    if (sEl || sIcon) {
      const cs = currentSeason()
      const icons = { spring: '\u{1F33C}', summer: '\u2600', autumn: '\u{1F342}', winter: '\u2744' }
      if (sEl) sEl.textContent = cs.name
      if (sIcon) sIcon.textContent = icons[cs.id] || '\u{1F33F}'
    }
  }

  updateQuests(t)
  renderQuests()

  // bulles contextuelles (1s de cadence)
  if (!tick._lastContextCheck || t - tick._lastContextCheck >= 1.0) {
    tick._lastContextCheck = t
    if (!tryBlockedTechBubble(t)) tryTriggerContextBubble(t)
  }

  if (hudRefs.rBerriesEl) hudRefs.rBerriesEl.textContent = state.resources.berries
  if (hudRefs.rWoodEl) hudRefs.rWoodEl.textContent = state.resources.wood
  if (hudRefs.rStoneEl) hudRefs.rStoneEl.textContent = state.resources.stone
  if (hudRefs.cBushesEl) hudRefs.cBushesEl.textContent = state.bushes.length
  refreshStocksLine()
  if (hudRefs.rPointsEl) hudRefs.rPointsEl.textContent = state.researchPoints

  updateCameraPan(dt)
  controls.update()
  composer.render()
  updateDynHUD()
  tickFps()

  requestAnimationFrame(tick)
}

loader.classList.add('hidden')
tick()
