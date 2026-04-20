// FDA enhance : objectif courant en haut, animation passage d'age, arbre tech.
// Module additif : ne touche pas aux modules de jeu existants.
import * as game from './forge-game.js';

// ============================================================
// 0. Pseudo joueur (stocke en localStorage, demande au 1er contact)
// ============================================================
const PSEUDO_KEY = 'fda_playerName';
function getPseudo() {
  return localStorage.getItem(PSEUDO_KEY) || '';
}
function askPseudo() {
  // Prompt simple au 1er lancement
  let name = prompt("Bienvenue dans Forge des Âges ! Quel est ton nom, bâtisseur ?", "");
  if (name) name = name.trim().slice(0, 24);
  if (name) {
    localStorage.setItem(PSEUDO_KEY, name);
    return name;
  }
  return '';
}
// Remplace {pseudo} dans un message par le nom du joueur (ou 'Bâtisseur' si vide)
function personalize(text) {
  if (!text) return text;
  const p = getPseudo() || 'Bâtisseur';
  return text.replace(/\{pseudo\}/g, p);
}
// Expose globalement pour les modules qui veulent personnaliser
window.fdaPersonalize = personalize;

// Observer le narratif pour appliquer la personnalisation en continu
function setupNarrativePersonalization() {
  const narr = document.getElementById('narrative');
  if (!narr) return;
  // 1) personnalise le texte actuel
  if (narr.innerHTML.includes('{pseudo}')) narr.innerHTML = personalize(narr.innerHTML);
  // 2) MutationObserver : toute modif future est aussi personnalisee
  const obs = new MutationObserver(() => {
    if (narr.innerHTML.includes('{pseudo}')) {
      narr.innerHTML = personalize(narr.innerHTML);
    }
  });
  obs.observe(narr, { childList: true, characterData: true, subtree: true });
}

// ============================================================
// 1. Objectif Actuel (mirror du systeme d'indices, mis en haut)
// ============================================================
const objBox    = () => document.getElementById('currentObjective');
const objMsg    = () => document.querySelector('#currentObjective .objective-message');
const objProgWrap = () => document.querySelector('#currentObjective .objective-progress-wrapper');
const objProgBar  = () => document.querySelector('#currentObjective .objective-progress-fill');
const objProgTxt  = () => document.querySelector('#currentObjective .objective-progress-text');
const claimBtn    = () => document.getElementById('claimObjectiveBtn');

// Map des messages d'objectif (la "condition" devient un objectif explicite a atteindre).
// On reformule l'indice pour qu'il sonne comme un objectif de progression.
const OBJECTIVE_LABELS = {
  firstVillagers:    { goal: 'Attirer 5 villageois',            getCur: () => game.villagers,     target: 5 },
  prepareForChief:   { goal: 'Réunir 25 villageois ET 25 haches (1 outil/personne)', getCur: () => Math.min(game.axes, game.villagers), target: 25 },
  seasonDuration:    { goal: 'Apprivoise le rythme des saisons', getCur: () => 1,                  target: 1 },
  meatValue:         { goal: 'Recruter 10 cueilleurs',          getCur: () => game.pickers,       target: 10 },
  chiefReady:        { goal: 'Reunir 25 haches et 25 villageois', getCur: () => Math.min(game.axes, game.villagers), target: 25 },
  tinkerHint:        { goal: 'Atteindre 40 villageois',         getCur: () => game.villagers,     target: 40 },
  wellHint:          { goal: 'Stocker 100 unites d\'eau',       getCur: () => game.water,         target: 100 },
  tenTinkers:        { goal: 'Recruter 10 bricoleurs',          getCur: () => game.tinkers,       target: 10 },
  moreWells:         { goal: 'Construire 50 seaux',             getCur: () => game.buckets,       target: 50 },
  workshopFiberLimit:{ goal: 'Recolter 150 fibres',             getCur: () => game.fibers,        target: 150 },
  shardEffectsReveal:{ goal: 'Trouver 5 eclats d\'eternite',    getCur: () => game.eternityShards, target: 5 },
  bakeryHint:        { goal: 'Atteindre l\'Age de l\'Agriculture', getCur: () => game.currentAge === 'Âge de l’Agriculture' ? 1 : 0, target: 1 },
  winterCoats:       { goal: 'Manteau pour chaque villageois (hiver)', getCur: () => game.coats, target: () => game.villagers },
  reorganizeHint:    { goal: 'Faire ta premiere decouverte',    getCur: () => 1,                  target: 1 },
};

// Indice courant pre-paye (interne, on "achete" automatiquement quand le joueur clique reclamer)
let lastDisplayedHintId = null;
let displayedHint = null; // hint actuellement montre dans le bandeau Objectif

