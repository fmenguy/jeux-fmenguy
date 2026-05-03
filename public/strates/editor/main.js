import * as THREE from 'three'
import {
  RESEARCH_TICK, BERRY_REGEN_INTERVAL, COL
} from './modules/constants.js'
import { state } from './modules/state.js'
import { camera, controls, composer, loader } from './modules/scene.js'
import { buildTerrain, waterMat, shallowMat, topVoxelIndex } from './modules/terrain.js'
import { populateDefaultScene } from './modules/worldgen.js'
import { refreshBushBerries, tickTreeGrowth, tickFoyers, checkUniqueBuildingButtons, bushLeafMesh, tickDeer } from './modules/placements.js'
import { tryBlockedTechBubble, hasPendingResearchableTech, unlockTech, queueTech } from './modules/tech.js'
import { tryTriggerContextBubble } from './modules/speech.js'
import { startNextQuest, updateQuests, renderQuests, initQuestDefs } from './modules/quests.js'
import { updateCameraPan, clampCamera } from './modules/camera-pan.js'
import {
  refreshHUD, refreshStocksLine, refreshTechsPanel, updateDynHUD, tickFps, hudRefs,
  tickResourceAnim
} from './modules/hud.js'
import { setTool, setBrush, refreshToolButtons } from './modules/interaction.js'
import { hasSave, loadGame, startAutoSave, resetTutorialFlags } from './modules/persistence.js'
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
import { computeJobProductivity } from './modules/productivity.js'
import { TECH_TREE_DATA } from './modules/gamedata.js'
import { initAgeTransitions, checkCairnOverlay } from './modules/age-transitions.js'
import { loadModels } from './modules/glb-cache.js'
import { initPopulationModal } from './modules/ui/population-modal.js'
import { initBuildingPanel } from './modules/ui/building-panel.js'
import { initAgriculturePanel } from './modules/ui/agriculture-panel.js'
import { initCellTooltip } from './modules/ui/cell-tooltip.js'
import { initTutoInvite, showTutoInvite } from './modules/ui/tutorial.js'
import { buildFog, tickFog } from './modules/fog.js'
import { tickConstructionFX } from './modules/construction-fx.js'
import { initSeasonBar, tickSeasonBar } from './modules/ui/season-bar.js'
// stocks.js import initialise state.stocks[k] = 0
import './modules/stocks.js'

// ============================================================================
// Boucle principale
// ============================================================================

await loadGameData()
await loadModels()
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
if (isNewGame) resetTutorialFlags()
if (!isNewGame && pendingSlot && hasSave(pendingSlot) && loadGame(pendingSlot)) {
  forceSeasonRepaint()
} else if (!isNewGame && hasSave('auto') && loadGame('auto')) {
  forceSeasonRepaint()
} else {
  populateDefaultScene()
}
buildVegetation()
buildFog()
setTool('nav')
setBrush(1)
refreshToolButtons()
refreshHUD()
startNextQuest()
startAutoSave(30)
initAudio()
initTechTreeUI()
initCharSheet()
initBuildingPanel()
initAgriculturePanel()
initCellTooltip()
initHelpOverlay()
initDayNight()
initPopulationModal()
bindDayNightUI()
refreshNightPointsHUD()
initAgeTransitions()
initTutoInvite()
initSeasonBar()

const btnPauseTuto = document.getElementById('pause-tuto')
if (btnPauseTuto) btnPauseTuto.addEventListener('click', () => {
  // fermer le menu pause avant d'afficher la bulle
  const pm = document.getElementById('pause-menu')
  if (pm) pm.classList.add('hidden')
  showTutoInvite()
})

// Lot B : expose la file de recherche a l UI externe (Lot C, tech tree XXL).
// L agent C appelle window.StratesResearch.queue(id) pour enfiler une tech
// et ecoute les events strates:queueChanged / :researchStarted / :techComplete.
try {
  window.StratesResearch = {
    queue: queueTech,
    unlock: unlockTech
  }
} catch (e) { /* ignore */ }

// Bouton Arbre des technologies (rail HUD, touche T)
const btnTT = document.getElementById('btn-techtree') || document.getElementById('btn-techtree-float')
if (btnTT) btnTT.addEventListener('click', toggleTechTree)
window.addEventListener('strates:toggleTechTree', toggleTechTree)

// Touche T
window.addEventListener('keydown', function(e) {
  if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return
  if (e.key === 't' || e.key === 'T') { e.preventDefault(); toggleTechTree() }
})

state.lastJobTime = performance.now() / 1000

const _resNameEl = document.getElementById('res-tech-name')
const _resBarEl = document.getElementById('res-bar-fill')
const _resPctEl = document.getElementById('res-tech-pct')

