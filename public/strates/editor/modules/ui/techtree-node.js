// ============================================================================
// Tech tree XXL (Lot C) - rendu d'un noeud (card tech) - maquette v2
//
// Structure DOM : .ttp-tech.<status> > .card > (.row + .cost + .lock|.check)
// Etats : locked | available | ready | researching | done | teased.
// ============================================================================

/**
 * @param {object}  tech    Objet tech du JSON SPEC v1.
 * @param {string}  status  locked|available|ready|researching|done|teased.
 * @param {object=} opts    { onUnlock: (id) => void, cost: number, vc: string }
 * @returns {HTMLElement}
 */
export function buildTechNode(tech, status, opts) {
  opts = opts || {}
  const isTeased = status === 'teased'
  const cost = typeof opts.cost === 'number' ? opts.cost : costOf(tech)

  const node = document.createElement('div')
  node.className = 'ttp-tech ' + status
  // Anti-spoiler pour les teased : aucune info reelle dans le DOM.
  if (!isTeased) {
    node.dataset.id = tech.id
    node.dataset.branch = tech.branch || ''
  }
  node.dataset.age = String(tech.age || 1)
  if (opts.vc) node.style.setProperty('--vc', opts.vc)

  // Corner indicator (check pour done, lock + missing count pour locked)
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
  } else if (status === 'ready') {
    costHtml = '<span><b>' + cost + '</b> pts</span>' +
               '<button class="ttp-tech-unlock">Rechercher</button>'
  } else if (status === 'done') {
    costHtml = '<span>Debloquee</span>'
  } else {
    costHtml = cost > 0 ? '<span><b>' + cost + '</b> pts</span>' : '<span>Gratuit</span>'
  }

  node.innerHTML =
    '<div class="card">' +
    corner +
    '  <div class="row">' +
    '    <div class="ic">' + escape(icon) + '</div>' +
    '    <div class="nm">' + escape(name) + '</div>' +
    '  </div>' +
    '  <div class="cost">' + costHtml + '</div>' +
    '</div>'

  // Bouton Rechercher
  const btn = node.querySelector('.ttp-tech-unlock')
  if (btn) {
    btn.addEventListener('click', function(e) {
      e.stopPropagation()
      if (typeof opts.onUnlock === 'function') opts.onUnlock(tech.id)
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
