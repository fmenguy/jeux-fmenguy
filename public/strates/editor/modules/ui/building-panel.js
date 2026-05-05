// ============================================================================
// Panneau d'info bâtiment : panneau latéral fixe (droite), même style que
// charsheet. S'ouvre via l'événement strates:buildingClicked.
// API : initBuildingPanel(), openBuildingPanel(type, building),
//       closeBuildingPanel(), isBuildingPanelOpen()
// ============================================================================

import { state } from '../state.js'
import { repaintCellSurface } from '../terrain.js'
import { showHudToast } from './research-popup.js'
import {
  removeHousesIn, removeManorsIn, removeBigHousesIn,
  removeResearchHousesIn, removeObservatoriesIn
} from '../placements.js'
import { unlinkColonistFromHome } from '../placements.js'
import * as placementsApi from '../placements.js'
import { refreshHUD } from '../hud.js'
import { getBuildingById } from '../gamedata.js'
import { techUnlocked } from '../tech.js'
import { GRID, SHALLOW_WATER_LEVEL } from '../constants.js'
import { openCharSheet } from '../charsheet-ui.js'
import { openColonistPicker, removeFromHouse, homeLabel, getHomeOf } from '../housing.js'

// Métiers (libellé court + icône) pour le badge dans la liste des résidents.
const PROFESSION_BADGE = {
  cueilleur:    { ic: '🫐', lbl: 'Cueilleur' },
  bucheron:     { ic: '🪓', lbl: 'Bûcheron' },
  mineur:       { ic: '⛏',  lbl: 'Mineur' },
  chercheur:    { ic: '📜', lbl: 'Chercheur' },
  chasseur:     { ic: '🏹', lbl: 'Chasseur' },
  constructeur: { ic: '🔨', lbl: 'Constructeur' },
}

// Lot B residents : capacite par defaut alignee sur buildings.json
// (residentsCapacity = 6 pour big-house). Spawn par defaut = 4 (2 couples),
// laissant 2 places libres pour accueil futur.
const BIG_HOUSE_CAPACITY = 6

