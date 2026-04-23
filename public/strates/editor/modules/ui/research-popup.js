// ============================================================================
// Lot C : popup de completion d une tech (toast en bas au centre).
//
// Injecte un bloc DOM + CSS inline une seule fois dans la page, puis ecoute
// l event 'strates:techComplete' (dispatch par l engine / tech.js) pour
// afficher pendant 4s le nom de la tech debloquee et ses unlocks (jobs,
// batiments). Se referme en fade-out automatiquement.
// ============================================================================

import { TECH_TREE_DATA } from '../gamedata.js'

let installed = false

const POPUP_CSS = `
.tech-popup {
  position: fixed; bottom: 100px; left: 50%;
  transform: translateX(-50%) translateY(20px);
  background: rgba(27,25,20,0.96);
  border: 1px solid var(--gold, #d4b870);
  border-radius: 4px; padding: 14px 20px;
  display: flex; align-items: center; gap: 14px;
  z-index: 200; opacity: 0;
  transition: opacity 0.3s, transform 0.3s;
  pointer-events: none; backdrop-filter: blur(10px);
  box-shadow: 0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(212,184,112,0.1);
  min-width: 280px;
  color: var(--ink, #ede3cc);
  font-family: var(--sans, "Inter", sans-serif);
}
.tech-popup.visible {
  opacity: 1;
  transform: translateX(-50%) translateY(0);
}
.tech-popup.hidden { display: none; }
.tech-popup .tcp-icon { font-size: 32px; line-height: 1; }
.tech-popup .tcp-label {
  font-family: var(--mono, "JetBrains Mono", monospace);
  font-size: 9px; letter-spacing: 0.14em;
  text-transform: uppercase; color: var(--gold, #d4b870);
  margin-bottom: 2px;
}
.tech-popup .tcp-name {
  font-family: var(--serif, "Fraunces", Georgia, serif);
  font-size: 18px; color: var(--ink, #ede3cc); font-weight: 500;
}
.tech-popup .tcp-unlocks {
  font-family: var(--mono, "JetBrains Mono", monospace);
  font-size: 10px; color: var(--ink-3, #7f7562); margin-top: 4px;
}
`

function ensureDom() {
  if (document.getElementById('tech-complete-popup')) return
  // Styles
  if (!document.getElementById('tech-complete-popup-style')) {
    const st = document.createElement('style')
    st.id = 'tech-complete-popup-style'
    st.textContent = POPUP_CSS
    document.head.appendChild(st)
  }
  // Markup
  const popup = document.createElement('div')
  popup.id = 'tech-complete-popup'
  popup.className = 'tech-popup hidden'
  popup.innerHTML =
    '<div class="tcp-icon" id="tcp-icon">&#x26CF;</div>' +
    '<div class="tcp-body">' +
    '  <div class="tcp-label">Recherche terminee</div>' +
    '  <div class="tcp-name" id="tcp-name">Pioche en pierre</div>' +
    '  <div class="tcp-unlocks" id="tcp-unlocks"></div>' +
    '</div>'
  document.body.appendChild(popup)
}

function findTech(id) {
  const techs = (TECH_TREE_DATA && TECH_TREE_DATA.techs) || []
  for (let i = 0; i < techs.length; i++) if (techs[i].id === id) return techs[i]
  return null
}

let hideTimer = null
let removeTimer = null

function showPopup(id, tech) {
  ensureDom()
  const popup = document.getElementById('tech-complete-popup')
  if (!popup) return
  const fallback = findTech(id)
  const t = tech || fallback || {}
  const icon = t.icon || '⚙️'
  const name = t.name || id
  const unlocksRaw = t.unlocks || {}
  const parts = []
  if (Array.isArray(unlocksRaw.jobs)) {
    unlocksRaw.jobs.forEach(function(j) { parts.push('▸ Metier : ' + j) })
  }
  if (Array.isArray(unlocksRaw.buildings)) {
    unlocksRaw.buildings.forEach(function(b) { parts.push('▸ Batiment : ' + b) })
  }
  const unlocks = parts.join('  ')

  const iconEl = document.getElementById('tcp-icon')
  const nameEl = document.getElementById('tcp-name')
  const unEl   = document.getElementById('tcp-unlocks')
  if (iconEl) iconEl.textContent = icon
  if (nameEl) nameEl.textContent = name
  if (unEl)   unEl.textContent   = unlocks

  if (hideTimer) { clearTimeout(hideTimer); hideTimer = null }
  if (removeTimer) { clearTimeout(removeTimer); removeTimer = null }

  popup.classList.remove('hidden')
  popup.classList.remove('visible')
  // Force reflow pour que la transition se joue sur le 'visible' qui suit
  void popup.offsetHeight
  popup.classList.add('visible')

  hideTimer = setTimeout(function() {
    popup.classList.remove('visible')
    removeTimer = setTimeout(function() { popup.classList.add('hidden') }, 350)
  }, 4000)
}

// ============================================================================
// Toast HUD generique (message court, fond sombre, 2-3 s)
// ============================================================================

const TOAST_CSS = `
.hud-toast {
  position: fixed; bottom: 68px; left: 50%;
  transform: translateX(-50%) translateY(10px);
  background: rgba(27,25,20,0.94);
  border: 1px solid rgba(212,184,112,0.35);
  border-radius: 4px; padding: 10px 18px;
  z-index: 300; opacity: 0;
  transition: opacity 0.25s, transform 0.25s;
  pointer-events: none; backdrop-filter: blur(8px);
  color: var(--ink, #ede3cc);
  font-family: var(--sans, "Inter", sans-serif);
  font-size: 13px; white-space: nowrap;
}
.hud-toast.visible { opacity: 1; transform: translateX(-50%) translateY(0); }
.hud-toast.hidden  { display: none; }
`

let toastStyleInjected = false
let toastHideTimer = null
let toastRemoveTimer = null

function ensureToastDom() {
  if (document.getElementById('hud-toast-el')) return
  if (!toastStyleInjected) {
    const st = document.createElement('style')
    st.id = 'hud-toast-style'
    st.textContent = TOAST_CSS
    document.head.appendChild(st)
    toastStyleInjected = true
  }
  const el = document.createElement('div')
  el.id = 'hud-toast-el'
  el.className = 'hud-toast hidden'
  document.body.appendChild(el)
}

export function showHudToast(message, durationMs) {
  const dur = durationMs != null ? durationMs : 2500
  ensureToastDom()
  const el = document.getElementById('hud-toast-el')
  if (!el) return
  el.textContent = message
  if (toastHideTimer)   { clearTimeout(toastHideTimer);   toastHideTimer = null }
  if (toastRemoveTimer) { clearTimeout(toastRemoveTimer); toastRemoveTimer = null }
  el.classList.remove('hidden')
  el.classList.remove('visible')
  void el.offsetHeight
  el.classList.add('visible')
  toastHideTimer = setTimeout(function() {
    el.classList.remove('visible')
    toastRemoveTimer = setTimeout(function() { el.classList.add('hidden') }, 300)
  }, dur)
}

export function installResearchPopup() {
  if (installed) return
  installed = true
  ensureDom()
  window.addEventListener('strates:techComplete', function(e) {
    const detail = (e && e.detail) || {}
    showPopup(detail.id, detail.tech)
  })
}
