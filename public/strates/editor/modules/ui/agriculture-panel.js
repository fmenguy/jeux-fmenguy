// ============================================================================
// Panneau Agriculture : overlay plein ecran type Farthest Frontier / Cities Skylines.
// Affiche les cultures plantables sous forme de cartes. Clic sur carte = entree
// en mode placement (ghost 2x2 + clic sur terrain fertile).
//
// API exportee :
//   initAgriculturePanel()          : injecte CSS + DOM (idempotent)
//   openAgriculturePanel()          : ouvre l overlay
//   closeAgriculturePanel()         : ferme l overlay
//   isAgriculturePanelOpen()        : true si visible
//   startFieldPlacement(cropId)     : entre en mode placement
//   cancelFieldPlacement()          : sort du mode placement
//   confirmFieldPlacement(gx, gz)   : valide le placement a la cellule (gx, gz)
//   updateFieldGhost(cell)          : met a jour le ghost 2x2 au survol
//   isFieldGhostActive()            : true si mode placement actif
// ============================================================================

import * as THREE from 'three'
import { state } from '../state.js'
import { GRID, SHALLOW_WATER_LEVEL } from '../constants.js'
import { techUnlocked } from '../tech.js'
import { addWheatField, isCellOccupied } from '../placements.js'
import { scene } from '../scene.js'
import { showHudToast } from './research-popup.js'
import { refreshHUD } from '../hud.js'

const CSS = `
#agri-overlay {
  position: fixed; inset: 0;
  background: rgba(6, 9, 14, 0.78);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  z-index: 90;
  display: none;
  align-items: center; justify-content: center;
  font-family: inherit;
}
#agri-overlay.open { display: flex; }
.agri-panel {
  width: min(960px, 92vw);
  max-height: 86vh;
  background: linear-gradient(180deg, rgba(18, 24, 32, 0.98), rgba(12, 16, 22, 0.99));
  border: 1px solid rgba(201,168,76,0.32);
  border-radius: 14px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.65);
  color: #f3ecdd;
  display: flex; flex-direction: column;
  overflow: hidden;
  animation: agriIn 0.22s ease-out;
}
@keyframes agriIn {
  from { transform: translateY(12px); opacity: 0; }
  to   { transform: translateY(0); opacity: 1; }
}
.agri-header {
  display: flex; align-items: center; gap: 14px;
  padding: 18px 24px;
  border-bottom: 1px solid rgba(201,168,76,0.24);
  background: linear-gradient(180deg, rgba(201,168,76,0.10), rgba(201,168,76,0.02));
}
.agri-header .agri-icon {
  font-size: 30px;
  filter: drop-shadow(0 0 8px rgba(217, 177, 74, 0.45));
}
.agri-header h2 {
  margin: 0; font-size: 22px; font-weight: 700;
  color: #d9b14a; letter-spacing: 0.06em;
}
.agri-header .agri-sub {
  margin-left: auto;
  color: rgba(243,236,221,0.72);
  font-size: 13px; font-style: italic;
}
.agri-close {
  background: transparent; border: none; color: #c7b98c;
  font-size: 24px; cursor: pointer; padding: 0 8px; line-height: 1;
  margin-left: 12px;
}
.agri-close:hover { color: #d9b14a; }
.agri-body {
  padding: 22px 24px 26px;
  overflow-y: auto;
}
.agri-body::-webkit-scrollbar { width: 8px; }
.agri-body::-webkit-scrollbar-thumb { background: rgba(201,168,76,0.30); border-radius: 4px; }
.agri-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 16px;
}
.agri-card {
  position: relative;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 12px;
  padding: 16px 16px 14px;
  cursor: pointer;
  transition: all 0.18s ease;
  display: flex; flex-direction: column; gap: 8px;
}
.agri-card:hover:not(.locked) {
  border-color: rgba(217,177,74,0.55);
  background: rgba(217,177,74,0.07);
  transform: translateY(-2px);
  box-shadow: 0 8px 22px rgba(0,0,0,0.4);
}
.agri-card.locked {
  opacity: 0.45;
  cursor: not-allowed;
  filter: grayscale(0.6);
}
.agri-card-head {
  display: flex; align-items: center; gap: 10px;
}
.agri-card-icon {
  font-size: 28px;
  width: 44px; height: 44px;
  display: flex; align-items: center; justify-content: center;
  background: rgba(217,177,74,0.10);
  border: 1px solid rgba(217,177,74,0.30);
  border-radius: 10px;
  flex-shrink: 0;
}
.agri-card-name {
  font-size: 16px; font-weight: 700; color: #f3ecdd;
}
.agri-card-desc {
  color: rgba(243,236,221,0.72);
  font-size: 12px; line-height: 1.45;
  min-height: 50px;
}
.agri-card-foot {
  display: flex; align-items: center; gap: 8px;
  margin-top: 4px; flex-wrap: wrap;
}
.agri-cost {
  font-size: 11px;
  color: #c7b98c;
  letter-spacing: 0.04em;
}
.agri-cost b { color: #d9b14a; font-weight: 700; }
.agri-badge {
  margin-left: auto;
  font-size: 10px; font-weight: 700;
  padding: 3px 8px;
  background: rgba(70,120,200,0.20);
  border: 1px solid rgba(110,170,230,0.45);
  color: #aac8ee;
  border-radius: 999px;
  letter-spacing: 0.06em; text-transform: uppercase;
}
.agri-card.locked .agri-badge {
  background: rgba(120,80,80,0.20);
  border-color: rgba(200,120,120,0.45);
  color: #e3b0b0;
}
.agri-card-lockmsg {
  font-size: 11px; color: #e3b0b0;
  margin-top: 2px;
  font-style: italic;
}
`

