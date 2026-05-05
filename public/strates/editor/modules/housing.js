// ============================================================================
// housing.js : helpers d assignation des colons à un foyer + 2 pickers UI.
//
// API data :
//   getHomeOf(colonist)            -> { type, building, index } | null
//   homeLabel(home)                -> "Cabane n°2" | "Grosse maison n°1"
//   getCapacityOf(type)            -> int
//   findFreeHouses()               -> [{ type, building, free }]
//   assignToHouse(colonist, building, type)
//   removeFromHouse(colonist)
//
// API UI :
//   openColonistPicker(building, type, onPick)  (fiche bâtiment)
//   openHousePicker(colonist, onPick)            (charsheet, social)
//
// Délègue à placements.assignColonistToHouse / removeColonistFromHouse si
// exportés (Lot B). Sinon, fallback local : edition de building.residents +
// colonist.homeBuildingId.
// ============================================================================

import { state } from './state.js'
import * as placementsApi from './placements.js'
import { showHudToast } from './ui/research-popup.js'

const CAPACITIES = { house: 2, manor: 6, 'big-house': 8 }
export function getCapacityOf(type) { return CAPACITIES[type] || 2 }

function _typeOf(building) {
  if ((state.houses || []).includes(building)) return 'house'
  if ((state.bigHouses || []).includes(building)) return 'big-house'
  if ((state.manors || []).includes(building)) return 'manor'
  return null
}

export function getHomeOf(colonist) {
  if (!colonist) return null
  if (colonist.homeBuildingId != null) {
    for (const arr of [state.houses, state.bigHouses, state.manors]) {
      if (!Array.isArray(arr)) continue
      const b = arr.find(x => x.id === colonist.homeBuildingId)
      if (b) return { type: _typeOf(b), building: b }
    }
  }
  for (const [arr, type] of [[state.houses, 'house'], [state.bigHouses, 'big-house'], [state.manors, 'manor']]) {
    if (!Array.isArray(arr)) continue
    for (const b of arr) {
      if ((b.residents || []).includes(colonist.id)) return { type, building: b }
    }
  }
  return null
}

const TYPE_LABELS = { house: 'Cabane', 'big-house': 'Grosse maison', manor: 'Manoir' }
export function homeLabel(home) {
  if (!home || !home.building) return 'Sans-abri'
  const arr = home.type === 'house' ? state.houses
            : home.type === 'big-house' ? state.bigHouses
            : state.manors
  const i = (arr || []).indexOf(home.building)
  return (TYPE_LABELS[home.type] || home.type) + (i >= 0 ? ' n°' + (i + 1) : '')
}

export function findFreeHouses() {
  const out = []
  for (const [arr, type] of [[state.houses, 'house'], [state.bigHouses, 'big-house'], [state.manors, 'manor']]) {
    if (!Array.isArray(arr)) continue
    for (const b of arr) {
      const cap = getCapacityOf(type)
      const cur = (b.residents || []).length
      if (cur < cap) out.push({ type, building: b, free: cap - cur })
    }
  }
  return out
}

// Assigne un colon à un bâtiment. Retourne true si OK, false si plein ou erreur.
// Nettoie automatiquement l ancien foyer si le colon était logé ailleurs.
export function assignToHouse(colonist, building, type) {
  if (!colonist || !building) return false
  if (typeof placementsApi.assignColonistToHouse === 'function') {
    try { return !!placementsApi.assignColonistToHouse(colonist, building) }
    catch (e) { console.error('[housing] assignColonistToHouse threw', e); return false }
  }
  // Fallback local
  type = type || _typeOf(building) || 'house'
  const cap = getCapacityOf(type)
  if (!Array.isArray(building.residents)) building.residents = []
  if (building.residents.length >= cap) return false
  // Retirer du foyer précédent si applicable
  removeFromHouse(colonist, { silent: true })
  building.residents.push(colonist.id)
  if (building.id != null) colonist.homeBuildingId = building.id
  return true
}

export function removeFromHouse(colonist, opts) {
  if (!colonist) return false
  // Lot B : unlinkColonistFromHome symétrise residents + homeBuildingId
  // + assignedBuildingId, à privilégier.
  if (typeof placementsApi.unlinkColonistFromHome === 'function') {
    try { placementsApi.unlinkColonistFromHome(colonist); return true }
    catch (e) { console.error('[housing] unlinkColonistFromHome threw', e); return false }
  }
  if (typeof placementsApi.removeColonistFromHouse === 'function') {
    try { return !!placementsApi.removeColonistFromHouse(colonist) }
    catch (e) { console.error('[housing] removeColonistFromHouse threw', e); return false }
  }
  // Fallback : scan toutes les habitations
  let removed = false
  for (const arr of [state.houses, state.bigHouses, state.manors]) {
    if (!Array.isArray(arr)) continue
    for (const b of arr) {
      if (!Array.isArray(b.residents)) continue
      const i = b.residents.indexOf(colonist.id)
      if (i >= 0) { b.residents.splice(i, 1); removed = true }
    }
  }
  if (colonist.homeBuildingId != null) colonist.homeBuildingId = null
  return removed
}

