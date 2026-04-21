// ============================================================================
// cinematics.js -- Lot D
// Gere les cinematiques de passage d'age.
// Pas de fichier MP3 : la fanfare est generee par Web Audio API.
// ============================================================================

// ---------------------------------------------------------------------------
// Son fanfare de passage d'age (Web Audio API synthetique)
// ---------------------------------------------------------------------------

/**
 * Joue une fanfare douce (accord majeur Do-Mi-Sol, enveloppe ADSR, ~2s).
 * Utilise AudioContext web natif, aucun fichier externe.
 */
function playFanfare() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const t = ctx.currentTime

    // Accord Do majeur : Do4, Mi4, Sol4
    const freqs = [261.63, 329.63, 392.00]

    freqs.forEach(freq => {
      const osc = ctx.createOscillator()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, t)

      const gain = ctx.createGain()
      // Attaque : 0 -> 0.15 en 0.05s
      gain.gain.setValueAtTime(0, t)
      gain.gain.linearRampToValueAtTime(0.15, t + 0.05)
      // Sustain court : reste a 0.12 jusqu'a 0.3s
      gain.gain.linearRampToValueAtTime(0.12, t + 0.30)
      // Decay progressif vers 0 en 1.5s
      gain.gain.linearRampToValueAtTime(0, t + 1.80)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start(t)
      osc.stop(t + 2.0)
    })

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
