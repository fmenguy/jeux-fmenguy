// ============================================================================
// tutorial.js — Onboarding séquentiel + bulle d'invitation différée
//
// Flux normal :
//   initTutoInvite() appelé au démarrage. Si aucun flag localStorage bloquant,
//   démarre un timer 60s d'inactivité. Actions significatives (strates:* et clics
//   actionbar) réinitialisent le timer. Au bout de 60s : bulle d'invitation.
//
// Bulle d'invitation :
//   [▶ Lancer le tuto] → lance le Tuto (7 étapes).
//   [✕] → pose localStorage['strates.tutoSkipped'], ne plus jamais afficher.
//
// showTutoInvite() : force l'affichage de la bulle, ignore les flags. Utile
//   pour le bouton "Tutoriel" dans le menu pause.
//
// Tuto (7 étapes) : intro → tech tree → branche Savoir → Recherche de base →
//   bouton Retour → onglet Construire → placement Hutte du Sage.
// ============================================================================

import { state } from '../state.js'

// IDs des techs bâtiment payantes qui déclenchent le tuto Constructeur.
const BUILDER_TUTO_TRIGGER_TECHS = new Set(['big-house', 'astronomy-1'])

// ─── Étapes ──────────────────────────────────────────────────────────────────

// kind:
//   'click'            — e.target.closest(clickSel) avance
//   'event'            — window event(event) + filter avance
//   'click-or-timeout' — click ou timeout (ms) avance
//
// autoWhen (optionnel) — () => bool, évalué toutes les 400ms.

const TUTO_STEPS = [
  {
    label:    'Tuto · 1/6',
    sel:      '#btn-open-techtree',
    text:     "Ouvre l'arbre des technologies",
    kind:     'click',
    clickSel: '#btn-open-techtree',
  },
  {
    label:    'Tuto · 2/6',
    sel:      '.ttp-branch[data-br="savoir"]',
    fallback: '#ttp-root',
    text:     'Explore la branche Savoir',
    kind:     'click',
    clickSel: '.ttp-branch[data-br="savoir"]',
  },
  {
    label:    'Tuto · 3/6',
    sel:      '.ttp-tech[data-id="basic-research"]',
    fallback: '#ttp-root',
    text:     "Débloque la Recherche de base, c'est gratuit !",
    kind:     'event',
    event:    'strates:techComplete',
    filter:   e => e.detail && e.detail.id === 'basic-research',
  },
  {
    label:    'Tuto · 4/6',
    sel:      '#ttp-back',
    fallback: '#ttp-root',
    text:     'Clique sur Retour pour revenir au jeu',
    kind:     'event',
    event:    'strates:techtreeClosed',
    autoWhen: () => {
      const el = document.getElementById('ttp-root')
      return !el || !el.classList.contains('open')
    },
  },
  {
    label:    'Tuto · 5/6',
    sel:      '.ab-tab[data-tab="build"]',
    text:     'Ouvre le menu Construire',
    kind:     'click',
    clickSel: '.ab-tab[data-tab="build"]',
    autoWhen: () => {
      const tab = document.querySelector('.ab-tab[data-tab="build"]')
      return !!(tab && tab.classList.contains('active'))
    },
  },
  {
    label:    'Tuto · 6/6',
    sel:      '[data-tool="place-research"]',
    fallback: '.ab-body#ab-build',
    text:     'Place la Hutte du Sage pour générer des points de recherche !',
    kind:     'event',
    event:    'strates:buildingPlaced',
    filter:   e => e.detail && e.detail.type === 'research',
    autoWhen: () => !!(state.researchHouses && state.researchHouses.length > 0),
  },
]