// ============================================================================
// Pickers UI : 2 modales flottantes partagées par building-panel, charsheet,
// social-panel. Style ardoise+or cohérent avec le reste du HUD.
// ============================================================================

const PICKER_CSS = `
.hous-picker-overlay {
  position: fixed; inset: 0;
  background: rgba(6,9,14,0.78);
  backdrop-filter: blur(4px);
  z-index: 95;
  display: none;
  align-items: center; justify-content: center;
  font-family: inherit;
}
.hous-picker-overlay.open { display: flex; }
.hous-picker {
  width: min(520px, 92vw);
  max-height: 86vh;
  background: linear-gradient(180deg, rgba(28,26,20,0.98), rgba(20,18,14,0.99));
  border: 1px solid rgba(212,184,112,0.40);
  border-radius: 8px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.7);
  color: #f3ecdd;
  display: flex; flex-direction: column;
  overflow: hidden;
}
.hous-picker-head {
  display: flex; align-items: center; gap: 10px;
  padding: 14px 18px;
  border-bottom: 1px solid rgba(212,184,112,0.30);
  background: linear-gradient(180deg, rgba(212,184,112,0.10), rgba(212,184,112,0.02));
}
.hous-picker-head h3 {
  margin: 0; flex: 1;
  font-size: 15px; font-weight: 700;
  color: #d4b870; letter-spacing: 0.06em;
}
.hous-picker-close {
  background: transparent; border: none; color: #c7b98c;
  font-size: 20px; cursor: pointer; padding: 0 6px; line-height: 1;
}
.hous-picker-close:hover { color: #d4b870; }
.hous-picker-body {
  padding: 14px 18px 18px;
  overflow-y: auto;
  display: flex; flex-direction: column; gap: 14px;
}
.hous-picker-body::-webkit-scrollbar { width: 8px; }
.hous-picker-body::-webkit-scrollbar-thumb { background: rgba(212,184,112,0.25); border-radius: 4px; }
.hous-picker-section h4 {
  margin: 0 0 6px 0;
  font-family: "JetBrains Mono", monospace;
  font-size: 9.5px; font-weight: 600;
  letter-spacing: 0.16em; text-transform: uppercase;
  color: #d4b870;
}
.hous-picker-empty {
  color: rgba(243,236,221,0.45);
  font-style: italic; font-size: 12px;
  padding: 4px 0;
}
.hous-picker-row {
  display: flex; align-items: center; gap: 8px;
  padding: 7px 10px;
  border-radius: 4px;
  border: 1px solid rgba(255,255,255,0.06);
  background: rgba(255,255,255,0.02);
  cursor: pointer;
  transition: background 0.12s, border-color 0.12s;
  font-size: 12.5px;
  margin-bottom: 4px;
}
.hous-picker-row:hover {
  background: rgba(212,184,112,0.10);
  border-color: rgba(212,184,112,0.45);
}
.hous-picker-row .name { flex: 1; }
.hous-picker-row .name.chief { color: #ffd98a; font-weight: 700; }
.hous-picker-row .gender.M { color: #a8c9ff; }
.hous-picker-row .gender.F { color: #ffb6cf; }
.hous-picker-row .meta {
  font-family: "JetBrains Mono", monospace;
  font-size: 9.5px;
  color: rgba(243,236,221,0.55);
  letter-spacing: 0.04em;
}
`

let _pickerEl = null
let _pickerHead = null
let _pickerBody = null
let _pickerOnPick = null
let _initialized = false

function _ensurePicker() {
  if (_initialized) return
  _initialized = true
  if (!document.getElementById('hous-picker-css')) {
    const s = document.createElement('style')
    s.id = 'hous-picker-css'
    s.textContent = PICKER_CSS
    document.head.appendChild(s)
  }
  _pickerEl = document.createElement('div')
  _pickerEl.className = 'hous-picker-overlay'
  _pickerEl.innerHTML =
    '<div class="hous-picker" role="dialog">' +
      '<div class="hous-picker-head">' +
        '<h3 id="hous-picker-title">Sélectionner</h3>' +
        '<button class="hous-picker-close" aria-label="Fermer">&times;</button>' +
      '</div>' +
      '<div class="hous-picker-body" id="hous-picker-body"></div>' +
    '</div>'
  document.body.appendChild(_pickerEl)
  _pickerHead = _pickerEl.querySelector('#hous-picker-title')
  _pickerBody = _pickerEl.querySelector('#hous-picker-body')
  _pickerEl.querySelector('.hous-picker-close').addEventListener('click', _closePicker)
  _pickerEl.addEventListener('click', e => { if (e.target === _pickerEl) _closePicker() })
}

function _closePicker() {
  if (_pickerEl) _pickerEl.classList.remove('open')
  _pickerOnPick = null
}

