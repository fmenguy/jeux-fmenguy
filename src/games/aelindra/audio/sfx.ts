/* ============================================
   AELINDRA · audio/sfx.ts
   Synthétiseur Web Audio API — sons de combat,
   magie, guilde. Zéro fichier audio requis.
   ============================================ */

let ctx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let muted = false;

function getCtx(): AudioContext {
  if (typeof window === 'undefined') throw new Error('AudioContext requires a browser');
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx = new Ctor();
    masterGain = ctx.createGain();
    masterGain.gain.value = 0.45;
    masterGain.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

function out(): AudioNode { getCtx(); return masterGain!; }

export function setMuted(m: boolean): void {
  muted = m;
  if (masterGain) masterGain.gain.value = m ? 0 : 0.45;
}
export function isMuted(): boolean { return muted; }

/* ---- helpers ---- */

function noise(c: AudioContext, dur: number): AudioBuffer {
  const buf = c.createBuffer(1, Math.ceil(c.sampleRate * dur), c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return buf;
}

function env(g: GainNode, t: number, atk: number, peak: number, dec: number): void {
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(peak, t + atk);
  g.gain.exponentialRampToValueAtTime(0.0001, t + atk + dec);
}

function osc(c: AudioContext, type: OscillatorType, freq: number, t: number, dur: number): OscillatorNode {
  const o = c.createOscillator();
  o.type = type;
  o.frequency.value = freq;
  o.start(t);
  o.stop(t + dur);
  return o;
}

function noiseSource(c: AudioContext, dur: number): AudioBufferSourceNode {
  const src = c.createBufferSource();
  src.buffer = noise(c, dur);
  return src;
}

/** Pitché aléatoirement ±semitones pour varier les répétitions */
function jitter(base: number, semitones = 1.5): number {
  return base * Math.pow(2, (Math.random() * 2 - 1) * semitones / 12);
}

/* ============================================
   COMBAT · armes physiques
   ============================================ */

/** Coup d'épée : woosh métallique + impact */
export function playSwing(): void {
  if (muted) return;
  try {
    const c = getCtx();
    const t = c.currentTime;
    const baseFreq = jitter(900);

    // Woosh (bruit filtré qui descend)
    const src = noiseSource(c, 0.2);
    const filt = c.createBiquadFilter();
    filt.type = 'bandpass';
    filt.frequency.setValueAtTime(baseFreq, t);
    filt.frequency.exponentialRampToValueAtTime(180, t + 0.16);
    filt.Q.value = 5;
    const g = c.createGain();
    env(g, t, 0.004, 0.3, 0.14);
    src.connect(filt).connect(g).connect(out());
    src.start(t); src.stop(t + 0.2);

    // Click métallique à l'impact
    const click = noiseSource(c, 0.04);
    const cf = c.createBiquadFilter();
    cf.type = 'highpass';
    cf.frequency.value = 3500;
    const cg = c.createGain();
    env(cg, t + 0.07, 0.001, 0.25, 0.035);
    click.connect(cf).connect(cg).connect(out());
    click.start(t + 0.07); click.stop(t + 0.12);
  } catch { /* audio désactivé */ }
}

/** Impact physique : choc grave + métal */
export function playHit(): void {
  if (muted) return;
  try {
    const c = getCtx();
    const t = c.currentTime;
    const f0 = jitter(160);

    // Corps grave (impact)
    const o1 = osc(c, 'square', f0, t, 0.14);
    o1.frequency.exponentialRampToValueAtTime(40, t + 0.12);
    const g1 = c.createGain();
    env(g1, t, 0.001, 0.5, 0.12);
    o1.connect(g1).connect(out());

    // Claquement de métal (bruit HF)
    const src = noiseSource(c, 0.06);
    const hpf = c.createBiquadFilter();
    hpf.type = 'highpass';
    hpf.frequency.value = 2000;
    const g2 = c.createGain();
    env(g2, t, 0.001, 0.22, 0.05);
    src.connect(hpf).connect(g2).connect(out());
    src.start(t); src.stop(t + 0.06);
  } catch { /* */ }
}

/** Critique : double impact violent + ring */
export function playCrit(): void {
  if (muted) return;
  try {
    const c = getCtx();
    const t = c.currentTime;

    // Boom grave
    const o1 = osc(c, 'square', jitter(220), t, 0.22);
    o1.frequency.exponentialRampToValueAtTime(38, t + 0.18);
    const g1 = c.createGain();
    env(g1, t, 0.001, 0.55, 0.2);
    o1.connect(g1).connect(out());

    // Ping métallique aigu
    const o2 = osc(c, 'triangle', jitter(1200), t + 0.02, 0.22);
    o2.frequency.exponentialRampToValueAtTime(2400, t + 0.1);
    const g2 = c.createGain();
    env(g2, t + 0.02, 0.003, 0.35, 0.18);
    o2.connect(g2).connect(out());

    // Bruit d'éclair
    const src = noiseSource(c, 0.08);
    const bf = c.createBiquadFilter();
    bf.type = 'bandpass';
    bf.frequency.value = 3000;
    bf.Q.value = 2;
    const g3 = c.createGain();
    env(g3, t, 0.001, 0.3, 0.07);
    src.connect(bf).connect(g3).connect(out());
    src.start(t); src.stop(t + 0.08);
  } catch { /* */ }
}

/** Tir à l'arc : tension corde + whoosh + impact */
export function playArrow(): void {
  if (muted) return;
  try {
    const c = getCtx();
    const t = c.currentTime;

    // Clac de corde (click impulsif HF)
    const src1 = noiseSource(c, 0.04);
    const hpf1 = c.createBiquadFilter();
    hpf1.type = 'highpass'; hpf1.frequency.value = 4000;
    const g1 = c.createGain();
    env(g1, t, 0.001, 0.35, 0.03);
    src1.connect(hpf1).connect(g1).connect(out());
    src1.start(t); src1.stop(t + 0.04);

    // Whoosh de flèche (bruit qui monte en fréquence = doppler)
    const src2 = noiseSource(c, 0.22);
    const bpf = c.createBiquadFilter();
    bpf.type = 'bandpass';
    bpf.frequency.setValueAtTime(200, t + 0.03);
    bpf.frequency.exponentialRampToValueAtTime(2200, t + 0.19);
    bpf.Q.value = 6;
    const g2 = c.createGain();
    env(g2, t + 0.03, 0.01, 0.22, 0.18);
    src2.connect(bpf).connect(g2).connect(out());
    src2.start(t + 0.03); src2.stop(t + 0.25);

    // Impact sourd à l'arrivée
    const o = osc(c, 'sawtooth', jitter(120), t + 0.18, 0.08);
    o.frequency.exponentialRampToValueAtTime(45, t + 0.26);
    const g3 = c.createGain();
    env(g3, t + 0.18, 0.001, 0.28, 0.07);
    o.connect(g3).connect(out());
  } catch { /* */ }
}

/* ============================================
   COMBAT · sorts
   ============================================ */

/** Boule de feu : grondement + crépitement + explosion */
export function playFireball(): void {
  if (muted) return;
  try {
    const c = getCtx();
    const t = c.currentTime;

    // Grondement montant (lancement)
    const o1 = osc(c, 'sawtooth', 60, t, 0.35);
    o1.frequency.exponentialRampToValueAtTime(200, t + 0.32);
    const g1 = c.createGain();
    env(g1, t, 0.02, 0.28, 0.3);
    const lpf = c.createBiquadFilter();
    lpf.type = 'lowpass'; lpf.frequency.value = 800;
    o1.connect(lpf).connect(g1).connect(out());

    // Crépitement (bruit bandpass qui descend = flèche de feu en vol)
    const src = noiseSource(c, 0.38);
    const bpf = c.createBiquadFilter();
    bpf.type = 'bandpass';
    bpf.frequency.setValueAtTime(3500, t);
    bpf.frequency.exponentialRampToValueAtTime(800, t + 0.35);
    bpf.Q.value = 3;
    const g2 = c.createGain();
    env(g2, t, 0.01, 0.18, 0.3);
    src.connect(bpf).connect(g2).connect(out());
    src.start(t); src.stop(t + 0.38);

    // Impact/explosion (boom grave + crépitement final)
    const boom = osc(c, 'sine', 80, t + 0.3, 0.25);
    boom.frequency.exponentialRampToValueAtTime(28, t + 0.55);
    const g3 = c.createGain();
    env(g3, t + 0.3, 0.005, 0.6, 0.22);
    boom.connect(g3).connect(out());

    const src2 = noiseSource(c, 0.18);
    const hpf = c.createBiquadFilter();
    hpf.type = 'highpass'; hpf.frequency.value = 1000;
    const g4 = c.createGain();
    env(g4, t + 0.3, 0.001, 0.25, 0.16);
    src2.connect(hpf).connect(g4).connect(out());
    src2.start(t + 0.3); src2.stop(t + 0.48);
  } catch { /* */ }
}

/** Sort générique : cristal magique (non-feu) */
export function playSpell(): void {
  if (muted) return;
  try {
    const c = getCtx();
    const t = c.currentTime;
    const base = jitter(520);

    const o1 = osc(c, 'triangle', base, t, 0.28);
    o1.frequency.exponentialRampToValueAtTime(base * 3, t + 0.2);
    const g1 = c.createGain();
    env(g1, t, 0.01, 0.32, 0.22);
    o1.connect(g1).connect(out());

    const o2 = osc(c, 'triangle', base * 1.5, t + 0.04, 0.28);
    o2.frequency.exponentialRampToValueAtTime(base * 4.5, t + 0.24);
    const g2 = c.createGain();
    env(g2, t + 0.04, 0.01, 0.22, 0.2);
    o2.connect(g2).connect(out());
  } catch { /* */ }
}

/** Soin : cloches do-mi-sol ascendantes */
export function playHeal(): void {
  if (muted) return;
  try {
    const c = getCtx();
    const t = c.currentTime;
    [523.25, 659.25, 783.99].forEach((freq, i) => {
      const o = osc(c, 'sine', freq, t + i * 0.07, 0.4);
      const g = c.createGain();
      const s = t + i * 0.07;
      env(g, s, 0.01, 0.28, 0.32);
      o.connect(g).connect(out());
    });
    // Shimmer (très léger bruit HF)
    const src = noiseSource(c, 0.3);
    const hpf = c.createBiquadFilter();
    hpf.type = 'highpass'; hpf.frequency.value = 6000;
    const gn = c.createGain();
    env(gn, t, 0.02, 0.07, 0.28);
    src.connect(hpf).connect(gn).connect(out());
    src.start(t); src.stop(t + 0.3);
  } catch { /* */ }
}

/** Mort : descente lourde + bruit de décomposition */
export function playDeath(): void {
  if (muted) return;
  try {
    const c = getCtx();
    const t = c.currentTime;

    const o = osc(c, 'sawtooth', 220, t, 0.5);
    o.frequency.exponentialRampToValueAtTime(36, t + 0.45);
    const g1 = c.createGain();
    env(g1, t, 0.01, 0.4, 0.45);
    o.connect(g1).connect(out());

    const src = noiseSource(c, 0.3);
    const lpf = c.createBiquadFilter();
    lpf.type = 'lowpass'; lpf.frequency.value = 400;
    const g2 = c.createGain();
    env(g2, t + 0.1, 0.01, 0.18, 0.22);
    src.connect(lpf).connect(g2).connect(out());
    src.start(t + 0.1); src.stop(t + 0.4);
  } catch { /* */ }
}

/* ============================================
   COMBAT · feedback & flow
   ============================================ */

/** Victoire : fanfare Do-Mi-Sol-Do */
export function playVictory(): void {
  if (muted) return;
  try {
    const c = getCtx();
    const t = c.currentTime;
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
      const o = osc(c, 'triangle', freq, t + i * 0.11, 0.3);
      const g = c.createGain();
      env(g, t + i * 0.11, 0.01, 0.38, 0.22);
      o.connect(g).connect(out());
    });
    // Shimmer final
    const src = noiseSource(c, 0.2);
    const hpf = c.createBiquadFilter();
    hpf.type = 'highpass'; hpf.frequency.value = 5000;
    const gn = c.createGain();
    env(gn, t + 0.3, 0.01, 0.1, 0.18);
    src.connect(hpf).connect(gn).connect(out());
    src.start(t + 0.3); src.stop(t + 0.5);
  } catch { /* */ }
}

