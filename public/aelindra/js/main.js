/* ============================================
   AELINDRA · js/main.js
   Point d'entrée - initialisation du jeu
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {
  // Charger la sauvegarde si elle existe
  const hasSave = loadGame();
  if (!hasSave) {
    console.log('Nouvelle partie !');
  }

  // Reset des missions quotidiennes si nouveau jour
  resetDailyMissions();

  // Rendu initial
  renderSplash();

  console.log('%cAELINDRA · Chroniques des Profondeurs', 'color:#c8a84b;font-size:16px;font-weight:bold');
  console.log('État global disponible via window.G');
  console.log('goScreen(id) pour naviguer');
});

// Exposer les fonctions globales nécessaires aux onclick HTML
window.G           = G;
window.goScreen    = goScreen;
window.openNameEdit= openNameEdit;
window.savePlayerName = savePlayerName;
window.doPull      = doPull;
window.enterFloor         = enterFloor;
window.openDungeon        = openDungeon;
window.enterDungeonFloor  = enterDungeonFloor;
window.switchMarketTab = switchMarketTab;
window.buyItem     = buyItem;
window.endElfTurn  = endElfTurn;
window.$           = $;

// Équipement
window.openHeroDetail = openHeroDetail;
window.doEquip = function(heroId, itemId) {
  const ok = equipItem(heroId, itemId);
  if (ok) {
    const allItems = Object.values(MARKET_ITEMS).flat();
    const def = allItems.find(it => it.id === itemId);
    showToast(def ? `${def.name} équipé !` : 'Équipé !');
    updateMission('m3', 1);
  } else {
    showToast('Impossible d\'équiper cet objet.');
  }
  renderHeroDetail(heroId);
};
window.doUnequip = function(heroId, slot) {
  const hero = G.team.find(h => h.id === heroId) || G.collection.find(h => h.id === heroId);
  const itemId = hero?.equipped?.[slot];
  const ok = unequipItem(heroId, slot);
  if (ok) {
    const allItems = Object.values(MARKET_ITEMS).flat();
    const def = allItems.find(it => it.id === itemId);
    showToast(def ? `${def.name} retiré.` : 'Retiré.');
  }
  renderHeroDetail(heroId);
};

// Missions
window.doClaimMission = function(id) {
  claimMission(id);
  updateCurrencies();
  renderMissions();
};

// Action de combat depuis les boutons du panneau gauche
window.setCombatAction = function(action) {
  if (!G.combat || !G.combat.selected) {
    showToast('Sélectionnez d\'abord une unité elfique.');
    return;
  }
  G.combat.action = action;
  renderCombat();

  const hint = $('combat-hint');
  if (!hint) return;

  if (action === 'move')   { hint.textContent = 'Cliquez une case bleue pour vous déplacer.'; return; }
  if (action === 'attack') { hint.textContent = 'Cliquez un ennemi rouge pour attaquer.'; return; }
  if (action === 'spell')  { hint.textContent = 'Cliquez un ennemi rouge pour lancer un sort.'; return; }

  if (action.startsWith('ability:')) {
    const abilityId = action.slice(8);
    const ab = ABILITIES[abilityId];
    if (ab) {
      const tags = ab.tags || [];
      if (tags.includes('heal'))     hint.textContent = `${ab.icon} ${ab.name} : cliquez un allié à soigner.`;
      else if (tags.includes('mobility')) hint.textContent = `${ab.icon} ${ab.name} : cliquez une case de destination.`;
      else if (tags.includes('aoe')) hint.textContent = `${ab.icon} ${ab.name} : cliquez un ennemi (zone rayon 2).`;
      else                           hint.textContent = `${ab.icon} ${ab.name} : cliquez une cible ennemie.`;
    }
  }
};
