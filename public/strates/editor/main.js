import * as THREE from 'three'
import {
  RESEARCH_TICK, BERRY_REGEN_INTERVAL, COL
} from './modules/constants.js'
import { state } from './modules/state.js'
import { camera, controls, composer, loader } from './modules/scene.js'
import { buildTerrain, waterMat, shallowMat, topVoxelIndex } from './modules/terrain.js'
import { populateDefaultScene } from './modules/worldgen.js'
import { refreshBushBerries, countActiveResearchers, tickTreeGrowth, checkUniqueBuildingButtons } from './modules/placements.js'
import { tryBlockedTechBubble, hasPendingResearchableTech } from './modules/tech.js'
import { tryTriggerContextBubble } from './modules/speech.js'
import { startNextQuest, updateQuests, renderQuests, initQuestDefs } from './modules/quests.js'
import { updateCameraPan } from './modules/camera-pan.js'
import {
  refreshHUD, refreshStocksLine, refreshTechsPanel, updateDynHUD, tickFps, hudRefs
} from './modules/hud.js'
import { setTool, setBrush } from './modules/interaction.js'
import { hasSave, loadGame, startAutoSave } from './modules/persistence.js'
import { loadGameData } from './modules/gamedata.js'
import { tickSeasons, currentSeason, forceSeasonRepaint } from './modules/seasons.js'
import { buildVegetation, tickVegetationSeasons } from './modules/vegetation.js'
import { initAudio, tickAudio } from './modules/audio.js'
import { tickWeather } from './modules/weather.js'
import { initTechTreeUI, toggleTechTree, closeTechTree } from './modules/techtree-ui.js'
import { initCharSheet } from './modules/charsheet-ui.js'
import { initHelpOverlay, isHelpOverlayOpen } from './modules/help-overlay.js'
import { initDayNight, bindDayNightUI, tickDayNight, refreshNightPointsHUD } from './modules/daynight.js'
import { tickAllNeeds } from './modules/needs.js'
import { TECH_TREE_DATA } from './modules/gamedata.js'
import { initAgeTransitions, checkCairnOverlay } from './modules/age-transitions.js'
// stocks.js import initialise state.stocks[k] = 0
import './modules/stocks.js'

// ============================================================================
// Boucle principale
// ============================================================================

await loadGameData()
initQuestDefs()

// Injecter les techs du JSON SPEC v1 dans state.techs (sans ecraser les existantes).
// Normalisation : cost { research: N } -> number, requires [] -> req single id.
// Le consommateur (tech.js, hud.js, techtree-ui.js) attend encore le format plat
// legacy (cost number, req string|null). Le cablage du graphe complet requires[]
// multiple est prevu par Lot C (UI tech tree XXL).
if (TECH_TREE_DATA && TECH_TREE_DATA.techs) {
  for (const t of TECH_TREE_DATA.techs) {
    if (!state.techs[t.id]) {
      const costNum = (t.cost && typeof t.cost === 'object') ? (t.cost.research || 0) : (t.cost || 0)
      const reqFirst = Array.isArray(t.requires) ? (t.requires[0] || null) : (t.requires || null)
      state.techs[t.id] = {
        name: t.name,
        cost: costNum,
        req: reqFirst,
        requires: Array.isArray(t.requires) ? t.requires.slice() : [],
        age: t.age,
        branch: t.branch || null,
        icon: t.icon,
        tint: t.color || null,
        unlocked: false
      }
    }
  }
}

buildTerrain()
const isNewGame = (() => { try { const v = localStorage.getItem('strates-new-game'); localStorage.removeItem('strates-new-game'); return !!v } catch(e) { return false } })()
const pendingSlot = (() => { try { const v = localStorage.getItem('strates-pending-load'); localStorage.removeItem('strates-pending-load'); return v } catch(e) { return null } })()
if (!isNewGame && pendingSlot && hasSave(pendingSlot) && loadGame(pendingSlot)) {
  forceSeasonRepaint()
} else if (!isNewGame && hasSave('auto') && loadGame('auto')) {
  forceSeasonRepaint()
} else {
  populateDefaultScene()
}
buildVegetation()
setTool('nav')
setBrush(1)
refreshHUD()
startNextQuest()
startAutoSave(30)
initAudio()
initTechTreeUI()
initCharSheet()
initHelpOverlay()
initDayNight()
bindDayNightUI()
refreshNightPointsHUD()
initAgeTransitions()

// Bouton Arbre des technologies (bouton flottant HUD, touche T)
const btnTT = document.getElementById('btn-techtree') || document.getElementById('btn-techtree-float')
if (btnTT) btnTT.addEventListener('click', toggleTechTree)
const btnTTFloat = document.getElementById('btn-techtree-float')
if (btnTTFloat) btnTTFloat.addEventListener('click', toggleTechTree)

