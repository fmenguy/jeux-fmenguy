// ============================================================================
// Overlay d'aide (touche H). Refonte U4 style Clair Obscur.
// Layout deux colonnes, rubriques selectionnables a gauche, contenu a droite.
// Le tick du jeu est mis en pause tant que l'overlay est ouvert (via
// isHelpOverlayOpen() appele depuis main.js).
// ============================================================================

let initialized = false
let backdropEl = null
let panelEl = null
let menuEl = null
let contentEl = null

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
  // S'assurer qu'une rubrique est selectionnee (Camera par defaut).
  if (menuEl && !menuEl.querySelector('.ho-menu-item.active')) {
    const first = menuEl.querySelector('.ho-menu-item')
    if (first) selectTopic(first.dataset.topic)
  }
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

function selectTopic(topic) {
  if (!topic || !menuEl || !contentEl) return
  const items = menuEl.querySelectorAll('.ho-menu-item')
  for (const it of items) {
    if (it.dataset.topic === topic) it.classList.add('active')
    else it.classList.remove('active')
  }
  const sections = contentEl.querySelectorAll('section[data-topic]')
  for (const s of sections) {
    if (s.dataset.topic === topic) s.removeAttribute('hidden')
    else s.setAttribute('hidden', '')
  }
  // Remonte le scroll de la zone de contenu.
  contentEl.scrollTop = 0
}

export function initHelpOverlay() {
  if (initialized) return
  initialized = true
  panelEl = document.getElementById('help-overlay')
  backdropEl = document.getElementById('help-backdrop')
  menuEl = document.getElementById('ho-menu')
  contentEl = document.getElementById('ho-content')
  if (!panelEl || !backdropEl) return

  const btnClose = document.getElementById('help-overlay-close')
  if (btnClose) btnClose.addEventListener('click', closeHelpOverlay)
  backdropEl.addEventListener('click', closeHelpOverlay)

  // Selection de rubrique par clic sur un bouton du menu.
  if (menuEl) {
    menuEl.addEventListener('click', (e) => {
      const btn = e.target && e.target.closest ? e.target.closest('.ho-menu-item') : null
      if (!btn) return
      const topic = btn.dataset.topic
      if (topic) selectTopic(topic)
    })
  }

  // Rubrique par defaut : Camera.
  selectTopic('camera')

  window.addEventListener('keydown', (e) => {
    if (isEditable(e.target)) return
    if (e.key === 'h' || e.key === 'H') {
      e.preventDefault()
      toggleHelpOverlay()
    }
  })
}
