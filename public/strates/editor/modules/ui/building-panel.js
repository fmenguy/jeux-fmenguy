// ============================================================================
// Panneau d'info bâtiment : panneau latéral fixe (droite), même style que
// charsheet. S'ouvre via l'événement strates:buildingClicked.
// API : initBuildingPanel(), openBuildingPanel(type, building),
//       closeBuildingPanel(), isBuildingPanelOpen()
// ============================================================================

import { state } from '../state.js'

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
.bp-resident-name { flex: 1; font-size: 12px; color: #f3ecdd; }
.bp-resident-chief {
  font-size: 9px; color: #ffd98a; font-weight: 700;
  letter-spacing: 0.1em; text-transform: uppercase;
  background: rgba(255,217,138,0.12); border-radius: 3px;
  padding: 1px 5px;
}
.bp-resident-gender { color: #a8c9ff; font-size: 13px; }
.bp-resident-gender.F { color: #ffb6cf; }
.bp-empty { color: rgba(199,185,140,0.5); font-style: italic; font-size: 12px; }
`

const BUILDING_META = {
  house:       { icon: '🏠', name: 'Cabane',        desc: 'Abrite les colons du village.' },
  manor:       { icon: '🏰', name: 'Manoir',        desc: 'Grand foyer pour familles nombreuses. Fusion de 4 cabanes.' },
  foyer:       { icon: '🔥', name: 'Foyer',         desc: 'Cœur du camp. Rassemble le clan, permet la cuisson.' },
  research:    { icon: '🔬', name: 'Hutte du Sage', desc: 'Génère des points de recherche chaque tick.' },
  field:       { icon: '🌾', name: 'Champ',         desc: 'Champ cultivé. Produit des ressources agricoles.' },
  observatory: { icon: '🔭', name: 'Promontoire',   desc: 'Génère des points nocturnes quand la nuit tombe.' },
}

const HOUSE_CAPACITY = 2
const MANOR_CAPACITY = 6

let panelEl = null
let bodyEl  = null

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
}

function colonistById(id) {
  return (state.colonists || []).find(c => c.id === id) || null
}

function residentRow(colonistId) {
  const c = colonistById(colonistId)
  if (!c) return ''
  const genClass = c.gender === 'F' ? 'F' : 'M'
  const sym = c.gender === 'F' ? '♀' : '♂'
  return '<div class="bp-resident">' +
    '<span style="font-size:14px">👤</span>' +
    '<span class="bp-resident-name">' + c.name + '</span>' +
    (c.isChief ? '<span class="bp-resident-chief">Chef</span>' : '') +
    '<span class="bp-resident-gender ' + genClass + '">' + sym + '</span>' +
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

  if (type === 'house' || type === 'manor') {
    const capacity = type === 'manor' ? MANOR_CAPACITY : HOUSE_CAPACITY
    const residents = building.residents || []

    sections.push(
      '<div class="bp-section">' +
        '<div class="bp-row">' +
          '<span class="bp-key">Capacité</span>' +
          '<span class="bp-val">' + residents.length + ' / ' + capacity + '</span>' +
        '</div>' +
      '</div>'
    )

    const resHtml = residents.length
      ? residents.map(id => residentRow(id)).join('')
      : '<div class="bp-empty">Aucun résident</div>'

    sections.push(
      '<div class="bp-section">' +
        '<h4>Résidents</h4>' +
        resHtml +
      '</div>'
    )
  }

  if (type === 'research') {
    const assignedId = building.assignedColonistId
    const chercheur = assignedId != null ? colonistById(assignedId) : null
    sections.push(
      '<div class="bp-section">' +
        '<h4>Chercheur</h4>' +
        (chercheur
          ? residentRow(assignedId)
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

export function initBuildingPanel() {
  window.addEventListener('strates:buildingClicked', function(e) {
    const d = e && e.detail
    if (!d) return
    openBuildingPanel(d.type, d.building)
  })
}

export function openBuildingPanel(type, building) {
  ensureDom()
  const meta = BUILDING_META[type] || { icon: '🏗', name: type }
  document.getElementById('bp-icon').textContent  = meta.icon
  document.getElementById('bp-title').textContent = meta.name
  bodyEl.innerHTML = buildContent(type, building)
  panelEl.classList.remove('hidden')
  // Forcer un redémarrage de l'animation slide-in
  panelEl.style.animation = 'none'
  void panelEl.offsetHeight
  panelEl.style.animation = ''
}

export function closeBuildingPanel() {
  if (panelEl) panelEl.classList.add('hidden')
}

export function isBuildingPanelOpen() {
  return !!(panelEl && !panelEl.classList.contains('hidden'))
}
