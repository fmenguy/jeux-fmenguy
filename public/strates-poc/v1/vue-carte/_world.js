/* ==================================================================
   _world.js, données partagées par les 3 POCs vue-carte
   Grille 64x64, biomes simulés via bruit value-noise déterministe,
   liste de bâtiments fixes, masque de brouillard (île centrale révélée).
   Aucune dépendance externe.
================================================================== */
(function () {
  const SIZE = 64;

  /* --- Bruit value-noise déterministe (seed fixe) ---------------- */
  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = a;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  const rand = mulberry32(424242);

  /* Génère une grille de bruit basse fréquence puis interpole */
  function noiseGrid(cellSize) {
    const n = Math.ceil(SIZE / cellSize) + 2;
    const g = new Array(n * n);
    for (let i = 0; i < g.length; i++) g[i] = rand();
    const out = new Float32Array(SIZE * SIZE);
    const lerp = (a, b, t) => a + (b - a) * t;
    const smooth = t => t * t * (3 - 2 * t);
    for (let y = 0; y < SIZE; y++) {
      for (let x = 0; x < SIZE; x++) {
        const fx = x / cellSize, fy = y / cellSize;
        const ix = Math.floor(fx), iy = Math.floor(fy);
        const tx = smooth(fx - ix), ty = smooth(fy - iy);
        const a = g[iy * n + ix];
        const b = g[iy * n + ix + 1];
        const c = g[(iy + 1) * n + ix];
        const d = g[(iy + 1) * n + ix + 1];
        out[y * SIZE + x] = lerp(lerp(a, b, tx), lerp(c, d, tx), ty);
      }
    }
    return out;
  }

  const elev = noiseGrid(11);
  const moist = noiseGrid(8);

  /* --- Modulation pour produire une île centrale ------------------ */
  const island = new Float32Array(SIZE * SIZE);
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const dx = (x - SIZE / 2) / (SIZE / 2);
      const dy = (y - SIZE / 2) / (SIZE / 2);
      const d = Math.sqrt(dx * dx + dy * dy);
      const falloff = Math.max(0, 1 - d * 1.05);
      island[y * SIZE + x] = elev[y * SIZE + x] * 0.65 + falloff * 0.55;
    }
  }

  /* --- Biome par cellule ------------------------------------------ */
  /* codes : 0 eau profonde, 1 eau, 2 sable, 3 herbe, 4 forêt,
            5 roche, 6 neige */
  const biome = new Uint8Array(SIZE * SIZE);
  for (let i = 0; i < SIZE * SIZE; i++) {
    const e = island[i];
    const m = moist[i];
    let b;
    if (e < 0.30) b = 0;
    else if (e < 0.42) b = 1;
    else if (e < 0.48) b = 2;
    else if (e > 0.78) b = 6;
    else if (e > 0.66) b = 5;
    else if (m > 0.55) b = 4;
    else b = 3;
    biome[i] = b;
  }

  /* --- Bâtiments placés à la main sur des cellules d'herbe -------- */
  /* Icônes : 🏠 maison, 🔥 foyer, 🔬 labo, 🔭 promontoire,
            🏘️ village, 🌾 champ, ⛏ mine, 🏹 chasse */
  const buildings = [
    { x: 30, y: 32, kind: "village",     icon: "🏘️", name: "Moriah",     pop: 12 },
    { x: 41, y: 28, kind: "maison",      icon: "🏠", name: "Hutte nord", pop: 4 },
    { x: 34, y: 38, kind: "foyer",       icon: "🔥", name: "Foyer",      pop: 0 },
    { x: 26, y: 39, kind: "champ",       icon: "🌾", name: "Champ sud",  pop: 0 },
    { x: 44, y: 35, kind: "labo",        icon: "🔬", name: "Hutte du sage", pop: 1 },
    { x: 22, y: 30, kind: "promontoire", icon: "🔭", name: "Promontoire", pop: 0 },
    { x: 38, y: 22, kind: "mine",        icon: "⛏",  name: "Mine",       pop: 2 },
    { x: 48, y: 40, kind: "chasse",      icon: "🏹", name: "Tentes",     pop: 3 },
  ];

  /* --- Brouillard de guerre : disque révélé autour du village ----- */
  /* fog[i] : 0 = exploré, 1 = pénombre (vu jadis), 2 = inconnu       */
  const fog = new Uint8Array(SIZE * SIZE);
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const dx = x - 32, dy = y - 33;
      const d = Math.sqrt(dx * dx + dy * dy);
      let f;
      if (d < 12) f = 0;
      else if (d < 19) f = 1;
      else f = 2;
      // un peu de bruit sur la frontière, plus organique
      const n = noiseGrid; // (no-op pour shape)
      const wob = (elev[y * SIZE + x] - 0.5) * 4;
      if (d + wob < 11) f = 0;
      else if (d + wob < 18) f = Math.min(f, 1);
      fog[y * SIZE + x] = f;
    }
  }

  /* --- Frontière de territoire (cellules autour du village) ------- */
  const territory = new Uint8Array(SIZE * SIZE);
  const cx = 30, cy = 32, R = 8;
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const dx = x - cx, dy = y - cy;
      const wob = (moist[y * SIZE + x] - 0.5) * 3;
      if (Math.sqrt(dx * dx + dy * dy) + wob < R) territory[y * SIZE + x] = 1;
    }
  }

  /* --- Helpers ---------------------------------------------------- */
  function biomeAt(x, y) { return biome[y * SIZE + x]; }
  function fogAt(x, y) { return fog[y * SIZE + x]; }
  function inTerritory(x, y) { return territory[y * SIZE + x] === 1; }
  function elevAt(x, y) { return island[y * SIZE + x]; }
  function moistAt(x, y) { return moist[y * SIZE + x]; }

  /* --- Export global --------------------------------------------- */
  window.STRATES_WORLD = {
    SIZE, biome, fog, territory, buildings,
    biomeAt, fogAt, inTerritory, elevAt, moistAt,
  };
})();
