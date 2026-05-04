import { state } from './state.js'
import { refreshHUD } from './hud.js'
import { showHudToast } from './ui/research-popup.js'
import { spawnColonsAroundHouse } from './colonist.js'
import { getResourceById } from './gamedata.js'

// ============================================================================
// Catalogue de quetes (hardcode)
// ============================================================================

const QUEST_CATALOG = [
  {
    id: 'berries-75',
    title: 'Récolte de baies',
    description: "Récoltez 75 baies pour l'hiver.",
    goal: { type: 'stat', key: 'totalBerriesHarvested', target: 75 },
    rewards: [
      { type: 'research', amount: 30 },
      { type: 'resource', id: 'berries', amount: 30 },
      { type: 'speedBoost', durationSec: 60, factor: 1.20 }
    ],
    color: '#8c5cc4'
  },
  {
    id: 'houses-3',
    title: 'Bâtir le hameau',
    description: 'Construisez 3 maisons pour le clan.',
    goal: { type: 'stat', key: 'housesPlaced', target: 3 },
    rewards: [
      { type: 'research', amount: 20 },
      { type: 'resource', id: 'wood', amount: 10 }
    ],
    color: '#c97a4a'
  },
  {
    id: 'colons-8',
    title: 'Croissance du clan',
    description: 'Accueillez 8 colons dans le village.',
    goal: { type: 'colonists', target: 8 },
    rewards: [
      { type: 'research', amount: 25 },
      { type: 'colonist', count: 1 }
    ],
    color: '#ffb070'
  },
  {
    id: 'mines-5',
    title: 'Extraction minière',
    description: 'Complétez 5 chantiers de mine.',
    goal: { type: 'stat', key: 'minesCompleted', target: 5 },
    reward: { researchPoints: 35, stone: 10 },
    color: '#a8a196'
  },
  {
    id: 'foyer-1',
    title: 'Feu sacré',
    description: "Allumez un foyer au cœur du village.",
    goal: { type: 'foyer', target: 1 },
    reward: { researchPoints: 40 },
    color: '#ff8c00'
  },
  {
    id: 'berries-150',
    title: "Provisions d'hiver",
    description: 'Récoltez 150 baies au total.',
    goal: { type: 'stat', key: 'totalBerriesHarvested', target: 150 },
    reward: { researchPoints: 50 },
    color: '#6b2d8c'
  },
  {
    id: 'houses-5',
    title: 'Village en essor',
    description: 'Construisez 5 maisons.',
    goal: { type: 'stat', key: 'housesPlaced', target: 5 },
    reward: { researchPoints: 45, stone: 5 },
    color: '#c97a4a'
  },
  {
    id: 'mines-15',
    title: 'Maître mineur',
    description: 'Complétez 15 chantiers de mine.',
    goal: { type: 'stat', key: 'minesCompleted', target: 15 },
    reward: { researchPoints: 60, stone: 20 },
    color: '#7d8a9a'
  },
  {
    id: 'colons-12',
    title: 'Tribu prospère',
    description: 'Atteignez 12 colons dans le village.',
    goal: { type: 'colonists', target: 12 },
    reward: { researchPoints: 55 },
    color: '#ffb070'
  }
]

function resolveGoal(goal) {
  if (goal.type === 'stat')      return () => state.gameStats[goal.key] || 0
  if (goal.type === 'colonists') return () => state.colonists.length
  if (goal.type === 'foyer')     return () => (state.foyers || []).length
  return () => 0
}

// ============================================================================
// API publique
// ============================================================================

export function getAvailableQuests() {
  const doneIds   = new Set((state.questsCompleted || []).map(q => q.id))
  const activeIds = new Set((state.questsActive    || []).map(q => q.id))
  const pool = QUEST_CATALOG.filter(q => !doneIds.has(q.id) && !activeIds.has(q.id))
  state.questsAvailable = pool.slice(0, 3).map(q => ({ ...q, check: resolveGoal(q.goal) }))
  try { window.dispatchEvent(new CustomEvent('strates:questsAvailable', { detail: { quests: state.questsAvailable } })) } catch (_) {}
}

