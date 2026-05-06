import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'

const status = document.getElementById('status')
status.textContent = 'Three.js chargé. Clic glisser pour pivoter, molette pour zoomer.'

const GLB_BASE = '../../editor/assets/models/fantaisy/'
const loader = new GLTFLoader()

const MAT = {
  brown:     new THREE.MeshLambertMaterial({ color: 0x8B5E3C }),
  darkBrown: new THREE.MeshLambertMaterial({ color: 0x5C3A1E }),
  woodLight: new THREE.MeshLambertMaterial({ color: 0xA67B4A }),
  woodDark:  new THREE.MeshLambertMaterial({ color: 0x4A3220 }),
  thatch:    new THREE.MeshLambertMaterial({ color: 0xC9A24A }),
  pise:      new THREE.MeshLambertMaterial({ color: 0xB89668 }),
  stone:     new THREE.MeshLambertMaterial({ color: 0x8a8784 }),
  brick:     new THREE.MeshLambertMaterial({ color: 0x8B4A38 }),
  ember:     new THREE.MeshStandardMaterial({ color: 0xff5520, emissive: 0xff3300, emissiveIntensity: 1.2 }),
  hide:      new THREE.MeshLambertMaterial({ color: 0x8c6a4a }),
  metal:     new THREE.MeshLambertMaterial({ color: 0x666b70 }),
}

function box(g, w, h, d, mat, x, y, z) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat)
  m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true
  g.add(m); return m
}
function cyl(g, rt, rb, h, mat, x, y, z, seg = 12) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat)
  m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true
  g.add(m); return m
}
function cone(g, r, h, mat, x, y, z, seg = 12) {
  const m = new THREE.Mesh(new THREE.ConeGeometry(r, h, seg), mat)
  m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true
  g.add(m); return m
}
function pyramid(g, base, h, mat, x, y, z) {
  return cone(g, base, h, mat, x, y, z, 4)
}

// ---------- Cabanes ----------
function makeCabaneActuelle() {
  const g = new THREE.Group()
  box(g, 1.0, 0.7, 1.0, MAT.woodLight, 0, 0.35, 0)
  pyramid(g, 0.85, 0.5, MAT.thatch, 0, 0.95, 0)
  return g
}
function makeCabanePise() {
  const g = new THREE.Group()
  box(g, 0.7, 0.5, 0.7, MAT.pise, 0, 0.25, 0)
  box(g, 0.18, 0.28, 0.05, MAT.darkBrown, 0, 0.14, 0.36)
  pyramid(g, 0.6, 0.55, MAT.thatch, 0, 0.78, 0)
  return g
}
function makeCabaneBois() {
  const g = new THREE.Group()
  box(g, 0.8, 0.4, 0.8, MAT.woodLight, 0, 0.2, 0)
  for (let i = 0; i < 4; i++) {
    const y = 0.06 + i * 0.1
    box(g, 0.82, 0.04, 0.84, MAT.woodDark, 0, y, 0)
  }
  // toit triangulaire (prisme)
  const roof = new THREE.Group()
  const triShape = new THREE.Shape()
  triShape.moveTo(-0.45, 0); triShape.lineTo(0.45, 0); triShape.lineTo(0, 0.45); triShape.lineTo(-0.45, 0)
  const ext = new THREE.ExtrudeGeometry(triShape, { depth: 0.85, bevelEnabled: false })
  const m = new THREE.Mesh(ext, MAT.woodDark); m.castShadow = true
  m.position.set(0, 0.4, -0.425)
  roof.add(m)
  g.add(roof)
  return g
}

