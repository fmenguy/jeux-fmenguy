// FDA · Moteur des ages tardifs (5 a 8).
//
// Module additif : il ne modifie aucun module existant. Il lit l'etat du jeu via
// forge-game.js, tient son propre etat pour les ressources, batiments et metiers
// tardifs, genere son UI, et tourne sur son propre tick.
//
// Tout le CONTENU vit dans forge-ages-data.js. Ce fichier ne contient que des
// mecaniques generiques : ajouter un batiment ne doit demander AUCUNE ligne ici.
//
// C'est le patron destine au jeu Strates : le registre de donnees se transpose
// directement en techtree.json / buildings.json.

import * as game from './forge-game.js';
import { AGE_STONE, AGE_METALS, AGE_FARMING, AGE_CITIES } from './forge-game.js';
import { LATE_AGES, AGE_STEAM, AGE_MACHINES, AGE_ATOM, AGE_STARS } from './forge-ages-data.js';

export { AGE_STEAM, AGE_MACHINES, AGE_ATOM, AGE_STARS, LATE_AGES };

// Ordre canonique des huit ages. Source unique : ne jamais retaper ces chaines.
export const AGE_ORDER = [
  AGE_STONE, AGE_METALS, AGE_FARMING, AGE_CITIES,
  AGE_STEAM, AGE_MACHINES, AGE_ATOM, AGE_STARS,
];

export const ageIndex = (name) => AGE_ORDER.indexOf(name);
const currentAgeIndex = () => Math.max(0, ageIndex(game.currentAge));

// Le savoir est la seule ressource dont la production est amplifiee par la
// recherche. Son id est nomme ici pour eviter de le retaper dans le moteur.
export const RES_KNOWLEDGE = 'knowledge';

// ============================================================
// Index plats du registre
// ============================================================
const byId = (list) => Object.fromEntries(list.map((x) => [x.id, x]));

export const LATE_RESOURCES = byId(LATE_AGES.flatMap((a) => a.resources.map((r) => ({ ...r, age: a.name }))));
export const LATE_BUILDINGS = byId(LATE_AGES.flatMap((a) => a.buildings.map((b) => ({ ...b, age: a.name }))));
export const LATE_WORKERS = byId(LATE_AGES.flatMap((a) => a.workers.map((w) => ({ ...w, age: a.name }))));

// ============================================================
// Etat etendu (un seul objet, sauvegarde en bloc par forge-save.js)
// ============================================================
const freshState = () => ({
  res: Object.fromEntries(Object.keys(LATE_RESOURCES).map((id) => [id, 0])),
  buildings: Object.fromEntries(Object.keys(LATE_BUILDINGS).map((id) => [id, 0])),
  workers: Object.fromEntries(Object.keys(LATE_WORKERS).map((id) => [id, 0])),
  flags: { planetsSettled: 0, rocketLaunched: false },
});

let state = freshState();

export function getExtendedState() {
  return state;
}

// Fusion tolerante : une vieille sauvegarde qui ignore une ressource recente
// repart a zero sur celle ci plutot que de planter.
export function setExtendedState(saved) {
  const base = freshState();
  if (!saved || typeof saved !== 'object') {
    state = base;
    return;
  }
  for (const key of ['res', 'buildings', 'workers']) {
    if (!saved[key]) continue;
    for (const id of Object.keys(base[key])) {
      const v = Number(saved[key][id]);
      if (Number.isFinite(v) && v >= 0) base[key][id] = v;
    }
  }
  base.flags = { ...base.flags, ...(saved.flags || {}) };
  state = base;
}

// ============================================================
// Acces unifie aux ressources : core (forge-game.js) et tardives (state.res)
// ============================================================
const CORE_RES_SETTER = {
  berries: 'setBerries', wood: 'setWood', stone: 'setStone', water: 'setWater',
  meat: 'setMeat', fibers: 'setFibers', metals: 'setMetals', herbs: 'setHerbs',
  wheat: 'setWheat', flour: 'setFlour', bread: 'setBread',
};

// Compteurs core lisibles pour les couts et les prerequis (batiments, metiers).
const CORE_COUNTS = [
  'villagers', 'chief', 'pickers', 'hunters', 'miners', 'farmers', 'tinkers',
  'researchers', 'explorers', 'villages', 'mines', 'workshops', 'sawmills',
  'stoneQuarries', 'herbalists', 'wheatFields', 'mills', 'bakeries',
  'warehouses', 'wells', 'eternityShards', 'axes', 'buckets', 'pickaxes',
  'bows', 'coats', 'metalAxes', 'remedies',
];

