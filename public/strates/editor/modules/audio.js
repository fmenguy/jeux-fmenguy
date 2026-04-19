import { state } from './state.js'

// ============================================================================
// Lecteur audio : une piste par age. Charge les fichiers depuis
// public/strates/audio/<age>.mp3. Crossfade lent quand l'age change.
// Bouton HUD pour toggle mute. Etat memorise en localStorage.
//
// Pour ajouter une piste : deposer un fichier MP3/OGG dans
// public/strates/audio/ et l'ajouter a TRACKS ci-dessous.
// Sources suggerees : pixabay.com/fr/music/, freemusicarchive.org,
// opengameart.org. Preferer des boucles ambient douces (lofi, piano,
// flute, harpe, cordes). Duree ideale 2 a 5 minutes.
// ============================================================================

// Mapping age -> chemin. null si pas de fichier dispo (on reste silencieux).
// L'age courant est determine par la tech la plus haute debloquee.
const TRACKS = {
  stone:  './audio/stone.mp3',
  bronze: './audio/bronze.mp3',
  iron:   './audio/iron.mp3',
  gold:   './audio/gold.mp3'
  // plus tard : industrial, modern, atomic, space
}

const LOFI_MUTE_KEY = 'strates-audio-muted'
const TARGET_VOLUME = 0.55
const FADE_SECONDS = 2.5

let muted = true
let current = null          // { age, audio, gain }
let pending = null          // { age, audio, startAt }
let lastCheckedAge = null
let fadeInterval = null

function getCurrentAge() {
  const t = state.techs
  if (!t) return 'stone'
  if (t['pick-gold'] && t['pick-gold'].unlocked) return 'gold'
  if (t['pick-iron'] && t['pick-iron'].unlocked) return 'iron'
  if (t['pick-bronze'] && t['pick-bronze'].unlocked) return 'bronze'
  return 'stone'
}

function createAudio(src) {
  const a = new Audio()
  a.src = src
  a.loop = true
  a.volume = 0
  a.preload = 'auto'
  return a
}

function stopFade() {
  if (fadeInterval != null) {
    clearInterval(fadeInterval)
    fadeInterval = null
  }
}

function crossfadeTo(age) {
  if (current && current.age === age) return
  const src = TRACKS[age]
  if (!src) return
  stopFade()
  const prev = current
  const next = { age, audio: createAudio(src) }
  next.audio.addEventListener('error', () => {
    // fichier absent, on abandonne silencieusement
    if (current === next) current = null
    next.audio.remove()
  }, { once: true })
  next.audio.addEventListener('canplaythrough', () => {
    if (muted) return
    next.audio.play().catch(() => {})
  }, { once: true })
  current = next
  // fade lent
  const steps = 30
  let step = 0
  const startPrev = prev ? prev.audio.volume : 0
  fadeInterval = setInterval(() => {
    step++
    const t = step / steps
    if (next.audio) next.audio.volume = muted ? 0 : TARGET_VOLUME * t
    if (prev && prev.audio) prev.audio.volume = startPrev * (1 - t)
    if (step >= steps) {
      stopFade()
      if (prev && prev.audio) {
        try { prev.audio.pause() } catch (e) {}
        prev.audio.src = ''
        prev.audio.remove?.()
      }
    }
  }, (FADE_SECONDS * 1000) / steps)
}

function applyMute() {
  if (!current || !current.audio) return
  if (muted) {
    current.audio.volume = 0
    try { current.audio.pause() } catch (e) {}
  } else {
    current.audio.volume = TARGET_VOLUME
    current.audio.play().catch(() => {})
  }
}

export function isMuted() { return muted }

export function setMuted(m) {
  muted = !!m
  try { localStorage.setItem(LOFI_MUTE_KEY, muted ? '1' : '0') } catch (e) {}
  applyMute()
  updateButton()
  if (!muted && !current) crossfadeTo(getCurrentAge())
}

export function toggleMute() { setMuted(!muted) }

function updateButton() {
  const btn = document.getElementById('btn-audio')
  if (!btn) return
  btn.textContent = muted ? '\u266a' : '\u266b'
  btn.title = muted ? 'Activer la musique' : 'Couper la musique'
  btn.classList.toggle('on', !muted)
}

export function tickAudio() {
  if (muted) return
  const age = getCurrentAge()
  if (age !== lastCheckedAge) {
    lastCheckedAge = age
    crossfadeTo(age)
  }
}

export function initAudio() {
  try {
    const s = localStorage.getItem(LOFI_MUTE_KEY)
    muted = s !== '0' // par defaut muet
  } catch (e) { muted = true }

  const btn = document.getElementById('btn-audio')
  if (btn) btn.addEventListener('click', () => toggleMute())
  updateButton()

  // demarrage passif au premier geste utilisateur (autoplay policy)
  const onFirstGesture = () => {
    if (!muted) crossfadeTo(getCurrentAge())
    window.removeEventListener('pointerdown', onFirstGesture)
    window.removeEventListener('keydown', onFirstGesture)
  }
  window.addEventListener('pointerdown', onFirstGesture)
  window.addEventListener('keydown', onFirstGesture)
}
