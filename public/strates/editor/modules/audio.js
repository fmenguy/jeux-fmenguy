import { state } from './state.js'
import { SEASONS } from './seasons.js'

// ============================================================================
// Lecteur audio : une piste par saison. Charge les fichiers depuis
// public/strates/editor/audio/<saison>.mp3. Crossfade lent quand la saison
// change. Bouton HUD pour toggle mute. Etat memorise en localStorage.
// ============================================================================

// Mapping saison -> chemin. Les fichiers absents sont ignores silencieusement.
const TRACKS = {
  spring: './audio/printemps.mp3',
  summer: './audio/ete.mp3',
  autumn: './audio/automne.mp3',
  winter: './audio/hiver.mp3'
}

const LOFI_MUTE_KEY = 'strates-audio-muted'
const TARGET_VOLUME = 0.55
const FADE_SECONDS = 2.5

let muted = true
let current = null
let lastCheckedSeason = null
let fadeInterval = null

function getCurrentSeasonId() {
  if (state.season && SEASONS[state.season.idx]) return SEASONS[state.season.idx].id
  return 'spring'
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

function crossfadeTo(season) {
  if (current && current.season === season) return
  const src = TRACKS[season]
  if (!src) {
    // aucune piste pour cette saison, on eteint simplement l'ancienne
    if (current) {
      const prev = current
      current = null
      try { prev.audio.pause() } catch (e) {}
      prev.audio.src = ''
    }
    return
  }
  stopFade()
  const prev = current
  const next = { season, audio: createAudio(src) }
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
  if (!muted && !current) crossfadeTo(getCurrentSeasonId())
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
  const s = getCurrentSeasonId()
  if (s !== lastCheckedSeason) {
    lastCheckedSeason = s
    crossfadeTo(s)
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
    if (!muted) crossfadeTo(getCurrentSeasonId())
    window.removeEventListener('pointerdown', onFirstGesture)
    window.removeEventListener('keydown', onFirstGesture)
  }
  window.addEventListener('pointerdown', onFirstGesture)
  window.addEventListener('keydown', onFirstGesture)
}
