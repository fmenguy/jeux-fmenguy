// ============================================================================
// tutorial.js  — Onboarding séquentiel 4 étapes
//
// Bulles dorées positionnées sur l'élément ciblé, avancement par événement
// ou clic. Ne se relance pas si localStorage['strates.tutoDone'] est défini.
// ============================================================================

const STORAGE_KEY = 'strates.tutoDone'

// Chaque étape :
//   sel       — sélecteur CSS de l'élément ciblé (peut n'exister qu'après une action)
//   fallbackSel — sélecteur de repli si l'élément n'est pas encore dans le DOM
//   text      — contenu de la bulle
//   kind      — 'click' | 'event'
//   clickSel  — sélecteur pour la délégation de clic (kind=click)
//   event     — nom de l'événement custom (kind=event)
//   filter    — prédicat sur l'événement (kind=event), null = toujours vrai
const STEPS = [
  {
    sel:        '#btn-open-techtree',
    text:       "Ouvre l'arbre des technologies",
    kind:       'click',
    clickSel:   '#btn-open-techtree',
  },
  {
    sel:        '.ttp-branch[data-br="savoir"]',
    fallbackSel:'#ttp-root',
    text:       'Explore la branche Savoir',
    kind:       'click',
    clickSel:   '.ttp-branch[data-br="savoir"]',
  },
  {
    sel:        '.ttp-tech[data-id="basic-research"]',
    fallbackSel:'#ttp-root',
    text:       "Débloque la Recherche de base — c'est gratuit !",
    kind:       'event',
    event:      'strates:techComplete',
    filter:     e => e.detail && e.detail.id === 'basic-research',
  },
  {
    sel:        '[data-tool="place-research"]',
    fallbackSel:'.ab-body#ab-build',
    text:       'Place ta Hutte du Sage sur le terrain',
    kind:       'event',
    event:      'strates:buildingPlaced',
    filter:     e => e.detail && e.detail.type === 'research',
  },
]

let currentStep = 0
let ring = null
let bubble = null
let posTimer = null
let cleanupFn = null

function injectStyles() {
  if (document.getElementById('tuto-style')) return
  const s = document.createElement('style')
  s.id = 'tuto-style'
  s.textContent = `
@keyframes tuto-pulse {
  0%   { box-shadow: 0 0 0 0   rgba(200,168,75,.0); }
  50%  { box-shadow: 0 0 0 6px rgba(200,168,75,.4); }
  100% { box-shadow: 0 0 0 0   rgba(200,168,75,.0); }
}
.tuto-ring {
  position: fixed;
  border: 2px solid #c8a84b;
  border-radius: 6px;
  pointer-events: none;
  z-index: 9000;
  animation: tuto-pulse 1.4s ease-in-out infinite;
  transition: top .2s, left .2s, width .2s, height .2s;
}
.tuto-bubble {
  position: fixed;
  z-index: 9001;
  background: #1c1a14;
  color: #e8dfc8;
  border: 1px solid #c8a84b;
  border-radius: 6px;
  padding: 10px 14px 10px 12px;
  font-family: "JetBrains Mono", ui-monospace, monospace;
  font-size: 11.5px;
  line-height: 1.45;
  max-width: 240px;
  box-shadow: 0 4px 18px rgba(0,0,0,.55);
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.tuto-bubble::before {
  content: '';
  position: absolute;
  width: 8px; height: 8px;
  background: #1c1a14;
  border: 1px solid #c8a84b;
  transform: rotate(45deg);
}
.tuto-bubble.arrow-top::before {
  top: -5px; left: 18px;
  border-bottom: none; border-right: none;
}
.tuto-bubble.arrow-bottom::before {
  bottom: -5px; left: 18px;
  border-top: none; border-left: none;
}
.tuto-bubble-text {
  color: #e8dfc8;
  font-size: 11.5px;
}
.tuto-step-label {
  font-size: 9px;
  letter-spacing: .14em;
  text-transform: uppercase;
  color: #c8a84b;
  opacity: .8;
}
.tuto-skip {
  position: fixed;
  bottom: 18px;
  right: 18px;
  z-index: 9002;
  background: transparent;
  border: 1px solid rgba(200,168,75,.3);
  border-radius: 4px;
  color: rgba(200,168,75,.5);
  font-family: "JetBrains Mono", ui-monospace, monospace;
  font-size: 9px;
  letter-spacing: .1em;
  text-transform: uppercase;
  padding: 5px 10px;
  cursor: pointer;
  transition: color .15s, border-color .15s;
}
.tuto-skip:hover { color: #c8a84b; border-color: #c8a84b; }
`
  document.head.appendChild(s)
}

