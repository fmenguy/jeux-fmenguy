import * as THREE from 'three'
import { scene } from './scene.js'
import { state } from './state.js'
import { GRID } from './constants.js'

// ============================================================================
// Systeme meteo : pluie, neige, ciel gris
// ============================================================================

const CX = GRID / 2, CZ = GRID / 2
const SPAN = GRID * 0.72

// Probabilites par saison : [seuil_cumulatif, type_meteo]
const PROBS = {
  spring: [[0.52, 'clear'], [0.80, 'light_rain'], [1.00, 'rain']],
  summer: [[0.78, 'clear'], [0.94, 'light_rain'], [1.00, 'rain']],
  autumn: [[0.32, 'clear'], [0.58, 'light_rain'], [0.82, 'rain'], [1.00, 'heavy_rain']],
  winter: [[0.40, 'clear'], [0.58, 'snow'],        [0.80, 'snow'], [1.00, 'heavy_snow']]
}

// Config par etat meteo
const CFG = {
  clear:      { rainOp: 0,    snowOp: 0,    rainSpeed: 0,  snowSpeed: 0, rainN: 0,    snowN: 0,    fogDensity: 0.005 },
  light_rain: { rainOp: 0.20, snowOp: 0,    rainSpeed: 22, snowSpeed: 0, rainN: 1400, snowN: 0,    fogDensity: 0.007 },
  rain:       { rainOp: 0.38, snowOp: 0,    rainSpeed: 30, snowSpeed: 0, rainN: 2500, snowN: 0,    fogDensity: 0.011 },
  heavy_rain: { rainOp: 0.60, snowOp: 0,    rainSpeed: 40, snowSpeed: 0, rainN: 4000, snowN: 0,    fogDensity: 0.017 },
  snow:       { rainOp: 0,    snowOp: 0.50, rainSpeed: 0,  snowSpeed: 4, rainN: 0,    snowN: 1500, fogDensity: 0.008 },
  heavy_snow: { rainOp: 0,    snowOp: 0.72, rainSpeed: 0,  snowSpeed: 6, rainN: 0,    snowN: 3000, fogDensity: 0.013 }
}

// ---- Pluie (LineSegments) ----
const RAIN_N = 4000
const rPos  = new Float32Array(RAIN_N * 6)
const rVel  = new Float32Array(RAIN_N)
const rGeo  = new THREE.BufferGeometry()
const rAttr = new THREE.BufferAttribute(rPos, 3)
rAttr.setUsage(THREE.DynamicDrawUsage)
rGeo.setAttribute('position', rAttr)
const rMat = new THREE.LineBasicMaterial({
  color: 0x9bb8d4, transparent: true, opacity: 0, depthWrite: false
})
const rainMesh = new THREE.LineSegments(rGeo, rMat)
rainMesh.frustumCulled = false
rainMesh.renderOrder = 10
scene.add(rainMesh)

// ---- Neige (Points) ----
const SNOW_N = 3000
const sPos   = new Float32Array(SNOW_N * 3)
const sPhase = new Float32Array(SNOW_N)
const sGeo   = new THREE.BufferGeometry()
const sAttr  = new THREE.BufferAttribute(sPos, 3)
sAttr.setUsage(THREE.DynamicDrawUsage)
sGeo.setAttribute('position', sAttr)
const sMat = new THREE.PointsMaterial({
  color: 0xddeeff, size: 0.28, transparent: true, opacity: 0,
  depthWrite: false, sizeAttenuation: true
})
const snowMesh = new THREE.Points(sGeo, sMat)
snowMesh.frustumCulled = false
snowMesh.renderOrder = 10
scene.add(snowMesh)

function spawnRain(i, randomY) {
  const x = CX + (Math.random() - 0.5) * SPAN * 2
  const y = randomY ? Math.random() * 80 + 2 : 82
  const z = CZ + (Math.random() - 0.5) * SPAN * 2
  const len = 1.0 + Math.random() * 1.4
  rPos[i*6  ] = x;       rPos[i*6+1] = y;       rPos[i*6+2] = z
  rPos[i*6+3] = x + 0.5; rPos[i*6+4] = y - len; rPos[i*6+5] = z + 0.12
  rVel[i] = 0.78 + Math.random() * 0.44
}

