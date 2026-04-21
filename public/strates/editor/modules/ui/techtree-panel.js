// ============================================================================
// Panneau Tech tree XXL (Lot C)
//
// Panneau plein ecran avec pan + zoom, colonnes = ages, lignes = branches,
// noeuds = cards, liens SVG entre prerequis, filtres par branche + recherche
// texte. Ages 2+ en flou avec "?????" au lieu du nom reel (preserve la
// surprise, ne jamais afficher meme via devtools).
//
// Consomme :
//   - TECH_TREE_DATA (JSON SPEC v1 via gamedata.js, lecture seule)
//   - state.techs[id].unlocked (ecriture via unlockTech locale)
//   - state.researchPoints (decremente au deblocage)
//
// N'ecrit pas dans data/*.json. Ne touche pas jobs.js / needs.js.
// ============================================================================
import { state } from '../state.js'
import { TECH_TREE_DATA } from '../gamedata.js'
import { refreshTechsPanel } from '../hud.js'

let root = null         // #ttp-root (conteneur plein ecran)
let isOpen = false

// ─── Styles injectes au besoin ───────────────────────────────────────────────

function ensureStylesheet() {
  if (document.getElementById('ttp-stylesheet')) return
  const link = document.createElement('link')
  link.id = 'ttp-stylesheet'
  link.rel = 'stylesheet'
  link.href = new URL('../../styles/techtree.css', import.meta.url).href
  document.head.appendChild(link)
}

// ─── Bootstrap du DOM ────────────────────────────────────────────────────────

export function initTechTreePanel() {
  ensureStylesheet()
  if (document.getElementById('ttp-root')) {
    root = document.getElementById('ttp-root')
    return
  }
  root = document.createElement('div')
  root.id = 'ttp-root'
  root.innerHTML = `
    <div class="ttp-backdrop"></div>
    <div class="ttp-frame">
      <header class="ttp-header">
        <h2 class="ttp-title">Arbre des technologies</h2>
        <div class="ttp-meta">
          <span class="ttp-pts" id="ttp-pts">0 pts</span>
          <button class="ttp-close" id="ttp-close" aria-label="Fermer">Fermer (Esc)</button>
        </div>
      </header>
      <div class="ttp-body">
        <div class="ttp-stage" id="ttp-stage">
          <div class="ttp-canvas" id="ttp-canvas"></div>
        </div>
      </div>
    </div>
  `
  document.body.appendChild(root)
  root.querySelector('#ttp-close').addEventListener('click', closeTechTreePanel)
  root.querySelector('.ttp-backdrop').addEventListener('click', closeTechTreePanel)
  window.addEventListener('keydown', function(e) {
    if (!isOpen) return
    if (e.key === 'Escape') { e.preventDefault(); closeTechTreePanel() }
  })
}

// ─── Ouverture / fermeture ───────────────────────────────────────────────────

export function openTechTreePanel() {
  if (!root) initTechTreePanel()
  if (!root) return
  isOpen = true
  root.classList.add('open')
  render()
}

export function closeTechTreePanel() {
  if (!root) return
  isOpen = false
  root.classList.remove('open')
}

export function toggleTechTreePanel() {
  if (!root) initTechTreePanel()
  if (!root) return
  if (isOpen) closeTechTreePanel()
  else openTechTreePanel()
}

// ─── Rendu (squelette, le contenu arrive aux commits suivants) ───────────────

function render() {
  if (!root) return
  const pts = document.getElementById('ttp-pts')
  if (pts) pts.textContent = (state.researchPoints || 0) + ' pts'
  // Rendu grille + noeuds + liens + filtres : commits suivants.
}