function updateObjective() {
  const box = objBox();
  if (!box) return;
  const cur = game.currentHint;
  const purchased = game.purchasedHints || [];

  // Trouver le prochain indice non encore achete dont la condition est remplie
  let target = cur;
  if (!target) {
    target = (game.dynamicHints || []).find(h => h.condition() && !purchased.includes(h.id));
  }

  if (!target) {
    // Trouver le prochain indice quelle que soit sa condition (pour donner un objectif a viser)
    target = (game.dynamicHints || []).find(h => !purchased.includes(h.id));
  }

  if (!target) {
    displayedHint = null;
    box.classList.add('objective-empty');
    objMsg().textContent = 'Toutes les sagesses sont dévoilées. Vise les Éclats d\'Éternité !';
    objProgWrap().hidden = true;
    claimBtn().hidden = true;
    return;
  }

  displayedHint = target;
  box.classList.remove('objective-empty');
  const meta = OBJECTIVE_LABELS[target.id];
  const alreadyPurchased = purchased.includes(target.id);
  if (alreadyPurchased) return;

  // La progression reelle vers l'objectif affiche se base sur meta (cur/target),
  // pas sur target.condition() qui peut etre vraie pour une raison annexe.
  const curVal = meta ? meta.getCur() : 0;
  const targetVal = meta ? (typeof meta.target === 'function' ? meta.target() : meta.target) : 1;
  const objectiveReached = meta ? curVal >= targetVal : target.condition();

  if (meta && !objectiveReached) {
    // Affichage du PROGRES vers la condition de deblocage
    box.classList.add('objective-progress');
    box.classList.remove('objective-ready');
    objMsg().textContent = meta.goal;
    objProgWrap().hidden = false;
    const shown = Math.min(curVal, targetVal);
    const pct = Math.min(100, Math.round((shown / targetVal) * 100));
    objProgBar().style.width = pct + '%';
    objProgTxt().textContent = `${shown} / ${targetVal}`;
    claimBtn().hidden = true;
  } else {
    // Condition remplie : l'indice est PRET a etre revele
    box.classList.add('objective-ready');
    box.classList.remove('objective-progress');
    objMsg().textContent = 'Indice débloqué !';
    objProgWrap().hidden = true;
    claimBtn().hidden = false;
    // Auto-flash si nouveau
    if (lastDisplayedHintId !== target.id) {
      lastDisplayedHintId = target.id;
      box.classList.remove('objective-flash');
      void box.offsetWidth;
      box.classList.add('objective-flash');
    }
  }
}

// Reclamer un indice : implementation autonome (le buyHint natif a un bug ReferenceError
// sur 'purchasedHintsList' non declaree, qui swallowe silencieusement le clic).
// Tous les indices reclamables ici sont gratuits : le cout etait deja "atteindre la condition".
function claimHint(hint) {
  if (!hint) return;
  const purchased = game.purchasedHints || [];
  if (purchased.includes(hint.id)) return;

  // Ajouter dans la liste visible
  const list = document.getElementById('purchasedHintsList');
  if (list) {
    const li = document.createElement('li');
    li.textContent = hint.message;
    li.classList.add('hint-fresh');
    list.appendChild(li);
    setTimeout(() => li.classList.remove('hint-fresh'), 2000);
  }
  purchased.push(hint.id);
  if (typeof game.setPurchasedHints === 'function') game.setPurchasedHints(purchased);
  if (typeof game.setCurrentHint === 'function') game.setCurrentHint(null);

  // Petit rappel narratif : ou retrouver les indices acquis
  const narr = document.getElementById('narrative');
  if (narr) {
    narr.innerHTML = `Indice révélé ! Tu peux le relire à tout moment dans l'onglet <strong>Sagesses</strong>.`;
  }
}

function wireClaim() {
  const btn = claimBtn();
  if (!btn || btn.dataset.wired) return;
  btn.dataset.wired = '1';
  btn.addEventListener('click', () => {
    const purchased = game.purchasedHints || [];
    // Skip explicitement les indices deja achetes (le displayedHint peut etre stale).
    let hint = displayedHint && !purchased.includes(displayedHint.id) ? displayedHint : null;
    if (!hint && game.currentHint && !purchased.includes(game.currentHint.id)) hint = game.currentHint;
    if (!hint) hint = (game.dynamicHints || []).find(h => !purchased.includes(h.id));
    if (!hint) return;
    claimHint(hint);
    // Force le rafraichissement immediat de l'affichage objectif
    updateObjective();
  });
}

// ============================================================
// 2. Animation de passage d'age (flash dore + narration mise en valeur)
// ============================================================
let lastSeenAge = null;
function checkAgeChange() {
  const cur = game.currentAge;
  if (lastSeenAge === null) { lastSeenAge = cur; return; }
  if (cur !== lastSeenAge) {
    lastSeenAge = cur;
    triggerAgeAnimation(cur);
  }
}

function triggerAgeAnimation(ageName) {
  const overlay = document.createElement('div');
  overlay.className = 'age-unlock-overlay';
  overlay.innerHTML = `
    <div class="age-unlock-content">
      <div class="age-unlock-label">Nouvelle Ère</div>
      <div class="age-unlock-name">${ageName}</div>
      <div class="age-unlock-hint">Cliquez pour continuer</div>
    </div>`;
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('show'));
  const close = () => {
    overlay.classList.remove('show');
    setTimeout(() => overlay.remove(), 500);
  };
  overlay.addEventListener('click', close);
  setTimeout(close, 4500);
}

