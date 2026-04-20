import * as THREE from 'three'
import { state } from './state.js'
import { scene, sun, hemi, sky, sunDir } from './scene.js'
import { refreshHUD } from './hud.js'

// ============================================================================
// Cycle jour/nuit (MVP C).
//
// Le joueur bascule manuellement via la touche N ou l'icone HUD. Pas de cycle
// automatique. Transition visuelle lissee sur environ 1.5 s (ambiance, lumiere
// directionnelle, skybox, fog).
//
// Le mode nuit active :
//   - des points nocturnes generes par les promontoires d'observation quand un
//     colon stationne dessus,
//   - un comportement social autour des maisons (feu de camp social, foyer).
// Il desactive certaines activites jour (cueillette de baies par exemple).
// ============================================================================

// --- Parametres d'ambiance pour le jour et la nuit ------------------------
const DAY = {
  bg:        new THREE.Color(0xcfe6f5),
  fog:       new THREE.Color(0xcfe6f5),
  fogDensity: 0.005,
  sunColor:  new THREE.Color(0xfff2d9),
  sunIntensity: 2.4,
  hemiSky:   new THREE.Color(0xbcd7ff),
  hemiGround:new THREE.Color(0x3a2a1a),
  hemiIntensity: 0.55,
  skyTurbidity: 6,
  skyRayleigh: 1.6,
  sunElev: 60,
  sunAzim: 135
}

const NIGHT = {
  bg:        new THREE.Color(0x0c1426),
  fog:       new THREE.Color(0x0c1426),
  fogDensity: 0.012,
  sunColor:  new THREE.Color(0x7d94c8),
  sunIntensity: 0.35,
  hemiSky:   new THREE.Color(0x2a3a6a),
  hemiGround:new THREE.Color(0x08080c),
  hemiIntensity: 0.28,
  skyTurbidity: 0.8,
  skyRayleigh: 0.15,
  sunElev: -10,
  sunAzim: 215
}

// --- Etat de la transition ------------------------------------------------
const TRANSITION_DURATION = 1.5 // secondes
let transitionT = 1              // 1 = pleinement au mode courant
let fromMode = 'day'
let toMode   = 'day'

// Tick pour les points nocturnes
const NIGHT_POINT_INTERVAL = 5 // secondes
let nightPointAccum = 0

// Callbacks (HUD, audio) relies par setHudCallbacks
let onModeChange = null

function lerpColor(out, a, b, k) {
  out.r = a.r + (b.r - a.r) * k
  out.g = a.g + (b.g - a.g) * k
  out.b = a.b + (b.b - a.b) * k
}

function applyAmbiance(k, from, to) {
  const tmp = new THREE.Color()
  lerpColor(tmp, from.bg, to.bg, k)
  if (scene.background && scene.background.isColor) scene.background.copy(tmp)
  if (scene.fog) {
    scene.fog.color.copy(tmp)
    scene.fog.density = from.fogDensity + (to.fogDensity - from.fogDensity) * k
  }
  lerpColor(sun.color, from.sunColor, to.sunColor, k)
  sun.intensity = from.sunIntensity + (to.sunIntensity - from.sunIntensity) * k
  lerpColor(hemi.color, from.hemiSky, to.hemiSky, k)
  lerpColor(hemi.groundColor, from.hemiGround, to.hemiGround, k)
  hemi.intensity = from.hemiIntensity + (to.hemiIntensity - from.hemiIntensity) * k
  const skyU = sky.material.uniforms
  skyU.turbidity.value = from.skyTurbidity + (to.skyTurbidity - from.skyTurbidity) * k
  skyU.rayleigh.value  = from.skyRayleigh + (to.skyRayleigh - from.skyRayleigh) * k
  const elev = from.sunElev + (to.sunElev - from.sunElev) * k
  const azim = from.sunAzim + (to.sunAzim - from.sunAzim) * k
  sunDir.setFromSphericalCoords(1, THREE.MathUtils.degToRad(Math.max(1, 90 - Math.abs(elev))), THREE.MathUtils.degToRad(azim))
  skyU.sunPosition.value.copy(sunDir)
}

function modeParams(mode) {
  return mode === 'night' ? NIGHT : DAY
}

export function initDayNight() {
  const mode = state.isNight ? 'night' : 'day'
  fromMode = mode
  toMode = mode
  transitionT = 1
  applyAmbiance(1, modeParams(mode), modeParams(mode))
  updateHudIcon()
}

export function isNight() {
  return !!state.isNight
}

export function toggleDayNight() {
  const nowNight = !state.isNight
  state.isNight = nowNight
  fromMode = nowNight ? 'day' : 'night'
  toMode   = nowNight ? 'night' : 'day'
  transitionT = 0
  updateHudIcon()
  if (onModeChange) onModeChange(nowNight)
}

export function setDayNightCallback(cb) {
  onModeChange = cb
}

function updateHudIcon() {
  const el = document.getElementById('daynight-icon')
  if (el) {
    el.textContent = state.isNight ? '\u{1F319}' : '\u2600'
    el.title = state.isNight ? 'Mode nuit (N pour basculer)' : 'Mode jour (N pour basculer)'
  }
  const pill = document.getElementById('daynight-pill')
  if (pill) {
    pill.classList.toggle('night', !!state.isNight)
  }
  const np = document.getElementById('r-nightpoints')
  if (np) np.textContent = state.nightPoints
}

// ---- Promontoires d'observation ----
// Stocke les promontoires dans state.observatories (x, z, group).

export function isColonistOnObservatory(c) {
  if (!state.observatories || !state.observatories.length) return false
  for (const obs of state.observatories) {
    if (c.x === obs.x && c.z === obs.z) return true
  }
  return false
}

export function tickDayNight(dt) {
  if (transitionT < 1) {
    transitionT = Math.min(1, transitionT + dt / TRANSITION_DURATION)
    const k = transitionT < 0.5
      ? 2 * transitionT * transitionT
      : 1 - Math.pow(-2 * transitionT + 2, 2) / 2
    applyAmbiance(k, modeParams(fromMode), modeParams(toMode))
  }

  if (state.isNight) {
    nightPointAccum += dt
    if (nightPointAccum >= NIGHT_POINT_INTERVAL) {
      nightPointAccum -= NIGHT_POINT_INTERVAL
      let gained = 0
      for (const c of state.colonists) {
        if (c.state !== 'IDLE') continue
        if (isColonistOnObservatory(c)) gained++
      }
      if (gained > 0) {
        state.nightPoints += gained
        const np = document.getElementById('r-nightpoints')
        if (np) np.textContent = state.nightPoints
      }
    }
  } else {
    nightPointAccum = 0
  }
}

// Bind keyboard N + HUD click handler
export function bindDayNightUI() {
  window.addEventListener('keydown', (e) => {
    const tag = e.target && e.target.tagName
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
    if (e.key === 'n' || e.key === 'N') {
      e.preventDefault()
      toggleDayNight()
    }
  })
  const pill = document.getElementById('daynight-pill')
  if (pill) pill.addEventListener('click', toggleDayNight)
  updateHudIcon()
}

export function refreshNightPointsHUD() {
  const np = document.getElementById('r-nightpoints')
  if (np) np.textContent = state.nightPoints
}