/** Défaite : descente dissonante */
export function playDefeat(): void {
  if (muted) return;
  try {
    const c = getCtx();
    const t = c.currentTime;
    [392, 311.13, 233.08].forEach((freq, i) => {
      const o = osc(c, 'sine', freq, t + i * 0.24, 0.5);
      const g = c.createGain();
      env(g, t + i * 0.24, 0.02, 0.32, 0.42);
      o.connect(g).connect(out());
    });
  } catch { /* */ }
}

/** Click UI */
export function playClick(): void {
  if (muted) return;
  try {
    const c = getCtx();
    const t = c.currentTime;
    const o = osc(c, 'square', 1100, t, 0.06);
    o.frequency.exponentialRampToValueAtTime(1600, t + 0.04);
    const g = c.createGain();
    env(g, t, 0.001, 0.14, 0.04);
    o.connect(g).connect(out());
  } catch { /* */ }
}

/* ============================================
   GUILDE · invocation
   ============================================ */

/** Grondement montant de l'orbe qui se charge */
export function playOrbCharge(): void {
  if (muted) return;
  try {
    const c = getCtx();
    const t = c.currentTime;
    const dur = 1.4;

    // Grondement LFO grave
    const o = osc(c, 'sawtooth', 55, t, dur);
    o.frequency.exponentialRampToValueAtTime(200, t + dur);
    const lpf = c.createBiquadFilter();
    lpf.type = 'lowpass';
    lpf.frequency.setValueAtTime(300, t);
    lpf.frequency.exponentialRampToValueAtTime(1200, t + dur);
    const g = c.createGain();
    env(g, t, 0.15, 0.35, 0.05);
    o.connect(lpf).connect(g).connect(out());

    // Scintillement runique (bruit HF qui croît)
    const src = noiseSource(c, dur);
    const hpf = c.createBiquadFilter();
    hpf.type = 'highpass';
    hpf.frequency.setValueAtTime(3000, t);
    hpf.frequency.exponentialRampToValueAtTime(8000, t + dur);
    const gn = c.createGain();
    env(gn, t, 0.2, 0.25, 0.05);
    src.connect(hpf).connect(gn).connect(out());
    src.start(t); src.stop(t + dur);
  } catch { /* */ }
}

