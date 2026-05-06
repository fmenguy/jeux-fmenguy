// ============================================================================
// journal.js -- Lot B
// Journal du village. Couche moteur pure : log d evenements + snapshots
// periodiques de stats agregees. Aucune UI ici (le rendu sera assure par
// Lot C). Les events et snapshots sont bornes par taille pour eviter une
// croissance illimitee de la save / de la memoire.
// ============================================================================

import { state } from './state.js'

const MAX_EVENTS = 1000
const MAX_SNAPSHOTS = 200

function _ensureJournal() {
  if (!state.journal) state.journal = { events: [], snapshots: [] }
  if (!Array.isArray(state.journal.events)) state.journal.events = []
  if (!Array.isArray(state.journal.snapshots)) state.journal.snapshots = []
}

// Pousse un evenement dans le journal. payload est un objet libre (serialisable
// JSON). Le timestamp temps de jeu (year, season, day) est capture ici pour
// que l UI puisse trier et regrouper sans re-calculer.
export function logEvent(type, payload = {}) {
  _ensureJournal()
  const s = state.season || { idx: 0, year: 1 }
  const event = {
    type,
    payload,
    year: s.year != null ? s.year : 1,
    season: s.idx != null ? s.idx : 0,
    day: state.dayCount != null ? state.dayCount : 0,
    ts: Date.now()
  }
  state.journal.events.push(event)
  if (state.journal.events.length > MAX_EVENTS) {
    state.journal.events.splice(0, state.journal.events.length - MAX_EVENTS)
  }
}

// Capture une snapshot de stats agregees. Appele a chaque changement de saison
// (cf. seasons.js::tickSeasons). Conserve les compteurs de batiments, stocks,
// ressources, techs et population pour permettre des graphes historiques.
export function snapshotStats() {
  _ensureJournal()
  const s = state.season || { idx: 0, year: 1 }
  const snap = {
    year: s.year != null ? s.year : 1,
    season: s.idx != null ? s.idx : 0,
    ts: Date.now(),
    pop: state.colonists ? state.colonists.length : 0,
    stocks: Object.assign({}, state.stocks || {}),
    resources: Object.assign({}, state.resources || {}),
    techsCount: Object.values(state.techs || {}).filter(t => t && t.unlocked).length,
    buildingsCount:
        (state.houses ? state.houses.length : 0)
      + (state.bigHouses ? state.bigHouses.length : 0)
      + (state.foyers ? state.foyers.length : 0)
      + (state.observatories ? state.observatories.length : 0)
      + (state.researchHouses ? state.researchHouses.length : 0)
      + (state.cairns ? state.cairns.length : 0)
      + (state.wheatFields ? state.wheatFields.length : 0)
      + (state.forges ? state.forges.length : 0)
  }
  state.journal.snapshots.push(snap)
  if (state.journal.snapshots.length > MAX_SNAPSHOTS) {
    state.journal.snapshots.splice(0, state.journal.snapshots.length - MAX_SNAPSHOTS)
  }
}

// Lecture des events. filter peut etre :
//   - undefined : retourne tous les events (copie shallow)
//   - string    : filtre par type exact
//   - function  : predicate (event) => bool
export function getEvents(filter) {
  if (!state.journal || !Array.isArray(state.journal.events)) return []
  if (!filter) return state.journal.events.slice()
  if (typeof filter === 'string') {
    return state.journal.events.filter(e => e.type === filter)
  }
  if (typeof filter === 'function') {
    return state.journal.events.filter(filter)
  }
  return state.journal.events.slice()
}

export function getSnapshots() {
  if (!state.journal || !Array.isArray(state.journal.snapshots)) return []
  return state.journal.snapshots.slice()
}