export const isCoreRes = (id) => Object.prototype.hasOwnProperty.call(CORE_RES_SETTER, id);

export function getRes(id) {
  if (isCoreRes(id)) return game[id] || 0;
  if (id in state.res) return state.res[id];
  return 0;
}

export function setRes(id, value) {
  const v = Math.max(0, value);
  if (isCoreRes(id)) {
    game[CORE_RES_SETTER[id]](v);
  } else if (id in state.res) {
    state.res[id] = Math.min(v, resCap(id));
  }
}

export const addRes = (id, n) => setRes(id, getRes(id) + n);

// Plafond d'une ressource tardive. Les entrepots elargissent aussi ces stocks.
export function resCap(id) {
  const def = LATE_RESOURCES[id];
  if (!def) return Infinity;
  return def.max + (game.warehouses || 0) * 5000;
}

// Lecture generique d'un compteur : ressource, batiment ou metier, core ou tardif.
export function getCount(id) {
  if (isCoreRes(id)) return game[id] || 0;
  if (CORE_COUNTS.includes(id)) return game[id] || 0;
  if (id in state.buildings) return state.buildings[id];
  if (id in state.workers) return state.workers[id];
  if (id in state.res) return state.res[id];
  return 0;
}

// ============================================================
// Visibilite et achat
// ============================================================
// Un batiment de seuil (unlocksAge) apparait des l'age precedent : c'est lui qui
// fait basculer d'age. Les autres n'apparaissent qu'une fois l'age atteint.
export function isBuildingVisible(b) {
  const need = ageIndex(b.age);
  return currentAgeIndex() >= (b.unlocksAge ? need - 1 : need);
}

export const isWorkerVisible = (w) => currentAgeIndex() >= ageIndex(w.age);

export const isResourceVisible = (r) => currentAgeIndex() >= ageIndex(r.age) || getRes(r.id) > 0;

export function missingFor(cost) {
  const missing = [];
  for (const [id, amount] of Object.entries(cost || {})) {
    const have = getCount(id);
    if (have < amount) missing.push({ id, have, amount });
  }
  return missing;
}

export const canAfford = (cost) => missingFor(cost).length === 0;

function payCost(cost) {
  for (const [id, amount] of Object.entries(cost || {})) {
    // Les couts portant sur un compteur (villageois, chercheurs) sont des
    // prerequis a posseder, pas des ressources a depenser.
    if (isCoreRes(id) || id in state.res) setRes(id, getRes(id) - amount);
  }
}

const label = (id) => {
  const names = {
    berries: 'baies', wood: 'bois', stone: 'pierre', water: 'eau', meat: 'viande',
    fibers: 'fibres', metals: 'métaux', herbs: 'herbes', wheat: 'blé',
    flour: 'farine', bread: 'pain', villagers: 'villageois', tinkers: 'bricoleurs',
    researchers: 'chercheurs', miners: 'mineurs', warehouses: 'entrepôts',
    villages: 'villages',
  };
  if (names[id]) return names[id];
  if (LATE_RESOURCES[id]) return LATE_RESOURCES[id].name.toLowerCase();
  if (LATE_BUILDINGS[id]) return LATE_BUILDINGS[id].name.toLowerCase();
  if (LATE_WORKERS[id]) return LATE_WORKERS[id].name.toLowerCase();
  return id;
};

export const formatCost = (cost) =>
  Object.entries(cost || {}).map(([id, n]) => `${n} ${label(id)}`).join(', ');

function narrate(text) {
  const el = document.getElementById('narrative');
  if (el) el.textContent = text;
}

// ============================================================
// Construction et recrutement
// ============================================================
export function build(id) {
  const b = LATE_BUILDINGS[id];
  if (!b) return { error: 'Bâtiment inconnu.' };
  if (!isBuildingVisible(b)) return { error: 'Cet âge n’est pas encore atteint.' };
  const missing = missingFor(b.cost);
  if (missing.length) {
    return { error: `Il te faut ${formatCost(b.cost)}. Il manque : ${missing.map((m) => `${Math.floor(m.amount - m.have)} ${label(m.id)}`).join(', ')}.` };
  }
  payCost(b.cost);
  state.buildings[id] += 1;
  if (b.unlocksAge && ageIndex(b.unlocksAge) > currentAgeIndex()) {
    enterAge(b.unlocksAge);
  } else {
    narrate(b.narrative);
  }
  if (b.effect === 'endgame') offerLaunch();
  return undefined;
}