// ============================================================
// 3. Arbre des Ages
// ============================================================
const TECH_TREE = [
  {
    age: 'Âge de Pierre',
    tone: 'stone',
    items: [
      { icon: '🍇', label: 'Récolte de baies', check: () => true },
      { icon: '🌲', label: 'Bois & Pierre',    check: () => true },
      { icon: '🪓', label: 'Hache',            check: () => game.axes >= 1 },
      { icon: '⚱️', label: 'Seau',             check: () => game.buckets >= 1 },
      { icon: '👤', label: 'Villageois',       check: () => game.villagers >= 1 },
      { icon: '👑', label: 'Chef de tribu',    check: () => game.chief >= 1 },
      { icon: '🔧', label: 'Bricoleur',        check: () => game.tinkers >= 1 },
      { icon: '🏹', label: 'Chasse & Cueillette', check: () => game.hunters >= 1 || game.pickers >= 1 },
    ],
  },
  {
    age: 'Âge des Métaux',
    tone: 'metal',
    items: [
      { icon: '🗺️', label: 'Exploration',      check: () => game.explorers >= 1 || game.discoveredMetals },
      { icon: '⛏️', label: 'Mine',             check: () => game.mines >= 1 },
      { icon: '⚒️', label: 'Métaux',           check: () => game.metals >= 1 },
      { icon: '🪓', label: 'Hache de métal',   check: () => game.metalAxes >= 1 },
      { icon: '🌾', label: 'Fibres & Atelier', check: () => game.workshops >= 1 },
      { icon: '🌿', label: 'Herbes & Remèdes', check: () => game.herbalists >= 1 || game.remedies >= 1 },
      { icon: '🧥', label: 'Manteau (hiver)',  check: () => game.coats >= 1 },
      { icon: '🔬', label: 'Chercheur',        check: () => game.researchers >= 1 },
    ],
  },
  {
    age: 'Âge de l’Agriculture', // apostrophe courbe (match forge-game.js)
    tone: 'farm',
    items: [
      { icon: '🌾', label: 'Champ de blé',     check: () => game.wheatFields >= 1 },
      { icon: '🏭', label: 'Moulin',           check: () => game.mills >= 1 },
      { icon: '🥖', label: 'Boulangerie',      check: () => game.bakeries >= 1 },
      { icon: '🍞', label: 'Pain',             check: () => game.bread >= 1 },
      { icon: '🏬', label: 'Entrepôt',         check: () => game.warehouses >= 1 },
      { icon: '🛠️', label: 'Scierie',          check: () => game.sawmills >= 1 },
      { icon: '⛏️', label: 'Carrière',         check: () => game.stoneQuarries >= 1 },
    ],
  },
  {
    age: 'Âge des Cités',
    tone: 'city',
    items: [
      { icon: '🏡', label: 'Premier village',  check: () => game.villages >= 1 },
      { icon: '👥', label: '100 habitants',    check: () => game.getTotalPopulation() >= 100 },
      { icon: '🏘️', label: 'Plusieurs villages', check: () => game.villages >= 2 },
      { icon: '✨', label: 'Éclats d\'Éternité', check: () => game.eternityShards >= 1 },
      { icon: '🌟', label: '5 dons reçus',     check: () => game.eternityShards >= 5 },
    ],
  },
];

function renderTechTree() {
  const wrap = document.getElementById('techTreeColumns');
  if (!wrap) return;
  wrap.innerHTML = '';
  const currentAgeIdx = TECH_TREE.findIndex(c => c.age === game.currentAge);

  TECH_TREE.forEach((col, idx) => {
    const reached = idx <= currentAgeIdx;
    const isNext   = idx === currentAgeIdx + 1; // prochain age, on tease un peu
    const isFuture = idx > currentAgeIdx + 1;   // ages lointains, totalement caches
    const colEl = document.createElement('div');
    colEl.className = `tech-col tone-${col.tone}`
      + (reached ? ' reached' : ' locked')
      + (idx === currentAgeIdx ? ' current' : '')
      + (isNext ? ' next' : '')
      + (isFuture ? ' future' : '');

    let header, itemsHtml;
    if (reached) {
      header = `<span class="tech-col-num">${idx + 1}</span><span class="tech-col-age">${col.age}</span>`;
      itemsHtml = col.items.map(it => {
        const done = it.check();
        return `<li class="tech-item ${done ? 'done' : ''}"><span class="ti-icon">${it.icon}</span><span class="ti-label">${it.label}</span><span class="ti-check">${done ? '✓' : ''}</span></li>`;
      }).join('');
    } else if (isNext) {
      // Prochain age : nom revele, contenu masque mais nombre d'avancees connu
      header = `<span class="tech-col-num">${idx + 1}</span><span class="tech-col-age">${col.age}</span>`;
      itemsHtml = col.items.map(() =>
        `<li class="tech-item locked-item"><span class="ti-icon">🔒</span><span class="ti-label">À découvrir</span><span class="ti-check"></span></li>`
      ).join('');
    } else {
      // Ages lointains : tout cache
      header = `<span class="tech-col-num">?</span><span class="tech-col-age">??? ???</span>`;
      itemsHtml = '<li class="tech-item locked-item locked-deep"><span class="ti-icon">❔</span><span class="ti-label">Une ère oubliée…</span><span class="ti-check"></span></li>';
    }

    colEl.innerHTML = `
      <div class="tech-col-header">${header}</div>
      <ul class="tech-list">${itemsHtml}</ul>`;
    wrap.appendChild(colEl);
  });

  // Colonne fantome '...' a la fin pour teaser une suite
  const teaser = document.createElement('div');
  teaser.className = 'tech-col tech-col-teaser';
  teaser.innerHTML = `
    <div class="tech-teaser-content">
      <div class="tech-teaser-dots">···</div>
      <div class="tech-teaser-label">D'autres âges<br>viendront</div>
    </div>`;
  wrap.appendChild(teaser);
}

