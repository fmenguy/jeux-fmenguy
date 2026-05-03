// ============================================================================
// construction-fx.js : effet visuel des chantiers en cours.
//
// Lot E (UI/visuel). Lit en lecture seule les flags posés par Lot B :
//   building.isUnderConstruction (bool)
//   building.constructionProgress (0..1)
//
// Pour chaque bâtiment marqué isUnderConstruction :
//   - Force l'opacité des matériaux du group à 0.4 (mémorise l'état d'origine)
//   - Affiche une barre de progression DOM positionnée en world-to-screen
// Quand le flag retombe à false : restaure l'opacité d'origine et masque la barre.
//
// API : tickConstructionFX() appelé chaque frame depuis main.js.
// ============================================================================

import * as THREE from 'three'
import { state } from './state.js'
import { camera } from './scene.js'
import { isAnyBlockingModalOpen } from './ui/modal-state.js'

const _v3 = new THREE.Vector3()
const overlayContainer = ensureOverlayContainer()
const barCache = new Map() // group.uuid -> { wrap, fill }
const matCache = new WeakMap() // material -> { transparent, opacity }

function ensureOverlayContainer() {
  let el = document.getElementById('construction-fx-overlay')
  if (el) return el
  el = document.createElement('div')
  el.id = 'construction-fx-overlay'
  el.style.cssText =
    'position:fixed;inset:0;pointer-events:none;z-index:75;'
  document.body.appendChild(el)
  injectStyle()
  return el
}

function injectStyle() {
  if (document.getElementById('construction-fx-style')) return
  const s = document.createElement('style')
  s.id = 'construction-fx-style'
  s.textContent =
    '.cfx-bar {' +
    '  position:absolute; transform:translate(-50%, -100%);' +
    '  display:flex; flex-direction:column; align-items:center;' +
    '  pointer-events:none; user-select:none;' +
    '  font-family:"JetBrains Mono",ui-monospace,monospace;' +
    '  font-size:9.5px; color:#f3ecdd;' +
    '  text-shadow:0 0 3px rgba(0,0,0,0.85);' +
    '  letter-spacing:0.06em;' +
    '}' +
    '.cfx-bar .cfx-label {' +
    '  margin-bottom:2px; padding:0 4px;' +
    '}' +
    '.cfx-bar .cfx-track {' +
    '  width:60px; height:5px; background:rgba(0,0,0,0.55);' +
    '  border:1px solid rgba(255,217,138,0.45);' +
    '  border-radius:3px; overflow:hidden;' +
    '}' +
    '.cfx-bar .cfx-fill {' +
    '  height:100%; width:0%; background:linear-gradient(90deg,#d4b870,#ffd98a);' +
    '  transition:width 0.18s linear;' +
    '}'
  document.head.appendChild(s)
}

function applyTransparency(group) {
  group.traverse(o => {
    const mats = o.material
    if (!mats) return
    const list = Array.isArray(mats) ? mats : [mats]
    for (const m of list) {
      if (!matCache.has(m)) {
        matCache.set(m, { transparent: m.transparent, opacity: m.opacity })
      }
      m.transparent = true
      m.opacity = 0.4
      m.needsUpdate = true
    }
  })
}

function restoreOpacity(group) {
  group.traverse(o => {
    const mats = o.material
    if (!mats) return
    const list = Array.isArray(mats) ? mats : [mats]
    for (const m of list) {
      const saved = matCache.get(m)
      if (saved) {
        m.transparent = saved.transparent
        m.opacity = saved.opacity
        m.needsUpdate = true
        matCache.delete(m)
      }
    }
  })
}

function ensureBar(uuid) {
  let entry = barCache.get(uuid)
  if (entry) return entry
  const wrap = document.createElement('div')
  wrap.className = 'cfx-bar'
  wrap.innerHTML =
    '<div class="cfx-label">🔨 0%</div>' +
    '<div class="cfx-track"><div class="cfx-fill"></div></div>'
  overlayContainer.appendChild(wrap)
  entry = {
    wrap,
    label: wrap.querySelector('.cfx-label'),
    fill: wrap.querySelector('.cfx-fill'),
  }
  barCache.set(uuid, entry)
  return entry
}

function removeBar(uuid) {
  const entry = barCache.get(uuid)
  if (!entry) return
  entry.wrap.remove()
  barCache.delete(uuid)
}

function projectToScreen(group, container) {
  // Position au sommet approximatif du group (1.6 unité au-dessus du pivot)
  _v3.setFromMatrixPosition(group.matrixWorld)
  _v3.y += 1.8
  _v3.project(camera)
  if (_v3.z < -1 || _v3.z > 1) return null
  const rect = container.getBoundingClientRect()
  return {
    x: (_v3.x * 0.5 + 0.5) * rect.width,
    y: (-_v3.y * 0.5 + 0.5) * rect.height,
  }
}

function* iterateBuildings() {
  if (state.houses)         for (const b of state.houses)         yield b
  if (state.foyers)         for (const b of state.foyers)         yield b
  if (state.bigHouses)      for (const b of state.bigHouses)      yield b
  if (state.researchHouses) for (const b of state.researchHouses) yield b
  if (state.observatories)  for (const b of state.observatories)  yield b
  if (state.cairns)         for (const b of state.cairns)         yield b
}

const seenThisTick = new Set()

export function tickConstructionFX() {
  // Masque tout l overlay si une modale bloquante est ouverte. La transparence
  // sur les meshes 3D reste appliquée (cohérent avec l état du chantier),
  // seule la barre DOM est cachée pour ne pas pénétrer la modale.
  if (isAnyBlockingModalOpen()) {
    overlayContainer.style.display = 'none'
    return
  }
  overlayContainer.style.display = ''
  seenThisTick.clear()
  const container = overlayContainer
  for (const b of iterateBuildings()) {
    if (!b || !b.group) continue
    const uuid = b.group.uuid
    if (b.isUnderConstruction) {
      seenThisTick.add(uuid)
      // Marqueur d'état pour savoir si la transparence a déjà été posée.
      if (!b._cfxApplied) {
        applyTransparency(b.group)
        b._cfxApplied = true
      }
      const bar = ensureBar(uuid)
      const screen = projectToScreen(b.group, container)
      if (screen) {
        bar.wrap.style.display = 'flex'
        bar.wrap.style.left = screen.x + 'px'
        bar.wrap.style.top = screen.y + 'px'
        const pct = Math.max(0, Math.min(1, b.constructionProgress || 0))
        bar.fill.style.width = (pct * 100).toFixed(0) + '%'
        bar.label.textContent = '🔨 ' + Math.round(pct * 100) + '%'
      } else {
        bar.wrap.style.display = 'none'
      }
    } else if (b._cfxApplied) {
      restoreOpacity(b.group)
      b._cfxApplied = false
      removeBar(uuid)
    }
  }
  // Nettoyage des barres orphelines (bâtiment supprimé pendant chantier)
  for (const uuid of Array.from(barCache.keys())) {
    if (!seenThisTick.has(uuid)) removeBar(uuid)
  }
}