const CSS = `
#bp-panel {
  position: fixed; top: 0; right: 0; bottom: 0;
  width: 340px; max-width: 92vw;
  background: linear-gradient(180deg, rgba(14,18,26,0.98), rgba(10,14,20,0.99));
  border-left: 1px solid rgba(201,168,76,0.35);
  box-shadow: -14px 0 40px rgba(0,0,0,0.6);
  color: #f3ecdd; z-index: 86;
  display: flex; flex-direction: column;
  font-size: 13px;
  animation: bpSlideIn 0.22s ease-out;
}
#bp-panel.hidden { display: none; }
@keyframes bpSlideIn {
  from { transform: translateX(24px); opacity: 0; }
  to   { transform: translateX(0); opacity: 1; }
}
.bp-header {
  display: flex; align-items: center; gap: 10px;
  padding: 14px 18px;
  border-bottom: 1px solid rgba(201,168,76,0.22);
  background: linear-gradient(180deg, rgba(201,168,76,0.08), rgba(201,168,76,0.02));
  flex-shrink: 0;
}
.bp-icon {
  width: 34px; height: 34px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 18px; flex-shrink: 0;
  background: rgba(201,168,76,0.12);
  border: 1px solid rgba(201,168,76,0.35);
}
.bp-title {
  flex: 1; margin: 0;
  font-size: 16px; font-weight: 700; color: #c9a84c;
  letter-spacing: 0.04em;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.bp-close-btn {
  background: transparent; border: none; color: #c7b98c;
  font-size: 20px; cursor: pointer; padding: 0 6px; line-height: 1;
}
.bp-close-btn:hover { color: #c9a84c; }
.bp-body {
  flex: 1; overflow-y: auto;
  padding: 14px 18px 20px;
  display: flex; flex-direction: column; gap: 12px;
}
.bp-body::-webkit-scrollbar { width: 6px; }
.bp-body::-webkit-scrollbar-thumb { background: rgba(201,168,76,0.25); border-radius: 3px; }
.bp-section {
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 9px; padding: 10px 12px;
}
.bp-section h4 {
  margin: 0 0 8px 0; font-size: 10px; font-weight: 700;
  color: #c9a84c; letter-spacing: 0.14em; text-transform: uppercase;
}
.bp-desc {
  color: rgba(243,236,221,0.7); font-size: 12px;
  line-height: 1.5; font-style: italic;
}
.bp-row {
  display: flex; justify-content: space-between; gap: 12px;
  padding: 4px 0; border-bottom: 1px dashed rgba(255,255,255,0.06);
}
.bp-row:last-child { border-bottom: none; }
.bp-key { color: #c7b98c; font-size: 11px; letter-spacing: 0.06em; text-transform: uppercase; }
.bp-val { color: #f3ecdd; font-variant-numeric: tabular-nums; text-align: right; }
.bp-resident {
  display: flex; align-items: center; gap: 8px;
  padding: 6px 0; border-bottom: 1px dashed rgba(255,255,255,0.06);
}
.bp-resident:last-child { border-bottom: none; }
.bp-resident-clickable { cursor: pointer; transition: background 0.12s; border-radius: 4px; padding-left: 4px; padding-right: 4px; }
.bp-resident-clickable:hover { background: rgba(255,217,138,0.10); }
.bp-resident-empty { opacity: 0.6; }
.bp-resident-remove {
  margin-left: auto;
  background: transparent;
  border: 1px solid rgba(220,80,80,0.30);
  color: rgba(220,140,140,0.65);
  font-size: 11px; line-height: 1;
  padding: 1px 6px;
  border-radius: 3px;
  cursor: pointer;
  font-family: inherit;
  transition: all 0.12s;
}
.bp-resident-remove:hover {
  background: rgba(220,80,80,0.18);
  border-color: rgba(220,80,80,0.55);
  color: #ffaaaa;
}
.bp-resident-assign {
  margin-left: auto;
  background: rgba(120,180,230,0.10);
  border: 1px solid rgba(120,180,230,0.40);
  color: #b0d4f5;
  font-size: 9.5px;
  letter-spacing: 0.06em;
  padding: 3px 9px;
  border-radius: 3px;
  cursor: pointer;
  font-family: var(--mono, monospace);
  transition: background 0.12s, color 0.12s;
}
.bp-resident-assign:hover {
  background: rgba(120,180,230,0.22);
  color: #d8ecff;
}
.bp-resident-name { flex: 1; font-size: 12px; color: #f3ecdd; }
.bp-resident-prof {
  font-size: 13px; line-height: 1;
  padding: 1px 4px;
  background: rgba(255,217,138,0.10);
  border: 1px solid rgba(255,217,138,0.30);
  border-radius: 3px;
}
.bp-resident-row-meta {
  flex-basis: 100%; padding-left: 26px;
  font-family: var(--mono, monospace);
  font-size: 9.5px; color: rgba(243,236,221,0.65);
  margin-top: 2px;
}
.bp-resident-partner {
  display: inline-block;
  padding: 1px 6px;
  background: rgba(220,90,140,0.16);
  border: 1px solid rgba(230,130,170,0.50);
  border-radius: 3px;
  color: #f0bcd4;
  letter-spacing: 0.04em;
}
.bp-resident-chief {
  font-size: 9px; color: #ffd98a; font-weight: 700;
  letter-spacing: 0.1em; text-transform: uppercase;
  background: rgba(255,217,138,0.12); border-radius: 3px;
  padding: 1px 5px;
}
.bp-resident-gender { color: #a8c9ff; font-size: 13px; }
.bp-resident-gender.F { color: #ffb6cf; }
.bp-empty { color: rgba(199,185,140,0.5); font-style: italic; font-size: 12px; }
.bp-footer {
  padding: 10px 18px 14px;
  flex-shrink: 0;
  border-top: 1px solid rgba(255,255,255,0.06);
}
.bp-destroy-btn {
  width: 100%;
  padding: 9px 0;
  background: rgba(180,40,40,0.18);
  border: 1px solid rgba(200,60,60,0.45);
  border-radius: 7px;
  color: #ff8080;
  font-size: 12px; font-weight: 600;
  cursor: pointer;
  letter-spacing: 0.04em;
  transition: background 0.15s, color 0.15s;
}
.bp-destroy-btn:hover:not(.locked):not([disabled]) {
  background: rgba(200,50,50,0.35);
  color: #ffaaaa;
}
.bp-destroy-btn.locked,
.bp-destroy-btn[disabled] {
  background: rgba(80,80,80,0.18);
  border-color: rgba(140,140,140,0.35);
  color: rgba(220,200,200,0.45);
  cursor: not-allowed;
}
.bp-upgrade-btn {
  width: 100%;
  display: flex; flex-direction: column; align-items: center; gap: 3px;
  padding: 10px 8px;
  background: rgba(80,140,200,0.15);
  border: 1px solid rgba(120,180,230,0.45);
  border-radius: 7px;
  color: #b0d4f5;
  font-family: inherit;
  cursor: pointer;
  letter-spacing: 0.04em;
  transition: background 0.15s, color 0.15s, border-color 0.15s;
}
.bp-upgrade-btn:hover:not([disabled]) {
  background: rgba(110,170,225,0.28);
  border-color: rgba(180,220,250,0.65);
  color: #d8ecff;
}
.bp-upgrade-btn[disabled] {
  background: rgba(80,80,80,0.16);
  border-color: rgba(140,140,140,0.32);
  color: rgba(200,210,225,0.45);
  cursor: not-allowed;
}
.bp-upgrade-label { font-size: 12.5px; font-weight: 700; }
.bp-upgrade-cost {
  font-family: var(--mono, monospace);
  font-size: 10px;
  letter-spacing: 0.06em;
  color: rgba(243,236,221,0.7);
}
.bp-upgrade-btn[disabled] .bp-upgrade-cost { color: rgba(220,200,200,0.45); }
.bp-upgrade-progress {
  display: flex; flex-direction: column; gap: 4px;
}
.bp-upgrade-progress .bp-upgrade-track {
  width: 100%; height: 8px;
  background: rgba(0,0,0,0.45);
  border: 1px solid rgba(120,180,230,0.45);
  border-radius: 4px;
  overflow: hidden;
}
.bp-upgrade-progress .bp-upgrade-fill {
  height: 100%;
  background: linear-gradient(90deg, #6ea0d8, #b0d4f5);
  transition: width 0.25s linear;
}
.bp-upgrade-progress .bp-upgrade-pct {
  font-family: var(--mono, monospace);
  font-size: 10px;
  letter-spacing: 0.06em;
  color: #b0d4f5;
  align-self: flex-end;
}
`