// ---------- Hutte du sage ----------
function makeSageActuel() {
  const g = new THREE.Group()
  box(g, 1.1, 0.8, 1.1, MAT.darkBrown, 0, 0.4, 0)
  pyramid(g, 0.95, 0.7, MAT.thatch, 0, 1.15, 0)
  // totem central
  cyl(g, 0.05, 0.05, 0.4, MAT.woodDark, 0, 1.7, 0)
  return g
}
function makeSageTorches(scene, lightRegistry) {
  const g = new THREE.Group()
  box(g, 1.0, 0.7, 1.0, MAT.woodDark, 0, 0.35, 0)
  cone(g, 0.75, 0.9, MAT.thatch, 0, 1.15, 0, 8)
  // 4 torches aux coins
  const tPos = [[0.6, 0.6], [-0.6, 0.6], [0.6, -0.6], [-0.6, -0.6]]
  tPos.forEach(([x, z]) => {
    cyl(g, 0.04, 0.04, 0.6, MAT.woodDark, x, 0.3, z)
    box(g, 0.1, 0.1, 0.1, MAT.ember, x, 0.65, z)
    const pl = new THREE.PointLight(0xff7a20, 0.9, 3)
    pl.position.set(x, 0.7, z)
    g.add(pl)
    lightRegistry.push({ type: 'flame', light: pl, baseIntensity: 0.9 })
  })
  return g
}

// ---------- Promontoire ----------
function makePromoActuel() {
  const g = new THREE.Group()
  box(g, 0.7, 1.4, 0.7, MAT.woodLight, 0, 0.7, 0)
  box(g, 0.95, 0.1, 0.95, MAT.woodDark, 0, 1.45, 0)
  // garde-corps
  const gardes = [[0.45, 0.45], [-0.45, 0.45], [0.45, -0.45], [-0.45, -0.45]]
  gardes.forEach(([x, z]) => cyl(g, 0.04, 0.04, 0.3, MAT.woodDark, x, 1.65, z))
  pyramid(g, 0.7, 0.4, MAT.thatch, 0, 2.0, 0)
  return g
}
function makePromoObservatoire() {
  const g = new THREE.Group()
  box(g, 0.8, 0.6, 0.8, MAT.pise, 0, 0.3, 0)
  // toit ouvert (anneau)
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.4, 0.05, 6, 16),
    MAT.woodDark
  )
  ring.rotation.x = Math.PI / 2
  ring.position.y = 0.7
  g.add(ring)
  // télescope incliné
  const tube = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.08, 0.7, 10),
    MAT.metal
  )
  tube.position.set(0, 0.95, 0)
  tube.rotation.z = Math.PI / 4
  tube.castShadow = true
  g.add(tube)
  return g
}

// ---------- Grenier ----------
function makeGrenierPlaceholder() {
  const g = new THREE.Group()
  box(g, 1.0, 0.7, 1.0, MAT.thatch, 0, 0.35, 0)
  pyramid(g, 0.85, 0.4, MAT.woodDark, 0, 0.9, 0)
  return g
}
function makeGrenierPilotis() {
  const g = new THREE.Group()
  // 4 pilotis
  const pPos = [[0.35, 0.35], [-0.35, 0.35], [0.35, -0.35], [-0.35, -0.35]]
  pPos.forEach(([x, z]) => cyl(g, 0.05, 0.06, 0.5, MAT.woodDark, x, 0.25, z))
  // plateforme
  box(g, 0.95, 0.08, 0.95, MAT.woodLight, 0, 0.54, 0)
  // cabine
  box(g, 0.75, 0.55, 0.75, MAT.pise, 0, 0.86, 0)
  // toit
  pyramid(g, 0.65, 0.5, MAT.thatch, 0, 1.4, 0)
  return g
}
function makeGrenierSilo() {
  const g = new THREE.Group()
  cyl(g, 0.5, 0.5, 1.2, MAT.woodLight, 0, 0.6, 0, 16)
  // bandes
  for (let i = 0; i < 3; i++) {
    const y = 0.25 + i * 0.4
    const t = new THREE.Mesh(new THREE.TorusGeometry(0.51, 0.03, 6, 24), MAT.woodDark)
    t.rotation.x = Math.PI / 2
    t.position.y = y
    g.add(t)
  }
  cone(g, 0.55, 0.45, MAT.thatch, 0, 1.42, 0, 16)
  return g
}

