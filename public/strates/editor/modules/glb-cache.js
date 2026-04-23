import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'

// ============================================================================
// Cache de modeles GLB charges une seule fois au demarrage.
// getModel(key) retourne un clone profond pret a etre place en scene.
// loadModels() est un Promise a attendre avant la generation du monde.
// ============================================================================

const BASE = new URL('../assets/models/fantaisy/', import.meta.url).href

// Constantes de mise a l'echelle par type (ajuster selon les GLB)
export const TREE_GLB_SCALE  = 0.38
export const ROCK_GLB_SCALE  = 0.32
export const HOUSE_GLB_SCALE = 0.50
export const HUT_GLB_SCALE   = 0.45
export const DEER_GLB_SCALE  = 0.28

const MANIFEST = {
  tree:  'Pine Trees.glb',
  rock:  'Rock.glb',
  house: 'House.glb',
  hut:   'Hut.glb',
  deer:  'Deer.glb',
}

const _cache = {}
let _ready = false
const _loader = new GLTFLoader()

function _loadOne(key, filename) {
  return new Promise(function(resolve) {
    _loader.load(
      BASE + encodeURIComponent(filename),
      function(gltf) { _cache[key] = gltf.scene; resolve() },
      undefined,
      function() { resolve() }  // echec silencieux -> fallback procedural
    )
  })
}

export function loadModels() {
  const promises = Object.keys(MANIFEST).map(function(k) { return _loadOne(k, MANIFEST[k]) })
  return Promise.all(promises).then(function() { _ready = true })
}

export function modelsReady() { return _ready }

export function getModel(key) {
  if (!_cache[key]) return null
  return _cache[key].clone(true)
}