const BUILDING_META = {
  house:       { icon: '🏠', name: 'Cabane',        desc: 'Abrite les colons du village.' },
  manor:       { icon: '🏰', name: 'Manoir',        desc: 'Grand foyer pour familles nombreuses. Fusion de 4 cabanes.' },
  foyer:       { icon: '🔥', name: 'Foyer',         desc: 'Cœur du camp. Rassemble le clan, permet la cuisson.' },
  research:    { icon: '🔬', name: 'Hutte du Sage', desc: 'Génère des points de recherche chaque tick.' },
  field:       { icon: '🌾', name: 'Champ',         desc: 'Champ cultivé. Produit des ressources agricoles.' },
  observatory: { icon: '🔭', name: 'Promontoire',   desc: 'Génère des points nocturnes quand la nuit tombe.' },
  'big-house': { icon: '🏯', name: 'Grande maison', desc: 'Demeure spacieuse pouvant accueillir 8 villageois.' },
  cairn:       { icon: '🪨', name: 'Cairn',         desc: 'Monument rituel de passage à l\'âge du Bronze.' },
}

// Coûts de construction (source : buildings.json). Sert au remboursement 50%.
const BUILDING_COSTS = {
  house:       { wood: 10, stone: 5 },
  foyer:       { stone: 8, wood: 3 },
  'big-house': { wood: 5 },
  research:    { wood: 12, stone: 8 },
  observatory: { stone: 5 },
  manor:       {},
}

