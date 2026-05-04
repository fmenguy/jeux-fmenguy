// ============================================================================
// social-panel.js : modale Social MVP read-only.
// Liste tous les couples, célibataires et sans-abri du village.
//
// Style ardoise+or cohérent avec les autres modales du HUD.
// API : initSocialPanel(), openSocialPanel(), closeSocialPanel(),
//       isSocialPanelOpen()
// ============================================================================

import { state } from '../state.js'
import { openCharSheet } from '../charsheet-ui.js'

const CSS = `
#social-overlay {
  position: fixed; inset: 0;
  background: rgba(6, 9, 14, 0.78);
  backdrop-filter: blur(4px);
  z-index: 92;
  display: none;
  align-items: center; justify-content: center;
  font-family: inherit;
}
#social-overlay.open { display: flex; }
.social-panel {
  width: min(720px, 92vw);
  max-height: 86vh;
  background: linear-gradient(180deg, rgba(28,26,20,0.98), rgba(20,18,14,0.99));
  border: 1px solid rgba(201,168,76,0.40);
  border-radius: 10px;
  box-shadow: 0 24px 70px rgba(0,0,0,0.70);
  color: #f3ecdd;
  display: flex; flex-direction: column;
  overflow: hidden;
}
.social-header {
  display: flex; align-items: center; gap: 12px;
  padding: 16px 22px;
  border-bottom: 1px solid rgba(201,168,76,0.30);
  background: linear-gradient(180deg, rgba(201,168,76,0.10), rgba(201,168,76,0.02));
}
.social-header .ic { font-size: 22px; }
.social-header h2 {
  margin: 0; font-size: 18px; font-weight: 700;
  color: #c9a84c; letter-spacing: 0.06em; flex: 1;
}
.social-close {
  background: transparent; border: none; color: #c7b98c;
  font-size: 22px; cursor: pointer; padding: 0 6px; line-height: 1;
}
.social-close:hover { color: #c9a84c; }
.social-body {
  padding: 18px 22px 22px;
  overflow-y: auto;
  display: flex; flex-direction: column; gap: 16px;
}
.social-body::-webkit-scrollbar { width: 8px; }
.social-body::-webkit-scrollbar-thumb { background: rgba(201,168,76,0.25); border-radius: 4px; }
.social-section h3 {
  margin: 0 0 8px 0;
  font-family: "JetBrains Mono", monospace;
  font-size: 10px; font-weight: 700;
  color: #c9a84c; letter-spacing: 0.16em; text-transform: uppercase;
}
.social-empty {
  color: rgba(243,236,221,0.45);
  font-style: italic;
  font-size: 12px;
  padding: 6px 4px;
}
.social-row {
  display: flex; align-items: center; gap: 8px;
  padding: 6px 8px;
  border-radius: 4px;
  border: 1px solid rgba(255,255,255,0.05);
  background: rgba(255,255,255,0.02);
  font-size: 12.5px;
  margin-bottom: 4px;
  transition: background 0.12s, border-color 0.12s;
}
.social-row.clickable { cursor: pointer; }
.social-row.clickable:hover { background: rgba(255,217,138,0.08); border-color: rgba(255,217,138,0.30); }
.social-name { color: #f3ecdd; }
.social-name.chief { color: #ffd98a; font-weight: 700; }
.social-gender { font-size: 13px; }
.social-gender.M { color: #a8c9ff; }
.social-gender.F { color: #ffb6cf; }
.social-meta {
  margin-left: auto;
  font-family: "JetBrains Mono", monospace;
  font-size: 9.5px;
  color: rgba(243,236,221,0.55);
  letter-spacing: 0.04em;
}
.social-couple-line {
  display: flex; align-items: center; gap: 8px;
  flex-wrap: wrap;
}
.social-heart {
  color: #f0bcd4;
  font-size: 14px;
  margin: 0 4px;
}
`

let overlayEl = null
let bodyEl = null
let initialized = false

function _ensureCSS() {
  if (document.getElementById('social-panel-css')) return
  const s = document.createElement('style')
  s.id = 'social-panel-css'
  s.textContent = CSS
  document.head.appendChild(s)
}

function _ensureDom() {
  if (overlayEl) return
  _ensureCSS()
  overlayEl = document.createElement('div')
  overlayEl.id = 'social-overlay'
  overlayEl.innerHTML =
    '<div class="social-panel" role="dialog" aria-label="Liens sociaux">' +
      '<div class="social-header">' +
        '<span class="ic">&#128150;</span>' +
        '<h2>Liens sociaux du village</h2>' +
        '<button class="social-close" aria-label="Fermer">&times;</button>' +
      '</div>' +
      '<div class="social-body" id="social-body"></div>' +
    '</div>'
  document.body.appendChild(overlayEl)
  bodyEl = overlayEl.querySelector('#social-body')
  overlayEl.querySelector('.social-close').addEventListener('click', closeSocialPanel)
  overlayEl.addEventListener('click', (e) => {
    if (e.target === overlayEl) closeSocialPanel()
  })
  // Délégation : clic sur un nom de colon ouvre la charsheet
  bodyEl.addEventListener('click', (e) => {
    const row = e.target.closest('.social-row.clickable')
    if (!row) return
    const cid = row.dataset.cid
    if (cid == null) return
    const c = (state.colonists || []).find(x => String(x.id) === String(cid))
    if (c) {
      closeSocialPanel()
      openCharSheet(c)
    }
  })
}