function spawnSnow(i, randomY) {
  sPos[i*3  ] = CX + (Math.random() - 0.5) * SPAN * 2
  sPos[i*3+1] = randomY ? Math.random() * 80 + 2 : 82
  sPos[i*3+2] = CZ + (Math.random() - 0.5) * SPAN * 2
  sPhase[i]   = Math.random() * Math.PI * 2
}

// Init avec positions aleatoires sur toute la hauteur
for (let i = 0; i < RAIN_N; i++) spawnRain(i, true)
for (let i = 0; i < SNOW_N; i++) spawnSnow(i, true)
rAttr.needsUpdate = true
sAttr.needsUpdate = true

// ---- Machine a etats meteo ----
let _cur = 'clear', _tgt = 'clear', _blend = 1, _changeIn = 90, _acc = 0

function pickWeather(sid) {
  const table = PROBS[sid] || PROBS.spring
  const r = Math.random()
  for (const [p, w] of table) if (r < p) return w
  return 'clear'
}

export function currentWeather() { return _blend >= 0.5 ? _tgt : _cur }

const CLEAR_COL = new THREE.Color(0xcfe6f5)
const RAIN_COL  = new THREE.Color(0x8898a8)
const SNOW_COL  = new THREE.Color(0xc8d4e0)

const WEATHER_LABEL = {
  clear: '', light_rain: 'pluie fine', rain: 'pluie',
  heavy_rain: 'averse', snow: 'neige', heavy_snow: 'tempete de neige'
}

export function tickWeather(dt) {
  _acc += dt
  if (_acc >= _changeIn) {
    _acc = 0
    _changeIn = 65 + Math.random() * 115
    const sid = state.season ? ['spring', 'summer', 'autumn', 'winter'][state.season.idx] : 'spring'
    const next = pickWeather(sid)
    if (next !== (_blend >= 1 ? _cur : _tgt)) {
      _tgt = next; _blend = 0
    }
  }

  if (_blend < 1) {
    _blend = Math.min(1, _blend + dt / 8)
    if (_blend >= 1) _cur = _tgt
  }

  const eff = _blend >= 0.5 ? _tgt : _cur
  const cfg = CFG[eff] || CFG.clear

  // Opacites fluides
  rMat.opacity += (cfg.rainOp - rMat.opacity) * Math.min(1, dt * 1.8)
  sMat.opacity += (cfg.snowOp - sMat.opacity) * Math.min(1, dt * 1.0)

  // Icone meteo dans le HUD
  const wEl = document.getElementById('weather-label')
  if (wEl) wEl.textContent = WEATHER_LABEL[eff] || ''

  // Draw range pour limiter le travail CPU
  const rN = Math.min(RAIN_N, cfg.rainN)
  const sN = Math.min(SNOW_N, cfg.snowN)
  rGeo.setDrawRange(0, rN * 2)
  sGeo.setDrawRange(0, sN)

  // Mise a jour particules pluie
  if (rMat.opacity > 0.005 && rN > 0) {
    const spd = cfg.rainSpeed
    const wdx = 0.45 * dt, wdz = 0.12 * dt
    for (let i = 0; i < rN; i++) {
      const dy = spd * rVel[i] * dt
      rPos[i*6+1] -= dy;   rPos[i*6+4] -= dy
      rPos[i*6  ] += wdx;  rPos[i*6+3] += wdx
      rPos[i*6+2] += wdz;  rPos[i*6+5] += wdz
      if (rPos[i*6+4] < -1) spawnRain(i, false)
    }
    rAttr.needsUpdate = true
  }

  // Mise a jour particules neige
  if (sMat.opacity > 0.005 && sN > 0) {
    const spd = cfg.snowSpeed
    for (let i = 0; i < sN; i++) {
      sPos[i*3+1] -= spd * dt
      sPos[i*3  ] += Math.sin(sPos[i*3+1] * 0.4 + sPhase[i]) * 1.2 * dt
      if (sPos[i*3+1] < -1) spawnSnow(i, false)
    }
    sAttr.needsUpdate = true
  }

  // Couleur fog selon meteo
  const isSnow = eff.includes('snow')
  const targetFog = isSnow ? SNOW_COL : (eff === 'clear' ? CLEAR_COL : RAIN_COL)
  scene.fog.color.lerp(targetFog, dt * 0.25)
  scene.fog.density += (cfg.fogDensity - scene.fog.density) * dt * 0.5
}
