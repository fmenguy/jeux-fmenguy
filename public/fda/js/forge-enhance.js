// FDA enhance : objectif courant en haut, animation passage d'age, arbre tech.
// Module additif : ne touche pas aux modules de jeu existants.
import * as game from './forge-game.js';

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
  prepareForChief:   { goal: 'Forger 25 haches',                getCur: () => game.axes,          target: 25 },
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
  reorganizeHint:    { goal: 'Faire ta premiere decouverte',    getCur: () => 1,                  target: 1 },
};

// Indice courant pre-paye (interne, on "achete" automatiquement quand le joueur clique reclamer)
let lastDisplayedHintId = null;

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
    box.classList.add('objective-empty');
    objMsg().textContent = 'Toutes les sagesses sont dévoilées. Vise les Éclats d\'Éternité !';
    objProgWrap().hidden = true;
    claimBtn().hidden = true;
    return;
  }

  box.classList.remove('objective-empty');
  const meta = OBJECTIVE_LABELS[target.id];
  const conditionMet = target.condition();
  const alreadyPurchased = purchased.includes(target.id);

  if (alreadyPurchased) {
    // Cherche le suivant
    return;
  }

  if (meta && !conditionMet) {
    // Affichage du PROGRES vers la condition de deblocage
    box.classList.add('objective-progress');
    box.classList.remove('objective-ready');
    objMsg().textContent = '🎯 ' + meta.goal;
    objProgWrap().hidden = false;
    const cur = Math.min(meta.getCur(), meta.target);
    const pct = Math.min(100, Math.round((cur / meta.target) * 100));
    objProgBar().style.width = pct + '%';
    objProgTxt().textContent = `${cur} / ${meta.target}`;
    claimBtn().hidden = true;
  } else {
    // Condition remplie : l'indice est PRET a etre revele
    box.classList.add('objective-ready');
    box.classList.remove('objective-progress');
    objMsg().textContent = '✨ Indice débloqué : clique pour le révéler.';
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

function wireClaim() {
  const btn = claimBtn();
  if (!btn || btn.dataset.wired) return;
  btn.dataset.wired = '1';
  btn.addEventListener('click', () => {
    // Le 1er indice de chaque session est offert : on bypass le cout en pre-creditant
    const hint = game.currentHint || (game.dynamicHints || []).find(h => h.condition() && !(game.purchasedHints || []).includes(h.id));
    if (!hint) return;
    // Forcer l'achat via la fonction native si dispo
    if (typeof window.buyHint === 'function') {
      // Donner un coup de pouce : creediter les ressources passives manquantes pour permettre l'achat
      const cost = hint.cost || {};
      if (cost.passive) {
        // passifs : pas de cout, on appelle juste buyHint
      }
      window.buyHint();
    }
    // Apres claim, l'indice est dans purchasedHints, updateObjective passera au suivant
    setTimeout(updateObjective, 50);
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
    age: 'Âge de l\'Agriculture',
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
    const colEl = document.createElement('div');
    colEl.className = `tech-col tone-${col.tone}` + (reached ? ' reached' : ' locked') + (idx === currentAgeIdx ? ' current' : '');
    const itemsHtml = col.items.map(it => {
      const done = reached && it.check();
      return `<li class="tech-item ${done ? 'done' : ''}"><span class="ti-icon">${it.icon}</span><span class="ti-label">${it.label}</span><span class="ti-check">${done ? '✓' : ''}</span></li>`;
    }).join('');
    colEl.innerHTML = `
      <div class="tech-col-header">
        <span class="tech-col-num">${idx + 1}</span>
        <span class="tech-col-age">${col.age}</span>
      </div>
      <ul class="tech-list">${itemsHtml}</ul>`;
    wrap.appendChild(colEl);
  });
}

// ============================================================
// Bootstrap
// ============================================================
function tick() {
  try {
    updateObjective();
    checkAgeChange();
    renderTechTree();
  } catch (e) { /* silencieux */ }
}

document.addEventListener('DOMContentLoaded', () => {
  wireClaim();
  tick();
  setInterval(tick, 1000);
});