export function acceptQuest(id) {
  if (!state.questsActive) state.questsActive = []
  if (state.questsActive.length >= 3) return
  const q = (state.questsAvailable || []).find(q => q.id === id)
  if (!q) return
  if (state.questsActive.some(a => a.id === id)) return
  state.questsActive = [...state.questsActive, { ...q, progress: 0, completed: false }]
  state.questsAvailable = (state.questsAvailable || []).filter(x => x.id !== id)
  try { window.dispatchEvent(new CustomEvent('strates:questAccepted', { detail: { quest: state.questsActive.find(a => a.id === id) } })) } catch (_) {}
  refreshHUD()
}

// Convertit un objet reward legacy (forme { researchPoints, wood, stone, ... })
// en tableau rewards[] au format Lot A v1. Si quest.rewards existe deja (Lot A),
// on l utilise tel quel.
function normalizeRewards(quest) {
  if (Array.isArray(quest.rewards) && quest.rewards.length > 0) return quest.rewards
  const r = quest.reward
  if (!r) return []
  const out = []
  if (r.researchPoints) out.push({ type: 'research', amount: r.researchPoints })
  if (r.wood)    out.push({ type: 'resource', id: 'wood',    amount: r.wood })
  if (r.stone)   out.push({ type: 'resource', id: 'stone',   amount: r.stone })
  if (r.berries) out.push({ type: 'resource', id: 'berries', amount: r.berries })
  if (r.silex)   out.push({ type: 'resource', id: 'silex',   amount: r.silex })
  if (r.grain)   out.push({ type: 'resource', id: 'grain',   amount: r.grain })
  return out
}

// Trouve un point de spawn pertinent pour un colon recompense de quete.
// Priorite : Cairn, sinon premiere maison, sinon premier colon.
function findRewardSpawnAnchor() {
  // Cairn : marqueur de civilisation, on cherche un site cairn-pierre si dispo.
  const allHouses = [].concat(state.houses || [], state.bigHouses || [], state.manors || [])
  for (const h of allHouses) {
    if (h && h.buildingId === 'cairn-pierre') return { x: h.x, z: h.z }
  }
  if (allHouses.length > 0) {
    const h = allHouses[0]
    return { x: h.x, z: h.z }
  }
  if (state.colonists && state.colonists.length > 0) {
    const c = state.colonists[0]
    return { x: c.x, z: c.z }
  }
  return null
}

// Applique une seule entree de reward (tableau Lot A). Retourne un libelle court
// pour le toast, ou null si rien d affichable.
function applySingleReward(entry) {
  if (!entry || !entry.type) return null
  const t = entry.type

  if (t === 'research') {
    const n = entry.amount || 0
    state.researchPoints = (state.researchPoints || 0) + n
    return '+' + n + ' recherche'
  }

  if (t === 'resource') {
    const id = entry.id
    const n = entry.amount || 0
    if (!id || n <= 0) return null
    if (!state.resources) state.resources = {}
    state.resources[id] = (state.resources[id] || 0) + n
    const def = getResourceById(id)
    const label = (def && def.name) ? def.name.toLowerCase() : id
    return '+' + n + ' ' + label
  }

  if (t === 'speedBoost') {
    const dur = entry.durationSec || 60
    const factor = (typeof entry.factor === 'number' && entry.factor > 0) ? entry.factor : 1.2
    const now = (typeof performance !== 'undefined' && performance.now)
      ? performance.now() / 1000
      : Date.now() / 1000
    // Si un boost est deja actif, on prend le plus avantageux (facteur max,
    // expiration max). Cas simple, suffisant pour age de pierre.
    const cur = state.speedBoost
    const newExpires = now + dur
    if (cur && cur.expiresAt && cur.expiresAt > newExpires && cur.factor >= factor) {
      // l existant est meilleur sur tous les axes, on ne touche pas
    } else {
      state.speedBoost = {
        factor: Math.max(factor, cur && cur.factor ? cur.factor : 0),
        expiresAt: Math.max(newExpires, cur && cur.expiresAt ? cur.expiresAt : 0)
      }
      try {
        window.dispatchEvent(new CustomEvent('strates:speedBoostChanged', {
          detail: { boost: state.speedBoost }
        }))
      } catch (_) {}
    }
    const pct = Math.round((factor - 1) * 100)
    return '+' + pct + '% vitesse ' + dur + 's'
  }

  if (t === 'colonist') {
    const n = entry.count || 1
    const anchor = findRewardSpawnAnchor()
    if (anchor) {
      try {
        spawnColonsAroundHouse(anchor.x, anchor.z, n)
      } catch (e) {
        console.warn('[quests] echec spawn colonist reward', e)
      }
    } else {
      console.warn('[quests] aucun ancre pour spawn colonist reward')
    }
    return '+' + n + ' colon' + (n > 1 ? 's' : '')
  }

  return null
}