// Types non destructibles
const NON_DESTRUCTIBLE = new Set(['cairn', 'field'])

const HOUSE_CAPACITY = 2
const MANOR_CAPACITY = 6

let panelEl = null
let bodyEl  = null
let _currentType     = null
let _currentBuilding = null

function ensureDom() {
  if (panelEl) return
  if (!document.getElementById('bp-style')) {
    const s = document.createElement('style')
    s.id = 'bp-style'
    s.textContent = CSS
    document.head.appendChild(s)
  }
  panelEl = document.createElement('div')
  panelEl.id = 'bp-panel'
  panelEl.className = 'hidden'
  panelEl.setAttribute('role', 'dialog')
  panelEl.setAttribute('aria-label', 'Infos bâtiment')
  // Le bouton Détruire dans la fiche est désormais remplacé par le bouton
  // global Démolir dans l actionbar (mode destroy). Le footer reste pour
  // d éventuelles infos futures (production, occupants synthétiques, etc.).
  panelEl.innerHTML =
    '<div class="bp-header">' +
      '<div class="bp-icon" id="bp-icon">🏠</div>' +
      '<h3 class="bp-title" id="bp-title">Bâtiment</h3>' +
      '<button class="bp-close-btn" id="bp-close-btn" title="Fermer (Échap)">✕</button>' +
    '</div>' +
    '<div class="bp-body" id="bp-body"></div>'
  document.body.appendChild(panelEl)
  document.getElementById('bp-close-btn').addEventListener('click', closeBuildingPanel)
  bodyEl = document.getElementById('bp-body')
  // Délégation : clic sur un résident ouvre la fiche du colon (charsheet).
  bodyEl.addEventListener('click', (e) => {
    // Bouton "Retirer" sur un résident : retire le colon, refresh.
    const removeBtn = e.target.closest('button[data-action="remove-resident"]')
    if (removeBtn) {
      e.stopPropagation()
      const cid = removeBtn.dataset.cid
      const c = (state.colonists || []).find(x => String(x.id) === String(cid))
      if (!c || !_currentBuilding) return
      const home = getHomeOf(c)
      const lbl = home ? homeLabel(home) : 'son foyer'
      removeFromHouse(c)
      try { showHudToast(c.name + ' retiré de ' + lbl + ', désormais sans-abri.', 2800) } catch (_) {}
      bodyEl.innerHTML = buildContent(_currentType, _currentBuilding)
      _wireUpgradeButton()
      return
    }
    // Bouton "+ Assigner" sur un slot libre : ouvre le picker colon.
    const assignBtn = e.target.closest('button[data-action="assign-resident"]')
    if (assignBtn) {
      e.stopPropagation()
      if (!_currentBuilding || !_currentType) return
      openColonistPicker(_currentBuilding, _currentType, () => {
        bodyEl.innerHTML = buildContent(_currentType, _currentBuilding)
        _wireUpgradeButton()
      })
      return
    }
    // Clic sur la ligne résident : ouvre la charsheet.
    const row = e.target.closest('.bp-resident-clickable')
    if (!row) return
    const cid = row.dataset.cid
    if (cid == null) return
    const c = (state.colonists || []).find(x => String(x.id) === String(cid))
    if (c) openCharSheet(c)
  })
}

