// ============================================================================
// Vue Population v0.3 - Sprint 1 (Liste, Métiers, Compétences)
// Vanilla JS, pas de React. Template literals + délégation d'événements.
// Branche sur state.colonists via l'adapter colonistView().
// ============================================================================

import { state } from '../state.js'

// ---- Constantes ----

const TABS = [
  { id: 'liste',       label: 'Liste' },
  { id: 'metiers',     label: 'Métiers' },
  { id: 'competences', label: 'Compétences' },
]

const JOB_DEFS = [
  { id: 'cueilleur',  label: 'Cueilleur',  icon: '🫐', desc: 'Récolte les baies et ressources naturelles', req: null },
  { id: 'bucheron',   label: 'Bûcheron',   icon: '🪓', desc: 'Abat les arbres proches',                   req: 'Hache pierre' },
  { id: 'mineur',     label: 'Mineur',     icon: '⛏',  desc: 'Extrait la pierre et les minerais',          req: null },
  { id: 'chercheur',  label: 'Chercheur',  icon: '📜', desc: 'Génère des points de recherche',             req: 'Hutte du sage' },
  { id: 'chasseur',   label: 'Chasseur',   icon: '🏹', desc: 'Chasse le gibier, rapporte viande et os',    req: 'Arc' },
]

// Mapping métier vers compétence pour afficher le niveau dans les chips
const JOB_SKILL = {
  bucheron:  'logging',
  mineur:    'mining',
  cueilleur: 'gathering',
  chasseur:  'hunting',
  chercheur: 'research',
}

// Helpers de niveau / xp de compétences (lecture seule sur le raw colonist)
function skillLevelOf(rawC, name) {
  if (!rawC) return 0
  const direct = rawC.skills && rawC.skills[name]
  if (typeof direct === 'number' && direct > 0) {
    return Math.min(10, Math.floor(direct))
  }
  const xp = rawC.skillsXp && rawC.skillsXp[name]
  if (typeof xp === 'number' && xp > 0) {
    return Math.min(10, Math.floor(xp / 20))
  }
  return 0
}

function skillXpOf(rawC, name) {
  if (!rawC) return 0
  const xp = rawC.skillsXp && rawC.skillsXp[name]
  return typeof xp === 'number' ? xp : 0
}

const SKILL_CATEGORIES = [
  { id: 'harvest', label: 'Récolte',   color: '#8bb583', skills: ['bois', 'cueillette', 'herboristerie', 'pioche', 'chasse', 'peche'] },
  { id: 'craft',   label: 'Artisanat', color: '#d9b87a', skills: ['artisanat', 'cuisine', 'construction', 'forge'] },
  { id: 'combat',  label: 'Combat',    color: '#c67a5a', skills: ['arc', 'force', 'discretion', 'combat'] },
  { id: 'savoir',  label: 'Savoir',    color: '#a89ac8', skills: ['recherche', 'oratoire', 'medecine', 'magie'] },
]

// ---- Adapter ----

function stateActivity(raw) {
  if (raw.isWandering) return 'flane'
  switch (raw.state) {
    case 'IDLE':        return 'repos'
    case 'MOVING':      return 'marche'
    case 'WORKING':     return 'travaille'
    case 'RESEARCHING': return 'recherche'
    default:            return (raw.state || 'repos').toLowerCase()
  }
}

function colonistView(raw) {
  return {
    id:      raw.id,
    name:    raw.name || '?',
    gender:  raw.gender || 'M',
    age:     raw.age != null ? raw.age : 0,
    chief:   !!raw.isChief,
    village: raw.village || 'souche',
    job:        raw.job || null,
    profession: raw.profession || null,
    state:      stateActivity(raw),
    hp:         raw.hp   != null ? raw.hp   : 80,
    mor:        raw.mor  != null ? raw.mor  : 70,
    faim:       raw.faim != null ? raw.faim : 60,
    skills:     raw.skills || {},
    rel:        raw.rel   || [],
    house:      raw.assignedBuildingId || null,
    _raw:       raw,
  }
}

