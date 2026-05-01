// ============================================================================
// Shim de compatibilite : main.js importe historiquement
//   { initTechTreeUI, toggleTechTree, closeTechTree } from './techtree-ui.js'
//
// Le vrai panneau Tech tree XXL (Lot C) vit dans modules/ui/techtree-panel.js.
// Pour garder main.js intact (scope Lot C strict), ce module re-exporte
// simplement les bindings du nouveau panel.
// ============================================================================
import {
  initTechTreePanel,
  openTechTreePanel,
  closeTechTreePanel,
  toggleTechTreePanel
} from './ui/techtree-panel.js'

export function initTechTreeUI()  { initTechTreePanel() }
export function openTechTree()    { openTechTreePanel() }
export function closeTechTree()   { closeTechTreePanel() }
export function toggleTechTree()  { toggleTechTreePanel() }

export { refreshTechTreeAfterAgeChange } from './ui/techtree-panel.js'