function applyRewards(quest) {
  const rewards = normalizeRewards(quest)
  if (!rewards.length) return []
  const labels = []
  for (const entry of rewards) {
    const lbl = applySingleReward(entry)
    if (lbl) labels.push(lbl)
  }
  return labels
}

// Compat retro : ancien nom utilise plus haut. Conserve pour eviter de casser
// d eventuels appelants externes.
function applyReward(reward) {
  if (!reward) return
  applyRewards({ reward })
}

function checkQuestProgress() {
  if (!state.questsActive || state.questsActive.length === 0) return
  let anyCompleted = false
  state.questsActive = state.questsActive.map(q => {
    if (q.completed) return q
    const check = q.check || resolveGoal(q.goal)
    const p = Math.min(q.goal.target, check())
    if (p >= q.goal.target) {
      const labels = applyRewards(q)
      state.questsCompleted = [...(state.questsCompleted || []), { id: q.id, title: q.title }]
      try { window.dispatchEvent(new CustomEvent('strates:questCompleted', { detail: { quest: q, rewards: labels } })) } catch (_) {}
      // Toast HUD listant les recompenses obtenues. Si la quete n a aucun
      // reward affichable (cas degenere), on affiche au moins le titre.
      if (typeof showHudToast === 'function') {
        const head = 'Quete reussie : ' + q.title
        const tail = labels.length > 0 ? ' (' + labels.join(', ') + ')' : ''
        showHudToast(head + tail, 4000)
      }
      anyCompleted = true
      return null
    }
    return { ...q, progress: p }
  }).filter(Boolean)

  if (anyCompleted) {
    getAvailableQuests()
    refreshHUD()
  }
}

// ============================================================================
// Compatibilite avec main.js et worldgen.js
// ============================================================================

export function initQuestDefs() { /* catalogue hardcode, rien a faire */ }
export function startNextQuest() { getAvailableQuests() }

export function updateQuests(_nowSec) {
  checkQuestProgress()
  tickSpeedBoost()
}

// ============================================================================
// Tick d expiration du speedBoost et badge HUD
// ============================================================================

let _boostBadgeEl = null
let _boostBadgeStyleInjected = false

function ensureBoostBadge() {
  if (_boostBadgeEl) return _boostBadgeEl
  if (!_boostBadgeStyleInjected) {
    const st = document.createElement('style')
    st.id = 'speed-boost-badge-style'
    st.textContent =
      '#speed-boost-badge {' +
      ' position: fixed; top: 12px; right: 12px; z-index: 9999;' +
      ' background: linear-gradient(135deg, #2d6e2a, #5fc25c);' +
      ' color: #fff; font-family: system-ui, sans-serif; font-size: 13px;' +
      ' font-weight: 600; padding: 6px 12px; border-radius: 14px;' +
      ' box-shadow: 0 2px 8px rgba(0,0,0,0.35);' +
      ' border: 1px solid #8af087; pointer-events: none;' +
      ' display: flex; align-items: center; gap: 6px;' +
      '}' +
      '#speed-boost-badge.hidden { display: none; }' +
      '#speed-boost-badge .sb-icon { font-size: 14px; }'
    document.head.appendChild(st)
    _boostBadgeStyleInjected = true
  }
  const el = document.createElement('div')
  el.id = 'speed-boost-badge'
  el.className = 'hidden'
  document.body.appendChild(el)
  _boostBadgeEl = el
  return el
}

