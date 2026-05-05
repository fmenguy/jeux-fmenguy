import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'

// ============================================================================
// Cache de modeles GLB charges une seule fois au demarrage.
// getModel(key) retourne un clone profond pret a etre place en scene.
// getModelClips(key) retourne les AnimationClip[] du modele.
// loadModels() est un Promise a attendre avant la generation du monde.
// ============================================================================

const BASE = new URL('../assets/models/fantaisy/', import.meta.url).href

// Constantes de mise a l'echelle par type (ajuster selon les GLB)
export const TREE_GLB_SCALE = 0.40
export const ROCK_GLB_SCALE = 1.92
export const DEER_GLB_SCALE = 0.5
// Scale appliqué aux GLB Farm/Farm Dirt après centrage. Le footprint cible
// est 2x2 cellules ; le scale dépend de la taille native du GLB (ajustable).
export const FARM_GLB_SCALE = 0.5

const MANIFEST = {
  tree: 'Pine.glb',
  rock: 'Rock.glb',
  deer: 'Deer.glb',
  'farm-dirt':      'Farm Dirt.glb',
  'farm-sprouting': 'Farm.glb',
  // house, hut, bonfire retires — fallback procedural utilise
}

const _cache = {}
const _clips = {}
let _ready = false
const _loader = new GLTFLoader()

function _loadOne(key, filename) {
  return new Promise(function(resolve) {
    _loader.load(
      BASE + encodeURIComponent(filename),
      function(gltf) {
        _cache[key] = gltf.scene
        _clips[key] = gltf.animations || []
        resolve()
      },
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
  if (!_cache[key]) {
    if (key === 'deer') console.log('[deer] cache miss for key deer, _cache keys:', Object.keys(_cache))
    return null
  }
  if (key === 'deer') {
    let mc = 0
    _cache[key].traverse(function(o) { if (o.isMesh) mc++ })
    console.log('[deer] cache hit, source meshes:', mc)
  }
  return _cache[key].clone(true)
}

export function getModelClips(key) {
  return _clips[key] || []
}