/** Son d'invocation selon la rareté */
export function playSummon(rarity: 'common' | 'rare' | 'epic' | 'legendary'): void {
  if (muted) return;
  try {
    const c = getCtx();
    const t = c.currentTime;

    if (rarity === 'legendary') {
      // Fanfare éclatante : Do-Mi-Sol + shimmer long
      [523.25, 659.25, 783.99].forEach((freq, i) => {
        const o = osc(c, 'triangle', freq * 2, t + i * 0.08, 0.5);
        const g = c.createGain();
        env(g, t + i * 0.08, 0.01, 0.45, 0.4);
        o.connect(g).connect(out());
      });
      const src = noiseSource(c, 0.5);
      const hpf = c.createBiquadFilter();
      hpf.type = 'highpass'; hpf.frequency.value = 5500;
      const gn = c.createGain();
      env(gn, t + 0.1, 0.02, 0.2, 0.4);
      src.connect(hpf).connect(gn).connect(out());
      src.start(t + 0.1); src.stop(t + 0.6);
    } else if (rarity === 'epic') {
      // Accord magique + éclat
      [440, 554, 660].forEach((freq, i) => {
        const o = osc(c, 'triangle', freq, t + i * 0.05, 0.45);
        const g = c.createGain();
        env(g, t + i * 0.05, 0.01, 0.35, 0.38);
        o.connect(g).connect(out());
      });
    } else if (rarity === 'rare') {
      // Deux notes
      [392, 523].forEach((freq, i) => {
        const o = osc(c, 'triangle', freq, t + i * 0.08, 0.35);
        const g = c.createGain();
        env(g, t + i * 0.08, 0.01, 0.28, 0.28);
        o.connect(g).connect(out());
      });
    } else {
      // Pop discret
      const o = osc(c, 'triangle', jitter(660), t, 0.22);
      o.frequency.exponentialRampToValueAtTime(880, t + 0.14);
      const g = c.createGain();
      env(g, t, 0.01, 0.22, 0.18);
      o.connect(g).connect(out());
    }
  } catch { /* */ }
}