// ─── Styles ───────────────────────────────────────────────────────────────────

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
@keyframes tuto-flash-in {
  from { opacity: 0; transform: translateY(-8px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes tuto-invite-in {
  from { opacity: 0; transform: translateY(-8px); }
  to   { opacity: 1; transform: translateY(0); }
}
.tuto-ring {
  position: fixed;
  border: 2px solid #c8a84b;
  border-radius: 6px;
  pointer-events: none;
  z-index: 9000;
  animation: tuto-pulse 1.4s ease-in-out infinite;
  transition: top .18s, left .18s, width .18s, height .18s;
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
.tuto-step-label {
  font-size: 9px;
  letter-spacing: .14em;
  text-transform: uppercase;
  color: #c8a84b;
  opacity: .8;
}

.tuto-flash {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 9010;
  background: #1c1a14;
  border: 1.5px solid #c8a84b;
  border-radius: 8px;
  padding: 16px 32px;
  font-family: "JetBrains Mono", ui-monospace, monospace;
  font-size: 18px;
  color: #c8a84b;
  letter-spacing: .1em;
  box-shadow: 0 8px 32px rgba(0,0,0,.7);
  animation: tuto-flash-in .3s ease-out;
  pointer-events: none;
}
.tuto-invite {
  position: fixed;
  top: 80px;
  left: 16px;
  z-index: 9003;
  background: #1c1a14;
  border: 1px solid #c8a84b;
  border-radius: 8px;
  padding: 13px 15px 12px;
  font-family: "JetBrains Mono", ui-monospace, monospace;
  color: #e8dfc8;
  box-shadow: 0 4px 24px rgba(0,0,0,.7);
  display: flex;
  flex-direction: column;
  gap: 10px;
  animation: tuto-invite-in .3s ease-out;
  min-width: 190px;
}
.tuto-invite-title {
  font-size: 12px;
  color: #c8a84b;
  letter-spacing: .04em;
}
.tuto-invite-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.tuto-invite-start {
  flex: 1;
  background: transparent;
  border: 1px solid #c8a84b;
  border-radius: 4px;
  color: #c8a84b;
  font-family: "JetBrains Mono", ui-monospace, monospace;
  font-size: 10px;
  letter-spacing: .06em;
  padding: 5px 10px;
  cursor: pointer;
  animation: tuto-pulse 1.4s ease-in-out infinite;
  transition: background .15s;
}
.tuto-invite-start:hover { background: rgba(200,168,75,.12); }
.tuto-invite-dismiss {
  background: transparent;
  border: none;
  color: rgba(200,168,75,.45);
  font-size: 15px;
  line-height: 1;
  cursor: pointer;
  padding: 2px 4px;
  border-radius: 3px;
  transition: color .15s;
  flex-shrink: 0;
}
.tuto-invite-dismiss:hover { color: #c8a84b; }
`
  document.head.appendChild(s)
}

// ─── Moteur générique ─────────────────────────────────────────────────────────

function runTutorial(steps, storageKey, onComplete, skipBtn) {
  try { if (localStorage.getItem(storageKey)) { onComplete && onComplete(); return } } catch (e) {}

  let currentIdx = 0
  let cleanupFn = null
  let timeoutId = null

  const ring = document.createElement('div')
  ring.className = 'tuto-ring'
  document.body.appendChild(ring)

  const bubble = document.createElement('div')
  bubble.className = 'tuto-bubble'
  document.body.appendChild(bubble)

  function getTarget(step) {
    return document.querySelector(step.sel) || (step.fallback && document.querySelector(step.fallback)) || null
  }

  function reposition() {
    const step = steps[currentIdx]
    if (!step) return

    if (step.autoWhen && step.autoWhen()) { advance(); return }

    const el = getTarget(step)
    if (!el) return

    const r   = el.getBoundingClientRect()
    const PAD = 5
    const showRing = !step.ringGuard || step.ringGuard()

    if (showRing) {
      ring.style.cssText = [
        'top:'    + (r.top  - PAD) + 'px',
        'left:'   + (r.left - PAD) + 'px',
        'width:'  + (r.width  + PAD * 2) + 'px',
        'height:' + (r.height + PAD * 2) + 'px',
        'display:block',
      ].join(';')
    } else {
      ring.style.display = 'none'
    }

    const above = r.top - PAD >= 100
    bubble.className = 'tuto-bubble ' + (above ? 'arrow-bottom' : 'arrow-top')
    bubble.style.left    = Math.max(8, r.left - PAD) + 'px'
    bubble.style.display = 'flex'

    if (above) {
      bubble.style.top    = ''
      bubble.style.bottom = (window.innerHeight - r.top + PAD + 10) + 'px'
    } else {
      bubble.style.bottom = ''
      bubble.style.top    = (r.bottom + PAD + 10) + 'px'
    }
  }

  function advance() {
    if (cleanupFn) { cleanupFn(); cleanupFn = null }
    if (timeoutId) { clearTimeout(timeoutId); timeoutId = null }
    currentIdx++
    if (currentIdx >= steps.length) { teardown(true); return }
    showStep(currentIdx)
  }

  function teardown(completed) {
    if (cleanupFn) { cleanupFn(); cleanupFn = null }
    if (timeoutId) { clearTimeout(timeoutId); timeoutId = null }
    clearInterval(posTimer)
    ring.remove()
    bubble.remove()
    if (completed) {
      try { localStorage.setItem(storageKey, '1') } catch (e) {}
      onComplete && onComplete()
    }
  }

  function showStep(idx) {
    const step = steps[idx]
    bubble.innerHTML =
      '<span class="tuto-step-label">' + step.label + '</span>' +
      '<span>' + step.text + '</span>'

    ring.style.display = 'none'
    reposition()
    ring.style.display = 'none'
    requestAnimationFrame(() => requestAnimationFrame(reposition))

    if (cleanupFn) { cleanupFn(); cleanupFn = null }
    if (timeoutId) { clearTimeout(timeoutId); timeoutId = null }

    if (step.kind === 'click' || step.kind === 'click-or-timeout') {
      const handler = e => {
        if (e.target.closest(step.clickSel)) {
          document.removeEventListener('click', handler, true)
          cleanupFn = null
          advance()
        }
      }
      document.addEventListener('click', handler, true)
      cleanupFn = () => document.removeEventListener('click', handler, true)

      if (step.kind === 'click-or-timeout' && step.timeout) {
        timeoutId = setTimeout(() => { timeoutId = null; advance() }, step.timeout)
      }
    } else {
      const handler = e => {
        if (!step.filter || step.filter(e)) {
          window.removeEventListener(step.event, handler)
          cleanupFn = null
          advance()
        }
      }
      window.addEventListener(step.event, handler)
      cleanupFn = () => window.removeEventListener(step.event, handler)
    }
  }

  const posTimer = setInterval(reposition, 400)
  window.addEventListener('resize', reposition)

  if (skipBtn) {
    skipBtn.onclick = () => { teardown(false); try { localStorage.setItem(storageKey, '1') } catch (e) {} }
  }

  showStep(0)

  return { teardown }
}

// ─── Tuto Constructeur (déclenché à la 1ère tech bâtiment payante) ────────────

const BUILDER_TUTO_STEPS = [
  {
    label:    'Constructeur · 1/3',
    sel:      '.rail-btn[data-panel="population"]',
    text:     'Vos bâtiments doivent être construits par un colon. Ouvrez la vue Population.',
    kind:     'event',
    event:    'strates:populationOpen',
    autoWhen: () => {
      const el = document.getElementById('popPanel')
      return !!(el && el.classList.contains('open'))
    },
  },
  {
    label:    'Constructeur · 2/3',
    sel:      '.pv2-tab[data-tab="metiers"]',
    fallback: '#popPanel',
    text:     'Cliquez sur Métiers, puis sur Constructeur pour assigner un colon. Plus son niveau est haut, plus il construit vite.',
    kind:     'click-or-timeout',
    clickSel: '.pv2-job-card[data-job-id="constructeur"], .pv2-tab[data-tab="metiers"]',
    timeout:  60000,
    autoWhen: () => {
      const card = document.querySelector('.pv2-job-card[data-job-id="constructeur"]')
      return !!(card && card.classList.contains('open'))
    },
  },
  {
    label:    'Constructeur · 3/3',
    sel:      '.pv2-job-card[data-job-id="constructeur"]',
    fallback: '#popPanel',
    text:     'Assignez un colon. Le tuto se ferme dès qu un Constructeur est en poste.',
    kind:     'click-or-timeout',
    clickSel: '.pv2-job-action[data-job-id="constructeur"]',
    timeout:  120000,
    autoWhen: () => {
      return !!(state.colonists && state.colonists.some(c => c.assignedJob === 'builder'))
    },
  },
]

let builderTutoActive = false

function builderTutoDone() {
  try { return !!localStorage.getItem('strates.builderTutoDone') } catch (e) { return false }
}

function maybeRunBuilderTuto() {
  if (builderTutoActive || builderTutoDone()) return
  injectStyles()
  builderTutoActive = true
  try {
    runTutorial(BUILDER_TUTO_STEPS, 'strates.builderTutoDone', () => {
      builderTutoActive = false
      showFlash('Constructeur en poste !')
    })
  } catch (e) { builderTutoActive = false }
}

window.addEventListener('strates:techComplete', e => {
  const id = e && e.detail && e.detail.id
  if (id && BUILDER_TUTO_TRIGGER_TECHS.has(id)) {
    setTimeout(maybeRunBuilderTuto, 400)
  }
})

// ─── Flash de fin ─────────────────────────────────────────────────────────────

function showFlash(text) {
  const el = document.createElement('div')
  el.className = 'tuto-flash'
  el.textContent = text
  document.body.appendChild(el)
  setTimeout(() => el.remove(), 2000)
}

// ─── Lancement des tutos (réutilisé par l'invite et le bouton manuel) ─────────

function runTutorials() {
  injectStyles()
  isTutoActive = true
  stopInactivityTimer()
  removeInviteBubble()

  function onTutoDone() {
    isTutoActive = false
    showFlash("C'est parti !")
  }

  try {
    runTutorial(TUTO_STEPS, 'strates.tutoDone', onTutoDone)
  } catch (e) {}
}

// ─── Bulle d'invitation ───────────────────────────────────────────────────────

let inviteEl = null

function removeInviteBubble() {
  if (inviteEl) { inviteEl.remove(); inviteEl = null }
}

function showInviteBubble() {
  if (tutosDone() || isTutoActive) { stopInactivityTimer(); return }
  stopInactivityTimer()
  if (inviteEl) return
  injectStyles()

  inviteEl = document.createElement('div')
  inviteEl.className = 'tuto-invite'
  inviteEl.innerHTML =
    '<div class="tuto-invite-title">&#128161; Tu débutes ?</div>' +
    '<div class="tuto-invite-row">' +
    '  <button class="tuto-invite-start">&#9654; Lancer le tuto</button>' +
    '  <button class="tuto-invite-dismiss" title="Ne plus afficher">&#10005;</button>' +
    '</div>'
  document.body.appendChild(inviteEl)

  inviteEl.querySelector('.tuto-invite-start').onclick = () => {
    removeInviteBubble()
    runTutorials()
  }
  inviteEl.querySelector('.tuto-invite-dismiss').onclick = () => {
    removeInviteBubble()
    try { localStorage.setItem('strates.tutoSkipped', '1') } catch (e) {}
  }
}

// ─── Flag d'activité tuto ─────────────────────────────────────────────────────

let isTutoActive = false

// ─── Timer d'inactivité ───────────────────────────────────────────────────────

const INACTIVITY_DELAY = 60_000
const STRATES_EVENTS = [
  'strates:buildingPlaced',
  'strates:techComplete',
  'strates:techtreeClosed',
  'strates:firstHarvestZone',
  'strates:toggleTechTree',
  'strates:populationOpen',
  'strates:questAccepted',
]

let inactivityTimer = null

function tutosDone() {
  try {
    if (localStorage.getItem('strates.tutoSkipped')) return true
    if (localStorage.getItem('strates.tutoDone')) return true
  } catch (e) {}
  return false
}

function resetInactivityTimer() {
  clearTimeout(inactivityTimer)
  if (tutosDone() || isTutoActive) { inactivityTimer = null; return }
  inactivityTimer = setTimeout(showInviteBubble, INACTIVITY_DELAY)
}

function stopInactivityTimer() {
  clearTimeout(inactivityTimer)
  inactivityTimer = null
}

// ─── Point d'entrée ───────────────────────────────────────────────────────────

function isPartieAvancee() {
  return (
    (state.researchHouses && state.researchHouses.length > 0) ||
    (state.colonists && state.colonists.length > 5) ||
    (state.currentAge && state.currentAge > 1)
  )
}

export function initTutoInvite() {
  if (tutosDone()) return
  if (isPartieAvancee()) return

  // Première visite : afficher le popup après 4s sans attendre l'inactivité
  setTimeout(showInviteBubble, 4000)

  // Timer d'inactivité 60s en secours (si le popup a été fermé sans répondre)
  STRATES_EVENTS.forEach(ev => window.addEventListener(ev, resetInactivityTimer))
  document.addEventListener('click', (e) => {
    if (e.target.closest('.ab-tab') || e.target.closest('.tool') || e.target.closest('.rail-btn')) {
      resetInactivityTimer()
    }
  }, true)

  resetInactivityTimer()
}

// Force l'affichage de la bulle d'invitation, ignore les flags localStorage.
// Appelé par le bouton "Tutoriel" du menu pause.
export function showTutoInvite() {
  injectStyles()
  removeInviteBubble()
  showInviteBubble()
}
