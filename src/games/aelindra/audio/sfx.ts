/* ============================================
   AELINDRA · audio/sfx.ts
   Lecteur audio HTML5 — fichiers Kenney CC0
   Pool d'instances + variation de pitch + anti-spam
   ============================================ */

const BASE = '/games/aelindra/sfx';

const FILES = {
  // UI
  'ui:click':    [`${BASE}/ui/click.ogg`],
  'ui:back':     [`${BASE}/ui/back.ogg`],
  'ui:gold':     [`${BASE}/ui/gold-gain.ogg`, `${BASE}/ui/gold-gain-2.ogg`],

  // Combat — épée
  'sword:swing': [
    `${BASE}/combat/sword-swing-1.ogg`,
    `${BASE}/combat/sword-swing-2.ogg`,
    `${BASE}/combat/sword-swing-3.ogg`,
  ],
  'sword:heavy': [`${BASE}/combat/sword-heavy.ogg`],

  // Combat — impacts
  'hit:normal':  [`${BASE}/combat/hit-normal.ogg`, `${BASE}/combat/hit-normal-2.ogg`],
  'hit:crit':    [`${BASE}/combat/hit-crit.ogg`,   `${BASE}/combat/hit-crit-2.ogg`],
  'combat:block':[`${BASE}/combat/block.ogg`],

  // Combat — arc
  'bow:release': [`${BASE}/combat/arrow-whoosh-1.ogg`, `${BASE}/combat/arrow-whoosh-2.ogg`],
  'arrow:hit':   [`${BASE}/combat/arrow-hit.ogg`],

  // Combat — mort / fin
  'death:enemy': [`${BASE}/combat/enemy-death.ogg`],
  'death:hero':  [`${BASE}/combat/hero-death.ogg`],
  'combat:victory': [`${BASE}/combat/victory.ogg`],
  'combat:defeat':  [`${BASE}/combat/defeat.ogg`],

  // Sorts
  'spell:fire-cast':    [`${BASE}/spells/fireball-cast.ogg`],
  'spell:fire-impact':  [`${BASE}/spells/fireball-impact.ogg`],
  'spell:ice-cast':     [`${BASE}/spells/ice-cast.ogg`],
  'spell:ice-impact':   [`${BASE}/spells/ice-impact.ogg`],
  'spell:heal':         [`${BASE}/spells/heal-cast.ogg`],
  'spell:buff':         [`${BASE}/spells/buff-self.ogg`],
  'spell:dash':         [`${BASE}/spells/dash.ogg`],

  // Guilde
  'guild:charge':     [`${BASE}/guild/orb-charge.ogg`, `${BASE}/guild/orb-charge-2.ogg`],
  'guild:pop':        [`${BASE}/guild/summon-pop.ogg`],
  'guild:epic':       [`${BASE}/guild/summon-epic.ogg`],
  'guild:legendary':  [`${BASE}/guild/summon-legendary.ogg`],
  'guild:card-flip':  [`${BASE}/guild/card-flip.ogg`, `${BASE}/guild/card-flip-2.ogg`],
} as const;

export type SfxKey = keyof typeof FILES;

/* ---- Volume par catégorie ---- */
const VOL: Record<string, number> = {
  ui:      0.45,
  sword:   0.65,
  hit:     0.80,
  bow:     0.60,
  arrow:   0.70,
  death:   0.85,
  combat:  0.75,
  spell:   0.75,
  guild:   0.85,
};

/* ---- État global ---- */
let masterVolume = 1;
let muted = false;

/* ---- Pool d'instances HTML5 (4 par URL) ---- */
const POOL = 4;
const cache = new Map<string, HTMLAudioElement[]>();
const lastPlayed = new Map<SfxKey, number>();
const COOLDOWN = 40; // ms anti-spam

function pool(url: string): HTMLAudioElement[] {
  if (!cache.has(url)) {
    cache.set(url, Array.from({ length: POOL }, () => {
      const a = new Audio(url);
      a.preload = 'auto';
      return a;
    }));
  }
  return cache.get(url)!;
}

/* ---- API publique ---- */

export function playSfx(key: SfxKey, opts?: { volume?: number; pitch?: boolean }): void {
  if (typeof window === 'undefined' || muted) return;

  const now = performance.now();
  if (now - (lastPlayed.get(key) ?? 0) < COOLDOWN) return;
  lastPlayed.set(key, now);

  const urls = FILES[key] as readonly string[];
  const url = urls[Math.floor(Math.random() * urls.length)];
  const instances = pool(url);
  const audio = instances.find(a => a.paused || a.ended) ?? instances[0];

  audio.currentTime = 0;
  const cat = (key as string).split(':')[0];
  audio.volume = Math.min(1, (opts?.volume ?? VOL[cat] ?? 0.7) * masterVolume);
  audio.playbackRate = opts?.pitch === false ? 1 : 0.93 + Math.random() * 0.14;

  audio.play().catch(() => { /* autoplay policy — silencieux avant premier tap */ });
}

export function preloadSet(keys: SfxKey[]): void {
  if (typeof window === 'undefined') return;
  keys.forEach(k => (FILES[k] as readonly string[]).forEach(pool));
}

export function setMuted(value: boolean): void { muted = value; }
export function isMuted(): boolean { return muted; }
export function setMasterVolume(v: number): void { masterVolume = Math.max(0, Math.min(1, v)); }
export function getMasterVolume(): number { return masterVolume; }

/* ---- Persistance localStorage ---- */
const LS_KEY = 'aelindra:audio';

export function loadAudioPrefs(): void {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return;
    const { volume, muted: m } = JSON.parse(raw) as { volume?: number; muted?: boolean };
    if (typeof volume === 'number') setMasterVolume(volume);
    if (typeof m === 'boolean') setMuted(m);
  } catch { /* */ }
}

export function saveAudioPrefs(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LS_KEY, JSON.stringify({ volume: masterVolume, muted }));
  } catch { /* */ }
}

/* ---- Raccourcis nommés (compatibilité anciens appelants) ---- */
export const playClick      = () => playSfx('ui:click');
export const playSwing      = () => playSfx('sword:swing');
export const playHit        = () => playSfx('hit:normal');
export const playCrit       = () => playSfx('hit:crit');
export const playArrow      = () => { playSfx('bow:release'); setTimeout(() => playSfx('arrow:hit'), 200); };
export const playFireball   = () => { playSfx('spell:fire-cast'); setTimeout(() => playSfx('spell:fire-impact'), 280); };
export const playSpell      = () => playSfx('spell:ice-cast');
export const playHeal       = () => playSfx('spell:heal');
export const playDeath      = () => playSfx('death:enemy');
export const playVictory    = () => playSfx('combat:victory');
export const playDefeat     = () => playSfx('combat:defeat');
export const playOrbCharge  = () => playSfx('guild:charge');

export function playSummon(rarity: 'common' | 'rare' | 'epic' | 'legendary'): void {
  if (rarity === 'legendary') playSfx('guild:legendary');
  else if (rarity === 'epic') playSfx('guild:epic');
  else                        playSfx('guild:pop');
  setTimeout(() => playSfx('guild:card-flip'), 400);
}