// ---------- Forge ----------
function makeForgePlaceholder() {
  const g = new THREE.Group()
  box(g, 1.0, 0.5, 1.0, MAT.stone, 0, 0.25, 0)
  return g
}
function makeForgePrimitive(scene, lightRegistry) {
  const g = new THREE.Group()
  // socle pierre
  box(g, 1.0, 0.4, 1.0, MAT.stone, 0, 0.2, 0)
  // foyer rougeoyant
  box(g, 0.4, 0.12, 0.4, MAT.ember, 0, 0.46, 0.15)
  const pl = new THREE.PointLight(0xff5210, 1.0, 3.5)
  pl.position.set(0, 0.6, 0.15)
  g.add(pl)
  lightRegistry.push({ type: 'fire', light: pl, baseIntensity: 1.0 })
  // cheminée brique
  box(g, 0.32, 0.9, 0.32, MAT.brick, 0, 0.85, -0.3)
  box(g, 0.36, 0.05, 0.36, MAT.brick, 0, 1.32, -0.3)
  // petit toit incliné côté foyer
  const roofShape = new THREE.Shape()
  roofShape.moveTo(-0.55, 0); roofShape.lineTo(0.55, 0); roofShape.lineTo(0.55, 0.3); roofShape.lineTo(-0.55, 0)
  const ext = new THREE.ExtrudeGeometry(roofShape, { depth: 0.5, bevelEnabled: false })
  const roof = new THREE.Mesh(ext, MAT.woodDark)
  roof.position.set(0, 0.55, -0.05)
  roof.rotation.y = 0
  roof.castShadow = true
  g.add(roof)
  return g
}
function makeForgeTente(scene, lightRegistry) {
  const g = new THREE.Group()
  // base pierre
  box(g, 1.0, 0.3, 1.0, MAT.stone, 0, 0.15, 0)
  // 4 perches
  const pPos = [[0.4, 0.4], [-0.4, 0.4], [0.4, -0.4], [-0.4, -0.4]]
  pPos.forEach(([x, z]) => cyl(g, 0.03, 0.03, 1.0, MAT.woodDark, x, 0.8, z))
  // tente en peaux (cone tronqué)
  const tente = new THREE.Mesh(
    new THREE.ConeGeometry(0.7, 0.7, 4),
    MAT.hide
  )
  tente.position.set(0, 1.15, 0)
  tente.rotation.y = Math.PI / 4
  tente.castShadow = true
  g.add(tente)
  // foyer ouvert
  cyl(g, 0.25, 0.3, 0.08, MAT.stone, 0, 0.34, 0, 12)
  box(g, 0.3, 0.06, 0.3, MAT.ember, 0, 0.4, 0)
  const pl = new THREE.PointLight(0xff6020, 0.85, 3)
  pl.position.set(0, 0.55, 0)
  g.add(pl)
  lightRegistry.push({ type: 'fire', light: pl, baseIntensity: 0.85 })
  return g
}

// ---------- Ziggurat ----------
// Registre global des paliers : chaque entrée = { tiers: [Group...], statue?: Group, lights: [{light, baseIntensity}] }
const zigguratRegistry = []
let currentZigguratTier = 4

const COL_LIGHT = new THREE.MeshLambertMaterial({ color: 0xc0a878 })
const COL_DARK  = new THREE.MeshLambertMaterial({ color: 0x8a7050 })
const COL_COPPER = new THREE.MeshLambertMaterial({ color: 0xb87333 })

// 4 étages décroissants : 4x4, 3x3, 2x2, 1x1, hauteur 0.5 chacun.
function makeZigguratTiers(count = 4) {
  const tiers = []
  const sizes = [4, 3, 2, 1]
  const h = 0.5
  for (let i = 0; i < count; i++) {
    const g = new THREE.Group()
    const s = sizes[i]
    const mat = (i % 2 === 0) ? COL_LIGHT : COL_DARK
    const m = new THREE.Mesh(new THREE.BoxGeometry(s, h, s), mat)
    m.castShadow = true; m.receiveShadow = true
    m.position.y = i * h + h / 2
    g.add(m)
    tiers.push(g)
  }
  return tiers
}