// Touche T
window.addEventListener('keydown', function(e) {
  if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return
  if (e.key === 't' || e.key === 'T') { e.preventDefault(); toggleTechTree() }
})

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
  // Pause totale du tick de jeu tant que l'overlay d'aide (touche H) est ouvert.
  // On vide le delta pour ne pas accumuler, on continue juste le rendu camera.
  if (isHelpOverlayOpen()) {
    clock.getDelta()
    for (const [, m] of state.markers) m.lookAt(camera.position)
    for (const [, m] of state.buildMarkers) m.lookAt(camera.position)
    updateCameraPan(0)
    controls.update()
    composer.render()
    tickFps()
    requestAnimationFrame(tick)
    return
  }
  const dt = Math.min(0.1, clock.getDelta())
  const t = clock.elapsedTime
  waterMat.uniforms.uTime.value = t
  shallowMat.uniforms.uTime.value = t

  for (const [, m] of state.markers) m.lookAt(camera.position)
  for (const [, m] of state.buildMarkers) m.lookAt(camera.position)

  // generation de points de recherche
  // Lot B, B11 : l accumulation est gelee si aucune tech n est recherchable
  // pour l age courant. Evite que researchPoints monte indefiniment alors
  // que le joueur a tout debloque (toutes les techs disponibles faites).
  state.researchTickAccum += dt
  if (state.researchTickAccum >= RESEARCH_TICK) {
    state.researchTickAccum -= RESEARCH_TICK
    const n = countActiveResearchers()
    if (n > 0 && hasPendingResearchableTech()) {
      state.researchPoints += n
      refreshTechsPanel()
    }
  }

  // flashs de minage
  let colorsDirty = false
  for (let i = state.flashes.length - 1; i >= 0; i--) {
    const f = state.flashes[i]
    f.t += dt
    const idxV = topVoxelIndex(f.x, f.z)
    if (idxV < 0) { state.flashes.splice(i, 1); continue }
    if (f.t >= 0.3) {
      state.instanced.setColorAt(idxV, state.origColor[idxV])
      state.flashes.splice(i, 1)
      colorsDirty = true
    } else {
      const k = 1 - (f.t / 0.3)
      tmpColor.copy(state.origColor[idxV]).lerp(COL.flash, k)
      state.instanced.setColorAt(idxV, tmpColor)
      colorsDirty = true
    }
  }
  // Lot B perf : upload GPU uniquement si une couleur a ete modifiee cette frame.
  if (colorsDirty && state.instanced.instanceColor) state.instanced.instanceColor.needsUpdate = true

  // Lot B : monter les besoins (faim, Sans-abri) avant la MAJ des colons
  // pour que leur state soit coherent avant la prise de decision.
  tickAllNeeds(dt)

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

  tickDayNight(dt)
  tickSeasons(dt)
  tickVegetationSeasons(dt)
  tickTreeGrowth(dt)
  tickWeather(dt)
  tickAudio()
  // HUD saison
  if (!tick._lastSeasonHUD || t - tick._lastSeasonHUD >= 1.0) {
    tick._lastSeasonHUD = t
    const sEl = document.getElementById('season-name')
    const sIcon = document.getElementById('season-icon')
    const sTemp = document.getElementById('season-temp')
    if (sEl || sIcon || sTemp) {
      const cs = currentSeason()
      // Temperatures indicatives par saison (placeholder visuel, U3)
      const temps = { spring: 12, summer: 22, autumn: 10, winter: -2 }
      if (sTemp) {
        const v = temps[cs.id]
        sTemp.textContent = (v != null ? v : 15) + '°C'
      }
      const icons = { spring: '\u{1F33C}', summer: '\u2600', autumn: '\u{1F342}', winter: '\u2744' }
      if (sEl) sEl.textContent = cs.name
      if (sIcon) sIcon.textContent = icons[cs.id] || '\u{1F33F}'
    }
  }

  updateQuests(t)
  renderQuests()

  // bulles contextuelles + badge Cairn (1s de cadence)
  if (!tick._lastContextCheck || t - tick._lastContextCheck >= 1.0) {
    tick._lastContextCheck = t
    if (!tryBlockedTechBubble(t)) tryTriggerContextBubble(t)
    checkCairnOverlay()
    checkUniqueBuildingButtons()
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
  // Lot B perf : HUD dynamique gate a 5 Hz (boucle O(colons) + string signature
  // couteuses a 60 Hz). Invisible pour le joueur, gros gain CPU.
  if (!tick._lastDynHUD || t - tick._lastDynHUD > 0.2) {
    tick._lastDynHUD = t
    updateDynHUD()
  }
  tickFps()


  requestAnimationFrame(tick)
}

// Initialise les labels de mode
;(function() {
  const isSandbox = window.STRATES_MODE === 'sandbox'
  const badge = document.getElementById('mode-badge')
  const modeLabel = document.getElementById('hud-mode-label')
  if (badge)     badge.textContent     = isSandbox ? 'Godmod / Sandbox' : 'Mode jeu'
  if (modeLabel) modeLabel.textContent = isSandbox ? ', éditeur de carte' : ''
  document.title = isSandbox ? 'Strates, éditeur' : 'Strates'
})()

loader.classList.add('hidden')
tick()
