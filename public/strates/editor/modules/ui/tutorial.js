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
    fallback: '.ab-tools#ab-build',
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
  padding: 14px 18px;
  font-family: "JetBrains Mono", ui-monospace, monospace;
  font-size: 11.5px;
  line-height: 1.5;
  min-width: 280px;
  max-width: 340px;
  box-sizing: border-box;
  word-wrap: break-word;
  overflow-wrap: break-word;
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
.tuto-bubble.arrow-top.right-aligned::before {
  left: auto; right: 18px;
}
.tuto-bubble.arrow-bottom.right-aligned::before {
  left: auto; right: 18px;
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
.tuto-info-next {
  align-self: flex-end;
  margin-top: 4px;
  background: transparent;
  border: 1px solid #c8a84b;
  border-radius: 4px;
  color: #c8a84b;
  font-family: "JetBrains Mono", ui-monospace, monospace;
  font-size: 10px;
  letter-spacing: .06em;
  padding: 4px 11px;
  cursor: pointer;
  transition: background .15s;
}
.tuto-info-next:hover { background: rgba(200,168,75,.14); }
.tuto-info-bubble.centered {
  max-width: 320px;
  text-align: center;
  align-items: center;
}
.tuto-info-bubble.centered::before { display: none; }
`
  document.head.appendChild(s)
}

// ─── Moteur générique ─────────────────────────────────────────────────────────

function sweepOrphanTutoElements() {
  document.querySelectorAll('.tuto-ring, .tuto-bubble').forEach(el => el.remove())
}

// Place une bulle .tuto-bubble par rapport au rect d ancrage. Bascule à droite
// si la bulle déborderait du viewport, et choisit dessus/dessous selon la
// hauteur disponible. Ajoute/retire les classes arrow-top/arrow-bottom et
// right-aligned pour que la flèche pointe au bon endroit.
function placeBubbleNearRect(bubble, r, baseClass, PAD) {
  const vw = window.innerWidth
  const vh = window.innerHeight
  const bw = bubble.offsetWidth || 320
  const bh = bubble.offsetHeight || 120
  const above = (r.top - PAD - bh - 14) >= 8 && r.top - PAD >= 200
  const arrowCls = above ? 'arrow-bottom' : 'arrow-top'
  // Décide alignement gauche/droite selon dépassement du viewport
  const wantLeft = r.left - PAD
  const overflowsRight = wantLeft + bw > vw - 8
  let alignCls = ''
  bubble.style.transform = ''
  if (overflowsRight) {
    bubble.style.left = ''
    bubble.style.right = Math.max(8, vw - r.right - PAD) + 'px'
    alignCls = ' right-aligned'
  } else {
    bubble.style.right = ''
    bubble.style.left = Math.max(8, wantLeft) + 'px'
  }
  bubble.className = baseClass + ' ' + arrowCls + alignCls
  bubble.style.display = 'flex'
  if (above) {
    bubble.style.top = ''
    bubble.style.bottom = (vh - r.top + PAD + 10) + 'px'
  } else {
    bubble.style.bottom = ''
    bubble.style.top = (r.bottom + PAD + 10) + 'px'
  }
}

function runTutorial(steps, storageKey, onComplete, skipBtn) {
  try { if (localStorage.getItem(storageKey)) { onComplete && onComplete(); return } } catch (e) {}

  // Avant de créer un nouveau ring/bubble, balayer les orphelins éventuels
  // d'un précédent tuto qui aurait fui (skip, double trigger, hot-reload).
  sweepOrphanTutoElements()

  let currentIdx = 0
  let cleanupFn = null
  let timeoutId = null
  let stepRepositionTimers = []
  let torndown = false

  function clearStepRepositionTimers() {
    for (const t of stepRepositionTimers) clearTimeout(t)
    stepRepositionTimers = []
  }

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
    if (torndown) return
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

    placeBubbleNearRect(bubble, r, 'tuto-bubble', PAD)
  }

  function advance() {
    if (cleanupFn) { cleanupFn(); cleanupFn = null }
    if (timeoutId) { clearTimeout(timeoutId); timeoutId = null }
    currentIdx++
    if (currentIdx >= steps.length) { teardown(true); return }
    showStep(currentIdx)
  }

  function teardown(completed) {
    if (torndown) return
    torndown = true
    if (cleanupFn) { cleanupFn(); cleanupFn = null }
    if (timeoutId) { clearTimeout(timeoutId); timeoutId = null }
    clearStepRepositionTimers()
    clearInterval(posTimer)
    window.removeEventListener('resize', reposition)
    // Force display:none avant remove pour neutraliser instantanément le rendu.
    ring.style.display = 'none'
    bubble.style.display = 'none'
    ring.remove()
    bubble.remove()
    // Sécurité : balayer aussi les éventuels orphelins (autre instance, hot reload).
    sweepOrphanTutoElements()
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

    // Couvre les transitions CSS de l UI cible (ex : transform 0.4s du
    // ttp-branch-canvas quand on entre dans une branche du tech tree).
    // Sans ces tirs, le ring du step suivant se positionne au milieu de
    // la transition et reste decale jusqu au prochain setInterval.
    clearStepRepositionTimers()
    for (const ms of [80, 200, 400, 600, 900]) {
      stepRepositionTimers.push(setTimeout(reposition, ms))
    }

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

// ─── Tour de l interface (déclenché à la fin du tuto principal) ───────────────
//
// Pure information : chaque étape avance via un bouton "Suivant" dans la bulle
// (pas d action gameplay attendue). Highlight le DOM ciblé via le ring habituel.
// La dernière étape n a pas de cible : bulle centrée + bouton "Terminer".

const INTERFACE_TOUR_STEPS = [
  {
    label: 'Interface · 1/6',
    sel:   '#btn-cell-info',
    text:  'Cliquez sur la loupe pour consulter les données de la carte : ressources, biomes, météo.',
  },
  {
    label: 'Interface · 2/6',
    sel:   '#daynight-pill',
    text:  'Bascule jour ↔ nuit (touche N). La nuit, vos chercheurs assignés à un promontoire génèrent des points nocturnes 🌙 pour débloquer des techs spéciales.',
  },
  {
    label: 'Interface · 3/6',
    sel:   '.actionbar .ab-tabs',
    fallback: '.ab-tabs',
    text:  'Trois modes d interaction : Naviguer pour observer, Récoltes pour assigner des tâches, Construire pour poser des bâtiments.',
  },
  {
    label: 'Interface · 4/6',
    sel:   '.topbar .center',
    fallback: '.topbar',
    text:  'Vos ressources collectées en temps réel : 🪵 Bois, 🪨 Pierre, 🫐 Baies et toutes les autres.',
  },
  {
    label: 'Interface · 5/6',
    sels:  ['#btn-help', '#btn-save'],
    fallback: '#btn-help',
    text:  'Sauvegardez votre progression à tout moment avec 💾. Le bouton ? contient la description complète du jeu.',
  },
  {
    label: 'Interface · 6/6',
    sel:   null,
    text:  'Tout est décrit dans le menu d aide. Bonne aventure !',
  },
]

// Moteur mixte : par défaut chaque étape avance via un bouton "Suivant".
// Si une étape déclare step.kind ('event' | 'click' | 'click-or-timeout'),
// elle attend l action gameplay correspondante (comme runTutorial). Dans ce
// cas pas de bouton Suivant. step.autoWhen() peut aussi auto-avancer.
function runInfoTour(steps, storageKey, onComplete) {
  try { if (localStorage.getItem(storageKey)) { onComplete && onComplete(); return } } catch (e) {}
  sweepOrphanTutoElements()

  let currentIdx = 0
  let torndown = false
  let cleanupFn = null
  let timeoutId = null

  const ring = document.createElement('div')
  ring.className = 'tuto-ring'
  document.body.appendChild(ring)

  const bubble = document.createElement('div')
  bubble.className = 'tuto-bubble tuto-info-bubble'
  document.body.appendChild(bubble)

  function reposition() {
    if (torndown) return
    const step = steps[currentIdx]
    if (!step) return

    if (step.autoWhen && step.autoWhen()) { advance(); return }

    if (!step.sel && !step.sels) {
      // Bulle centrée, pas de ring
      ring.style.display = 'none'
      bubble.className = 'tuto-bubble tuto-info-bubble centered'
      bubble.style.left = '50%'
      bubble.style.top = '50%'
      bubble.style.right = ''
      bubble.style.bottom = ''
      bubble.style.transform = 'translate(-50%, -50%)'
      bubble.style.display = 'flex'
      return
    }

    // Cible(s) : sels (multi) prioritaire, sinon sel + fallback. Pour sels,
    // on calcule le bounding rect englobant tous les éléments présents.
    let r = null
    if (Array.isArray(step.sels)) {
      const els = step.sels.map(s => document.querySelector(s)).filter(Boolean)
      if (els.length === 0) { ring.style.display = 'none'; return }
      const rects = els.map(e => e.getBoundingClientRect())
      const minLeft = Math.min(...rects.map(rc => rc.left))
      const minTop  = Math.min(...rects.map(rc => rc.top))
      const maxRight  = Math.max(...rects.map(rc => rc.right))
      const maxBottom = Math.max(...rects.map(rc => rc.bottom))
      r = { left: minLeft, top: minTop, right: maxRight, bottom: maxBottom,
            width: maxRight - minLeft, height: maxBottom - minTop }
    } else {
      const el = document.querySelector(step.sel) || (step.fallback && document.querySelector(step.fallback))
      if (!el) { ring.style.display = 'none'; return }
      r = el.getBoundingClientRect()
    }
    const PAD = 6
    ring.style.cssText = [
      'top:'    + (r.top  - PAD) + 'px',
      'left:'   + (r.left - PAD) + 'px',
      'width:'  + (r.width  + PAD * 2) + 'px',
      'height:' + (r.height + PAD * 2) + 'px',
      'display:block',
    ].join(';')

    placeBubbleNearRect(bubble, r, 'tuto-bubble tuto-info-bubble', PAD)
  }

  function teardown(completed) {
    if (torndown) return
    torndown = true
    if (cleanupFn) { cleanupFn(); cleanupFn = null }
    if (timeoutId) { clearTimeout(timeoutId); timeoutId = null }
    clearInterval(posTimer)
    window.removeEventListener('resize', reposition)
    ring.style.display = 'none'
    bubble.style.display = 'none'
    ring.remove()
    bubble.remove()
    sweepOrphanTutoElements()
    if (completed) {
      try { localStorage.setItem(storageKey, '1') } catch (e) {}
      onComplete && onComplete()
    }
  }

  function advance() {
    if (torndown) return
    if (cleanupFn) { cleanupFn(); cleanupFn = null }
    if (timeoutId) { clearTimeout(timeoutId); timeoutId = null }
    currentIdx++
    if (currentIdx >= steps.length) { teardown(true); return }
    showStep(currentIdx)
  }

  function showStep(idx) {
    const step = steps[idx]
    const isLast = idx === steps.length - 1
    const isInteractive = !!step.kind

    let inner =
      '<span class="tuto-step-label">' + step.label + '</span>' +
      '<span>' + step.text + '</span>'
    if (!isInteractive) {
      const btnLabel = isLast ? 'Terminer' : 'Suivant ▶'
      inner += '<button class="tuto-info-next">' + btnLabel + '</button>'
    }
    bubble.innerHTML = inner
    if (!isInteractive) {
      bubble.querySelector('.tuto-info-next').addEventListener('click', advance)
    }

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
    } else if (step.kind === 'event') {
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

    ring.style.display = 'none'
    reposition()
    requestAnimationFrame(() => requestAnimationFrame(reposition))
  }

  const posTimer = setInterval(reposition, 400)
  window.addEventListener('resize', reposition)

  showStep(0)
  return { teardown }
}

// ─── Tuto Métier-Chercheur (déclenché à la fin du tuto Hutte du sage) ─────────

const RESEARCHER_TUTO_STEPS = [
  {
    label: 'Chercheur · 1/7',
    sel:   null,
    text:  'La Hutte du sage est là, mais personne ne fait de recherche. Assignons François comme Chercheur.',
  },
  {
    label: 'Chercheur · 2/7',
    sel:   '.rail-btn[data-panel="population"]',
    text:  'Ouvrez le panneau Population.',
    kind:  'event',
    event: 'strates:populationOpen',
    autoWhen: () => {
      const el = document.getElementById('popPanel')
      return !!(el && el.classList.contains('open'))
    },
  },
  {
    label: 'Chercheur · 3/7',
    sel:   '.pv2-tab[data-tab="metiers"]',
    fallback: '#popPanel',
    text:  'Cliquez sur Métiers.',
    kind:  'click',
    clickSel: '.pv2-tab[data-tab="metiers"]',
    autoWhen: () => {
      const tab = document.querySelector('.pv2-tab[data-tab="metiers"]')
      return !!(tab && tab.classList.contains('active'))
    },
  },
  {
    label: 'Chercheur · 4/7',
    sel:   '.pv2-job-card[data-job-id="chercheur"]',
    fallback: '#popPanel',
    text:  'Cliquez sur Chercheur pour voir la liste d assignation.',
    kind:  'click',
    clickSel: '.pv2-job-card[data-job-id="chercheur"]',
    autoWhen: () => {
      const card = document.querySelector('.pv2-job-card[data-job-id="chercheur"]')
      return !!(card && card.classList.contains('open'))
    },
  },
  {
    label: 'Chercheur · 5/7',
    sel:   '.pv2-job-card[data-job-id="chercheur"] .pv2-assign-row:first-of-type .pv2-job-action',
    fallback: '.pv2-job-card[data-job-id="chercheur"]',
    text:  'Assignez François ★ (chef) comme Chercheur. Plus son niveau augmentera, plus la recherche ira vite.',
    kind:  'click-or-timeout',
    clickSel: '.pv2-job-action[data-job-id="chercheur"]',
    timeout: 180000,
    autoWhen: () => {
      return !!(state.colonists && state.colonists.some(c => c.isChief && c.assignedJob === 'researcher'))
    },
  },
  {
    label: 'Chercheur · 6/7',
    sel:   '#popPanel .pop-close',
    fallback: '#popPanel',
    text:  'Parfait. Maintenant fermez le panneau Population pour continuer.',
    kind:  'click-or-timeout',
    clickSel: '#popPanel .pop-close, #popPanel .pv2-close',
    timeout: 120000,
    autoWhen: () => {
      const el = document.getElementById('popPanel')
      return !el || !el.classList.contains('open')
    },
  },
  {
    label: 'Chercheur · 7/7',
    sel:   null,
    text:  'Parfait. La recherche est lancée. Plus tard vous pourrez assigner plusieurs chercheurs pour aller plus vite.',
  },
]

let researcherTutoActive = false

function maybeRunResearcherTuto() {
  if (researcherTutoActive) return
  try {
    if (localStorage.getItem('strates.researcherTutoDone')) {
      // Déjà fait : enchaîner directement le tuto Interface
      maybeRunInterfaceTour()
      return
    }
    if (localStorage.getItem('strates.tutoSkipped')) return
  } catch (e) {}
  injectStyles()
  researcherTutoActive = true
  isTutoActive = true
  try {
    runInfoTour(RESEARCHER_TUTO_STEPS, 'strates.researcherTutoDone', () => {
      researcherTutoActive = false
      isTutoActive = false
      showFlash('Recherche lancée !')
      setTimeout(maybeRunInterfaceTour, 1300)
    })
  } catch (e) {
    researcherTutoActive = false
    isTutoActive = false
  }
}

let interfaceTourActive = false

function maybeRunInterfaceTour() {
  if (interfaceTourActive) return
  try {
    if (localStorage.getItem('strates.interfaceTutoDone')) return
    if (localStorage.getItem('strates.tutoSkipped')) return
  } catch (e) {}
  injectStyles()
  interfaceTourActive = true
  isTutoActive = true
  try {
    runInfoTour(INTERFACE_TOUR_STEPS, 'strates.interfaceTutoDone', () => {
      interfaceTourActive = false
      isTutoActive = false
      showFlash('Bienvenue sur Strates')
    })
  } catch (e) {
    interfaceTourActive = false
    isTutoActive = false
  }
}

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
    // Chaîne : Hutte du sage → Métier-Chercheur → Interface tour.
    // maybeRunResearcherTuto enchaîne lui-même vers maybeRunInterfaceTour.
    setTimeout(maybeRunResearcherTuto, 1300)
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
