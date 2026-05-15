/* ============================================
   AELINDRA · audio/sfx.ts
   Synthétiseur de sons Web Audio API, zéro fichier.
   Style retro-fantasy : épée, magie, soin, victoire/défaite.
   ============================================ */

let ctx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let muted = false;

function getCtx(): AudioContext {
  if (typeof window === 'undefined') {
    throw new Error('AudioContext requires a browser');
  }
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx = new Ctor();
    masterGain = ctx.createGain();
    masterGain.gain.value = 0.4;
    masterGain.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') {
    void ctx.resume();
  }
  return ctx;
}

function out(): AudioNode {
  getCtx();
  return masterGain!;
}

export function setMuted(m: boolean): void {
  muted = m;
  if (masterGain) masterGain.gain.value = m ? 0 : 0.4;
}

export function isMuted(): boolean {
  return muted;
}

/* ============================================
   Générateurs élémentaires
   ============================================ */

function makeNoiseBuffer(c: AudioContext, durationSec: number): AudioBuffer {
  const sampleRate = c.sampleRate;
  const length = Math.floor(sampleRate * durationSec);
  const buffer = c.createBuffer(1, length, sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  return buffer;
}

function envelope(gain: GainNode, t: number, attackSec: number, peak: number, decaySec: number): void {
  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(peak, t + attackSec);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + attackSec + decaySec);
}

/* ============================================
   SONS
   ============================================ */

/** Swing : woosh court (mouvement / esquive) */
export function playSwing(): void {
  if (muted) return;
  try {
    const c = getCtx();
    const t = c.currentTime;
    const noise = c.createBufferSource();
    noise.buffer = makeNoiseBuffer(c, 0.15);
    const filter = c.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1800, t);
    filter.frequency.exponentialRampToValueAtTime(400, t + 0.12);
    filter.Q.value = 4;
    const g = c.createGain();
    envelope(g, t, 0.005, 0.35, 0.12);
    noise.connect(filter).connect(g).connect(out());
    noise.start(t);
    noise.stop(t + 0.16);
  } catch { /* audio désactivé */ }
}

/** Hit : impact court et grave (attaque physique réussie) */
export function playHit(): void {
  if (muted) return;
  try {
    const c = getCtx();
    const t = c.currentTime;
    const osc = c.createOscillator();
    osc.type = 'square';
    osc.frequency.setValueAtTime(180, t);
    osc.frequency.exponentialRampToValueAtTime(55, t + 0.09);
    const g = c.createGain();
    envelope(g, t, 0.001, 0.45, 0.1);
    // Bruit ajouté pour le "punch"
    const noise = c.createBufferSource();
    noise.buffer = makeNoiseBuffer(c, 0.05);
    const ng = c.createGain();
    envelope(ng, t, 0.001, 0.2, 0.04);
    osc.connect(g).connect(out());
    noise.connect(ng).connect(out());
    osc.start(t);
    osc.stop(t + 0.12);
    noise.start(t);
    noise.stop(t + 0.06);
  } catch { /* */ }
}

/** Crit : double impact avec montée aiguë */
export function playCrit(): void {
  if (muted) return;
  try {
    const c = getCtx();
    const t = c.currentTime;
    // Boom grave
    const o1 = c.createOscillator();
    o1.type = 'square';
    o1.frequency.setValueAtTime(220, t);
    o1.frequency.exponentialRampToValueAtTime(40, t + 0.18);
    const g1 = c.createGain();
    envelope(g1, t, 0.001, 0.5, 0.2);
    o1.connect(g1).connect(out());
    o1.start(t);
    o1.stop(t + 0.22);
    // Ping aigu
    const o2 = c.createOscillator();
    o2.type = 'triangle';
    o2.frequency.setValueAtTime(880, t + 0.02);
    o2.frequency.exponentialRampToValueAtTime(1760, t + 0.1);
    const g2 = c.createGain();
    envelope(g2, t + 0.02, 0.005, 0.3, 0.15);
    o2.connect(g2).connect(out());
    o2.start(t + 0.02);
    o2.stop(t + 0.22);
  } catch { /* */ }
}