function updateBoostBadge() {
  if (typeof document === 'undefined') return
  const el = ensureBoostBadge()
  if (!el) return
  const sb = state.speedBoost
  if (!sb) {
    el.classList.add('hidden')
    return
  }
  const now = (typeof performance !== 'undefined' && performance.now)
    ? performance.now() / 1000
    : Date.now() / 1000
  const remain = Math.max(0, Math.ceil(sb.expiresAt - now))
  const pct = Math.round((sb.factor - 1) * 100)
  el.innerHTML = '<span class="sb-icon">&#9889;</span> +' + pct + '% vitesse, ' + remain + 's'
  el.classList.remove('hidden')
}

function tickSpeedBoost() {
  const sb = state.speedBoost
  if (!sb) {
    updateBoostBadge()
    return
  }
  const now = (typeof performance !== 'undefined' && performance.now)
    ? performance.now() / 1000
    : Date.now() / 1000
  if (now >= sb.expiresAt) {
    state.speedBoost = null
    updateBoostBadge()
    try { window.dispatchEvent(new CustomEvent('strates:speedBoostChanged', { detail: { boost: null } })) } catch (_) {}
    if (typeof showHudToast === 'function') {
      showHudToast('Boost de vitesse termine.', 2500)
    }
    return
  }
  updateBoostBadge()
}

// ============================================================================
// Rendu HTML
// ============================================================================

const questsBodyEl = () => document.getElementById('quests-body')
let lastQuestSig = ''
let activeTab = 'available'

export function resetQuestSig() { lastQuestSig = ''; activeTab = 'available' }

// Libelle d affichage des recompenses pour la carte de quete. Gere a la fois
// l ancien objet reward (legacy) et le tableau rewards[] Lot A v1.
function rewardLabelFromList(rewards) {
  if (!Array.isArray(rewards) || rewards.length === 0) return ''
  const parts = []
  for (const r of rewards) {
    if (!r || !r.type) continue
    if (r.type === 'research') parts.push('+' + (r.amount || 0) + ' recherche')
    else if (r.type === 'resource') {
      const def = (typeof getResourceById === 'function') ? getResourceById(r.id) : null
      const label = (def && def.name) ? def.name.toLowerCase() : r.id
      parts.push('+' + (r.amount || 0) + ' ' + label)
    }
    else if (r.type === 'speedBoost') {
      const pct = Math.round(((r.factor || 1.2) - 1) * 100)
      parts.push('+' + pct + '% vitesse ' + (r.durationSec || 60) + 's')
    }
    else if (r.type === 'colonist') {
      const n = r.count || 1
      parts.push('+' + n + ' colon' + (n > 1 ? 's' : ''))
    }
  }
  return parts.join(' . ')
}

function rewardLabel(quest) {
  // Accepte soit un quest complet, soit un ancien objet reward { researchPoints, ... }
  if (!quest) return ''
  if (Array.isArray(quest.rewards) || quest.reward || quest.goal) {
    return rewardLabelFromList(normalizeRewards(quest))
  }
  // Fallback : on a recu un ancien reward direct.
  const r = quest
  const parts = []
  if (r.researchPoints) parts.push('+' + r.researchPoints + ' recherche')
  if (r.stone)  parts.push('+' + r.stone + ' pierre')
  if (r.wood)   parts.push('+' + r.wood + ' bois')
  if (r.berries) parts.push('+' + r.berries + ' baies')
  return parts.join(' . ')
}

function buildSig() {
  const active = state.questsActive   || []
  const avail  = state.questsAvailable || []
  const done   = state.questsCompleted || []
  return activeTab +
    '|a:' + active.map(q => q.id + ':' + (q.progress || 0)).join(';') +
    '|v:' + avail.map(x => x.id).join(',') +
    '|d:' + done.length
}

