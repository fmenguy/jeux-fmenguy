// ============================================================================
// Overlay d'aide controles, style "banger" type Clair Obscur / Hades.
// Touche H pour ouvrir/fermer. Fond floute, touches stylisees en CSS.
// ============================================================================

let initialized = false
let backdropEl = null
let panelEl = null

function isEditable(el) {
  if (!el) return false
  const tag = el.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true
  if (el.isContentEditable) return true
  return false
}

export function isHelpOverlayOpen() {
  return !!(panelEl && panelEl.classList.contains('open'))
}

export function openHelpOverlay() {
  if (!panelEl || !backdropEl) return
  panelEl.classList.add('open')
  backdropEl.classList.add('open')
}

export function closeHelpOverlay() {
  if (!panelEl || !backdropEl) return
  panelEl.classList.remove('open')
  backdropEl.classList.remove('open')
}

export function toggleHelpOverlay() {
  if (isHelpOverlayOpen()) closeHelpOverlay()
  else openHelpOverlay()
}

export function initHelpOverlay() {
  if (initialized) return
  initialized = true
  panelEl = document.getElementById('help-overlay')
  backdropEl = document.getElementById('help-backdrop')
  if (!panelEl || !backdropEl) return

  const btnClose = document.getElementById('help-overlay-close')
  if (btnClose) btnClose.addEventListener('click', closeHelpOverlay)
  backdropEl.addEventListener('click', closeHelpOverlay)

  window.addEventListener('keydown', (e) => {
    if (isEditable(e.target)) return
    if (e.key === 'h' || e.key === 'H') {
      e.preventDefault()
      toggleHelpOverlay()
      return
    }
    if (e.key === 'Escape' && isHelpOverlayOpen()) {
      e.preventDefault()
      e.stopPropagation()
      closeHelpOverlay()
    }
  }, true)
}