/** Spell : cristal magique aigu */
export function playSpell(): void {
  if (muted) return;
  try {
    const c = getCtx();
    const t = c.currentTime;
    const o = c.createOscillator();
    o.type = 'triangle';
    o.frequency.setValueAtTime(440, t);
    o.frequency.exponentialRampToValueAtTime(1320, t + 0.18);
    const g = c.createGain();
    envelope(g, t, 0.01, 0.35, 0.2);
    // Ajoute une seconde voix en quinte
    const o2 = c.createOscillator();
    o2.type = 'triangle';
    o2.frequency.setValueAtTime(660, t + 0.05);
    o2.frequency.exponentialRampToValueAtTime(1980, t + 0.22);
    const g2 = c.createGain();
    envelope(g2, t + 0.05, 0.01, 0.25, 0.18);
    o.connect(g).connect(out());
    o2.connect(g2).connect(out());
    o.start(t); o.stop(t + 0.25);
    o2.start(t + 0.05); o2.stop(t + 0.28);
  } catch { /* */ }
}

/** Heal : cloche douce ascendante */
export function playHeal(): void {
  if (muted) return;
  try {
    const c = getCtx();
    const t = c.currentTime;
    [523.25, 659.25, 783.99].forEach((freq, i) => { // do, mi, sol
      const o = c.createOscillator();
      o.type = 'sine';
      o.frequency.value = freq;
      const g = c.createGain();
      const start = t + i * 0.06;
      envelope(g, start, 0.01, 0.25, 0.3);
      o.connect(g).connect(out());
      o.start(start);
      o.stop(start + 0.35);
    });
  } catch { /* */ }
}

/** Death : descente sombre */
export function playDeath(): void {
  if (muted) return;
  try {
    const c = getCtx();
    const t = c.currentTime;
    const o = c.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(240, t);
    o.frequency.exponentialRampToValueAtTime(40, t + 0.4);
    const g = c.createGain();
    envelope(g, t, 0.01, 0.35, 0.4);
    o.connect(g).connect(out());
    o.start(t);
    o.stop(t + 0.45);
  } catch { /* */ }
}

/** Victory : fanfare courte */
export function playVictory(): void {
  if (muted) return;
  try {
    const c = getCtx();
    const t = c.currentTime;
    // Do-Mi-Sol-Do
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
      const o = c.createOscillator();
      o.type = 'triangle';
      o.frequency.value = freq;
      const g = c.createGain();
      const start = t + i * 0.12;
      envelope(g, start, 0.01, 0.35, 0.18);
      o.connect(g).connect(out());
      o.start(start);
      o.stop(start + 0.25);
    });
  } catch { /* */ }
}

/** Defeat : descente lente et sombre */
export function playDefeat(): void {
  if (muted) return;
  try {
    const c = getCtx();
    const t = c.currentTime;
    [523.25, 415.30, 311.13].forEach((freq, i) => { // do, sol#, ré# - dissonance descendante
      const o = c.createOscillator();
      o.type = 'sine';
      o.frequency.value = freq;
      const g = c.createGain();
      const start = t + i * 0.22;
      envelope(g, start, 0.02, 0.3, 0.35);
      o.connect(g).connect(out());
      o.start(start);
      o.stop(start + 0.45);
    });
  } catch { /* */ }
}

/** Click bouton (interaction UI) */
export function playClick(): void {
  if (muted) return;
  try {
    const c = getCtx();
    const t = c.currentTime;
    const o = c.createOscillator();
    o.type = 'square';
    o.frequency.setValueAtTime(880, t);
    o.frequency.exponentialRampToValueAtTime(1320, t + 0.04);
    const g = c.createGain();
    envelope(g, t, 0.001, 0.15, 0.04);
    o.connect(g).connect(out());
    o.start(t);
    o.stop(t + 0.06);
  } catch { /* */ }
}