export function destroyBuilding(type, building) {
  // Rembourser 50% du coût
  const cost = BUILDING_COSTS[type] || {}
  for (const [res, qty] of Object.entries(cost)) {
    const refund = Math.floor(qty * 0.5)
    if (refund > 0) state.resources[res] = (state.resources[res] || 0) + refund
  }

  // Lot B residents : avant la suppression effective, casser les liens des
  // residents (homeBuildingId, assignedBuildingId, building.residents).
  // Le moteur fera passer ces colons en SANS-ABRI au prochain tick (needs.js).
  // Le partnerId reste tant que le partenaire est vivant.
  if (type === 'house' || type === 'manor' || type === 'big-house') {
    const ids = Array.isArray(building.residents) ? building.residents.slice() : []
    for (const cid of ids) {
      const c = (state.colonists || []).find(cc => cc.id === cid)
      if (c) unlinkColonistFromHome(c)
    }
    if (Array.isArray(building.residents)) building.residents.length = 0
  }

  const cell = [{ x: building.x, z: building.z }]

  switch (type) {
    case 'house':
      removeHousesIn(cell)
      repaintCellSurface(building.x, building.z)
      break

    case 'manor':
      removeManorsIn(cell)
      for (let dz = 0; dz < 2; dz++) {
        for (let dx = 0; dx < 2; dx++) repaintCellSurface(building.x + dx, building.z + dz)
      }
      break

    case 'foyer': {
      const idx = state.foyers.findIndex(f => f.x === building.x && f.z === building.z)
      if (idx !== -1) {
        const f = state.foyers[idx]
        if (f.group) {
          f.group.removeFromParent()
          f.group.traverse(o => {
            if (o.material) o.material.dispose()
            if (o.geometry) o.geometry.dispose()
          })
        }
        state.foyers.splice(idx, 1)
      }
      repaintCellSurface(building.x, building.z)
      break
    }

    case 'big-house':
      removeBigHousesIn(cell)
      for (let dz = 0; dz < 4; dz++) {
        for (let dx = 0; dx < 4; dx++) repaintCellSurface(building.x + dx, building.z + dz)
      }
      break

    case 'research':
      removeResearchHousesIn(cell)
      repaintCellSurface(building.x, building.z)
      break

    case 'observatory':
      removeObservatoriesIn(cell)
      repaintCellSurface(building.x, building.z)
      break

    default:
      return
  }

  refreshHUD()
  closeBuildingPanel()
  showHudToast('Bâtiment détruit, ressources récupérées', 3000)
}

function colonistById(id) {
  return (state.colonists || []).find(c => c.id === id) || null
}