// Récupère le label affiché pour la profession actuelle
function jobLabelOf(profId) {
  const jd = JOB_DEFS.find(j => j.id === profId)
  return jd ? jd.label : null
}

function escH(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// ---- Helpers de rendu ----

function stateBadge(activity) {
  let cls = 'idle'
  if (activity === 'travaille') cls = 'work'
  if (activity === 'recherche') cls = 'research'
  const labels = {
    repos: 'repos', marche: 'marche', travaille: 'travaille',
    recherche: 'recherche', flane: 'flâne',
  }
  return '<span class="pv2-state ' + cls + '">' + escH(labels[activity] || activity) + '</span>'
}

function bars(c) {
  return '<div class="pv2-bars">' +
    bar('HP',   c.hp,   'hp') +
    bar('Mor',  c.mor,  'mor') +
    bar('Faim', c.faim, 'faim') +
    '</div>'
}

function bar(lbl, val, cls) {
  const pct = Math.max(0, Math.min(100, val || 0))
  return '<div class="pv2-bar-row">' +
    '<span class="pv2-bar-lbl">' + lbl + '</span>' +
    '<div class="pv2-bar-track"><div class="pv2-bar-fill ' + cls + '" style="width:' + pct + '%"></div></div>' +
    '</div>'
}

function portrait(c) {
  const init = escH(c.name[0] || '?')
  return '<div class="pv2-portrait ' + c.gender.toLowerCase() + '">' + init + '</div>'
}

// ---- Classe principale ----

export class PopulationModal {
  constructor(panelEl) {
    this.panel = panelEl
    this.tab = 'liste'
    this.query = ''
    this.sortKey = 'name'
    this.sortDir = 1
    this.selectedId = null
    this.openJobId = null
    this._loadPrefs()
    this._injectFrame()
    this._bindEvents()
  }

  _loadPrefs() {
    try {
      const p = JSON.parse(localStorage.getItem('population.prefs') || '{}')
      if (p.tab && TABS.find(t => t.id === p.tab)) this.tab = p.tab
      if (p.sortKey) this.sortKey = p.sortKey
      if (p.sortDir) this.sortDir = p.sortDir
    } catch (e) { /* ignore */ }
  }

  _savePrefs() {
    try {
      localStorage.setItem('population.prefs', JSON.stringify({
        tab: this.tab, sortKey: this.sortKey, sortDir: this.sortDir,
      }))
    } catch (e) { /* ignore */ }
  }

  _injectFrame() {
    this.panel.innerHTML =
      '<div class="pop-frame pop-v2" id="popFrame">' +
      '  <div class="pv2-head">' +
      '    <h3>Population</h3>' +
      '    <span class="pv2-count"><span id="pv2-cnt">0</span> colons</span>' +
      '    <span class="pv2-spacer"></span>' +
      '    <button class="pv2-close pop-close" title="Fermer">&times;</button>' +
      '  </div>' +
      '  <div class="pv2-tabs" id="pv2-tabs"></div>' +
      '  <div class="pv2-body" id="pv2-body"></div>' +
      '</div>'
  }

  _bindEvents() {
    // Délégation unique sur le panel
    this.panel.addEventListener('click', e => {
      if (e.target.closest('.pop-close')) { this.close(); return }

      const tab = e.target.closest('.pv2-tab')
      if (tab) { this.setTab(tab.dataset.tab); return }

      const row = e.target.closest('tr[data-cid]')
      if (row) { this._selectColon(row.dataset.cid); return }

      const th = e.target.closest('th[data-sort]')
      if (th) { this._sort(th.dataset.sort); return }

      // Boutons d'assignation à un métier (priorité avant le clic carte)
      const assignBtn = e.target.closest('.pv2-job-action')
      if (assignBtn) {
        e.stopPropagation()
        const jid = assignBtn.dataset.jobId
        const cid = assignBtn.dataset.cid
        const action = assignBtn.dataset.action
        this._toggleAssign(jid, cid, action)
        return
      }

      // Clic sur une carte métier : toggle du sous-panneau
      const jobCard = e.target.closest('.pv2-job-card')
      if (jobCard && jobCard.dataset.jobId) {
        const jid = jobCard.dataset.jobId
        this.openJobId = (this.openJobId === jid) ? null : jid
        this._renderBody()
        return
      }
    })

    this.panel.addEventListener('input', e => {
      if (e.target.id === 'pv2-search') {
        this.query = e.target.value
        this._renderBody()
      }
    })
  }

  _selectColon(id) {
    this.selectedId = id
    this._renderBody()
  }

  _toggleAssign(jobId, colonistId, action) {
    const raw = state.colonists.find(c => String(c.id) === String(colonistId))
    if (!raw) return
    if (action === 'remove') {
      raw.profession = null
    } else {
      raw.profession = jobId
    }
    // Garder le sous-panneau ouvert pour permettre d'assigner plusieurs colons a la suite
    this._renderBody()
  }

  _sort(key) {
    if (this.sortKey === key) this.sortDir *= -1
    else { this.sortKey = key; this.sortDir = 1 }
    this._savePrefs()
    this._renderBody()
  }

  open() {
    this.panel.classList.add('open')
    this.render()
  }

  close() {
    this.panel.classList.remove('open')
  }

  setTab(id) {
    this.tab = id
    this.selectedId = null
    this.openJobId = null
    this._savePrefs()
    this.render()
  }

  render() {
    this._renderTabs()
    this._renderBody()
    const cnt = document.getElementById('pv2-cnt')
    if (cnt) cnt.textContent = state.colonists.length
  }

  _renderTabs() {
    const el = document.getElementById('pv2-tabs')
    if (!el) return
    el.innerHTML = TABS.map(t =>
      '<button class="pv2-tab' + (t.id === this.tab ? ' active' : '') + '" data-tab="' + t.id + '">' +
      escH(t.label) + '</button>'
    ).join('')
  }

  _renderBody() {
    const el = document.getElementById('pv2-body')
    if (!el) return
    const colonists = state.colonists.map(colonistView)
    if (this.tab === 'liste')       el.innerHTML = this._htmlListe(colonists)
    else if (this.tab === 'metiers') el.innerHTML = this._htmlMetiers(colonists)
    else if (this.tab === 'competences') el.innerHTML = this._htmlCompetences(colonists)
    // Rebrancher le champ search après innerHTML (perte du focus gérée par l'utilisateur)
    const search = document.getElementById('pv2-search')
    if (search && this.tab === 'liste') {
      search.value = this.query
    }
  }

  // ---- TAB LISTE ----

  _htmlListe(colonists) {
    const q = this.query.toLowerCase()
    let rows = q
      ? colonists.filter(c => c.name.toLowerCase().includes(q))
      : colonists.slice()

    rows.sort((a, b) => {
      const ak = a[this.sortKey] || ''
      const bk = b[this.sortKey] || ''
      return String(ak).localeCompare(String(bk)) * this.sortDir
    })

    const th = (key, label) => {
      const sorted = this.sortKey === key
      const arrow = sorted ? (this.sortDir > 0 ? '▲' : '▼') : '▼'
      return '<th data-sort="' + key + '" class="' + (sorted ? 'sorted' : '') + '">' +
        escH(label) + '<span class="sort-arrow">' + arrow + '</span></th>'
    }

    const tableHtml =
      '<div class="pv2-toolbar">' +
      '  <input class="pv2-search" id="pv2-search" type="text" placeholder="Rechercher un colon..." />' +
      '</div>' +
      '<div class="pv2-table-wrap">' +
      '<table class="pv2-table"><thead><tr>' +
      th('name',  'Nom') +
      th('state', 'Activité') +
      th('job',   'Métier') +
      '<th>Santé</th>' +
      '<th>Maison</th>' +
      '</tr></thead><tbody>' +
      rows.map(c => {
        const sel = String(c.id) === String(this.selectedId)
        const genderColor = c.gender === 'M' ? '#9dc4e8' : '#e89dc8'
        return '<tr data-cid="' + escH(c.id) + '" class="' + (sel ? 'selected' : '') + '">' +
          '<td class="pv2-name-cell">' +
          '  <span class="pv2-name">' + (c.chief ? '<span class="pv2-chief-star">★</span> ' : '') + escH(c.name) + '</span>' +
          '  <span class="pv2-gender ' + c.gender.toLowerCase() + '" style="color:' + genderColor + '">' + (c.gender === 'M' ? '♂' : '♀') + '</span>' +
          '</td>' +
          '<td>' + stateBadge(c.state) + '</td>' +
          '<td style="font-family:var(--mono);font-size:10.5px;color:var(--ink-3)">' + escH(c.job || '—') + '</td>' +
          '<td>' + bars(c) + '</td>' +
          '<td style="font-family:var(--mono);font-size:10px;color:var(--ink-3)">' + escH(c.house || '—') + '</td>' +
          '</tr>'
      }).join('') +
      '</tbody></table></div>'

    // Supprimer doublon portrait dans les td
    const selected = colonists.find(c => String(c.id) === String(this.selectedId))
    const detailHtml = selected
      ? '<div class="pv2-detail">' + this._htmlDetail(selected) + '</div>'
      : '<div class="pv2-detail"><div class="pv2-detail-empty">Sélectionne un colon</div></div>'

    return '<div class="pv2-liste"><div style="flex:1;display:flex;flex-direction:column;overflow:hidden">' +
      tableHtml + '</div>' + detailHtml + '</div>'
  }

  _htmlDetail(c) {
    return '<div class="pv2-dhead">' +
      portrait(c) +
      '<div>' +
      '  <div class="pv2-dname">' + (c.chief ? '<span class="pv2-chief-star">★</span> ' : '') + escH(c.name) + '</div>' +
      '  <div class="pv2-dmeta">' + (c.gender === 'M' ? '♂ Homme' : '♀ Femme') +
      (c.age ? ' &middot; ' + c.age + ' ans' : '') + '</div>' +
      '</div>' +
      '</div>' +
      '<div class="pv2-dsec">' +
      '  <div class="pv2-dsec-title">Activité</div>' + stateBadge(c.state) +
      '</div>' +
      '<div class="pv2-dsec">' +
      '  <div class="pv2-dsec-title">Métier</div>' +
      '  <div style="font-family:var(--serif);font-size:13px;color:var(--ink)">' + escH(c.job || 'Aucun') + '</div>' +
      '</div>' +
      '<div class="pv2-dsec">' +
      '  <div class="pv2-dsec-title">Santé &middot; Moral &middot; Faim</div>' + bars(c) +
      '</div>' +
      (c.house ? '<div class="pv2-dsec"><div class="pv2-dsec-title">Logement</div>' +
      '<div style="font-family:var(--mono);font-size:10.5px;color:var(--ink-2)">' + escH(c.house) + '</div></div>' : '')
  }

  // ---- TAB MÉTIERS ----

  _htmlMetiers(colonists) {
    const cards = JOB_DEFS.map(jd => {
      // Affectation se base sur la profession (champ piloté par l'UI)
      const assigned = colonists.filter(c => c.profession === jd.id)
      const skillName = JOB_SKILL[jd.id]
      const chips = assigned.length
        ? assigned.map(c => {
            const lvl = skillName ? skillLevelOf(c._raw, skillName) : 0
            const lvlTxt = lvl > 0 ? (' Niv.' + lvl) : ''
            return '<span class="pv2-job-chip' + (c.chief ? ' chief' : '') + '">' +
              escH(c.name) + escH(lvlTxt) + '</span>'
          }).join('')
        : '<span class="pv2-job-empty">Personne</span>'

      const isOpen = this.openJobId === jd.id
      const assignPanel = isOpen ? this._htmlJobAssignPanel(jd, colonists) : ''

      return '<div class="pv2-job-card' + (isOpen ? ' open' : '') + '" data-job-id="' + escH(jd.id) + '">' +
        '<div class="pv2-job-head">' +
        '  <div class="pv2-job-icon">' + jd.icon + '</div>' +
        '  <div>' +
        '    <div class="pv2-job-label">' + escH(jd.label) + '</div>' +
        '    <div class="pv2-job-req">' + (jd.req ? 'Req : ' + escH(jd.req) : 'Aucun prérequis') + '</div>' +
        '  </div>' +
        '</div>' +
        '<div class="pv2-job-desc">' + escH(jd.desc) + '</div>' +
        '<div class="pv2-job-cap">Affectés : <b>' + assigned.length + '</b></div>' +
        '<div class="pv2-job-assigned">' + chips + '</div>' +
        assignPanel +
        '</div>'
    })

    return '<div class="pv2-metiers">' + cards.join('') + '</div>'
  }

  _htmlJobAssignPanel(jd, colonists) {
    const skillName = JOB_SKILL[jd.id]
    const disponibles = colonists.filter(c => !c.profession || c.profession === jd.id)
    const rows = disponibles.map(c => {
      const isCurrent = c.profession === jd.id
      const lvl = skillName ? skillLevelOf(c._raw, skillName) : 0
      const lvlTxt = lvl > 0 ? '<span class="pv2-assign-lvl">Niv.' + lvl + '</span>' : ''
      const action = isCurrent ? 'remove' : 'assign'
      const btnLabel = isCurrent ? 'Retirer' : 'Assigner'
      const btnCls = 'pv2-job-action' + (isCurrent ? ' remove' : '')
      return '<div class="pv2-assign-row' + (isCurrent ? ' current' : '') + '">' +
        '<span class="pv2-assign-name">' +
          (c.chief ? '<span class="pv2-chief-star">★</span> ' : '') +
          escH(c.name) + ' ' + lvlTxt +
        '</span>' +
        '<button class="' + btnCls + '" data-action="' + action + '" data-job-id="' + escH(jd.id) + '" data-cid="' + escH(c.id) + '">' +
          escH(btnLabel) +
        '</button>' +
        '</div>'
    }).join('')

    const body = disponibles.length
      ? rows
      : '<div class="pv2-assign-empty">Aucun colon disponible.</div>'

    return '<div class="pv2-job-assign">' +
      '<div class="pv2-assign-title">Assigner à ' + escH(jd.label) + '</div>' +
      body +
      '</div>'
  }

  // ---- TAB COMPÉTENCES ----

  _htmlCompetences(colonists) {
    if (!colonists.length) {
      return '<div class="pv2-competences" style="color:var(--ink-3);font-family:var(--mono);font-size:11px;padding:24px">Aucun colon.</div>'
    }

    const sections = SKILL_CATEGORIES.map(cat => {
      const headerCols = '<th class="col-name"></th>' +
        colonists.map(c => '<th title="' + escH(c.name) + '">' + escH(c.name[0]) + '</th>').join('')

      const bodyRows = cat.skills.map(skill => {
        const cells = colonists.map(c => {
          const lvl = (c.skills[skill] || 0)
          const opacity = lvl > 0 ? (0.18 + lvl * 0.165) : 0.06
          const bg = lvl > 0 ? cat.color : 'var(--panel-3)'
          return '<td><div class="pv2-skill-cell" style="background:' + bg + ';opacity:' + opacity.toFixed(2) + ';min-width:24px">' +
            (lvl > 0 ? lvl : '') + '</div></td>'
        }).join('')
        return '<tr><td class="col-name">' + escH(skill) + '</td>' + cells + '</tr>'
      }).join('')

      return '<div class="pv2-skill-cat">' +
        '<div class="pv2-skill-cat-title" style="color:' + cat.color + '">' + escH(cat.label) + '</div>' +
        '<div class="pv2-skill-matrix">' +
        '<table class="pv2-skill-table">' +
        '<thead><tr>' + headerCols + '</tr></thead>' +
        '<tbody>' + bodyRows + '</tbody>' +
        '</table></div></div>'
    })

    return '<div class="pv2-competences">' + sections.join('') + '</div>'
  }
}

// ---- Init ----

let instance = null

export function initPopulationModal() {
  const panel = document.getElementById('popPanel')
  if (!panel) return
  instance = new PopulationModal(panel)
  // Rafraîchir au clic sur le rail (l'open/close du panel reste dans index.html)
  window.addEventListener('strates:populationOpen', () => {
    if (instance) instance.render()
  })
}

export function getPopulationModal() { return instance }