function updateResearchWidget() {
  if (!_resNameEl) return
  const ar = state.activeResearch
  if (!ar) {
    const qLen = state.researchQueue ? state.researchQueue.length : 0
    _resNameEl.textContent = qLen > 0 ? ('En file : ' + qLen + ' tech' + (qLen > 1 ? 's' : '')) : 'Aucune recherche'
    if (_resBarEl) _resBarEl.style.width = '0%'
    if (_resPctEl) _resPctEl.textContent = ''
    return
  }
  const techEntry = TECH_TREE_DATA && Array.isArray(TECH_TREE_DATA.techs)
    ? TECH_TREE_DATA.techs.find(x => x.id === ar.id)
    : null
  const cost = techEntry ? ((techEntry.cost && techEntry.cost.research) || 0) : 0
  const pct = cost > 0 ? Math.min(100, Math.floor(ar.progress / cost * 100)) : 0
  if (_resNameEl) _resNameEl.textContent = techEntry ? techEntry.name : ar.id
  if (_resBarEl) _resBarEl.style.width = pct + '%'
  if (_resPctEl) _resPctEl.textContent = pct + '%'
}

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

  if (!tick._bushDiagDone && t > 2) {
    tick._bushDiagDone = true
    if (state.bushes.length > 0 && bushLeafMesh.count === 0) {
      console.warn('[diag] bushes placés (' + state.bushes.length + ') mais bushLeafMesh.count=0 — meshes invisibles')
    }
  }

  for (const [, m] of state.markers) m.lookAt(camera.position)
  for (const [, m] of state.buildMarkers) m.lookAt(camera.position)

  // Lot B : file de recherche. La progression n avance que si une tech est
  // active (state.activeResearch != null) ET qu au moins un chercheur est
  // assigne. A la completion (progress >= cost), unlockTech est appelee puis
  // la queue avance automatiquement. state.researchPoints est synchronise avec
  // la progression de la tech active pour garder la compat HUD existante.
  state.researchTickAccum += dt
  if (state.researchTickAccum >= RESEARCH_TICK) {
    state.researchTickAccum -= RESEARCH_TICK
    // Lot B : productivite de recherche scaled par nb de chercheurs RESEARCHING
    // ET par leur skillLevel('research'). Si aucun colon n a la profession
    // 'chercheur', la prod est strictement 0 (plus de plancher pour le chef).
    const prod = computeJobProductivity(state, 'chercheur', 'RESEARCHING')
    const n = Math.round(prod * 10)
    if (n > 0 && state.activeResearch) {
      state.activeResearch.progress += n
      const techEntry = TECH_TREE_DATA && Array.isArray(TECH_TREE_DATA.techs)
        ? TECH_TREE_DATA.techs.find(x => x.id === state.activeResearch.id)
        : null
      const cost = techEntry ? ((techEntry.cost && techEntry.cost.research) || 0) : 0
      if (cost > 0 && state.activeResearch.progress >= cost) {
        const completedId = state.activeResearch.id
        state.activeResearch = null
        // Le cout a deja ete paye en temps (progression), pas en points stockes.
        unlockTech(completedId, refreshTechsPanel, { alreadyPaid: true })
        try {
          window.dispatchEvent(new CustomEvent('strates:techComplete', {
            detail: { id: completedId, tech: techEntry }
          }))
        } catch (e) { /* ignore */ }
        // Avancer la file : si une autre tech est enfilee, elle devient active.
        if (state.researchQueue && state.researchQueue.length > 0) {
          const nextId = state.researchQueue.shift()
          state.activeResearch = { id: nextId, progress: 0 }
          try {
            window.dispatchEvent(new CustomEvent('strates:researchStarted', { detail: { id: nextId } }))
            window.dispatchEvent(new CustomEvent('strates:queueChanged'))
          } catch (e) { /* ignore */ }
        } else {
          try { window.dispatchEvent(new CustomEvent('strates:queueChanged')) } catch (e) { /* ignore */ }
        }
      }
      // Retrocompat : HUD researchPoints reflete la progression de la tech en cours.
      state.researchPoints = state.activeResearch ? Math.floor(state.activeResearch.progress) : 0
      refreshTechsPanel()
    } else if (!state.activeResearch && hasPendingResearchableTech()) {
      // Rien n est en cours mais des techs sont dispo : on n accumule pas,
      // on attend que le joueur enfile une tech via queueTech.
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

  tickDeer(dt)

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

  // Production de grain par les champs de ble (tick toutes les ~2s)
  tick._grainAccum = (tick._grainAccum || 0) + dt
  if (tick._grainAccum >= 2.0) {
    tick._grainAccum -= 2.0
    if (state.wheatFields && state.wheatFields.length) {
      for (const f of state.wheatFields) {
        f.grain = (f.grain || 0) + 0.08
        if (f.grain >= 1.0) {
          const harvested = Math.floor(f.grain)
          state.stocks.grain = (state.stocks.grain || 0) + harvested
          state.resources.grain = (state.resources.grain || 0) + harvested
          f.grain -= harvested
        }
      }
    }
  }

  tickFog(dt)
  tickConstructionFX()
  tickDayNight(dt)
  tickSeasons(dt)
  tickVegetationSeasons(dt)
  tickTreeGrowth(dt)
  tickFoyers(dt)
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
    const yearEl = document.getElementById('time-year')
    if (yearEl) yearEl.textContent = state.season.year ?? 1
    tickSeasonBar()
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

  tickResourceAnim()
  refreshStocksLine()

  updateCameraPan(dt)
  controls.update()
  clampCamera()
  composer.render()
  // Lot B perf : HUD dynamique gate a 5 Hz (boucle O(colons) + string signature
  // couteuses a 60 Hz). Invisible pour le joueur, gros gain CPU.
  if (!tick._lastDynHUD || t - tick._lastDynHUD > 0.2) {
    tick._lastDynHUD = t
    updateDynHUD()
    updateResearchWidget()
    refreshToolButtons()
  }
  tickFps()


  requestAnimationFrame(tick)
}

document.title = 'Strates'

loader.classList.add('hidden')
tick()