// ============================================================
// Bulle d'aide sur le claim (message transparent sur le petit lag)
// ============================================================
function injectClaimHelpBubble() {
  // supprime : le bug est resolu
}

// ============================================================
// 4. Sauvegardes : panneau modal a 5 slots
// ============================================================
const SAVE_SLOTS = 5;
const SLOT_KEY = (i) => `forgeSave${i}`;
const SLOT_META_KEY = (i) => `forgeSaveMeta${i}`;

function readSlotMeta(i) {
  try {
    const raw = localStorage.getItem(SLOT_KEY(i));
    if (!raw) return null;
    const data = JSON.parse(raw);
    const metaRaw = localStorage.getItem(SLOT_META_KEY(i));
    const meta = metaRaw ? JSON.parse(metaRaw) : {};
    return {
      age: data.currentAge || 'Âge de Pierre',
      villagers: data.villagers || 0,
      season: data.currentSeason ?? 0,
      savedAt: meta.savedAt || null,
    };
  } catch { return null; }
}

function writeSlotMeta(i) {
  localStorage.setItem(SLOT_META_KEY(i), JSON.stringify({ savedAt: Date.now() }));
}

function formatRelativeDate(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mn = String(d.getMinutes()).padStart(2, '0');
  return `${dd}/${mm} ${hh}:${mn}`;
}

const SEASON_ICONS = ['🌱', '☀️', '🍂', '❄️'];