export function recruit(id) {
  const w = LATE_WORKERS[id];
  if (!w) return { error: 'Métier inconnu.' };
  const missing = missingFor(w.cost);
  if (missing.length) {
    return { error: `Il te faut ${formatCost(w.cost)}. Il manque : ${missing.map((m) => `${Math.floor(m.amount - m.have)} ${label(m.id)}`).join(', ')}.` };
  }
  payCost(w.cost);
  state.workers[id] += 1;
  narrate(w.narrative);
  return undefined;
}

function enterAge(name) {
  game.setCurrentAge(name);
  const unlocked = game.unlockedAges || [];
  if (!unlocked.includes(name)) {
    unlocked.push(name);
    game.setUnlockedAges(unlocked);
  }
  const def = LATE_AGES.find((a) => a.name === name);
  narrate(def ? `Tu entres dans l’${name} ! ${def.tooltip}` : `Tu entres dans l’${name} !`);
}

// ============================================================
// Effets passifs
// ============================================================
// Deux familles d'effets, volontairement distinctes :
//  . structurels (buildingSlots, populationCap) : lies au simple fait que le
//    batiment existe. Les rendre dependants de la production ferait dépasser la
//    limite de batiments par village des la moindre panne de charbon.
//  . dynamiques (globalProduction, researchMultiplier, autoCraftTools) : lies au
//    fait que le batiment a REELLEMENT tourne au dernier tick. Une usine privee
//    d'electricite ne booste plus rien.
const sumEffect = (kind, counts) =>
  Object.values(LATE_BUILDINGS)
    .filter((b) => b.effect === kind)
    .reduce((s, b) => s + (counts[b.id] || 0) * (b.effectValue || 0), 0);

// Nombre de batiments ayant effectivement tourne au dernier tick.
let activeCount = {};

const structural = (kind) => sumEffect(kind, state.buildings);
const dynamic = (kind) => sumEffect(kind, activeCount);

const BASE_BUILDINGS_PER_VILLAGE = 2;
const BASE_POPULATION_PER_VILLAGE = 250;

function applyPassiveEffects() {
  game.setMaxBuildingsPerVillage(BASE_BUILDINGS_PER_VILLAGE + Math.floor(structural('buildingSlots')));
  game.setMaxPopulationPerVillage(BASE_POPULATION_PER_VILLAGE + Math.floor(structural('populationCap')));
}

// L'industrie s'affranchit des saisons : aucun modificateur saisonnier ici,
// contrairement aux recoltes des ages 1 a 4. C'est le sens de l'age de la Vapeur.
export const globalFactor = () => 1 + dynamic('globalProduction');
export const researchFactor = () => 1 + dynamic('researchMultiplier');

// Une usine fabrique les biens personnels que le joueur devait cliquer un a un.
// Le cout matiere est paye ici, pas dans le champ consumes du batiment, pour
// eviter de le debiter deux fois.
const COAT_COST = { fibers: 8, wood: 4 };
const REMEDY_COST = { herbs: 4, water: 4 };

function autoCraftTools() {
  const factories = Math.floor(dynamic('autoCraftTools'));
  const villagers = game.villagers || 0;
  for (let i = 0; i < factories; i++) {
    if (game.coats < villagers && canAfford(COAT_COST)) {
      payCost(COAT_COST);
      game.setCoats(game.coats + 1);
    } else if (game.remedies < villagers && canAfford(REMEDY_COST)) {
      payCost(REMEDY_COST);
      game.setRemedies(game.remedies + 1);
    }
  }
}

// ============================================================
// Production
// ============================================================
// Un batiment ne produit que si TOUTES ses consommations sont couvertes.
// Cela cree les vraies chaines : sans charbon, la fonderie s'arrete.
// Retourne le nombre d'exemplaires ayant reellement tourne.
function produceFrom(def, count, factor) {
  if (count <= 0) return 0;
  const consumes = def.consumes || {};
  let runs = count;
  for (const [id, rate] of Object.entries(consumes)) {
    if (rate > 0) runs = Math.min(runs, getRes(id) / rate);
  }
  runs = Math.min(count, Math.max(0, runs));
  if (runs <= 0) return 0;
  for (const [id, rate] of Object.entries(consumes)) addRes(id, -rate * runs);
  for (const [id, rate] of Object.entries(def.produces || {})) {
    const boost = id === RES_KNOWLEDGE ? factor * researchFactor() : factor;
    addRes(id, rate * runs * boost);
  }
  return runs;
}

