import * as THREE from 'three'
import { state } from './state.js'
import { scene, sun, hemi, sky, sunDir } from './scene.js'
import { refreshHUD, formatNum } from './hud.js'
import { techUnlocked } from './tech.js'

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
  sunAzim: 135,
  starsOpacity: 0
}

const NIGHT = {
  bg:        new THREE.Color(0x050510),
  fog:       new THREE.Color(0x050510),
  fogDensity: 0.012,
  sunColor:  new THREE.Color(0x7d94c8),
  sunIntensity: 0.35,
  hemiSky:   new THREE.Color(0x2a3a6a),
  hemiGround:new THREE.Color(0x08080c),
  hemiIntensity: 0.28,
  skyTurbidity: 0.8,
  skyRayleigh: 0.15,
  sunElev: -10,
  sunAzim: 215,
  starsOpacity: 1
}

// --- Champ d'etoiles (hemisphere superieure uniquement) ---
const starsGeo = new THREE.BufferGeometry()
;(function buildStars() {
  const positions = new Float32Array(800 * 3)
  for (let i = 0; i < 800; i++) {
    const theta = Math.random() * Math.PI * 2
    const phi = Math.random() * Math.PI * 0.5
    const r = 150 + Math.random() * 30
    positions[i * 3]     = r * Math.sin(phi) * Math.cos(theta)
    positions[i * 3 + 1] = r * Math.cos(phi)
    positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta)
  }
  starsGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
})()
const starsMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.45, sizeAttenuation: true, transparent: true, opacity: 0 })
const stars = new THREE.Points(starsGeo, starsMat)
stars.frustumCulled = false
scene.add(stars)

// --- Lucioles ---
function createFireflies() {
  const count = 40
  const geo = new THREE.BufferGeometry()
  const pos = new Float32Array(count * 3)
  const phases = new Float32Array(count)
  for (let i = 0; i < count; i++) {
    pos[i * 3]     = (Math.random() - 0.5) * 80
    pos[i * 3 + 1] = 1.0 + Math.random() * 2.5
    pos[i * 3 + 2] = (Math.random() - 0.5) * 80
    phases[i] = Math.random() * Math.PI * 2
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  const mat = new THREE.PointsMaterial({
    color: 0x88ff55,
    size: 0.35,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.85,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  })
  const ff = new THREE.Points(geo, mat)
  ff.visible = false
  ff.userData.phases = phases
  scene.add(ff)
  return ff
}

const fireflies = createFireflies()

function tickFireflies(time) {
  if (!fireflies.visible) return
  const pos = fireflies.geometry.attributes.position.array
  const phases = fireflies.userData.phases
  for (let i = 0; i < phases.length; i++) {
    const ph = phases[i]
    pos[i * 3]     += Math.sin(time * 0.3 + ph) * 0.008
    pos[i * 3 + 1] += Math.sin(time * 0.5 + ph * 1.3) * 0.004
    pos[i * 3 + 2] += Math.cos(time * 0.3 + ph * 0.7) * 0.008
    if (pos[i * 3 + 1] < 0.8) pos[i * 3 + 1] = 0.8
    if (pos[i * 3 + 1] > 4.0) pos[i * 3 + 1] = 4.0
  }
  fireflies.geometry.attributes.position.needsUpdate = true
  fireflies.material.opacity = 0.6 + Math.sin(time * 1.2) * 0.25
}

// --- Etat de la transition ------------------------------------------------
const TRANSITION_DURATION = 1.5 // secondes
let transitionT = 1              // 1 = pleinement au mode courant
let fromMode = 'day'
let toMode   = 'day'

// Tick pour les points nocturnes
const NIGHT_POINT_INTERVAL = 5 // secondes
let nightPointAccum = 0

// Duree de base de la nuit (en secondes). astronomy-1 la reduit de 20 s.
const BASE_NIGHT_DURATION = 120 // secondes
export function getNightDuration() {
  return BASE_NIGHT_DURATION - (techUnlocked('astronomy-1') ? 20 : 0)
}

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
  starsMat.opacity = from.starsOpacity + (to.starsOpacity - from.starsOpacity) * k
}

function modeParams(mode) {
  return mode === 'night' ? NIGHT : DAY
}

export function initDayNight() {
  const mode = state.isNight ? 'night' : 'day'
  fromMode = mode
  toMode = mode
  transitionT = 1
  fireflies.visible = !!state.isNight
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
  fireflies.visible = nowNight
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
    if (obs.isUnderConstruction) continue
    if (c.x === obs.x && c.z === obs.z) return true
  }
  return false
}

let _elapsed = 0

export function tickDayNight(dt) {
  _elapsed += dt
  if (transitionT < 1) {
    transitionT = Math.min(1, transitionT + dt / TRANSITION_DURATION)
    const k = transitionT < 0.5
      ? 2 * transitionT * transitionT
      : 1 - Math.pow(-2 * transitionT + 2, 2) / 2
    applyAmbiance(k, modeParams(fromMode), modeParams(toMode))
  }

  tickFireflies(_elapsed)

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
  if (np) np.textContent = formatNum(state.nightPoints)
}
