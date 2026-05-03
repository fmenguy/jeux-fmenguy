// ============================================================================
// modal-state.js : helper centralisé pour détecter l'ouverture d'une modale
// ou d'un panneau de jeu, et masquer automatiquement tous les éléments HUD
// (topbar, actionbar, leftrail, barres de chantier, tooltip Cairn, etc.)
// pour éviter les superpositions visuelles.
//
// Approche :
//   1. Une liste centrale de sélecteurs `BLOCKING_MODAL_SELECTORS` couvre toutes
//      les modales/panneaux du jeu (pause, sauvegarde, fiche colon, info bât,
//      population, quêtes, tech tree, aide, agriculture).
//   2. Une fonction `isAnyBlockingModalOpen()` exposée pour les modules qui en
//      ont besoin (ex : construction-fx pour la projection world-to-screen).
//   3. Un toggle automatique de la classe `body.modal-open` est maintenu via
//      MutationObserver sur les éléments cibles. Lorsqu'au moins une modale
//      est ouverte, les règles CSS associées masquent les éléments HUD.
//
// Aucun module métier ne doit dupliquer cette logique. Pour ajouter une
// nouvelle modale, il suffit d'inscrire son sélecteur ici.
// ============================================================================

export const BLOCKING_MODAL_SELECTORS = [
  '#popPanel.open',                       // Population
  '#quests.open',                         // Quêtes
  '#ttp-root.open',                       // Tech tree (XXL Lot C)
  '#help-overlay.open',                   // Aide (Clair Obscur)
  '#agri-overlay.open',                   // Agriculture
  '#char-panel:not(.hidden)',             // Fiche colon (Charsheet)
  '#bp-panel:not(.hidden)',               // Info bâtiment
  '#pause-menu:not(.hidden)',             // Menu pause (Échap)
  '#save-menu:not(.hidden)',              // Sauvegardes
]

const SELECTOR_JOINED = BLOCKING_MODAL_SELECTORS.join(',')

export function isAnyBlockingModalOpen() {
  return !!document.querySelector(SELECTOR_JOINED)
}

// ----- Maintien de la classe body.modal-open ---------------------------------

let installed = false
let lastState = false

function syncBodyClass() {
  const open = isAnyBlockingModalOpen()
  if (open === lastState) return
  lastState = open
  if (open) document.body.classList.add('modal-open')
  else document.body.classList.remove('modal-open')
}

function installStyle() {
  if (document.getElementById('modal-state-style')) return
  const s = document.createElement('style')
  s.id = 'modal-state-style'
  // Liste des éléments HUD à masquer dès qu'une modale bloquante est ouverte.
  // Couvre la barre du haut (topbar), barre d'actions du bas (actionbar),
  // rail latéral droit (leftrail), barres de progression de chantier
  // (construction-fx-overlay), tooltip conditions Cairn, et la season bar.
  s.textContent = [
    'body.modal-open .topbar,',
    'body.modal-open #actionbar,',
    'body.modal-open .leftrail,',
    'body.modal-open #construction-fx-overlay,',
    'body.modal-open #cairn-conditions-tooltip,',
    'body.modal-open #season-bar-pill {',
    '  display: none !important;',
    '}',
  ].join('\n')
  document.head.appendChild(s)
}

export function initModalState() {
  if (installed) return
  installed = true
  installStyle()

  // MutationObserver global sur le body : tout changement d'attribut class ou
  // style sur un descendant peut indiquer l'ouverture/fermeture d'une modale.
  // On filtre par scrutation de attributeFilter pour rester économe.
  const obs = new MutationObserver(() => {
    syncBodyClass()
  })
  obs.observe(document.body, {
    subtree: true,
    attributes: true,
    attributeFilter: ['class', 'style'],
    childList: true,
  })

  // Synchronisation initiale et filet de sécurité (cas où un module modifierait
  // un attribut sans déclencher correctement le MutationObserver, ou si la
  // modale est créée dynamiquement avant init).
  syncBodyClass()
  setInterval(syncBodyClass, 250)
}
