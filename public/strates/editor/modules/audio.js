import { state } from './state.js'
import { SEASONS } from './seasons.js'

// ============================================================================
// Lecteur audio : une piste par saison. Charge les fichiers depuis
// public/strates/editor/audio/<saison>.mp3. Crossfade lent quand la saison
// change. Bouton HUD pour toggle mute. Etat memorise en localStorage.
// ============================================================================

// Mapping saison -> chemin. Les fichiers absents sont ignores silencieusement.
// B16 : la piste ete.mp3 n'existe pas, elle est remplacee par un ambient
// synthetique genere via Web Audio API (cf. createSummerSyntheticAudio).
const SYNTH_SUMMER = '__synth_summer__'
const TRACKS = {
  spring: './audio/printemps.mp3',
  summer: SYNTH_SUMMER,
  autumn: './audio/automne.mp3',
  winter: './audio/hiver.mp3'
}

/**
 * Cree un ambient synthetique "ete" via Web Audio API. Renvoie un objet
 * compatible avec l'API minimale d'un HTMLAudioElement utilisee ici :
 * src, volume, loop, preload, play(), pause(), addEventListener, remove.
 *
 * Ambiance ete : bourdon chaud (do3 + sol3) + arpege lumineux en do majeur
 * (do4, mi4, sol4, la4) qui boucle lentement. Filtre passe-bas pour le
 * cote chaleureux. Le tout module via un gain de sortie pilote par
 * l'enveloppe du crossfade (audio.volume).
 */
function createSummerSyntheticAudio() {
  const Ctx = window.AudioContext || window.webkitAudioContext
  const api = {
    src: SYNTH_SUMMER,
    volume: 0,
    loop: true,
    preload: 'auto',
    _listeners: {},
    _ctx: null,
    _master: null,
    _nodes: [],
    _interval: null,
    _started: false,
    _ready: false,
    addEventListener: function (name, cb, opts) {
      if (!this._listeners[name]) this._listeners[name] = []
      this._listeners[name].push({ cb: cb, once: !!(opts && opts.once) })
    },
    _emit: function (name) {
      const list = this._listeners[name]
      if (!list) return
      const keep = []
      for (const l of list) {
        try { l.cb({ type: name, target: this }) } catch (e) {}
        if (!l.once) keep.push(l)
      }
      this._listeners[name] = keep
    },
    play: function () {
      const self = this
      return new Promise(function (resolve, reject) {
        try {
          if (!self._ctx) self._buildGraph()
          if (self._ctx.state === 'suspended') self._ctx.resume().catch(function () {})
          self._started = true
          self._applyVolume()
          resolve()
        } catch (e) { reject(e) }
      })
    },
    pause: function () {
      this._started = false
      if (this._master) {
        try { this._master.gain.value = 0 } catch (e) {}
      }
    },
    remove: function () {
      this._started = false
      if (this._interval) { clearInterval(this._interval); this._interval = null }
      for (const n of this._nodes) {
        try { if (n.stop) n.stop() } catch (e) {}
        try { if (n.disconnect) n.disconnect() } catch (e) {}
      }
      this._nodes = []
      if (this._ctx) {
        try { this._ctx.close() } catch (e) {}
        this._ctx = null
      }
    },
    _applyVolume: function () {
      if (!this._master) return
      this._master.gain.value = this._started ? this.volume : 0
    },
    _buildGraph: function () {
      if (!Ctx) throw new Error('AudioContext indisponible')
      const ctx = new Ctx()
      this._ctx = ctx
      const master = ctx.createGain()
      master.gain.value = 0
      this._master = master

      // Filtre passe-bas pour un grain chaud
      const filter = ctx.createBiquadFilter()
      filter.type = 'lowpass'
      filter.frequency.value = 2200
      filter.Q.value = 0.6
      filter.connect(master)
      master.connect(ctx.destination)

      // Bourdons : do3 (130.81), sol3 (196.00) en sine pour le cote doux
      const dronFreqs = [130.81, 196.00]
      for (const f of dronFreqs) {
        const osc = ctx.createOscillator()
        osc.type = 'sine'
        osc.frequency.value = f
        const g = ctx.createGain()
        g.gain.value = 0.08
        // Leger vibrato pour eviter le son fige
        const lfo = ctx.createOscillator()
        lfo.type = 'sine'
        lfo.frequency.value = 0.15 + Math.random() * 0.1
        const lfoGain = ctx.createGain()
        lfoGain.gain.value = 0.6
        lfo.connect(lfoGain)
        lfoGain.connect(osc.frequency)
        osc.connect(g)
        g.connect(filter)
        osc.start()
        lfo.start()
        this._nodes.push(osc, g, lfo, lfoGain)
      }

      // Arpege lumineux : do4, mi4, sol4, la4, sol4, mi4 en boucle
      const arp = [261.63, 329.63, 392.00, 440.00, 392.00, 329.63]
      let step = 0
      const self = this
      this._interval = setInterval(function () {
        if (!self._ctx || !self._started) return
        const t = self._ctx.currentTime
        const freq = arp[step % arp.length]
        step++
        const o = ctx.createOscillator()
        o.type = 'triangle'
        o.frequency.value = freq
        const g = ctx.createGain()
        g.gain.setValueAtTime(0, t)
        g.gain.linearRampToValueAtTime(0.06, t + 0.08)
        g.gain.linearRampToValueAtTime(0, t + 0.9)
        o.connect(g)
        g.connect(filter)
        o.start(t)
        o.stop(t + 1.0)
      }, 900)

      // Emet canplaythrough au prochain tick pour coller a l'API MP3
      const self2 = this
      setTimeout(function () { self2._ready = true; self2._emit('canplaythrough') }, 20)
    }
  }
  // Proxy de volume : audio.js ecrit audio.volume = ..., on propage au master.
  let _vol = 0
  Object.defineProperty(api, 'volume', {
    get: function () { return _vol },
    set: function (v) { _vol = v; api._applyVolume() }
  })
  return api
}

const LOFI_MUTE_KEY = 'strates-audio-muted'
const TARGET_VOLUME = 0.30
const FADE_SECONDS = 3.0

let muted = true
let current = null
let lastCheckedSeason = null
let fadeInterval = null

function getCurrentSeasonId() {
  if (state.season && SEASONS[state.season.idx]) return SEASONS[state.season.idx].id
  return 'spring'
}

function createAudio(src) {
  // B16 : si la piste est le tag synthetique, on instancie le generateur
  // Web Audio API plutot qu'un Audio() pointant vers un fichier absent.
  if (src === SYNTH_SUMMER) return createSummerSyntheticAudio()
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
    // fichier absent : fallback vers le synthetique ete si possible
    if (current !== next) return
    next.audio.remove?.()
    const fallback = createSummerSyntheticAudio()
    next.audio = fallback
    fallback.addEventListener('canplaythrough', () => {
      if (muted) return
      fallback.play().catch(() => {})
    }, { once: true })
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
    muted = (s === '1') // par defaut actif
  } catch (e) { muted = false }

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
