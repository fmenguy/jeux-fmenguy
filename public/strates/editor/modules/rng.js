// ============================================================================
// PRNG + bruit Perlin. seedRand et rng reassignables via resetRng().
// ============================================================================

export function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0
    let t = a
    t = Math.imul(t ^ t >>> 15, t | 1)
    t ^= t + Math.imul(t ^ t >>> 7, t | 61)
    return ((t ^ t >>> 14) >>> 0) / 4294967296
  }
}

// Containers reassignables (live binding via proprietes d'objet).
export const prng = {
  seedRand: mulberry32(1337),
  rng: mulberry32(7777)
}

export function resetRng(newSeed) {
  prng.seedRand = mulberry32(newSeed)
  prng.rng = mulberry32(newSeed + 1)
}

export function rng() { return prng.rng() }
export function seedRand() { return prng.seedRand() }

export const PERM = new Uint8Array(512)

export function rebuildPerm() {
  const p = new Uint8Array(256)
  for (let i = 0; i < 256; i++) p[i] = i
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(prng.seedRand() * (i + 1))
    const t = p[i]; p[i] = p[j]; p[j] = t
  }
  for (let i = 0; i < 512; i++) PERM[i] = p[i & 255]
}
rebuildPerm()

export function fade(t) { return t * t * t * (t * (t * 6 - 15) + 10) }
export function lerp(a, b, t) { return a + (b - a) * t }
export function grad(hash, x, y) {
  const h = hash & 3
  const u = h < 2 ? x : y
  const v = h < 2 ? y : x
  return ((h & 1) ? -u : u) + ((h & 2) ? -v : v)
}
export function perlin2(x, y) {
  const xi = Math.floor(x) & 255
  const yi = Math.floor(y) & 255
  const xf = x - Math.floor(x)
  const yf = y - Math.floor(y)
  const u = fade(xf), v = fade(yf)
  const aa = PERM[PERM[xi] + yi]
  const ab = PERM[PERM[xi] + yi + 1]
  const ba = PERM[PERM[xi + 1] + yi]
  const bb = PERM[PERM[xi + 1] + yi + 1]
  const x1 = lerp(grad(aa, xf, yf), grad(ba, xf - 1, yf), u)
  const x2 = lerp(grad(ab, xf, yf - 1), grad(bb, xf - 1, yf - 1), u)
  return lerp(x1, x2, v)
}
export function fbm(x, y, oct = 4) {
  let amp = 1, freq = 1, sum = 0, norm = 0
  for (let i = 0; i < oct; i++) {
    sum += perlin2(x * freq, y * freq) * amp
    norm += amp
    amp *= 0.5; freq *= 2
  }
  return sum / norm
}
