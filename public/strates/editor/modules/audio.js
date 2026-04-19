// ============================================================================
// Audio ambient lofi procedural (Web Audio API, aucun fichier externe).
// Drone bas + arpege pentatonique doux + noise filtre pour texture.
// Toggle mute via bouton HUD. Demarre au premier geste utilisateur (politique
// autoplay navigateurs).
// ============================================================================

let ctx = null
let masterGain = null
let muted = true
let started = false

const LOFI_MUTE_KEY = 'strates-audio-muted'

function createEngine() {
  if (ctx) return
  const AC = window.AudioContext || window.webkitAudioContext
  if (!AC) return
  ctx = new AC()
  masterGain = ctx.createGain()
  masterGain.gain.value = 0.0
  masterGain.connect(ctx.destination)

  // drone bas, deux oscillateurs legerement detunes
  const droneGain = ctx.createGain()
  droneGain.gain.value = 0.18
  const droneFilter = ctx.createBiquadFilter()
  droneFilter.type = 'lowpass'
  droneFilter.frequency.value = 420
  droneFilter.Q.value = 0.6
  droneGain.connect(droneFilter)
  droneFilter.connect(masterGain)

  const osc1 = ctx.createOscillator()
  osc1.type = 'triangle'
  osc1.frequency.value = 55 // La1 bas
  osc1.connect(droneGain)
  const osc2 = ctx.createOscillator()
  osc2.type = 'sine'
  osc2.frequency.value = 82.41 // Mi2 (quinte)
  osc2.detune.value = 6
  osc2.connect(droneGain)
  osc1.start()
  osc2.start()

  // lent vibrato sur osc2 pour animer
  const lfo = ctx.createOscillator()
  const lfoGain = ctx.createGain()
  lfoGain.gain.value = 3
  lfo.frequency.value = 0.12
  lfo.connect(lfoGain)
  lfoGain.connect(osc2.frequency)
  lfo.start()

  // arpege aleatoire lent (gammes pentatoniques)
  const SCALE = [220, 246.94, 293.66, 329.63, 392, 440, 493.88, 587.33]
  const arpGain = ctx.createGain()
  arpGain.gain.value = 0
  const arpFilter = ctx.createBiquadFilter()
  arpFilter.type = 'lowpass'
  arpFilter.frequency.value = 1800
  arpFilter.Q.value = 1.2
  arpGain.connect(arpFilter)
  arpFilter.connect(masterGain)

  function playArpNote() {
    if (!ctx || muted) return
    const now = ctx.currentTime
    const f = SCALE[Math.floor(Math.random() * SCALE.length)]
    const osc = ctx.createOscillator()
    osc.type = 'sine'
    osc.frequency.value = f
    const noteGain = ctx.createGain()
    noteGain.gain.setValueAtTime(0, now)
    noteGain.gain.linearRampToValueAtTime(0.08, now + 0.3)
    noteGain.gain.exponentialRampToValueAtTime(0.001, now + 3.5)
    osc.connect(noteGain)
    noteGain.connect(arpGain)
    osc.start(now)
    osc.stop(now + 4.0)
    // note occasionnelle d'octave pour color
    if (Math.random() < 0.15) {
      const osc2 = ctx.createOscillator()
      osc2.type = 'triangle'
      osc2.frequency.value = f * 2
      const g2 = ctx.createGain()
      g2.gain.setValueAtTime(0, now)
      g2.gain.linearRampToValueAtTime(0.04, now + 0.3)
      g2.gain.exponentialRampToValueAtTime(0.001, now + 3.5)
      osc2.connect(g2)
      g2.connect(arpGain)
      osc2.start(now + 0.2)
      osc2.stop(now + 4.0)
    }
  }

  // augmente le gain arp progressivement
  arpGain.gain.linearRampToValueAtTime(0.8, ctx.currentTime + 5)

  function scheduleNext() {
    const delayMs = 1800 + Math.random() * 3500
    setTimeout(() => {
      playArpNote()
      scheduleNext()
    }, delayMs)
  }
  scheduleNext()

  // noise filtre discret pour texture cassette
  const bufferSize = 2 * ctx.sampleRate
  const noiseBuf = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
  const data = noiseBuf.getChannelData(0)
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1
  const noise = ctx.createBufferSource()
  noise.buffer = noiseBuf
  noise.loop = true
  const noiseFilter = ctx.createBiquadFilter()
  noiseFilter.type = 'bandpass'
  noiseFilter.frequency.value = 800
  noiseFilter.Q.value = 0.5
  const noiseGain = ctx.createGain()
  noiseGain.gain.value = 0.02
  noise.connect(noiseFilter)
  noiseFilter.connect(noiseGain)
  noiseGain.connect(masterGain)
  noise.start()
}

export function isMuted() { return muted }

export function toggleMute() {
  setMuted(!muted)
}

export function setMuted(m) {
  muted = !!m
  try { localStorage.setItem(LOFI_MUTE_KEY, muted ? '1' : '0') } catch (e) {}
  if (!ctx) {
    if (!muted) ensureStarted()
    updateButton()
    return
  }
  const now = ctx.currentTime
  masterGain.gain.cancelScheduledValues(now)
  masterGain.gain.linearRampToValueAtTime(muted ? 0 : 0.6, now + 1.2)
  updateButton()
}

function ensureStarted() {
  if (started) return
  started = true
  createEngine()
  if (!ctx) return
  if (ctx.state === 'suspended') ctx.resume()
  const now = ctx.currentTime
  masterGain.gain.cancelScheduledValues(now)
  masterGain.gain.linearRampToValueAtTime(muted ? 0 : 0.6, now + 1.5)
}

function updateButton() {
  const btn = document.getElementById('btn-audio')
  if (!btn) return
  btn.textContent = muted ? '\u266a' : '\u266b'
  btn.title = muted ? 'Activer la musique' : 'Couper la musique'
  btn.classList.toggle('on', !muted)
}

export function initAudio() {
  // memoire mute
  try {
    const s = localStorage.getItem(LOFI_MUTE_KEY)
    if (s === '0') muted = false
    else muted = true // par defaut muet pour respecter autoplay policies
  } catch (e) { muted = true }

  const btn = document.getElementById('btn-audio')
  if (btn) btn.addEventListener('click', () => {
    ensureStarted()
    toggleMute()
  })
  updateButton()

  // demarrage passif : si non mute, on attend le premier geste pour init
  const onFirstGesture = () => {
    if (!muted) ensureStarted()
    window.removeEventListener('pointerdown', onFirstGesture)
    window.removeEventListener('keydown', onFirstGesture)
  }
  window.addEventListener('pointerdown', onFirstGesture)
  window.addEventListener('keydown', onFirstGesture)
}