function makeStaircase() {
  const g = new THREE.Group()
  // 4 marches sur la face avant (z+), la marche 0 au sol à l'extérieur, la marche 3 plus haute proche du centre
  for (let i = 0; i < 4; i++) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.1, 0.4), COL_DARK)
    m.castShadow = true; m.receiveShadow = true
    m.position.set(0, 0.05 + i * 0.1, 2.4 - i * 0.4)
    g.add(m)
  }
  return g
}

function makeZigguratV1() {
  const root = new THREE.Group()
  const tiers = makeZigguratTiers(4)
  tiers.forEach(t => root.add(t))
  const stairs = makeStaircase()
  root.add(stairs)
  // Light nuit centrale au sommet
  const pl = new THREE.PointLight(0xff8844, 0, 4)
  pl.position.set(0, 4 * 0.5 + 0.2, 0)
  root.add(pl)
  const lights = [{ light: pl, baseIntensity: 1.2 }]
  zigguratRegistry.push({ tiers, statue: null, stairs, lights })
  lights.forEach(l => allFlameLights.push({ type: 'ziggurat', light: l.light, baseIntensity: l.baseIntensity }))
  return root
}

function makeZigguratV2() {
  const root = new THREE.Group()
  const tiers = makeZigguratTiers(4)
  tiers.forEach(t => root.add(t))
  // Rampe diagonale plate sur le côté +x, du sol jusqu'au sommet de l'étage 4
  const totalH = 4 * 0.5
  const dx = 4.0   // distance horizontale parcourue (de x=2 sommet vers x=6 au sol approximativement)
  const rampLen = Math.sqrt(totalH * totalH + dx * dx)
  const angle = Math.atan2(totalH, dx)
  const ramp = new THREE.Mesh(
    new THREE.BoxGeometry(rampLen, 0.08, 0.6),
    COL_DARK
  )
  ramp.castShadow = true; ramp.receiveShadow = true
  // Centre de la rampe : x médian entre x=0 (sommet) et x=4 (sol), y médian entre 0 et totalH
  ramp.position.set(dx / 2, totalH / 2, 0)
  ramp.rotation.z = -angle
  root.add(ramp)
  // Light nuit centrale au sommet
  const pl = new THREE.PointLight(0xff8844, 0, 4)
  pl.position.set(0, totalH + 0.2, 0)
  root.add(pl)
  const lights = [{ light: pl, baseIntensity: 1.2 }]
  zigguratRegistry.push({ tiers, statue: null, ramp, lights })
  lights.forEach(l => allFlameLights.push({ type: 'ziggurat', light: l.light, baseIntensity: l.baseIntensity }))
  return root
}

function makeZigguratV3() {
  const root = new THREE.Group()
  // Seulement 3 étages bas
  const tiers = makeZigguratTiers(3)
  tiers.forEach(t => root.add(t))
  // Statue au sommet de l'étage 3 (y = 3 * 0.5 = 1.5)
  const statue = new THREE.Group()
  const baseY = 3 * 0.5
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.8, 12), COL_COPPER)
  body.castShadow = true; body.receiveShadow = true
  body.position.set(0, baseY + 0.4, 0)
  statue.add(body)
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.25, 12, 10), COL_COPPER)
  head.castShadow = true
  head.position.set(0, baseY + 0.8 + 0.25, 0)
  statue.add(head)
  root.add(statue)
  // 4 PointLights aux 4 coins de l'étage haut (3e, taille 2)
  const lights = []
  const cornerOffsets = [[0.9, 0.9], [-0.9, 0.9], [0.9, -0.9], [-0.9, -0.9]]
  cornerOffsets.forEach(([x, z]) => {
    const pl = new THREE.PointLight(0xff8844, 0, 4)
    pl.position.set(x, baseY + 0.1, z)
    root.add(pl)
    lights.push({ light: pl, baseIntensity: 1.2 })
  })
  zigguratRegistry.push({ tiers, statue, lights })
  lights.forEach(l => allFlameLights.push({ type: 'ziggurat', light: l.light, baseIntensity: l.baseIntensity }))
  return root
}