function _escH(s) {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function residentRow(colonistId) {
  const c = colonistById(colonistId)
  if (!c) return ''
  const genClass = c.gender === 'F' ? 'F' : 'M'
  const sym = c.gender === 'F' ? '♀' : '♂'
  const profMeta = c.profession ? PROFESSION_BADGE[c.profession] : null
  const profBadge = profMeta
    ? '<span class="bp-resident-prof" title="' + _escH(profMeta.lbl) + '">' + profMeta.ic + '</span>'
    : ''
  const partner = (c.partnerId != null) ? colonistById(c.partnerId) : null
  const partnerBadge = partner
    ? '<span class="bp-resident-partner" title="Couple avec ' + _escH(partner.name) + '">💞 ' + _escH(partner.name) + '</span>'
    : ''
  return '<div class="bp-resident bp-resident-clickable" data-cid="' + _escH(c.id) + '">' +
    '<span style="font-size:14px">👤</span>' +
    '<span class="bp-resident-name">' + _escH(c.name) + '</span>' +
    (c.isChief ? '<span class="bp-resident-chief">Chef</span>' : '') +
    profBadge +
    '<span class="bp-resident-gender ' + genClass + '">' + sym + '</span>' +
    '<button class="bp-resident-remove" data-action="remove-resident" data-cid="' + _escH(c.id) + '" title="Retirer du foyer">&times;</button>' +
    (partnerBadge ? '<span class="bp-resident-row-meta">' + partnerBadge + '</span>' : '') +
  '</div>'
}

function emptySlotRow() {
  return '<div class="bp-resident bp-resident-empty">' +
    '<span style="font-size:14px;opacity:.5">🪶</span>' +
    '<span class="bp-resident-name" style="font-style:italic;color:rgba(243,236,221,0.4)">Place libre</span>' +
    '<button class="bp-resident-assign" data-action="assign-resident" title="Assigner un colon">+ Assigner</button>' +
  '</div>'
}

// ============================================================================
// Upgrade : helpers et rendu
// ============================================================================

const RES_LABELS = {
  wood: 'bois', stone: 'pierre', berries: 'baies', silex: 'silex',
  grain: 'grain', viande: 'viande', 'raw-meat': 'viande crue',
  'cooked-meat': 'viande cuite', bone: 'os', hide: 'peau'
}
function _resLabel(k) { return RES_LABELS[k] || k }

// Vérifie qu un footprint 4x4 ancré en (x, z) tient sur la carte. La cellule
// (sourceHouse.x, sourceHouse.z) est ignorée (on remplace la cabane source).
function _canFitBigHouseAt(x, z, sourceHouse) {
  for (let dz = 0; dz < 4; dz++) {
    for (let dx = 0; dx < 4; dx++) {
      const cx = x + dx, cz = z + dz
      if (cx < 0 || cz < 0 || cx >= GRID || cz >= GRID) return false
      const k = cz * GRID + cx
      if (state.cellTop[k] <= SHALLOW_WATER_LEVEL) return false
      if (sourceHouse && cx === sourceHouse.x && cz === sourceHouse.z) continue
      if (typeof placementsApi.isCellOccupied === 'function'
          && placementsApi.isCellOccupied(cx, cz)) return false
    }
  }
  return true
}

function _renderUpgradeSection(building) {
  const targetDef = getBuildingById('big-house')
  if (!targetDef || !targetDef.upgradeFrom || targetDef.upgradeFrom.from !== 'cabane') return ''
  const cost = targetDef.upgradeFrom.cost || {}
  const buildTime = targetDef.upgradeFrom.buildTime || 0

  // Upgrade en cours : barre de progression
  if (building.isUnderUpgrade) {
    const pct = Math.max(0, Math.min(1, building.upgradeProgress || 0))
    const pctTxt = Math.round(pct * 100) + '%'
    return '<div class="bp-section">' +
      '<h4>Amélioration en cours</h4>' +
      '<div class="bp-upgrade-progress">' +
        '<div class="bp-upgrade-track"><div class="bp-upgrade-fill" style="width:' + (pct * 100).toFixed(1) + '%"></div></div>' +
        '<span class="bp-upgrade-pct">' + pctTxt + '</span>' +
      '</div>' +
    '</div>'
  }

  const hasTech = techUnlocked('big-house')
  const enoughRes = Object.entries(cost).every(([k, v]) => (state.resources[k] || 0) >= v)
  const fits = _canFitBigHouseAt(building.x, building.z, building)
  const disabled = !hasTech || !enoughRes || !fits

  let title = 'Amélioration en grosse maison (' + buildTime + 's)'
  if (!hasTech) title = 'Recherche Grosse maison requise.'
  else if (!enoughRes) {
    const lacks = Object.entries(cost)
      .filter(([k, v]) => (state.resources[k] || 0) < v)
      .map(([k, v]) => v + ' ' + _resLabel(k))
      .join(', ')
    title = 'Ressources insuffisantes : ' + lacks + '.'
  } else if (!fits) title = 'Pas assez de place autour de la cabane (4x4 nécessaire).'

  const costStr = Object.entries(cost).map(([k, v]) => v + ' ' + _resLabel(k)).join(', ') || 'gratuit'
  return '<div class="bp-section">' +
    '<h4>Améliorer</h4>' +
    '<button class="bp-upgrade-btn" id="bp-upgrade-btn"' +
      (disabled ? ' disabled' : '') + ' title="' + title + '">' +
      '<span class="bp-upgrade-label">&#11014; Améliorer en grosse maison</span>' +
      '<span class="bp-upgrade-cost">' + costStr + ' &middot; ' + buildTime + 's</span>' +
    '</button>' +
  '</div>'
}

function buildContent(type, building) {
  const meta = BUILDING_META[type] || { icon: '🏗', name: type, desc: '' }
  const sections = []

  sections.push(
    '<div class="bp-section">' +
      '<div class="bp-desc">' + meta.desc + '</div>' +
    '</div>'
  )

  if (type === 'house' || type === 'manor' || type === 'big-house') {
    // Lot B residents : capacite lue dans buildings.json via residentsCapacity
    // (cabane = 2, big-house = 6). Fallback constantes locales pour le manor
    // (pas de residentsCapacity dans data, valeur historique 6).
    let capacity
    if (type === 'house') {
      const def = getBuildingById('cabane')
      capacity = (def && typeof def.residentsCapacity === 'number') ? def.residentsCapacity : HOUSE_CAPACITY
    } else if (type === 'big-house') {
      const def = getBuildingById('big-house')
      capacity = (def && typeof def.residentsCapacity === 'number') ? def.residentsCapacity : BIG_HOUSE_CAPACITY
    } else {
      capacity = MANOR_CAPACITY
    }
    const residents = building.residents || []

    sections.push(
      '<div class="bp-section">' +
        '<div class="bp-row">' +
          '<span class="bp-key">Capacité</span>' +
          '<span class="bp-val">' + residents.length + ' / ' + capacity + '</span>' +
        '</div>' +
      '</div>'
    )

    // Liste : résidents puis slots libres, jusqu à atteindre la capacité.
    const rows = residents.map(id => residentRow(id))
    const free = Math.max(0, capacity - residents.length)
    for (let i = 0; i < free; i++) rows.push(emptySlotRow())

    sections.push(
      '<div class="bp-section">' +
        '<h4>Résidents</h4>' +
        rows.join('') +
      '</div>'
    )

    // Section Améliorer (cabane uniquement, pas le manoir ni la grosse maison)
    if (type === 'house') {
      const upgradeHtml = _renderUpgradeSection(building)
      if (upgradeHtml) sections.push(upgradeHtml)
    }
  }

  if (type === 'research') {
    const ids = Array.isArray(building.assignedColonistIds) ? building.assignedColonistIds : []
    const rows = ids.map(id => colonistById(id) ? residentRow(id) : null).filter(Boolean)
    sections.push(
      '<div class="bp-section">' +
        '<h4>Chercheurs (' + rows.length + ')</h4>' +
        (rows.length
          ? rows.join('')
          : '<div class="bp-empty">Aucun chercheur assigné</div>') +
      '</div>'
    )
  }

  if (type === 'field') {
    sections.push(
      '<div class="bp-section">' +
        '<div class="bp-row">' +
          '<span class="bp-key">Position</span>' +
          '<span class="bp-val">x ' + building.x + ' · z ' + building.z + '</span>' +
        '</div>' +
      '</div>'
    )
  }

  return sections.join('')
}

// Recalcule l état du bouton démolir d après l état courant (type bâtiment +
// tech 'demolition'). Idempotent, sans effet si le footer est déjà masqué
// ou si le panneau n est pas monté. Appelé depuis openBuildingPanel ET en
// Helper exposé : un type de bâtiment est-il destructible ? Utilisé par le
// mode destroy global de l actionbar pour bloquer le ciblage des Cairn / Champ.
export function isBuildingDestructible(type) {
  return !NON_DESTRUCTIBLE.has(type)
}

// Câble le bouton Améliorer présent dans le DOM injecté.
function _wireUpgradeButton() {
  const btn = document.getElementById('bp-upgrade-btn')
  if (!btn || btn.disabled) return
  btn.addEventListener('click', () => {
    if (_currentType !== 'house' || !_currentBuilding) return
    const target = getBuildingById('big-house')
    if (!target || !target.upgradeFrom) return
    const cost = target.upgradeFrom.cost || {}

    // Re-checks runtime : l état peut avoir changé pendant que la fiche était ouverte.
    if (!techUnlocked('big-house')) {
      showHudToast('Recherche Grosse maison requise.', 2500); return
    }
    if (!Object.entries(cost).every(([k, v]) => (state.resources[k] || 0) >= v)) {
      showHudToast('Ressources insuffisantes pour l amélioration.', 2500); return
    }
    if (!_canFitBigHouseAt(_currentBuilding.x, _currentBuilding.z, _currentBuilding)) {
      showHudToast('Emplacement impossible : la grosse maison nécessite 4x4 cellules libres.', 3500); return
    }

    // Lot B : appel direct si exporté par placements.js.
    // En attendant : événement de fallback pour ne pas bloquer le flow UI.
    if (typeof placementsApi.upgradeBuilding === 'function') {
      try { placementsApi.upgradeBuilding(_currentBuilding, 'big-house') }
      catch (e) { console.error('[strates] upgradeBuilding threw', e) }
    } else {
      try {
        window.dispatchEvent(new CustomEvent('strates:upgradeRequested', {
          detail: { building: _currentBuilding, targetType: 'big-house' }
        }))
      } catch (e) { /* ignore */ }
      showHudToast('Amélioration demandée (en attente du moteur).', 2500)
    }

    refreshHUD()
    // Re-render immédiat pour basculer en mode barre de progression
    if (_currentType && _currentBuilding) {
      bodyEl.innerHTML = buildContent(_currentType, _currentBuilding)
    }
  })
}

// Tick de rafraîchissement : barre de progression upgrade + bascule auto sur
// la big-house quand l upgrade est terminé. Démarré à initBuildingPanel.
let _refreshTimer = null
function _startRefreshLoop() {
  if (_refreshTimer != null) return
  _refreshTimer = setInterval(() => {
    if (!panelEl || panelEl.classList.contains('hidden')) return
    if (_currentType !== 'house' || !_currentBuilding) return
    const b = _currentBuilding
    // Upgrade terminée : la cabane est retirée de state.houses, et la big-house
    // existe désormais à la même position. On bascule automatiquement la fiche.
    const stillInHouses = (state.houses || []).indexOf(b) !== -1
    if (!b.isUnderUpgrade && (b.upgradedTo || !stillInHouses)) {
      const big = (state.bigHouses || []).find(x => x.x === b.x && x.z === b.z)
      if (big) { openBuildingPanel('big-house', big); return }
      closeBuildingPanel(); return
    }
    if (b.isUnderUpgrade) {
      const sec = bodyEl.querySelector('.bp-upgrade-progress')
      if (sec) {
        // Update fin (juste fill + label) pour éviter de tout re-render à 4 Hz
        const pct = Math.max(0, Math.min(1, b.upgradeProgress || 0))
        const fill = sec.querySelector('.bp-upgrade-fill')
        const lbl  = sec.querySelector('.bp-upgrade-pct')
        if (fill) fill.style.width = (pct * 100).toFixed(1) + '%'
        if (lbl)  lbl.textContent = Math.round(pct * 100) + '%'
      } else {
        // Pas encore en mode progress (premier tick post-clic) : re-render
        bodyEl.innerHTML = buildContent(_currentType, _currentBuilding)
      }
    }
  }, 250)
}

export function initBuildingPanel() {
  window.addEventListener('strates:buildingClicked', function(e) {
    const d = e && e.detail
    if (!d) return
    openBuildingPanel(d.type, d.building)
  })
  _startRefreshLoop()
}

export function openBuildingPanel(type, building) {
  ensureDom()
  _currentType     = type
  _currentBuilding = building
  const meta = BUILDING_META[type] || { icon: '🏗', name: type }
  document.getElementById('bp-icon').textContent  = meta.icon
  document.getElementById('bp-title').textContent = meta.name
  bodyEl.innerHTML = buildContent(type, building)
  _wireUpgradeButton()
  panelEl.classList.remove('hidden')
  // Forcer un redémarrage de l'animation slide-in
  panelEl.style.animation = 'none'
  void panelEl.offsetHeight
  panelEl.style.animation = ''
}

export function closeBuildingPanel() {
  if (panelEl) panelEl.classList.add('hidden')
  _currentType     = null
  _currentBuilding = null
}

export function isBuildingPanelOpen() {
  return !!(panelEl && !panelEl.classList.contains('hidden'))
}