function _escH(s) {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

// Cherche le bâtiment "maison" qui héberge ce colon. Lot B câble homeBuildingId
// directement sur le colon ; en attendant, on scanne les listes de bâtiments.
function _findHomeOf(c) {
  if (c.homeBuildingId != null) {
    const findIn = (arr, type) => {
      if (!Array.isArray(arr)) return null
      const b = arr.find(x => x.id === c.homeBuildingId || (x.x === c.homeX && x.z === c.homeZ))
      return b ? { type, building: b } : null
    }
    const r = findIn(state.houses, 'house') || findIn(state.bigHouses, 'big-house') || findIn(state.manors, 'manor')
    if (r) return r
  }
  // Fallback : scan des residents arrays
  const scan = (arr, type) => {
    if (!Array.isArray(arr)) return null
    for (const b of arr) {
      const ids = b.residents || []
      if (ids.includes(c.id)) return { type, building: b }
    }
    return null
  }
  return scan(state.houses, 'house') || scan(state.bigHouses, 'big-house') || scan(state.manors, 'manor')
}

function _homeLabel(home, indexByType) {
  if (!home) return null
  const labels = { house: 'Cabane', 'big-house': 'Grosse maison', manor: 'Manoir' }
  const arr = home.type === 'house' ? state.houses
            : home.type === 'big-house' ? state.bigHouses
            : state.manors
  const i = (arr || []).indexOf(home.building)
  const label = labels[home.type] || home.type
  return label + (i >= 0 ? ' n°' + (i + 1) : '')
}

function _genderSym(g) { return g === 'F' ? '♀' : '♂' }
function _genderClass(g) { return g === 'F' ? 'F' : 'M' }

function _colonistInline(c, withHome) {
  const home = withHome ? _findHomeOf(c) : null
  const homeStr = home ? _homeLabel(home) : null
  const nameCls = c.isChief ? 'social-name chief' : 'social-name'
  return '<span class="' + nameCls + '">' +
    (c.isChief ? '★ ' : '') +
    _escH(c.name) +
    '</span>' +
    '<span class="social-gender ' + _genderClass(c.gender) + '">' + _genderSym(c.gender) + '</span>' +
    (homeStr ? '<span class="social-meta">' + _escH(homeStr) + '</span>' : '')
}

function _renderBody() {
  if (!bodyEl) return
  const colonists = state.colonists || []

  // Couples : on regroupe par paire (a.id < b.id pour éviter les doublons).
  // Lot B câble c.partnerId. Tant que pas câblé : section vide.
  const seenInPair = new Set()
  const couples = []
  for (const c of colonists) {
    if (c.partnerId == null) continue
    if (seenInPair.has(c.id)) continue
    const partner = colonists.find(x => x.id === c.partnerId)
    if (!partner) continue
    seenInPair.add(c.id)
    seenInPair.add(partner.id)
    couples.push([c, partner])
  }

  // Célibataires : sans partnerId, mais avec un foyer.
  const singles = colonists.filter(c => c.partnerId == null && _findHomeOf(c))

  // Sans-abri : sans foyer assigné.
  const homeless = colonists.filter(c => !_findHomeOf(c))

  const couplesHtml = couples.length
    ? couples.map(([a, b]) => {
        const home = _findHomeOf(a) || _findHomeOf(b)
        const homeStr = home ? _homeLabel(home) : null
        return '<div class="social-row">' +
          '<div class="social-couple-line">' +
            '<span class="social-row clickable" data-cid="' + _escH(a.id) + '" style="background:transparent;border:none;padding:0;margin:0">' +
              _colonistInline(a, false) +
            '</span>' +
            '<span class="social-heart">💞</span>' +
            '<span class="social-row clickable" data-cid="' + _escH(b.id) + '" style="background:transparent;border:none;padding:0;margin:0">' +
              _colonistInline(b, false) +
            '</span>' +
          '</div>' +
          (homeStr ? '<span class="social-meta">' + _escH(homeStr) + '</span>' : '') +
        '</div>'
      }).join('')
    : '<div class="social-empty">Aucun couple pour le moment.</div>'

  const singlesHtml = singles.length
    ? singles.map(c => '<div class="social-row clickable" data-cid="' + _escH(c.id) + '">' + _colonistInline(c, true) + '</div>').join('')
    : '<div class="social-empty">Aucun colon célibataire.</div>'

  const homelessHtml = homeless.length
    ? homeless.map(c => '<div class="social-row clickable" data-cid="' + _escH(c.id) + '">' + _colonistInline(c, false) + '</div>').join('')
    : '<div class="social-empty">Tous les colons ont un toit.</div>'

  bodyEl.innerHTML =
    '<div class="social-section">' +
      '<h3>Couples (' + couples.length + ')</h3>' +
      couplesHtml +
    '</div>' +
    '<div class="social-section">' +
      '<h3>Sans couple (' + singles.length + ')</h3>' +
      singlesHtml +
    '</div>' +
    '<div class="social-section">' +
      '<h3>Sans-abri (' + homeless.length + ')</h3>' +
      homelessHtml +
    '</div>'
}

export function initSocialPanel() {
  if (initialized) return
  initialized = true
  _ensureDom()
}

export function openSocialPanel() {
  initSocialPanel()
  _renderBody()
  if (overlayEl) overlayEl.classList.add('open')
}

export function closeSocialPanel() {
  if (overlayEl) overlayEl.classList.remove('open')
}

export function isSocialPanelOpen() {
  return !!(overlayEl && overlayEl.classList.contains('open'))
}