function _escH(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function _genderSym(g) { return g === 'F' ? '♀' : '♂' }
function _genderClass(g) { return g === 'F' ? 'F' : 'M' }

// Picker COLON : utilisé depuis la fiche bâtiment quand un slot libre veut
// recevoir un nouveau résident. building/type identifient la maison cible.
export function openColonistPicker(building, type, onPick) {
  _ensurePicker()
  _pickerOnPick = onPick
  _pickerHead.textContent = 'Choisir un colon à loger'
  const colonists = state.colonists || []
  const homeless = []
  const housedElsewhere = []
  for (const c of colonists) {
    const home = getHomeOf(c)
    if (!home) homeless.push({ c, home: null })
    else if (home.building !== building) housedElsewhere.push({ c, home })
    // si home.building === building, déjà résident, on l ignore (déplacé géré côté ré-assignation)
  }

  function rowHtml(entry) {
    const c = entry.c
    const cls = c.isChief ? 'name chief' : 'name'
    const meta = entry.home ? '<span class="meta">' + _escH(homeLabel(entry.home)) + '</span>' : ''
    return '<div class="hous-picker-row" data-cid="' + _escH(c.id) + '">' +
      '<span class="' + cls + '">' + (c.isChief ? '★ ' : '') + _escH(c.name) + '</span>' +
      '<span class="gender ' + _genderClass(c.gender) + '">' + _genderSym(c.gender) + '</span>' +
      meta +
    '</div>'
  }

  _pickerBody.innerHTML =
    '<div class="hous-picker-section">' +
      '<h4>Sans-abri (' + homeless.length + ')</h4>' +
      (homeless.length ? homeless.map(rowHtml).join('') : '<div class="hous-picker-empty">Aucun colon sans-abri.</div>') +
    '</div>' +
    '<div class="hous-picker-section">' +
      '<h4>Logés ailleurs (' + housedElsewhere.length + ')</h4>' +
      (housedElsewhere.length ? housedElsewhere.map(rowHtml).join('') : '<div class="hous-picker-empty">Aucun.</div>') +
    '</div>'

  _pickerBody.onclick = e => {
    const row = e.target.closest('.hous-picker-row')
    if (!row) return
    const cid = row.dataset.cid
    const c = (state.colonists || []).find(x => String(x.id) === String(cid))
    if (!c) return
    const ok = assignToHouse(c, building, type)
    if (ok) {
      const home = getHomeOf(c)
      const lbl = home ? homeLabel(home) : 'la maison'
      try { showHudToast(c.name + ' est désormais résident de ' + lbl + '.', 2800) } catch (_) {}
      _closePicker()
      if (_pickerOnPick) _pickerOnPick(c)
    } else {
      try { showHudToast('Maison pleine.', 2200) } catch (_) {}
    }
  }
  _pickerEl.classList.add('open')
}

// Picker MAISON : utilisé depuis la charsheet ou la modale Social pour loger
// un colon donné. Liste les maisons avec place libre.
export function openHousePicker(colonist, onPick) {
  _ensurePicker()
  _pickerOnPick = onPick
  _pickerHead.textContent = 'Loger ' + (colonist ? colonist.name : '')
  const free = findFreeHouses()

  function rowHtml(entry) {
    const lbl = homeLabel(entry)
    const cap = getCapacityOf(entry.type)
    const cur = (entry.building.residents || []).length
    return '<div class="hous-picker-row" data-key="' + entry.type + ':' + ((state.houses || state.bigHouses || []).indexOf(entry.building)) + '">' +
      '<span class="name">' + _escH(lbl) + '</span>' +
      '<span class="meta">' + cur + '/' + cap + ' place' + (cap > 1 ? 's' : '') + '</span>' +
    '</div>'
  }

  _pickerBody.innerHTML =
    '<div class="hous-picker-section">' +
      '<h4>Maisons avec place libre (' + free.length + ')</h4>' +
      (free.length ? free.map(rowHtml).join('') : '<div class="hous-picker-empty">Aucune maison disponible. Construis ou agrandis une habitation.</div>') +
    '</div>'

  _pickerBody.onclick = e => {
    const row = e.target.closest('.hous-picker-row')
    if (!row) return
    // Lookup direct dans free[] par index conservé dans l ordre du rendu
    const idx = Array.prototype.indexOf.call(_pickerBody.querySelectorAll('.hous-picker-row'), row)
    const entry = free[idx]
    if (!entry || !colonist) return
    const ok = assignToHouse(colonist, entry.building, entry.type)
    if (ok) {
      const home = getHomeOf(colonist)
      const lbl = home ? homeLabel(home) : 'la maison'
      try { showHudToast(colonist.name + ' est désormais résident de ' + lbl + '.', 2800) } catch (_) {}
      _closePicker()
      if (_pickerOnPick) _pickerOnPick(entry.building)
    } else {
      try { showHudToast('Maison pleine.', 2200) } catch (_) {}
    }
  }
  _pickerEl.classList.add('open')
}