function applyZigguratTier(tier) {
  currentZigguratTier = tier
  zigguratRegistry.forEach(entry => {
    entry.tiers.forEach((t, i) => {
      // i = 0 base, doit toujours être visible si tier >= 1
      t.visible = (i + 1) <= tier
    })
    if (entry.statue) {
      // statue visible seulement à P4
      entry.statue.visible = (tier >= 4)
    }
    if (entry.stairs) {
      entry.stairs.visible = (tier >= 1)
    }
    if (entry.ramp) {
      // rampe visible dès P1 (en construction visuellement avec la base)
      entry.ramp.visible = (tier >= 1)
    }
  })
}

// ---------- GLB loader ----------
function loadGLB(scene, group, path, targetHeight = 2.2) {
  loader.load(path, (gltf) => {
    const obj = gltf.scene
    obj.traverse(c => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true } })
    // normaliser hauteur
    const bbox = new THREE.Box3().setFromObject(obj)
    const size = new THREE.Vector3(); bbox.getSize(size)
    const center = new THREE.Vector3(); bbox.getCenter(center)
    const scale = targetHeight / Math.max(size.y, 0.001)
    obj.scale.setScalar(scale)
    obj.position.x = -center.x * scale
    obj.position.z = -center.z * scale
    obj.position.y = -bbox.min.y * scale
    group.add(obj)
  }, undefined, (err) => {
    console.warn('GLB manquant', path, err)
    const miss = box(group, 0.8, 0.8, 0.8, new THREE.MeshLambertMaterial({ color: 0xff00ff }), 0, 0.4, 0)
    miss.userData.missing = true
  })
}

// ---------- Scene factory ----------
const allScenes = []
const allAmbients = []
const allFlameLights = []

function makeScene(canvas, builder, opts = {}) {
  const parent = canvas.parentElement
  const w = parent.clientWidth
  const h = parent.clientHeight - 28
  canvas.width = w; canvas.height = h

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
  renderer.setSize(w, h)
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap

  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x6a8fb5)

  const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 60)
  const camPos = opts.cameraPos || [2.4, 1.8, 2.6]
  camera.position.set(camPos[0], camPos[1], camPos[2])

  const controls = new OrbitControls(camera, canvas)
  const camTarget = opts.cameraTarget || [0, 0.7, 0]
  controls.target.set(camTarget[0], camTarget[1], camTarget[2])
  controls.enableDamping = true
  controls.update()

  const ambient = new THREE.AmbientLight(0xffffff, 0.55)
  scene.add(ambient)
  allAmbients.push(ambient)

  const sun = new THREE.DirectionalLight(0xfff2cc, 1.2)
  sun.position.set(4, 6, 3)
  sun.castShadow = true
  sun.shadow.mapSize.set(512, 512)
  sun.shadow.camera.left = -3; sun.shadow.camera.right = 3
  sun.shadow.camera.top = 3; sun.shadow.camera.bottom = -3
  scene.add(sun)

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(8, 8),
    new THREE.MeshLambertMaterial({ color: 0x4d7a3e })
  )
  ground.rotation.x = -Math.PI / 2
  ground.receiveShadow = true
  scene.add(ground)

  const modelGroup = new THREE.Group()
  scene.add(modelGroup)
  builder(scene, modelGroup, allFlameLights)

  function animate() {
    requestAnimationFrame(animate)
    controls.update()
    renderer.render(scene, camera)
  }
  animate()

  allScenes.push({ canvas, renderer, camera, scene, sun })
}