function createElements() {
  ring = document.createElement('div')
  ring.className = 'tuto-ring'
  document.body.appendChild(ring)

  bubble = document.createElement('div')
  bubble.className = 'tuto-bubble'
  document.body.appendChild(bubble)

  const skip = document.createElement('button')
  skip.className = 'tuto-skip'
  skip.textContent = 'Passer le tuto'
  skip.addEventListener('click', finishTutorial)
  document.body.appendChild(skip)
}

function getTarget(step) {
  let el = document.querySelector(step.sel)
  if (!el && step.fallbackSel) el = document.querySelector(step.fallbackSel)
  return el
}

function positionOnTarget(step) {
  const el = getTarget(step)
  if (!el || !ring || !bubble) return

  const r = el.getBoundingClientRect()
  const PAD = 5

  ring.style.top    = (r.top  - PAD) + 'px'
  ring.style.left   = (r.left - PAD) + 'px'
  ring.style.width  = (r.width  + PAD * 2) + 'px'
  ring.style.height = (r.height + PAD * 2) + 'px'
  ring.style.display = 'block'

  // Bulle : au-dessus si assez de place, sinon en dessous
  const bubH = 80
  const spaceAbove = r.top - PAD
  const above = spaceAbove >= bubH + 16

  bubble.className = 'tuto-bubble ' + (above ? 'arrow-bottom' : 'arrow-top')
  bubble.style.left = Math.max(8, r.left - PAD) + 'px'

  if (above) {
    bubble.style.top = ''
    bubble.style.bottom = (window.innerHeight - r.top + PAD + 10) + 'px'
  } else {
    bubble.style.bottom = ''
    bubble.style.top = (r.bottom + PAD + 10) + 'px'
  }
  bubble.style.display = 'flex'
}

function showStep(idx) {
  if (idx >= STEPS.length) { finishTutorial(); return }
  currentStep = idx
  const step = STEPS[idx]

  if (bubble) {
    bubble.innerHTML =
      '<span class="tuto-step-label">Étape ' + (idx + 1) + '/' + STEPS.length + '</span>' +
      '<span class="tuto-bubble-text">' + step.text + '</span>'
  }

  positionOnTarget(step)

  if (cleanupFn) { cleanupFn(); cleanupFn = null }

  if (step.kind === 'click') {
    const handler = e => {
      if (e.target.closest(step.clickSel)) {
        cleanupFn = null
        document.removeEventListener('click', handler, true)
        showStep(idx + 1)
      }
    }
    document.addEventListener('click', handler, true)
    cleanupFn = () => document.removeEventListener('click', handler, true)
  } else {
    const handler = e => {
      if (!step.filter || step.filter(e)) {
        cleanupFn = null
        window.removeEventListener(step.event, handler)
        showStep(idx + 1)
      }
    }
    window.addEventListener(step.event, handler)
    cleanupFn = () => window.removeEventListener(step.event, handler)
  }
}

function finishTutorial() {
  try { localStorage.setItem(STORAGE_KEY, '1') } catch (e) {}
  if (cleanupFn) { cleanupFn(); cleanupFn = null }
  if (posTimer) { clearInterval(posTimer); posTimer = null }
  if (ring)   ring.remove()
  if (bubble) bubble.remove()
  const skip = document.querySelector('.tuto-skip')
  if (skip) skip.remove()
  ring = null; bubble = null
}

export function initTutorial() {
  try { if (localStorage.getItem(STORAGE_KEY)) return } catch (e) {}

  injectStyles()
  createElements()

  // Reposition toutes les 400ms (cibles apparaissent en lazy)
  posTimer = setInterval(() => {
    if (currentStep < STEPS.length) positionOnTarget(STEPS[currentStep])
  }, 400)

  window.addEventListener('resize', () => {
    if (currentStep < STEPS.length) positionOnTarget(STEPS[currentStep])
  })

  showStep(0)
}
