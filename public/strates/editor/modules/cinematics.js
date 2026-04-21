// ============================================================================
// cinematics.js -- Lot D
// Gere les cinematiques de passage d'age.
// Pas de fichier MP3 : la fanfare est generee par Web Audio API.
// ============================================================================

// ---------------------------------------------------------------------------
// Son fanfare de passage d'age (Web Audio API synthetique)
// ---------------------------------------------------------------------------

/**
 * Joue une fanfare heroique synthetique (~2s).
 * Utilise AudioContext web natif, aucun fichier externe.
 */
function playFanfare() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()

    // Notes de la fanfare : Mi3, Sol3, Si3, Mi4, Sol4 puis decrescendo
    const notes = [
      { freq: 164.81, start: 0.0,  dur: 0.18, vol: 0.35 },
      { freq: 196.00, start: 0.12, dur: 0.18, vol: 0.38 },
      { freq: 246.94, start: 0.24, dur: 0.22, vol: 0.40 },
      { freq: 329.63, start: 0.36, dur: 0.30, vol: 0.45 },
      { freq: 392.00, start: 0.58, dur: 0.55, vol: 0.50 },
      { freq: 493.88, start: 0.80, dur: 0.55, vol: 0.42 },
      { freq: 659.25, start: 1.00, dur: 0.90, vol: 0.38 },
    ]

    const masterGain = ctx.createGain()
    masterGain.gain.setValueAtTime(1.0, ctx.currentTime)
    masterGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 2.2)
    masterGain.connect(ctx.destination)

    // Filtre lowpass leger pour adoucir
    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.setValueAtTime(3200, ctx.currentTime)
    filter.connect(masterGain)

    notes.forEach(({ freq, start, dur, vol }) => {
      // Oscillateur principal (onde carree douce)
      const osc = ctx.createOscillator()
      osc.type = 'square'
      osc.frequency.setValueAtTime(freq, ctx.currentTime + start)

      // Harmonique une octave au-dessus (onde triangle, plus douce)
      const osc2 = ctx.createOscillator()
      osc2.type = 'triangle'
      osc2.frequency.setValueAtTime(freq * 2, ctx.currentTime + start)

      const envGain = ctx.createGain()
      envGain.gain.setValueAtTime(0, ctx.currentTime + start)
      envGain.gain.linearRampToValueAtTime(vol, ctx.currentTime + start + 0.04)
      envGain.gain.setValueAtTime(vol, ctx.currentTime + start + dur - 0.06)
      envGain.gain.linearRampToValueAtTime(0, ctx.currentTime + start + dur)

      const envGain2 = ctx.createGain()
      envGain2.gain.setValueAtTime(0, ctx.currentTime + start)
      envGain2.gain.linearRampToValueAtTime(vol * 0.3, ctx.currentTime + start + 0.04)
      envGain2.gain.setValueAtTime(vol * 0.3, ctx.currentTime + start + dur - 0.06)
      envGain2.gain.linearRampToValueAtTime(0, ctx.currentTime + start + dur)

      osc.connect(envGain)
      osc2.connect(envGain2)
      envGain.connect(filter)
      envGain2.connect(filter)

      osc.start(ctx.currentTime + start)
      osc.stop(ctx.currentTime + start + dur + 0.05)
      osc2.start(ctx.currentTime + start)
      osc2.stop(ctx.currentTime + start + dur + 0.05)
    })

    // Percussion d'intro : bruit impulsionnel
    const bufferSize = Math.floor(ctx.sampleRate * 0.12)
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
    const data = noiseBuffer.getChannelData(0)
    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize)
    const noise = ctx.createBufferSource()
    noise.buffer = noiseBuffer
    const noiseGain = ctx.createGain()
    noiseGain.gain.setValueAtTime(0.25, ctx.currentTime)
    noiseGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.12)
    noise.connect(noiseGain)
    noiseGain.connect(masterGain)
    noise.start(ctx.currentTime)

    // Ferme le contexte proprement apres la fin
    setTimeout(() => {
      try { ctx.close() } catch (e) {}
    }, 3000)
  } catch (e) {
    console.warn('[cinematics] Web Audio non disponible :', e)
  }
}

// ---------------------------------------------------------------------------
// playCinematic
// ---------------------------------------------------------------------------

/**
 * Joue une cinematique de passage d'age.
 *
 * @param {object} opts
 * @param {string} opts.title     - Titre principal ("AGE DU BRONZE")
 * @param {string} [opts.subtitle]- Sous-titre optionnel
 * @param {function} [opts.onEnd] - Callback appele quand la cinematique est terminee
 */
export function playCinematic({ title, subtitle = '', onEnd = null }) {
  const overlay = document.getElementById('cinematic-overlay')
  const titleEl = document.getElementById('cine-title-el')
  const titleText = document.getElementById('cine-title-text')
  const subtitleText = document.getElementById('cine-subtitle-text')

  if (!overlay || !titleEl) {
    console.warn('[cinematics] elements DOM introuvables')
    if (onEnd) onEnd()
    return
  }

  titleText.textContent = title
  subtitleText.textContent = subtitle

  // Etape 1 : fade noir 1s
  overlay.classList.add('cine-visible')
  overlay.style.transition = 'opacity 1s ease'
  // Force repaint avant la transition
  overlay.getBoundingClientRect()
  overlay.classList.add('cine-fade-in')

  // Etape 2 : titre apparait a 1s, reste 2s
  const T_FADE_IN  = 1000  // 1s
  const T_TITLE    = 2000  // 2s titre visible
  const T_SOUND    = 500   // son 0.5s apres le debut du fade-in
  const T_FADE_OUT = 1000  // 1s retour

  setTimeout(() => {
    titleEl.classList.add('cine-title-in')
  }, T_FADE_IN)

  // Son fanfare 0.5s apres le debut (overlap fade-in)
  setTimeout(() => {
    playFanfare()
  }, T_SOUND)

  // Etape 3 : fade retour apres titre
  const T_START_FADE_OUT = T_FADE_IN + T_TITLE

  setTimeout(() => {
    titleEl.classList.remove('cine-title-in')
  }, T_START_FADE_OUT - 200)

  setTimeout(() => {
    overlay.classList.remove('cine-fade-in')
    overlay.classList.add('cine-fade-out')
  }, T_START_FADE_OUT)

  // Etape 4 : fin de cinematique
  setTimeout(() => {
    overlay.classList.remove('cine-visible', 'cine-fade-out')
    overlay.style.transition = ''
    if (onEnd) onEnd()
  }, T_START_FADE_OUT + T_FADE_OUT)
}