function renderTabContent(body) {
  const active = state.questsActive   || []
  const avail  = state.questsAvailable || []
  const done   = state.questsCompleted || []

  if (activeTab === 'available') {
    if (avail.length === 0 && active.length === 0) {
      body.innerHTML = '<div class="qall-done">Toutes les quêtes sont complétées !</div>'
      return
    }
    if (avail.length === 0) {
      body.innerHTML = '<div class="qactive-empty">Aucune quête disponible pour l\'instant.</div>'
      return
    }
    const activeIds = new Set(active.map(q => q.id))
    const full = active.length >= 3
    body.innerHTML = avail.map(x => {
      const locked = full || activeIds.has(x.id)
      const lbl = rewardLabel(x)
      return '<div class="qcard' + (locked ? ' qcard-locked' : '') + '">' +
        '<div class="qcard-title"><span class="qdot" style="background:' + x.color + '"></span>' + x.title + '</div>' +
        '<div class="qcard-desc">' + x.description + '</div>' +
        (lbl ? '<div class="qcard-reward">' + lbl + '</div>' : '') +
        '<button class="qcard-accept" data-qid="' + x.id + '"' + (locked ? ' disabled' : '') + '>' +
          (full ? 'Slots pleins' : 'Accepter') +
        '</button>' +
      '</div>'
    }).join('')
    body.querySelectorAll('.qcard-accept:not([disabled])').forEach(btn => {
      btn.addEventListener('click', () => {
        acceptQuest(btn.dataset.qid)
        lastQuestSig = ''
        renderQuests()
      })
    })
    return
  }

  if (activeTab === 'active') {
    if (active.length === 0) {
      body.innerHTML = '<div class="qactive-empty">Aucune quête en cours.<br>Choisissez des quêtes dans l\'onglet "À prendre".</div>'
      return
    }
    body.innerHTML = active.map(q => {
      const pct = Math.min(100, Math.round(((q.progress || 0) / q.goal.target) * 100))
      return '<div class="qactive-card">' +
        '<div class="qactive-title"><span class="qdot" style="background:' + q.color + '"></span>' + q.title + '</div>' +
        '<div class="qactive-desc">' + q.description + '</div>' +
        '<div class="qbar"><div class="qfill" style="width:' + pct + '%"></div></div>' +
        '<div class="qprog">' + (q.progress || 0) + ' / ' + q.goal.target + '</div>' +
      '</div>'
    }).join('')
    return
  }

  if (activeTab === 'done') {
    if (done.length === 0) {
      body.innerHTML = '<div class="qdone-empty">Aucune quête complétée pour l\'instant.</div>'
      return
    }
    body.innerHTML = done.map(x =>
      '<div class="qdone-item"><span class="qdone-check">✓</span>' + x.title + '</div>'
    ).join('')
  }
}

export function renderQuests() {
  const tabsBar = document.getElementById('quests-tabs-bar')
  const body = questsBodyEl()
  if (!body) return

  const sig = buildSig()
  if (sig === lastQuestSig) return
  lastQuestSig = sig

  const avail  = state.questsAvailable || []
  const active = state.questsActive    || []
  const done   = state.questsCompleted || []

  const badge = (n) => n > 0 ? '<span class="q-tab-badge">' + n + '</span>' : ''

  if (tabsBar) {
    tabsBar.innerHTML =
      '<div class="q-tabs">' +
        '<button class="q-tab' + (activeTab === 'available' ? ' active' : '') + '" data-tab="available">À prendre' + badge(avail.length) + '</button>' +
        '<button class="q-tab' + (activeTab === 'active'    ? ' active' : '') + '" data-tab="active">En cours'   + badge(active.length) + '</button>' +
        '<button class="q-tab' + (activeTab === 'done'      ? ' active' : '') + '" data-tab="done">Réalisées'   + badge(done.length) + '</button>' +
      '</div>'
    tabsBar.querySelectorAll('.q-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        activeTab = btn.dataset.tab
        lastQuestSig = ''
        renderQuests()
      })
    })
  }

  renderTabContent(body)
}