function buildSaveMenu() {
  if (document.getElementById('saveMenuOverlay')) return;
  const overlay = document.createElement('div');
  overlay.id = 'saveMenuOverlay';
  overlay.innerHTML = `
    <div class="save-menu-card" role="dialog" aria-label="Sauvegardes">
      <div class="save-menu-header">
        <span>💾 Sauvegardes</span>
        <button class="save-menu-close" aria-label="Fermer">×</button>
      </div>
      <ul class="save-slots"></ul>
      <div class="save-menu-warning">⚠ Les sauvegardes sont stockées dans ton navigateur. Si tu vides le cache, elles seront perdues.</div>
      <div class="save-menu-debug" hidden>
        <span class="save-debug-label">Mode debug</span>
        <button class="save-debug-btn" id="saveExportDebugBtn">Exporter…</button>
        <button class="save-debug-btn" id="saveImportDebugBtn">Importer…</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeSaveMenu(); });
  overlay.querySelector('.save-menu-close').addEventListener('click', closeSaveMenu);
  overlay.querySelector('#saveExportDebugBtn').addEventListener('click', () => {
    const btn = document.getElementById('exportSaveBtn'); if (btn) btn.click();
  });
  overlay.querySelector('#saveImportDebugBtn').addEventListener('click', () => {
    const btn = document.getElementById('importSaveBtn'); if (btn) btn.click();
  });
}

function renderSlots() {
  const list = document.querySelector('#saveMenuOverlay .save-slots');
  if (!list) return;
  list.innerHTML = '';
  for (let i = 0; i < SAVE_SLOTS; i++) {
    const meta = readSlotMeta(i);
    const li = document.createElement('li');
    li.className = 'save-slot' + (meta ? ' filled' : ' empty');
    if (meta) {
      const seasonIcon = SEASON_ICONS[meta.season] || '🌱';
      li.innerHTML = `
        <div class="slot-info">
          <div class="slot-num">Slot ${i + 1}</div>
          <div class="slot-age">${meta.age}</div>
          <div class="slot-meta">${seasonIcon} · 👤 ${meta.villagers} villageois${meta.savedAt ? ' · ' + formatRelativeDate(meta.savedAt) : ''}</div>
        </div>
        <div class="slot-actions">
          <button class="slot-btn slot-load" data-slot="${i}">Charger</button>
          <button class="slot-btn slot-save" data-slot="${i}">Écraser</button>
          <button class="slot-btn slot-delete" data-slot="${i}" title="Supprimer">×</button>
        </div>`;
    } else {
      li.innerHTML = `
        <div class="slot-info">
          <div class="slot-num">Slot ${i + 1}</div>
          <div class="slot-empty-label">Vide</div>
        </div>
        <div class="slot-actions">
          <button class="slot-btn slot-save primary" data-slot="${i}">Sauvegarder ici</button>
        </div>`;
    }
    list.appendChild(li);
  }
  list.querySelectorAll('.slot-save').forEach(b => b.addEventListener('click', () => doSlotSave(+b.dataset.slot)));
  list.querySelectorAll('.slot-load').forEach(b => b.addEventListener('click', () => doSlotLoad(+b.dataset.slot)));
  list.querySelectorAll('.slot-delete').forEach(b => b.addEventListener('click', () => doSlotDelete(+b.dataset.slot)));
}

function doSlotSave(i) {
  if (typeof window.saveGame !== 'function') return;
  window.saveGame(i);
  writeSlotMeta(i);
  renderSlots();
}
function doSlotLoad(i) {
  if (typeof window.loadGame !== 'function') return;
  window.loadGame(i);
  closeSaveMenu();
}
function doSlotDelete(i) {
  if (!confirm(`Supprimer la sauvegarde Slot ${i + 1} ?`)) return;
  localStorage.removeItem(SLOT_KEY(i));
  localStorage.removeItem(SLOT_META_KEY(i));
  renderSlots();
}

function openSaveMenu() {
  buildSaveMenu();
  renderSlots();
  // affiche les boutons debug uniquement si le panel debug est ouvert OU ?debug=1
  const debugOpen = document.getElementById('debugPanel')?.classList.contains('open')
    || new URLSearchParams(location.search).has('debug');
  const dbg = document.querySelector('#saveMenuOverlay .save-menu-debug');
  if (dbg) dbg.hidden = !debugOpen;
  document.getElementById('saveMenuOverlay').classList.add('open');
}
function closeSaveMenu() {
  const o = document.getElementById('saveMenuOverlay');
  if (o) o.classList.remove('open');
}

// ============================================================
// 5. Mode DEBUG (Ctrl+Shift+D ou ?debug=1)
// ============================================================
// IMPORTANT : ces noms doivent matcher EXACTEMENT ceux utilises dans forge-game.js,
// y compris l'apostrophe courbe ’ (U+2019) dans "Âge de l’Agriculture".
const DEBUG_AGES = ['Âge de Pierre', 'Âge des Métaux', 'Âge de l’Agriculture', 'Âge des Cités'];

// Donne >= n de la ressource via le setter approprie
function debugGive(resource, amount) {
  const map = {
    berries: 'setBerries', wood: 'setWood', stone: 'setStone', water: 'setWater',
    meat: 'setMeat', fibers: 'setFibers', metals: 'setMetals', herbs: 'setHerbs',
    wheat: 'setWheat', flour: 'setFlour', bread: 'setBread',
    axes: 'setAxes', buckets: 'setBuckets', wells: 'setWells', pickaxes: 'setPickaxes',
    bows: 'setBows', coats: 'setCoats', metalAxes: 'setMetalAxes', remedies: 'setRemedies',
    mines: 'setMines', workshops: 'setWorkshops', sawmills: 'setSawmills',
    stoneQuarries: 'setStoneQuarries', herbalists: 'setHerbalists',
    wheatFields: 'setWheatFields', mills: 'setMills',
    villagers: 'setVillagers', chief: 'setChief', tinkers: 'setTinkers',
    researchers: 'setResearchers', pickers: 'setPickers', hunters: 'setHunters',
    explorers: 'setExplorers', miners: 'setMiners', farmers: 'setFarmers',
    villages: 'setVillages', eternityShards: 'setEternityShards',
  };
  const setterName = map[resource];
  if (setterName && typeof game[setterName] === 'function') {
    const cur = game[resource] ?? 0;
    game[setterName](Math.max(cur, amount));
  }
}

function debugFulfillCurrentObjective() {
  const purchased = game.purchasedHints || [];
  const hint = (game.dynamicHints || []).find(h => !purchased.includes(h.id));
  if (!hint) { debugLog('Tous les indices ont ete reveles.'); return; }
  const meta = OBJECTIVE_LABELS[hint.id];
  if (meta) {
    // Trouve la ressource correspondant au getCur()
    const resourceName = inferResourceFromGetCur(meta.getCur);
    if (resourceName) {
      debugGive(resourceName, meta.target);
      debugLog(`Objectif satisfait : ${meta.goal} (${resourceName} >= ${meta.target}).`);
    } else {
      // Fallback : tenter de remplir toutes les ressources usuelles
      ['villagers','axes','pickers','tinkers','wells','buckets','fibers','water','flour','eternityShards']
        .forEach(r => debugGive(r, meta.target));
      debugLog(`Objectif force par fallback (cible=${meta.target}).`);
    }
  } else {
    debugLog('Aucun mapping pour cet indice : ' + hint.id);
  }
  // Force un tick d'update
  setTimeout(() => { updateObjective(); renderTechTree(); }, 50);
}

// Heuristique : exécute getCur dans un sandbox pour deviner la ressource lue
function inferResourceFromGetCur(fn) {
  const src = fn.toString();
  const candidates = ['berries','wood','stone','water','meat','fibers','metals','herbs','wheat','flour','bread',
    'axes','buckets','wells','pickaxes','bows','coats','metalAxes','remedies',
    'mines','workshops','sawmills','stoneQuarries','herbalists','wheatFields','mills',
    'villagers','chief','tinkers','researchers','pickers','hunters','explorers','miners','farmers',
    'villages','eternityShards'];
  return candidates.find(c => src.includes('game.' + c) || src.includes('.' + c));
}

function debugAdvanceAge() {
  const idx = DEBUG_AGES.indexOf(game.currentAge);
  if (idx < DEBUG_AGES.length - 1 && typeof game.setCurrentAge === 'function') {
    const next = DEBUG_AGES[idx + 1];
    game.setCurrentAge(next);
    if (typeof game.setUnlockedAges === 'function') {
      const unlocked = game.unlockedAges || [];
      if (!unlocked.includes(next)) { unlocked.push(next); game.setUnlockedAges(unlocked); }
    }
    debugLog('Avancé à : ' + next);
  } else {
    debugLog('Déjà au dernier âge.');
  }
}

function debugFloodResources() {
  ['berries','wood','stone','water','meat','fibers','metals','herbs','wheat','flour','bread']
    .forEach(r => debugGive(r, 9999));
  debugLog('+9999 de toutes les ressources brutes.');
}

function debugAdvanceSeason() {
  if (typeof game.setSeasonTimer === 'function') {
    game.setSeasonTimer(game.seasonDuration - 1);
    debugLog('Saison avancée (au prochain tick).');
  }
}

function debugLog(msg) {
  const log = document.getElementById('debugLog');
  if (log) {
    const line = document.createElement('div');
    line.textContent = '› ' + msg;
    log.prepend(line);
    while (log.children.length > 8) log.lastChild.remove();
  }
  console.log('[FDA debug]', msg);
}

function buildDebugPanel() {
  if (document.getElementById('debugPanel')) return;
  const panel = document.createElement('div');
  panel.id = 'debugPanel';
  panel.innerHTML = `
    <div class="debug-header">
      <span>🛠️ Mode Debug</span>
      <button id="debugClose" title="Fermer (Ctrl+Shift+D)">×</button>
    </div>
    <div class="debug-body">
      <button class="debug-btn" data-act="objective">✓ Satisfaire objectif courant</button>
      <button class="debug-btn" data-act="age">⏩ Avancer d'un âge</button>
      <button class="debug-btn" data-act="season">🍂 Forcer fin de saison</button>
      <button class="debug-btn" data-act="flood">💰 +9999 toutes ressources</button>
      <button class="debug-btn" data-act="pop">👥 +50 villageois</button>
      <button class="debug-btn" data-act="shard">✨ +1 éclat</button>
      <button class="debug-btn" data-act="tools">⚒️ +50 outils chacun</button>
    </div>
    <div id="debugLog"></div>
  `;
  document.body.appendChild(panel);
  panel.querySelector('#debugClose').addEventListener('click', toggleDebugPanel);
  panel.querySelectorAll('.debug-btn').forEach(b => {
    b.addEventListener('click', () => {
      const act = b.dataset.act;
      switch (act) {
        case 'objective': debugFulfillCurrentObjective(); break;
        case 'age':       debugAdvanceAge(); break;
        case 'season':    debugAdvanceSeason(); break;
        case 'flood':     debugFloodResources(); break;
        case 'pop':       debugGive('villagers', (game.villagers || 0) + 50); debugLog('+50 villageois'); break;
        case 'shard':     debugGive('eternityShards', (game.eternityShards || 0) + 1); debugLog('+1 éclat'); break;
        case 'tools':     ['axes','buckets','pickaxes','bows','coats','metalAxes','remedies'].forEach(r => debugGive(r, 50)); debugLog('+50 de chaque outil'); break;
      }
    });
  });
}

function toggleDebugPanel() {
  buildDebugPanel();
  const p = document.getElementById('debugPanel');
  p.classList.toggle('open');
}

// ============================================================
// Bootstrap
// ============================================================
// Limite chefs : 1 par village (et 1 minimum tant qu'on a un chef au total).
// Quand la limite est atteinte, on grise le bouton + tooltip explicite.
function enforceChiefCap() {
  const btn = document.getElementById('appointChiefBtn');
  if (!btn) return;
  const chiefCount = game.chief || 0;
  const villageCount = game.villages || 0;
  const cap = Math.max(1, villageCount); // au moins 1 chef autorise des le depart
  if (chiefCount >= cap) {
    btn.disabled = true;
    btn.dataset.chiefCapped = '1';
    btn.title = villageCount === 0
      ? 'Un seul chef suffit avant de fonder un village.'
      : `Limite atteinte : 1 chef par village (${chiefCount}/${cap}).`;
  } else if (btn.dataset.chiefCapped) {
    btn.disabled = false;
    btn.dataset.chiefCapped = '';
    btn.title = '';
  }
}

// Regle "1 outil par villageois" : on ne peut pas fabriquer plus d'outils
// portatifs que de personnes pour les manier.
const PERSONAL_TOOLS = ['axes', 'buckets', 'pickaxes', 'bows', 'coats', 'metalAxes', 'remedies'];
const TOOL_BTN_IDS = {
  axes: 'craftAxeBtn', buckets: 'craftBucketBtn', pickaxes: 'craftPickaxeBtn',
  bows: 'craftBowBtn', coats: 'craftCoatBtn', metalAxes: 'craftMetalAxeBtn',
  remedies: 'craftRemedyBtn',
};
function enforceToolCap() {
  const villagers = game.villagers || 0;
  const totalTools = PERSONAL_TOOLS.reduce((s, k) => s + (game[k] || 0), 0);
  const capped = totalTools >= villagers && villagers >= 0;
  PERSONAL_TOOLS.forEach(k => {
    const btn = document.getElementById(TOOL_BTN_IDS[k]);
    if (!btn) return;
    if (capped) {
      if (!btn.dataset.toolCapped) {
        btn.dataset.toolCapped = '1';
        btn.dataset.prevTitle = btn.title || '';
      }
      btn.disabled = true;
      btn.title = villagers === 0
        ? 'Attire d\'abord des villageois pour porter les outils.'
        : `1 outil par personne (${totalTools}/${villagers}). Recrute plus de villageois.`;
    } else if (btn.dataset.toolCapped) {
      btn.dataset.toolCapped = '';
      btn.title = btn.dataset.prevTitle || '';
      // ne pas reactiver de force : laisse forge-ui gerer le canAfford
    }
  });
}

// ============================================================
// 5. Boutons de recolte en masse (+5 / +50 / +500)
// ============================================================
const BULK_TIERS = [
  { n: 5,   unlockVillagers: 5,   label: '+5'   },
  { n: 50,  unlockVillagers: 25,  label: '+50'  },
  { n: 500, unlockVillagers: 100, label: '+500' },
];
// Uniquement les baies : les autres ressources s'optimisent via outils (haches,
// pioches, seaux) et metiers (chasseurs). Les boutons bulk seraient cheates.
const BULK_GATHERERS = ['gatherBerries'];
// Au-dela de ce nombre de cueilleurs, la recolte est automatisee : on cache les bulk.
const BULK_HIDE_AT_PICKERS = 10;

function setupBulkButtons() {
  document.querySelectorAll('.resource button[onclick]').forEach(btn => {
    const m = btn.getAttribute('onclick').match(/(\w+)\(\)/);
    if (!m) return;
    const fnName = m[1];
    if (!BULK_GATHERERS.includes(fnName)) return;
    if (btn.dataset.bulkWired) return;
    btn.dataset.bulkWired = '1';

    BULK_TIERS.forEach(tier => {
      const b = document.createElement('button');
      b.className = 'bulk-btn';
      b.textContent = tier.label;
      b.dataset.bulkN = tier.n;
      b.dataset.bulkFn = fnName;
      b.hidden = true;
      b.addEventListener('click', () => {
        const fn = window[fnName];
        if (typeof fn !== 'function') return;
        for (let i = 0; i < tier.n; i++) fn();
      });
      btn.parentNode.insertBefore(b, btn.nextSibling);
    });
  });
}

function updateBulkVisibility() {
  const villagers = game.villagers || 0;
  const pickers = game.pickers || 0;
  const automated = pickers >= BULK_HIDE_AT_PICKERS;
  document.querySelectorAll('.bulk-btn').forEach(b => {
    const n = parseInt(b.dataset.bulkN, 10);
    const tier = BULK_TIERS.find(t => t.n === n);
    if (!tier) return;
    const shouldShow = !automated && villagers >= tier.unlockVillagers;
    if (shouldShow && b.hidden) {
      b.hidden = false;
      b.classList.add('bulk-unlock-flash');
      setTimeout(() => b.classList.remove('bulk-unlock-flash'), 1800);
    } else if (!shouldShow && !b.hidden) {
      b.hidden = true;
    }
  });
}

function tick() {
  try {
    updateObjective();
    checkAgeChange();
    renderTechTree();
    enforceChiefCap();
    enforceToolCap();
    setupBulkButtons();
    updateBulkVisibility();
  } catch (e) { /* silencieux */ }
}

// ============================================================
// CONSEILS CONTEXTUELS : petits indices sous les sections
// ============================================================
const SECTION_TIPS = {
  workforce: [
    { condition: () => game.villagers >= 10 && game.pickers < 2,
      text: "Recrute des cueilleurs pour automatiser la récolte de baies." },
    { condition: () => game.axes >= 5 && game.hunters < 1 && game.villagers >= 15,
      text: "Un chasseur rapporte de la viande, plus nourrissante que les baies." },
    { condition: () => game.villageFounded && game.tinkers < 1,
      text: "Un bricoleur débloque la scierie et la carrière." },
    { condition: () => game.tinkers >= 1 && game.miners < 5 && game.discoveredMetals,
      text: "Plus tu as de mineurs, plus tu extrais de métaux vite." },
    { condition: () => game.tinkers >= 10 && game.researchers < 1,
      text: "10 bricoleurs peuvent devenir un chercheur, clé des découvertes." },
    { condition: () => game.villagers >= 40 && game.pickers < 5,
      text: "Avec 40 habitants, tu as besoin de plus de cueilleurs pour ne pas manquer de nourriture." },
    { condition: () => game.water < 20 && game.villagers > 5,
      text: "L'eau est basse ! Construis un puits ou récolte avant que les villageois meurent de soif." },
    { condition: () => game.currentSeason === 3 && game.coats < game.villagers,
      text: "C'est l'hiver ! Fabrique des manteaux vite ou tes villageois mourront de froid." },
  ],
  buildings: [
    { condition: () => game.tinkers >= 1 && game.sawmills < 1,
      text: "Une scierie produit du bois automatiquement, libère du temps pour le reste." },
    { condition: () => game.tinkers >= 1 && game.stoneQuarries < 1,
      text: "Une carrière extrait de la pierre sans effort de ta part." },
    { condition: () => game.wells < 2 && game.villagers >= 10,
      text: "Avec plus de villageois, un second puits évite la pénurie d'eau." },
    { condition: () => game.discoveredMetals && game.mines < 1,
      text: "Les métaux sont découverts ! Une mine te permettra de les extraire." },
    { condition: () => game.discoveredHerbs && game.herbalists < 1,
      text: "Construis une herboristerie pour fabriquer des remèdes et ralentir les morts." },
    { condition: () => game.wheatFields >= 1 && game.mills < 1,
      text: "Un moulin transforme le blé en farine, base de l'alimentation de l'âge agricole." },
    { condition: () => game.villagesData.length > 0 && game.villagesData.every(v => v.buildings.filter(b => b !== "well").length >= game.maxBuildingsPerVillage) && game.villagers >= 50,
      text: "Tes villages sont pleins ! Fonde un nouveau village pour construire davantage." },
  ],
};

let _tipEls = {};

function getOrCreateTipEl(sectionId) {
  if (_tipEls[sectionId]) return _tipEls[sectionId];
  const section = document.getElementById(sectionId);
  if (!section) return null;
  const el = document.createElement('p');
  el.className = 'section-ctx-tip';
  section.appendChild(el);
  _tipEls[sectionId] = el;
  return el;
}

function updateContextualTips() {
  const sections = [
    { id: 'workforceSection', key: 'workforce' },
    { id: 'buildingsSection', key: 'buildings' },
  ];
  for (const { id, key } of sections) {
    const el = getOrCreateTipEl(id);
    if (!el) continue;
    const tips = SECTION_TIPS[key];
    const active = tips.find(t => { try { return t.condition(); } catch { return false; } });
    el.textContent = active ? active.text : '';
    el.hidden = !active;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  // Demande le pseudo au 1er contact (ne bloque pas si l'utilisateur annule)
  if (!getPseudo()) {
    setTimeout(askPseudo, 600); // petit delai pour laisser l'UI s'afficher
  }
  setupNarrativePersonalization();

  // Nudge anti-rush : au tout debut, petit message invitant a la patience.
  // Affiche une seule fois par partie (ou par navigateur).
  if (!localStorage.getItem('fda_patienceNudged')) {
    setTimeout(() => {
      const narr = document.getElementById('narrative');
      if (narr) {
        narr.innerHTML = `Prends ton temps, {pseudo}. Forge des Âges est un jeu lent qui recompense la patience : chaque age se construit sur le precedent. Observe ton Objectif en haut et consulte Sagesses quand tu bloques.`;
        narr.innerHTML = personalize(narr.innerHTML);
      }
      localStorage.setItem('fda_patienceNudged', '1');
    }, 2000);
  }

  // Petite bulle d'info sur l'objectif : rappelle qu'il peut y avoir du lag au claim
  setTimeout(injectClaimHelpBubble, 800);

  wireClaim();
  tick();
  setInterval(tick, 1000);
  setInterval(updateContextualTips, 2000);
  const openSaveBtn = document.getElementById('openSaveMenuBtn');
  if (openSaveBtn) openSaveBtn.addEventListener('click', openSaveMenu);
  // Re-applique les caps juste apres chaque clic, en phase BUBBLE et SYNCHRONE
  // (avant le repaint navigateur), pour eviter le flash d'activation des boutons.
  document.addEventListener('click', () => { enforceToolCap(); enforceChiefCap(); });

  // Debug mode : Ctrl+Shift+D ou ?debug=1 dans l'URL
  if (new URLSearchParams(location.search).has('debug')) {
    buildDebugPanel();
    document.getElementById('debugPanel').classList.add('open');
  }
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && (e.key === 'D' || e.key === 'd')) {
      e.preventDefault();
      toggleDebugPanel();
    }
  });
});
