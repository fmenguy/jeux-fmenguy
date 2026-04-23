// ============================================================================
// Lot C : notifications stackables de completion de tech (haut gauche).
//
// Ecoute l'event 'strates:techComplete' (dispatch par tech.js) et injecte
// une notif compacte dans #ttp-notifs. Chaque notif est independante, se
// ferme manuellement via la croix. Les notifs s'empilent verticalement.
// ============================================================================

import { TECH_TREE_DATA } from '../gamedata.js'

let installed = false

const NOTIF_CSS = `
#ttp-notifs {
  position: fixed;
  top: 70px;
  left: 18px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  z-index: 500;
  pointer-events: none;
}
.ttp-notif {
  display: flex;
  align-items: center;
  gap: 10px;
  background: rgba(27,25,20,0.96);
  border: 1px solid var(--gold, #d4b870);
  border-radius: 4px;
  padding: 8px 10px 8px 12px;
  max-width: 280px;
  color: var(--ink, #ede3cc);
  font-family: var(--sans, "Inter", sans-serif);
  pointer-events: auto;
  box-shadow: 0 4px 16px rgba(0,0,0,0.5);
  backdrop-filter: blur(10px);
  transform: translateX(-110%);
  opacity: 0;
  transition: transform 0.28s cubic-bezier(0.2,0.8,0.3,1), opacity 0.28s;
}
.ttp-notif.in {
  transform: translateX(0);
  opacity: 1;
}
.ttp-notif.out {
  transform: translateX(-110%);
  opacity: 0;
}
.ttp-notif .tn-ic {
  font-size: 20px;
  line-height: 1;
  flex-shrink: 0;
}
.ttp-notif .tn-body {
  flex: 1;
  min-width: 0;
}
.ttp-notif .tn-lbl {
  font-family: var(--mono, "JetBrains Mono", monospace);
  font-size: 8.5px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--gold, #d4b870);
  line-height: 1;
  margin-bottom: 2px;
}
.ttp-notif .tn-name {
  font-family: var(--serif, "Fraunces", Georgia, serif);
  font-size: 13px;
  font-weight: 600;
  color: var(--ink, #ede3cc);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ttp-notif .tn-close {
  flex-shrink: 0;
  background: none;
  border: none;
  color: var(--ink-3, #7f7562);
  cursor: pointer;
  font-size: 13px;
  line-height: 1;
  padding: 2px 4px;
  border-radius: 3px;
  transition: color 0.15s;
}
.ttp-notif .tn-close:hover { color: var(--ink, #ede3cc); }
`

function ensureContainer() {
  if (document.getElementById('ttp-notifs')) return
  if (!document.getElementById('ttp-notifs-style')) {
    const st = document.createElement('style')
    st.id = 'ttp-notifs-style'
    st.textContent = NOTIF_CSS
    document.head.appendChild(st)
  }
  const container = document.createElement('div')
  container.id = 'ttp-notifs'
  document.body.appendChild(container)
}

function findTech(id) {
  const techs = (TECH_TREE_DATA && TECH_TREE_DATA.techs) || []
  for (let i = 0; i < techs.length; i++) if (techs[i].id === id) return techs[i]
  return null
}

function showNotif(id, tech) {
  ensureContainer()
  const container = document.getElementById('ttp-notifs')
  if (!container) return
  const fallback = findTech(id)
  const t = tech || fallback || {}
  const icon = t.icon || '⚙'
  const name = t.name || id

  const notif = document.createElement('div')
  notif.className = 'ttp-notif'
  notif.innerHTML =
    '<span class="tn-ic">' + icon + '</span>' +
    '<span class="tn-body">' +
    '  <div class="tn-lbl">Debloque</div>' +
    '  <div class="tn-name">' + name + '</div>' +
    '</span>' +
    '<button class="tn-close" title="Fermer">x</button>'

  container.prepend(notif)

  // slide-in
  requestAnimationFrame(function() {
    requestAnimationFrame(function() { notif.classList.add('in') })
  })

  notif.querySelector('.tn-close').addEventListener('click', function() {
    notif.classList.remove('in')
    notif.classList.add('out')
    setTimeout(function() { if (notif.parentNode) notif.parentNode.removeChild(notif) }, 320)
  })
}

export function installResearchPopup() {
  if (installed) return
  installed = true
  ensureContainer()
  window.addEventListener('strates:techComplete', function(e) {
    const detail = (e && e.detail) || {}
    showNotif(detail.id, detail.tech)
  })
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