// ---------- Builders mapping ----------
const BUILDERS = {
  'cabane:0': (s, g) => g.add(makeCabaneActuelle()),
  'cabane:1': (s, g) => loadGLB(s, g, GLB_BASE + 'Hut.glb', 2.0),
  'cabane:2': (s, g) => g.add(makeCabanePise()),
  'cabane:3': (s, g) => g.add(makeCabaneBois()),

  'sage:0':   (s, g) => g.add(makeSageActuel()),
  'sage:1':   (s, g) => loadGLB(s, g, GLB_BASE + 'Wodden Temple.glb', 2.4),
  'sage:2':   (s, g, l) => g.add(makeSageTorches(s, l)),
  'sage:3':   (s, g) => loadGLB(s, g, GLB_BASE + 'Temple First Age Leve.glb', 2.4),

  'promo:0':  (s, g) => g.add(makePromoActuel()),
  'promo:1':  (s, g) => loadGLB(s, g, GLB_BASE + 'Watch Tower.glb', 2.6),
  'promo:2':  (s, g) => loadGLB(s, g, GLB_BASE + 'Stone Tower.glb', 2.6),
  'promo:3':  (s, g) => g.add(makePromoObservatoire()),

  'grenier:0': (s, g) => g.add(makeGrenierPlaceholder()),
  'grenier:1': (s, g) => loadGLB(s, g, GLB_BASE + 'Storage Hut.glb', 2.2),
  'grenier:2': (s, g) => g.add(makeGrenierPilotis()),
  'grenier:3': (s, g) => g.add(makeGrenierSilo()),

  'forge:0':   (s, g) => g.add(makeForgePlaceholder()),
  'forge:1':   (s, g, l) => g.add(makeForgePrimitive(s, l)),
  'forge:2':   (s, g, l) => g.add(makeForgeTente(s, l)),
  'forge:3':   (s, g) => loadGLB(s, g, GLB_BASE + 'Mine.glb', 2.2),

  'ziggurat:1': (s, g) => g.add(makeZigguratV1()),
  'ziggurat:2': (s, g) => g.add(makeZigguratV2()),
  'ziggurat:3': (s, g) => g.add(makeZigguratV3()),
}

const SCENE_OPTS = {
  ziggurat: {
    cameraPos: [5.5, 4.0, 5.5],
    cameraTarget: [0, 1.0, 0],
  },
}

// ---------- Init ----------
document.querySelectorAll('canvas[data-build]').forEach(canvas => {
  const key = canvas.dataset.build + ':' + canvas.dataset.variant
  const fn = BUILDERS[key]
  if (!fn) { console.warn('Builder manquant', key); return }
  const opts = SCENE_OPTS[canvas.dataset.build] || {}
  makeScene(canvas, fn, opts)
})

// Init paliers Ziggurat à P4 par défaut
applyZigguratTier(currentZigguratTier)

// Bind boutons palier
document.querySelectorAll('.tier-bar button[data-tier]').forEach(btn => {
  btn.addEventListener('click', () => {
    const tier = parseInt(btn.dataset.tier, 10)
    applyZigguratTier(tier)
    document.querySelectorAll('.tier-bar button[data-tier]').forEach(b => b.classList.remove('active'))
    btn.classList.add('active')
  })
})

// ---------- Day/Night ----------
let isNight = false
const btn = document.getElementById('toggleDayNight')
btn.addEventListener('click', () => {
  isNight = !isNight
  btn.textContent = isNight ? 'Passer en jour' : 'Passer en nuit'
  allScenes.forEach(({ scene, sun }) => {
    scene.background = new THREE.Color(isNight ? 0x1a2238 : 0x6a8fb5)
    sun.intensity = isNight ? 0.15 : 1.2
    sun.color = new THREE.Color(isNight ? 0x6080a0 : 0xfff2cc)
  })
  allAmbients.forEach(a => { a.intensity = isNight ? 0.15 : 0.55 })
  allFlameLights.forEach(({ type, light, baseIntensity }) => {
    if (type === 'ziggurat') {
      light.intensity = isNight ? baseIntensity : 0
    } else {
      light.intensity = isNight ? baseIntensity * 1.8 : baseIntensity * 0.4
    }
  })
})

// initial state, flammes faibles de jour, ziggurat éteint
allFlameLights.forEach(({ type, light, baseIntensity }) => {
  if (type === 'ziggurat') {
    light.intensity = 0
  } else {
    light.intensity = baseIntensity * 0.4
  }
})

// ---------- Resize ----------
window.addEventListener('resize', () => {
  allScenes.forEach(({ canvas, renderer, camera }) => {
    const parent = canvas.parentElement
    const w = parent.clientWidth
    const h = parent.clientHeight - 28
    canvas.width = w; canvas.height = h
    renderer.setSize(w, h)
    camera.aspect = w / h
    camera.updateProjectionMatrix()
  })
})
