// ============================================================================
// Tech tree XXL (Lot C) - rendu d'un noeud (card tech)
//
// Etats visuels :
//   - locked     : prerequis non rempli, opacity 0.3
//   - available  : prerequis rempli, pas assez de pts
//   - ready      : prerequis rempli, pts suffisants (glow bleu, bouton)
//   - researching: en cours (progress bar) [reserve pour un futur systeme]
//   - done       : deja debloque (glow dore)
//   - teased     : age >= 2, contenu masque par flou + "?????" force
// ============================================================================

/**
 * @param {object}  tech        Objet tech du JSON SPEC v1.
 * @param {string}  status      locked|available|ready|researching|done|teased.
 * @param {object=} opts        { onUnlock: (techId) => void, cost: number }
 * @returns {HTMLElement}
 */
export function buildTechNode(tech, status, opts) {
  opts = opts || {}
  const isTeased = status === 'teased'
  const cost = typeof opts.cost === 'number' ? opts.cost : costOf(tech)
  const card = el('div', 'ttp-node ttp-node--' + status)
  // Anti-spoiler : pour les teased, aucun id / branch / icon / cost reel
  // n'est ecrit dans le DOM. Seul l'age sert a ordonner visuellement.
  if (!isTeased) {
    card.dataset.id = tech.id
    card.dataset.branch = tech.branch || ''
  }
  card.dataset.age = String(tech.age || 1)

  // Icone (symbole neutre pour les teased)
  const icon = el('div', 'ttp-node-icon')
  icon.textContent = isTeased ? '?' : (tech.icon || '')
  card.appendChild(icon)

  // Nom (5 points d'interrogation forces pour les teased, jamais le vrai nom)
  const name = el('div', 'ttp-node-name')
  name.textContent = isTeased ? '?????' : (tech.name || tech.id)
  card.appendChild(name)

  // Cout / etat
  const foot = el('div', 'ttp-node-foot')
  if (status === 'done') {
    foot.appendChild(badge('Debloque', 'ttp-badge--done'))
  } else if (status === 'teased') {
    foot.appendChild(badge('?', 'ttp-badge--teased'))
  } else if (status === 'locked') {
    foot.appendChild(badge(cost + ' pts', 'ttp-badge--locked'))
  } else if (status === 'available') {
    foot.appendChild(badge(cost + ' pts', 'ttp-badge--cost'))
  } else if (status === 'researching') {
    const bar = el('div', 'ttp-node-progress')
    const fill = el('div', 'ttp-node-progress-fill')
    fill.style.width = (opts.progressPct || 0) + '%'
    bar.appendChild(fill)
    foot.appendChild(bar)
  } else if (status === 'ready') {
    const btn = el('button', 'ttp-node-unlock', 'Rechercher (' + cost + ')')
    btn.addEventListener('click', function(e) {
      e.stopPropagation()
      if (typeof opts.onUnlock === 'function') opts.onUnlock(tech.id)
    })
    foot.appendChild(btn)
  }
  card.appendChild(foot)

  return card
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function el(tag, cls, text) {
  const n = document.createElement(tag)
  if (cls) n.className = cls
  if (text != null) n.textContent = text
  return n
}
function badge(label, cls) {
  const n = el('span', 'ttp-badge ' + (cls || ''), label)
  return n
}
function costOf(tech) {
  if (!tech) return 0
  if (typeof tech.cost === 'number') return tech.cost
  if (tech.cost && typeof tech.cost === 'object') return tech.cost.research || 0
  return 0
}
