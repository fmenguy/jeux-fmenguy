import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'
import { Sky } from 'three/addons/objects/Sky.js'
import { GRID } from './constants.js'

// ============================================================================
// Boot rendu : renderer, scene, camera, controls, ciel, lumieres, post-process
// ============================================================================

export const app = document.getElementById('app')
export const loader = document.getElementById('loader')

export const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' })
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
renderer.outputColorSpace = THREE.SRGBColorSpace
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1.05
app.appendChild(renderer.domElement)

export const scene = new THREE.Scene()
scene.background = new THREE.Color(0xcfe6f5)
scene.fog = new THREE.FogExp2(0xcfe6f5, 0.005)

export const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.5, 800)
camera.position.set(GRID * 0.9, GRID * 0.7, GRID * 0.9)
camera.lookAt(GRID / 2, 0, GRID / 2)

export const controls = new OrbitControls(camera, renderer.domElement)
controls.target.set(GRID / 2, 2, GRID / 2)
controls.enableDamping = true
controls.dampingFactor = 0.08
controls.minDistance = 18
controls.maxDistance = GRID * 3
controls.maxPolarAngle = Math.PI * 0.48
controls.mouseButtons = { LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN }

// ---------- ciel ----------
export const sky = new Sky()
sky.scale.setScalar(450)
scene.add(sky)
export const sunDir = new THREE.Vector3()
const skyU = sky.material.uniforms
skyU.turbidity.value = 6
skyU.rayleigh.value = 1.6
skyU.mieCoefficient.value = 0.006
skyU.mieDirectionalG.value = 0.85
sunDir.setFromSphericalCoords(1, THREE.MathUtils.degToRad(60), THREE.MathUtils.degToRad(135))
skyU.sunPosition.value.copy(sunDir)

// ---------- lumieres ----------
export const sun = new THREE.DirectionalLight(0xfff2d9, 2.4)
sun.position.set(60, 70, 40)
sun.castShadow = true
// Lot B perf : 1024 au lieu de 2048 (4x moins de pixels a rasteriser/frame).
// Qualite visuelle quasi identique a cette distance camera.
sun.shadow.mapSize.set(1024, 1024)
sun.shadow.camera.near = 1
sun.shadow.camera.far = 200
{
  const d = 80
  sun.shadow.camera.left = -d
  sun.shadow.camera.right = d
  sun.shadow.camera.top = d
  sun.shadow.camera.bottom = -d
}
sun.shadow.bias = -0.0008
sun.shadow.normalBias = 0.05
scene.add(sun)
scene.add(sun.target)
sun.target.position.set(GRID / 2, 0, GRID / 2)

export const hemi = new THREE.HemisphereLight(0xbcd7ff, 0x3a2a1a, 0.55)
scene.add(hemi)

// ---------- post-process ----------
export const composer = new EffectComposer(renderer)
composer.addPass(new RenderPass(scene, camera))
export const bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.35, 0.85, 0.92)
composer.addPass(bloom)
const vignetteShader = {
  uniforms: { tDiffuse: { value: null }, uStrength: { value: 0.55 }, uSoftness: { value: 0.65 } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform float uStrength; uniform float uSoftness; varying vec2 vUv;
    void main() {
      vec4 c = texture2D(tDiffuse, vUv);
      vec2 d = vUv - 0.5; float r = length(d);
      float v = smoothstep(0.75, uSoftness * 0.35, r);
      c.rgb *= mix(1.0 - uStrength, 1.0, v);
      c.rgb = mix(c.rgb, c.rgb * vec3(1.04, 0.99, 0.92), 1.0 - v);
      gl_FragColor = c;
    }
  `
}
export const vignettePass = new ShaderPass(vignetteShader)
composer.addPass(vignettePass)
composer.addPass(new OutputPass())

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
  composer.setSize(window.innerWidth, window.innerHeight)
})

// Scratchers partages
export const tmpObj = new THREE.Object3D()
export const tmpColor = new THREE.Color()
export const HIDDEN_MATRIX = new THREE.Matrix4().makeScale(0, 0, 0)