export function lateGameLoop() {
  applyPassiveEffects();
  // Les facteurs se basent sur l'activite du tick precedent : cela evite que
  // l'ordre d'iteration sur les batiments change le resultat.
  const factor = globalFactor();
  const next = {};

  for (const b of Object.values(LATE_BUILDINGS)) {
    next[b.id] = produceFrom(b, state.buildings[b.id], factor);
  }
  for (const w of Object.values(LATE_WORKERS)) {
    produceFrom(w, state.workers[w.id], factor);
  }

  // Les chercheurs existent depuis l'age de Pierre mais ne produisaient rien.
  // Ils trouvent enfin un usage des qu'une Universite existe.
  if (researchFactor() > 1) addRes(RES_KNOWLEDGE, (game.researchers || 0) * 0.05 * factor);

  autoCraftTools();
  activeCount = next;
}

// ============================================================
// Endgame : ebauche du cycle planetaire
// ============================================================
const PLANETS_KEY = 'fda_planetsSettled';

function offerLaunch() {
  state.flags.rocketLaunched = true;
  const settled = Number(localStorage.getItem(PLANETS_KEY) || 0) + 1;
  localStorage.setItem(PLANETS_KEY, String(settled));
  state.flags.planetsSettled = settled;
  showEndgameOverlay(settled);
}

