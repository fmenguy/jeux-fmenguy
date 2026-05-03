// ============================================================================
// debug.js : helpers de logs gatés derrière un flag.
//
// Activation au runtime :
//   window.STRATES_DEBUG = true
//   ou URL ?debug=1
//
// En production (sans flag), dlog/dinfo/dwarn sont des no-op.
// Les vraies erreurs continuent à utiliser console.error directement.
// ============================================================================

const _enabled = (() => {
  try {
    if (typeof window !== 'undefined' && window.STRATES_DEBUG) return true
    if (typeof window !== 'undefined' && window.location) {
      const sp = new URLSearchParams(window.location.search)
      if (sp.has('debug') || sp.get('mode') === 'sandbox') return true
    }
  } catch (e) { /* ignore */ }
  return false
})()

export const STRATES_DEBUG = _enabled

export function dlog(...args)  { if (_enabled) console.log(...args) }
export function dinfo(...args) { if (_enabled) console.info(...args) }
export function dwarn(...args) { if (_enabled) console.warn(...args) }