const CROPS = [
  {
    id: 'champ-ble',
    name: 'Champ de blé',
    icon: '\u{1F33E}',
    desc: 'Produit du grain. Requiert terrain fertile. 2x2 cases.',
    cost: { wood: 4, stone: 2 },
    age: 2,
    techRequired: 'wheat-field'
  }
]

let initialized = false
let overlayEl = null
let gridEl = null

// Ghost de previsualisation 2x2 (cree une fois, deplace au survol)
let fieldGhost = null
let fieldGhostMat = null

function ensureCSS() {
  if (document.getElementById('agri-panel-css')) return
  const s = document.createElement('style')
  s.id = 'agri-panel-css'
  s.textContent = CSS
  document.head.appendChild(s)
}

function buildDOM() {
  if (overlayEl) return
  overlayEl = document.createElement('div')
  overlayEl.id = 'agri-overlay'
  overlayEl.innerHTML = `
    <div class="agri-panel" role="dialog" aria-label="Agriculture">
      <div class="agri-header">
        <span class="agri-icon">\u{1F33E}</span>
        <h2>Agriculture</h2>
        <span class="agri-sub">Choisissez une culture à planter</span>
        <button type="button" class="agri-close" aria-label="Fermer">×</button>
      </div>
      <div class="agri-body">
        <div class="agri-grid" id="agri-grid"></div>
      </div>
    </div>
  `
  document.body.appendChild(overlayEl)
  gridEl = overlayEl.querySelector('#agri-grid')

  overlayEl.querySelector('.agri-close').addEventListener('click', closeAgriculturePanel)
  overlayEl.addEventListener('click', (e) => {
    if (e.target === overlayEl) closeAgriculturePanel()
  })
}

function renderCards() {
  if (!gridEl) return
  gridEl.innerHTML = ''
  for (const crop of CROPS) {
    const unlocked = techUnlocked(crop.techRequired)
    const card = document.createElement('div')
    card.className = 'agri-card' + (unlocked ? '' : ' locked')
    card.dataset.cropId = crop.id
    card.innerHTML = `
      <div class="agri-card-head">
        <div class="agri-card-icon">${crop.icon}</div>
        <div class="agri-card-name">${crop.name}</div>
      </div>
      <div class="agri-card-desc">${crop.desc}</div>
      <div class="agri-card-foot">
        <span class="agri-cost">Coût : <b>${crop.cost.wood}</b> bois, <b>${crop.cost.stone}</b> pierre</span>
        <span class="agri-badge">Âge ${crop.age}</span>
      </div>
      ${unlocked ? '' : '<div class="agri-card-lockmsg">Recherchez « Premier champ » pour débloquer.</div>'}
    `
    if (unlocked) {
      card.addEventListener('click', () => {
        closeAgriculturePanel()
        startFieldPlacement(crop.id)
      })
    }
    gridEl.appendChild(card)
  }
}

export function initAgriculturePanel() {
  if (initialized) return
  initialized = true
  ensureCSS()
  buildDOM()
}

export function openAgriculturePanel() {
  initAgriculturePanel()
  renderCards()
  overlayEl.classList.add('open')
}

export function closeAgriculturePanel() {
  if (overlayEl) overlayEl.classList.remove('open')
}

export function isAgriculturePanelOpen() {
  return !!(overlayEl && overlayEl.classList.contains('open'))
}

// ===========================================================================
// Mode placement
// ===========================================================================

