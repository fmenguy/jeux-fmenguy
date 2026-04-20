import * as THREE from 'three'
import {
  CAMERA_KEY_FORWARD, CAMERA_KEY_BACKWARD, CAMERA_KEY_LEFT, CAMERA_KEY_RIGHT,
  CAMERA_KEY_ROTATE_LEFT, CAMERA_KEY_ROTATE_RIGHT
} from './constants.js'
import { state } from './state.js'
import { camera, controls } from './scene.js'

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
}
