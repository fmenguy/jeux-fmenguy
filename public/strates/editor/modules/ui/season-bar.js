// ============================================================================
// season-bar.js : barre de progression de la saison courante dans le HUD.
// Gatée par la tech "calendrier" (Âge II Savoir, données par Lot A).
//
// Lecture seule sur seasons.js : currentSeason() + state.season.idx.
// Pas de modification de seasons.js.
//
// API :
//   initSeasonBar()  : injecte CSS + DOM (idempotent)
//   tickSeasonBar()  : met à jour la barre, à appeler ~1 Hz depuis main.js
// ============================================================================

import { state } from '../state.js'
import { techUnlocked } from '../tech.js'
import { currentSeason } from '../seasons.js'

// Convention locale : 1 saison = 20 jours (cohérent avec rythme rapide du jeu).
// SEASON_DURATION dans seasons.js = 600 s, donc 1 jour ≈ 30 s côté affichage.
const DAYS_PER_SEASON = 20

// Map id → libellé français accentué (le name brut côté SEASONS est sans accent).
const SEASON_DISPLAY = {
  spring: 'Printemps',
  summer: 'Été',
  autumn: 'Automne',
  winter: 'Hiver'
}

const CSS = `
.season-bar-pill {
  display: none;
  flex-direction: column;
  gap: 3px;
  padding: 4px 10px;
  border: 1px solid var(--rule);
  border-radius: 3px;
  background: rgba(0,0,0,.2);
  align-items: center;
}
.season-bar-pill.show { display: flex; }
.season-bar-track {
  width: 120px; height: 6px;
  background: rgba(0,0,0,0.45);
  border: 1px solid rgba(201,168,76,0.45);
  border-radius: 3px;
  overflow: hidden;
}
.season-bar-fill {
  height: 100%;
  width: 0%;
  background: linear-gradient(90deg, #c9a84c 0%, #e0c46a 100%);
  transition: width .35s linear;
}
.season-bar-label {
  font-family: var(--mono);
  font-size: 9.5px;
  letter-spacing: 0.04em;
  color: var(--ink-3);
  white-space: nowrap;
  text-align: center;
}
`

let pillEl = null
let fillEl = null
let labelEl = null
let initialized = false

function injectCSS() {
  if (document.getElementById('season-bar-css')) return
  const s = document.createElement('style')
  s.id = 'season-bar-css'
  s.textContent = CSS
  document.head.appendChild(s)
}

export function initSeasonBar() {
  if (initialized) return
  injectCSS()
  const seasonPill = document.querySelector('.topbar .right .season')
  if (!seasonPill || !seasonPill.parentElement) return
  pillEl = document.createElement('div')
  pillEl.className = 'season-bar-pill'
  pillEl.id = 'season-bar-pill'
  pillEl.title = 'Progression de la saison (calendrier)'
  pillEl.innerHTML =
    '<div class="season-bar-track"><div class="season-bar-fill"></div></div>' +
    '<span class="season-bar-label">—</span>'
  seasonPill.parentElement.insertBefore(pillEl, seasonPill.nextSibling)
  fillEl = pillEl.querySelector('.season-bar-fill')
  labelEl = pillEl.querySelector('.season-bar-label')
  initialized = true
}

export function tickSeasonBar() {
  if (!initialized) initSeasonBar()
  if (!pillEl) return
  if (!techUnlocked('calendrier')) {
    pillEl.classList.remove('show')
    return
  }
  pillEl.classList.add('show')
  const cs = currentSeason()
  const progress = Math.max(0, Math.min(1, cs.progress || 0))
  fillEl.style.width = (progress * 100).toFixed(1) + '%'
  // Nom de la prochaine saison via state.season.idx + 1
  const nextIdx = ((state.season && state.season.idx) || 0) + 1
  const nextIds = ['spring', 'summer', 'autumn', 'winter']
  const nextId = nextIds[nextIdx % nextIds.length]
  const nextName = SEASON_DISPLAY[nextId] || nextId
  const daysLeft = Math.max(1, Math.round((1 - progress) * DAYS_PER_SEASON))
  labelEl.textContent = nextName + ' dans ' + daysLeft + ' jour' + (daysLeft > 1 ? 's' : '')
}