function ensureGhost() {
  if (fieldGhost) return
  fieldGhostMat = new THREE.MeshBasicMaterial({
    color: 0x44ff44,
    transparent: true,
    opacity: 0.4,
    depthTest: false
  })
  const geo = new THREE.BoxGeometry(2, 0.1, 2)
  fieldGhost = new THREE.Mesh(geo, fieldGhostMat)
  fieldGhost.renderOrder = 997
  fieldGhost.visible = false
  scene.add(fieldGhost)
}

function isFootprintValid(gx, gz) {
  for (let dz = 0; dz < 2; dz++) {
    for (let dx = 0; dx < 2; dx++) {
      const cx = gx + dx, cz = gz + dz
      if (cx < 0 || cz < 0 || cx >= GRID || cz >= GRID) return false
      const k = cz * GRID + cx
      if (state.cellTop[k] <= SHALLOW_WATER_LEVEL) return false
      if (isCellOccupied(cx, cz)) return false
      if (!state.cellFertile || state.cellFertile[k] !== 1) return false
    }
  }
  return true
}

export function startFieldPlacement(cropId) {
  state.fieldPlacementMode = cropId || 'champ-ble'
  document.body.style.cursor = 'crosshair'
  ensureGhost()
  fieldGhost.visible = false
  showHudToast('Cliquez sur un terrain fertile pour placer votre champ de ble. ESC pour annuler.', 5000)
}

export function cancelFieldPlacement() {
  state.fieldPlacementMode = null
  document.body.style.cursor = ''
  if (fieldGhost) fieldGhost.visible = false
}

export function isFieldGhostActive() {
  return !!state.fieldPlacementMode
}

/**
 * Met a jour la position et la couleur du ghost 2x2.
 * @param {{x:number,z:number}|null} cell
 */
export function updateFieldGhost(cell) {
  if (!state.fieldPlacementMode) {
    if (fieldGhost) fieldGhost.visible = false
    return
  }
  ensureGhost()
  if (!cell) { fieldGhost.visible = false; return }
  // Origine du footprint = cellule survolee (le 2x2 s etend en +x, +z)
  const gx = cell.x, gz = cell.z
  if (gx < 0 || gz < 0 || gx + 1 >= GRID || gz + 1 >= GRID) {
    fieldGhost.visible = false
    return
  }
  const tops = []
  for (let dz = 0; dz < 2; dz++) {
    for (let dx = 0; dx < 2; dx++) {
      tops.push(state.cellTop[(gz + dz) * GRID + (gx + dx)] || 0)
    }
  }
  const top = Math.max(...tops)
  fieldGhost.position.set(gx + 1, top + 0.05, gz + 1)
  fieldGhostMat.color.setHex(isFootprintValid(gx, gz) ? 0x44ff44 : 0xff4444)
  fieldGhost.visible = true
}

export function confirmFieldPlacement(gx, gz) {
  if (!state.fieldPlacementMode) return
  const ok = addWheatField(gx, gz)
  if (!ok) {
    // Diagnostic : cellule fertile ? deja occupee ?
    const k = gz * GRID + gx
    if (gx < 0 || gz < 0 || gx + 1 >= GRID || gz + 1 >= GRID) {
      showHudToast('Emplacement hors-carte.', 2500)
      return
    }
    let anyNonFertile = false
    let anyOccupied = false
    for (let dz = 0; dz < 2; dz++) {
      for (let dx = 0; dx < 2; dx++) {
        const cx = gx + dx, cz = gz + dz
        if (cx < 0 || cz < 0 || cx >= GRID || cz >= GRID) continue
        const kk = cz * GRID + cx
        if (!state.cellFertile || state.cellFertile[kk] !== 1) anyNonFertile = true
        if (isCellOccupied(cx, cz)) anyOccupied = true
      }
    }
    if (anyNonFertile) {
      showHudToast('Choisissez un terrain fertile (zone doree) pour votre champ de ble.', 3000)
    } else if (anyOccupied) {
      showHudToast('Cette zone est deja occupee.', 2500)
    } else {
      showHudToast('Impossible de placer un champ ici.', 2500)
    }
    return
  }
  // Succes : retire les couts et sort du mode
  if (state.resources) {
    state.resources.wood = Math.max(0, (state.resources.wood || 0) - 4)
    state.resources.stone = Math.max(0, (state.resources.stone || 0) - 2)
  }
  state.fieldPlacementMode = null
  document.body.style.cursor = ''
  if (fieldGhost) fieldGhost.visible = false
  refreshHUD()
  showHudToast('Champ de ble plante ! Il produira du grain avec le temps.', 3500)
}
