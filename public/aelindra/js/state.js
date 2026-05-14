/* ============================================
   AELINDRA · js/state.js
   État global du jeu + persistance localStorage
   ============================================ */

const G = {
  // --- Joueur ---
  playerName: 'Aventurier',

  // --- Monnaies ---
  gold: 120,   // Or (dépensé au marché)
  orbs: 15,    // Orbes runiques (dépensés à la guilde)

  // --- Progression ---
  tutoFloor:    0,     // Palier du Gouffre complété (0 = aucun, 5 = terminé)
  tutoComplete: false,
  dungeonProgress: { foret: 0, mines: 0, tour: 0 }, // étages complétés par donjon

  // --- Équipe et collection ---
  team:       [],  // Héros actifs (instances, max 4 en combat)
  collection: [],  // Tous les héros possédés (hors team de départ)

  // --- Inventaire ---
  inventory: [], // { itemId, quantity }

  // --- Gacha ---
  pity: 0, // Compteur pity guilde (reset à 50)

  // --- Missions ---
  missionProgress: {
    m1: { done: false, progress: 0, claimed: false },
    m2: { done: false, progress: 0, claimed: false },
    m3: { done: false, progress: 0, claimed: false },
    m4: { done: false, progress: 0, claimed: false },
    m5: { done: false, progress: 0, claimed: false },
    d1: { done: false, progress: 0, claimed: false, lastReset: '' },
    d2: { done: false, progress: 0, claimed: false, lastReset: '' },
    d3: { done: false, progress: 0, claimed: false, lastReset: '' },
  },

  // --- Combat en cours (null hors combat) ---
  combat: null,
  /*
  combat: {
    floorNum: 1,          // numéro du palier (pour les récompenses)
    grid: [],             // grille 7×7, chaque case = null | unitId
    units: [],            // toutes les unités actives
    turn: 1,
    phase: 'elf',         // 'elf' | 'enemy'
    selected: null,       // id unité sélectionnée
    action: null,         // 'move' | 'attack' | 'spell' | 'item' | null
    log: [],
    isOver: false,
    winner: null,         // 'elf' | 'enemy' | null
  }
  */
};

// ============================================
// PERSISTANCE
// ============================================

function saveGame() {
  try {
    const toSave = {
      playerName:      G.playerName,
      gold:            G.gold,
      orbs:            G.orbs,
      tutoFloor:       G.tutoFloor,
      tutoComplete:    G.tutoComplete,
      team:            G.team,
      collection:      G.collection,
      inventory:       G.inventory,
      pity:            G.pity,
      missionProgress:  G.missionProgress,
      dungeonProgress:  G.dungeonProgress,
    };
    localStorage.setItem('aelindra_save', JSON.stringify(toSave));
  } catch(e) {
    console.warn('Sauvegarde impossible:', e);
  }
}

function loadGame() {
  try {
    const raw = localStorage.getItem('aelindra_save');
    if (!raw) return false;
    const saved = JSON.parse(raw);
    Object.assign(G, saved);
    if (!G.dungeonProgress) G.dungeonProgress = { foret: 0, mines: 0, tour: 0 };
    // Migration : s'assurer que chaque entrée missionProgress a les champs attendus
    const dailyIds = ['d1', 'd2', 'd3'];
    Object.keys(G.missionProgress).forEach(id => {
      const p = G.missionProgress[id];
      if (p.done === undefined) p.done = p.progress >= getMissionTotal(id);
      if (dailyIds.includes(id) && p.lastReset === undefined) p.lastReset = '';
    });
    return true;
  } catch(e) {
    console.warn('Chargement impossible:', e);
    return false;
  }
}

function resetGame() {
  localStorage.removeItem('aelindra_save');
  location.reload();
}

// ============================================
// HELPERS
// ============================================

function getHeroById(id) {
  return G.team.find(h => h.id === id)
      || G.collection.find(h => h.id === id)
      || STARTER_HEROES.find(h => h.id === id);
}

function isHeroOwned(id) {
  return G.team.some(h => h.id === id) || G.collection.some(h => h.id === id);
}

function addGold(amount) {
  G.gold = Math.max(0, G.gold + amount);
  saveGame();
}

function addOrbs(amount) {
  G.orbs = Math.max(0, G.orbs + amount);
  saveGame();
}

function spendGold(amount) {
  if (G.gold < amount) return false;
  G.gold -= amount;
  saveGame();
  return true;
}

