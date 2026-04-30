import * as THREE from 'three'
import {
  GRID,
  CAMERA_KEY_FORWARD, CAMERA_KEY_BACKWARD, CAMERA_KEY_LEFT, CAMERA_KEY_RIGHT,
  CAMERA_KEY_ROTATE_LEFT, CAMERA_KEY_ROTATE_RIGHT
} from './constants.js'
import { state } from './state.js'
import { camera, controls } from './scene.js'

// Contraintes de deplacement camera
const CAM_BORDER  = 6   // marge horizontale autour de la carte (unites)
const CAM_ABOVE   = 3   // altitude min au-dessus du point le plus haut du terrain

let _maxHeightCache = 5
let _maxHeightTime  = 0

function terrainMaxHeight() {
  const now = performance.now()
  if (now - _maxHeightTime < 2000) return _maxHeightCache
  _maxHeightTime = now
  if (!state.cellTop) return 5
  let max = 0
  for (let i = 0, len = state.cellTop.length; i < len; i++) {
    if (state.cellTop[i] > max) max = state.cellTop[i]
  }
  _maxHeightCache = max
  return max
}

export function clampCamera() {
  const lo = -CAM_BORDER
  const hi = GRID + CAM_BORDER
  controls.target.x = THREE.MathUtils.clamp(controls.target.x, lo, hi)
  controls.target.z = THREE.MathUtils.clamp(controls.target.z, lo, hi)
  camera.position.x = THREE.MathUtils.clamp(camera.position.x, lo, hi)
  camera.position.z = THREE.MathUtils.clamp(camera.position.z, lo, hi)
  const minY = terrainMaxHeight() + CAM_ABOVE
  if (camera.position.y < minY) camera.position.y = minY
}

// ============================================================================
// Deplacement camera ZQSD / WASD
// ============================================================================

export function isEditableTarget(el) {
  if (!el) return false
  const tag = el.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true
  if (el.isContentEditable) return true
  return false
}

window.addEventListener('keydown', (e) => {
  if (isEditableTarget(document.activeElement)) return
  state.cameraKeys.add(e.key)
})
window.addEventListener('keyup', (e) => {
  state.cameraKeys.delete(e.key)
})
window.addEventListener('blur', () => { state.cameraKeys.clear() })

const camTmpForward = new THREE.Vector3()
const camTmpRight = new THREE.Vector3()
const camTmpMove = new THREE.Vector3()
const camTmpOffset = new THREE.Vector3()
const camRotAxis = new THREE.Vector3(0, 1, 0)
const ROT_SPEED = 1.2 // rad/s

export function updateCameraPan(dt) {
  if (isEditableTarget(document.activeElement)) return
  let fwd = 0, side = 0, rot = 0
  for (const k of state.cameraKeys) {
    if (CAMERA_KEY_FORWARD.has(k)) fwd += 1
    else if (CAMERA_KEY_BACKWARD.has(k)) fwd -= 1
    else if (CAMERA_KEY_LEFT.has(k)) side -= 1
    else if (CAMERA_KEY_RIGHT.has(k)) side += 1
    else if (CAMERA_KEY_ROTATE_LEFT.has(k)) rot -= 1
    else if (CAMERA_KEY_ROTATE_RIGHT.has(k)) rot += 1
  }

  if (rot !== 0) {
    camTmpOffset.subVectors(camera.position, controls.target)
    camTmpOffset.applyAxisAngle(camRotAxis, rot * ROT_SPEED * dt)
    camera.position.copy(controls.target).add(camTmpOffset)
    controls.update()
  }

  if (fwd === 0 && side === 0) return

  camTmpForward.subVectors(controls.target, camera.position)
  camTmpForward.y = 0
  if (camTmpForward.lengthSq() < 1e-6) return
  camTmpForward.normalize()
  camTmpRight.set(-camTmpForward.z, 0, camTmpForward.x)

  const dist = camera.position.distanceTo(controls.target)
  const speed = THREE.MathUtils.clamp(dist * 0.30, 8, 60)

  camTmpMove.set(0, 0, 0)
  camTmpMove.addScaledVector(camTmpForward, fwd)
  camTmpMove.addScaledVector(camTmpRight, side)
  if (camTmpMove.lengthSq() < 1e-6) return
  camTmpMove.normalize().multiplyScalar(speed * dt)

  controls.target.add(camTmpMove)
  camera.position.add(camTmpMove)
  clampCamera()
}
