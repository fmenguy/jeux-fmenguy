import { STOCK_KEYS } from './constants.js'
import { state } from './state.js'

// ============================================================================
// Stocks de ressources (pierre, terre, minerais)
// ============================================================================

// initialisation
for (const k of STOCK_KEYS) state.stocks[k] = 0

export function incrStockForBiome(biome) {
  if (biome === 'rock' || biome === 'snow') state.stocks.stone++
  else if (biome === 'grass' || biome === 'forest' || biome === 'sand') state.stocks.dirt++
}

export function totalBuildStock() {
  return state.stocks.stone + state.stocks.dirt
}

export function consumeBuildStock() {
  if (state.stocks.stone === 0 && state.stocks.dirt === 0) return false
  if (state.stocks.stone >= state.stocks.dirt) state.stocks.stone--
  else state.stocks.dirt--
  return true
}