function spendOrbs(amount) {
  if (G.orbs < amount) return false;
  G.orbs -= amount;
  saveGame();
  return true;
}

function addToCollection(hero) {
  if (!isHeroOwned(hero.id)) {
    G.collection.push({ ...hero, level: 1, xp: 0 });
  }
  saveGame();
}

function addToTeam(hero) {
  if (G.team.length >= 4) return false;
  if (!G.team.find(h => h.id === hero.id)) {
    G.team.push({ ...hero, level: 1, xp: 0 });
  }
  saveGame();
  return true;
}

function getMissionTotal(id) {
  const all = [...MAIN_MISSIONS, ...DAILY_MISSIONS];
  return all.find(m => m.id === id)?.total || 1;
}

function updateMission(id, delta = 1) {
  const prog = G.missionProgress[id];
  if (!prog || prog.claimed) return;
  const target = getMissionTotal(id);
  prog.progress = Math.min(prog.progress + delta, target);
  if (prog.progress >= target) prog.done = true;
  saveGame();
}

// Alias de compatibilité
function progressMission(id, amount = 1) {
  updateMission(id, amount);
}

function claimMission(id) {
  const prog = G.missionProgress[id];
  if (!prog || !prog.done || prog.claimed) return;
  const all = [...MAIN_MISSIONS, ...DAILY_MISSIONS];
  const mission = all.find(m => m.id === id);
  if (!mission) return;
  if (mission.reward.gold)  { G.gold += mission.reward.gold; }
  if (mission.reward.orbs)  { G.orbs += mission.reward.orbs; }
  prog.claimed = true;
  saveGame();
}

function resetDailyMissions() {
  const today = new Date().toISOString().slice(0, 10);
  ['d1', 'd2', 'd3'].forEach(id => {
    const prog = G.missionProgress[id];
    if (!prog) return;
    if (prog.lastReset !== today) {
      prog.progress  = 0;
      prog.done      = false;
      prog.claimed   = false;
      prog.lastReset = today;
    }
  });
  saveGame();
}

// ============================================
// ÉQUIPEMENT
// ============================================

// Détermine le slot d'équipement selon le type de l'item
// Les types du marché ressemblent à "Arme 1M · Guerrier", "Corps · Mage", etc.
function getItemSlot(item) {
  const t = (item.type || '').toLowerCase();
  if (t.startsWith('arme') || t.startsWith('munitions')) return 'weapon';
  if (t.startsWith('corps') || t.startsWith('bouclier') || t.startsWith('tête') || t.startsWith('jambes')) return 'body';
  return null;
}

function equipItem(heroId, itemId) {
  const hero = G.team.find(h => h.id === heroId) || G.collection.find(h => h.id === heroId);
  if (!hero) return false;

  // Trouver l'item dans l'inventaire
  const invEntry = G.inventory.find(i => i.itemId === itemId);
  if (!invEntry) return false;

  // Trouver la définition de l'item dans les données du marché
  const allItems = Object.values(MARKET_ITEMS).flat();
  const itemDef = allItems.find(it => it.id === itemId);
  if (!itemDef) return false;

  const slot = getItemSlot(itemDef);
  if (!slot) return false;

  // Initialiser equipped si absent
  if (!hero.equipped) hero.equipped = { weapon: null, body: null };

  // Si le slot est déjà occupé, remettre l'ancien item dans l'inventaire
  if (hero.equipped[slot]) {
    const oldId = hero.equipped[slot];
    const existing = G.inventory.find(i => i.itemId === oldId);
    if (existing) existing.quantity++;
    else G.inventory.push({ itemId: oldId, quantity: 1 });
  }

  // Équiper le nouvel item (stocker son id)
  hero.equipped[slot] = itemId;

  // Retirer l'item de l'inventaire
  if (invEntry.quantity > 1) invEntry.quantity--;
  else G.inventory.splice(G.inventory.indexOf(invEntry), 1);

  saveGame();
  return true;
}

function unequipItem(heroId, slot) {
  const hero = G.team.find(h => h.id === heroId) || G.collection.find(h => h.id === heroId);
  if (!hero) return false;
  if (!hero.equipped || !hero.equipped[slot]) return false;

  const itemId = hero.equipped[slot];
  hero.equipped[slot] = null;

  // Remettre dans l'inventaire
  const existing = G.inventory.find(i => i.itemId === itemId);
  if (existing) existing.quantity++;
  else G.inventory.push({ itemId: itemId, quantity: 1 });

  saveGame();
  return true;
}