function showEndgameOverlay(settled) {
  if (document.getElementById('endgameOverlay')) return;
  const overlay = document.createElement('div');
  overlay.id = 'endgameOverlay';
  overlay.className = 'age-unlock-overlay';
  overlay.innerHTML = `
    <div class="age-unlock-content">
      <div class="age-unlock-label">La Fusée s’élève</div>
      <div class="age-unlock-name">${AGE_STARS}</div>
      <div class="age-unlock-hint">
        De la première baie cueillie au premier feu quittant l’atmosphère.<br>
        Planètes colonisées : ${settled}<br><br>
        Le cycle planétaire est une ébauche : le voyage vers un nouveau monde
        reste à écrire.<br>
        <em>Clique pour continuer à jouer.</em>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('show'));
  overlay.addEventListener('click', () => {
    overlay.classList.remove('show');
    setTimeout(() => overlay.remove(), 500);
  });
}

// ============================================================
// Arbre des Ages : colonnes fournies a forge-enhance.js
// ============================================================
export const getLateTechColumns = () =>
  LATE_AGES.map((a) => ({
    age: a.name,
    tone: a.tone,
    items: a.techItems.map((t) => ({
      icon: t.icon,
      label: t.label,
      check: () => getCount(t.checkId) >= t.checkMin,
    })),
  }));

// ============================================================
// Rendu de l'UI, entierement genere depuis le registre
// ============================================================
let mounted = false;

function mountResourceCards() {
  const grid = document.getElementById('resources');
  if (!grid) return;
  for (const r of Object.values(LATE_RESOURCES)) {
    if (document.getElementById(`lateRes-${r.id}`)) continue;
    const card = document.createElement('article');
    card.className = 'res';
    card.id = `lateRes-${r.id}`;
    card.style.display = 'none';
    card.innerHTML = `
      <div class="res-seal">${r.icon}</div>
      <div class="res-name">${r.name}</div>
      <div class="res-count" id="lateResCount-${r.id}">0</div>
      <div class="res-tooltip">${r.tooltip}</div>`;
    grid.appendChild(card);
  }
}

function sectionAfter(anchorId, sectionId, title) {
  let sec = document.getElementById(sectionId);
  if (sec) return sec;
  const anchor = document.getElementById(anchorId);
  if (!anchor || !anchor.parentNode) return null;
  sec = document.createElement('div');
  sec.className = 'section';
  sec.id = sectionId;
  sec.style.display = 'none';
  sec.innerHTML = `<h2>${title}</h2>`;
  anchor.parentNode.insertBefore(sec, anchor.nextSibling);
  return sec;
}

function mountBuildings() {
  const sec = sectionAfter('buildingsSection', 'advancedBuildingsSection', 'Industrie');
  if (!sec) return;
  for (const b of Object.values(LATE_BUILDINGS)) {
    if (document.getElementById(`lateBuild-${b.id}`)) continue;
    const row = document.createElement('div');
    row.className = 'craft';
    row.id = `lateBuild-${b.id}`;
    row.style.display = 'none';
    row.innerHTML = `
      <p><span class="icon">${b.icon}</span> ${b.name}: <span id="lateBuildCount-${b.id}">0</span></p>
      <button id="lateBuildBtn-${b.id}">Construire (${formatCost(b.cost)})</button>
      <span class="tooltip">${b.tooltip}</span>`;
    sec.appendChild(row);
    row.querySelector('button').addEventListener('click', () => {
      const res = build(b.id);
      if (res && res.error) showError(res.error);
      renderLate();
    });
  }
}

function mountWorkers() {
  const sec = sectionAfter('workerSection', 'advancedWorkersSection', 'Spécialistes');
  if (!sec) return;
  for (const w of Object.values(LATE_WORKERS)) {
    if (document.getElementById(`lateWork-${w.id}`)) continue;
    const row = document.createElement('div');
    row.className = 'worker';
    row.id = `lateWork-${w.id}`;
    row.style.display = 'none';
    row.innerHTML = `
      <p><span class="icon">${w.icon}</span> ${w.name}: <span id="lateWorkCount-${w.id}">0</span></p>
      <button id="lateWorkBtn-${w.id}">Recruter (${formatCost(w.cost)})</button>
      <span class="tooltip">${w.tooltip}</span>`;
    sec.appendChild(row);
    row.querySelector('button').addEventListener('click', () => {
      const res = recruit(w.id);
      if (res && res.error) showError(res.error);
      renderLate();
    });
  }
}

function showError(message) {
  const box = document.getElementById('alert');
  if (!box) return;
  box.textContent = message;
  box.style.display = 'flex';
  setTimeout(() => { if (box.textContent === message) box.style.display = 'none'; }, 5000);
}

export function renderLate() {
  if (!mounted) return;

  for (const r of Object.values(LATE_RESOURCES)) {
    const card = document.getElementById(`lateRes-${r.id}`);
    const count = document.getElementById(`lateResCount-${r.id}`);
    if (card) card.style.display = isResourceVisible(r) ? 'inline-block' : 'none';
    if (count) count.textContent = Math.floor(getRes(r.id));
  }

  let anyBuilding = false;
  for (const b of Object.values(LATE_BUILDINGS)) {
    const row = document.getElementById(`lateBuild-${b.id}`);
    const btn = document.getElementById(`lateBuildBtn-${b.id}`);
    const count = document.getElementById(`lateBuildCount-${b.id}`);
    const visible = isBuildingVisible(b);
    if (visible) anyBuilding = true;
    if (row) {
      row.style.display = visible ? 'grid' : 'none';
      row.classList.toggle('ready', visible && canAfford(b.cost));
    }
    if (btn) btn.disabled = !canAfford(b.cost);
    if (count) count.textContent = state.buildings[b.id];
  }
  const bSec = document.getElementById('advancedBuildingsSection');
  if (bSec) bSec.style.display = anyBuilding ? 'block' : 'none';

  let anyWorker = false;
  for (const w of Object.values(LATE_WORKERS)) {
    const row = document.getElementById(`lateWork-${w.id}`);
    const btn = document.getElementById(`lateWorkBtn-${w.id}`);
    const count = document.getElementById(`lateWorkCount-${w.id}`);
    const visible = isWorkerVisible(w);
    if (visible) anyWorker = true;
    if (row) row.style.display = visible ? 'grid' : 'none';
    if (btn) btn.disabled = !canAfford(w.cost);
    if (count) count.textContent = state.workers[w.id];
  }
  const wSec = document.getElementById('advancedWorkersSection');
  if (wSec) wSec.style.display = anyWorker ? 'block' : 'none';
}

export function initLateAges() {
  if (mounted) return;
  mountResourceCards();
  mountBuildings();
  mountWorkers();
  mounted = true;
  renderLate();
}

if (typeof document !== 'undefined' && document.addEventListener) {
  document.addEventListener('DOMContentLoaded', () => {
    initLateAges();
    setInterval(() => {
      try {
        lateGameLoop();
        renderLate();
      } catch (e) {
        console.error('[FDA ages] tick', e);
      }
    }, 1000);
  });
}
