// ============================================================================
// Tech tree XXL (Lot C) - rendu d'un noeud (card tech) - maquette v2
//
// Structure DOM : .ttp-tech.<status> > .card > (.row + .cost + .lock|.check)
// Etats : locked | available | ready | researching | queued | done | teased.
//
// Integration file de recherche (Lot B) :
//   - opts.onQueue(id)   : appele quand le joueur clique "Mettre en file"
//   - opts.activeId      : id de la tech en cours (state.activeResearch.id)
//   - opts.activeProgress: progression de la tech en cours (0..cost)
//   - opts.queueIndex    : position 1-based dans la file, ou 0 si pas en file
// ============================================================================

/**
 * @param {object}  tech    Objet tech du JSON SPEC v1.
 * @param {string}  status  locked|available|ready|researching|queued|done|teased.
 * @param {object=} opts    Voir entete.
 * @returns {HTMLElement}
 */
export function buildTechNode(tech, status, opts) {
  opts = opts || {}
  const isTeased = status === 'teased'
  const cost = typeof opts.cost === 'number' ? opts.cost : costOf(tech)
  const nightCost = (tech && tech.cost && typeof tech.cost === 'object') ? (tech.cost.night || 0) : 0
  const activeProgress = typeof opts.activeProgress === 'number' ? opts.activeProgress : 0
  const queueIndex = typeof opts.queueIndex === 'number' ? opts.queueIndex : 0

  const node = document.createElement('div')
  node.className = 'ttp-tech ' + status
  // Pulse visuel supplementaire pour la tech en cours de recherche
  if (status === 'researching') node.classList.add('ttp-research')
  // Anti-spoiler pour les teased : aucune info reelle dans le DOM.
  if (!isTeased) {
    node.dataset.id = tech.id
    node.dataset.branch = tech.branch || ''
  }
  node.dataset.age = String(tech.age || 1)
  if (opts.vc) node.style.setProperty('--vc', opts.vc)

  // Corner indicator
  let corner = ''
  if (status === 'done') {
    corner = '<div class="check">&#x2713;</div>'
  } else if (status === 'locked') {
    const reqs = Array.isArray(tech.requires) ? tech.requires : []
    const miss = reqs.length
    corner = '<div class="lock">&#x1F512; <b>' + miss + '</b></div>'
  }

  const icon = isTeased ? '?' : (tech.icon || '')
  const name = isTeased ? '?????' : (tech.name || tech.id)

  // Cost / action row
  let costHtml = ''
  if (status === 'teased') {
    costHtml = '<span>? pts</span>'
  } else if (status === 'researching') {
    const pct = cost > 0 ? Math.min(100, Math.round((activeProgress / cost) * 100)) : 0
    costHtml = '<span><b>' + Math.floor(activeProgress) + '</b>/' + cost + '</span>' +
               '<button class="ttp-tech-unlock" disabled>En cours...</button>'
    // La barre de progression sera injectee apres la card (voir plus bas)
    void pct
  } else if (status === 'queued') {
    costHtml = '<span><b>' + cost + '</b> pts</span>' +
               '<button class="ttp-tech-unlock" disabled>En file (' + queueIndex + ')</button>'
  } else if (status === 'ready' || status === 'available') {
    const nightSuffix = nightCost > 0 ? ' + ' + nightCost + '&#127769;' : ''
    // Si stocks nocturnes insuffisants, le bouton est desactive avec un
    // tooltip explicatif (cf. queueTech dans tech.js).
    if (opts.disabled) {
      const tip = opts.disabledTitle || ''
      costHtml = '<span><b>' + cost + '</b> pts' + nightSuffix + '</span>' +
                 '<button class="ttp-tech-unlock" disabled title="' + escape(tip) + '">Mettre en file &rarr;</button>'
    } else {
      costHtml = '<span><b>' + cost + '</b> pts' + nightSuffix + '</span>' +
                 '<button class="ttp-tech-unlock">Mettre en file &rarr;</button>'
    }
  } else if (status === 'done') {
    costHtml = '<span class="ttp-tech-acquis">&#x2713; Acquis</span>'
  } else if (status === 'locked') {
    costHtml = (cost > 0 ? '<span><b>' + cost + '</b> pts</span>' : '<span>Gratuit</span>') +
               '<button class="ttp-tech-unlock" disabled>Verrouille</button>'
  } else {
    costHtml = cost > 0 ? '<span><b>' + cost + '</b> pts</span>' : '<span>Gratuit</span>'
  }

  // Barre de progression pour la tech active
  let progressBar = ''
  if (status === 'researching' && cost > 0) {
    const pct = Math.min(100, Math.max(0, (activeProgress / cost) * 100))
    progressBar = '<div class="ttp-tech-bar"><i style="width:' + pct.toFixed(1) + '%"></i></div>'
  }

  node.innerHTML =
    '<div class="card">' +
    corner +
    '  <div class="row">' +
    '    <div class="ic">' + escape(icon) + '</div>' +
    '    <div class="nm">' + escape(name) + '</div>' +
    '  </div>' +
    '  <div class="cost">' + costHtml + '</div>' +
    progressBar +
    '</div>'

  // Bouton Mettre en file
  const btn = node.querySelector('.ttp-tech-unlock')
  if (btn && !btn.disabled) {
    btn.addEventListener('click', function(e) {
      e.stopPropagation()
      if (typeof opts.onQueue === 'function') opts.onQueue(tech.id)
      // Retrocompat : certains appels historiques passaient onUnlock.
      else if (typeof opts.onUnlock === 'function') opts.onUnlock(tech.id)
    })
  }

  return node
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function costOf(tech) {
  if (!tech) return 0
  if (typeof tech.cost === 'number') return tech.cost
  if (tech.cost && typeof tech.cost === 'object') return tech.cost.research || 0
  return 0
}
function escape(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function(c) {
    return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]
  })
}
