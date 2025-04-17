import { initGame, gameLoop, gatherBerries, gatherWood, gatherStone, gatherWater, gatherMeat, gatherFibers, gatherMetals, craftAxe, craftBucket, craftPickaxe, craftBow, craftCoat, craftMetalAxe, craftRemedy, craftWell, craftMine, craftWorkshop, craftHerbalist, craftWheatField, craftMill, craftBakery, craftSawmill, craftStoneQuarry, craftWarehouse, recruitVillager, appointChief, recruitTinker, recruitPicker, recruitHunter, recruitResearcher, sendExplorers, recruitMiner, recruitFarmer, foundVillage, seekShard, dynamicHints, purchasedHints, setCurrentHint } from './game.js';

import { updateDisplay, updateSeasonDisplay, updateExplorationDisplay, showAlert, hideAlert, enableDragAndDrop, applyCraftOrder, buyHint, toggleHints, enhancedUpdateDisplay } from './ui.js';

import { saveGame, loadGame, exportSave, importSavePrompt } from './save.js';

// Exporter les fonctions globales pour les événements onclick
window.gatherBerries = () => {
  gatherBerries();
  enhancedUpdateDisplay();
};

window.gatherWood = () => {
  gatherWood();
  enhancedUpdateDisplay();
};

window.gatherStone = () => {
  gatherStone();
  enhancedUpdateDisplay();
};

window.gatherWater = () => {
  gatherWater();
  enhancedUpdateDisplay();
};

window.gatherMeat = () => {
  gatherMeat();
  enhancedUpdateDisplay();
};

window.gatherFibers = () => {
  gatherFibers();
  enhancedUpdateDisplay();
};

window.gatherMetals = () => {
  gatherMetals();
  enhancedUpdateDisplay();
};

window.craftAxe = () => {
  const result = craftAxe();
  if (result && result.error) {
    showAlert(result.error);
  }
  enhancedUpdateDisplay();
};

window.craftBucket = () => {
  const result = craftBucket();
  if (result && result.error) {
    showAlert(result.error);
  }
  enhancedUpdateDisplay();
};

window.craftPickaxe = () => {
  const result = craftPickaxe();
  if (result && result.error) {
    showAlert(result.error);
  }
  enhancedUpdateDisplay();
};

window.craftBow = () => {
  const result = craftBow();
  if (result && result.error) {
    showAlert(result.error);
  }
  enhancedUpdateDisplay();
};

window.craftCoat = () => {
  const result = craftCoat();
  if (result && result.error) {
    showAlert(result.error);
  }
  enhancedUpdateDisplay();
};

window.craftMetalAxe = () => {
  const result = craftMetalAxe();
  if (result && result.error) {
    showAlert(result.error);
  }
  enhancedUpdateDisplay();
};

window.craftRemedy = () => {
  const result = craftRemedy();
  if (result && result.error) {
    showAlert(result.error);
  }
  enhancedUpdateDisplay();
};

window.craftWell = () => {
  const result = craftWell();
  if (result && result.error) {
    showAlert(result.error);
  }
  enhancedUpdateDisplay();
};

window.craftMine = () => {
  const result = craftMine();
  if (result && result.error) {
    showAlert(result.error);
  }
  enhancedUpdateDisplay();
};

window.craftWorkshop = () => {
  const result = craftWorkshop();
  if (result && result.error) {
    showAlert(result.error);
  }
  enhancedUpdateDisplay();
};

window.craftHerbalist = () => {
  const result = craftHerbalist();
  if (result && result.error) {
    showAlert(result.error);
  }
  enhancedUpdateDisplay();
};

window.craftWheatField = () => {
  const result = craftWheatField();
  if (result && result.error) {
    showAlert(result.error);
  }
  enhancedUpdateDisplay();
};

window.craftMill = () => {
  const result = craftMill();
  if (result && result.error) {
    showAlert(result.error);
  }
  enhancedUpdateDisplay();
};

window.craftBakery = () => {
  const result = craftBakery();
  if (result && result.error) {
    showAlert(result.error);
  }
  enhancedUpdateDisplay();
};

window.craftSawmill = () => {
  const result = craftSawmill();
  if (result && result.error) {
    showAlert(result.error);
  }
  enhancedUpdateDisplay();
};

window.craftStoneQuarry = () => {
  const result = craftStoneQuarry();
  if (result && result.error) {
    showAlert(result.error);
  }
  enhancedUpdateDisplay();
};

window.craftWarehouse = () => {
  const result = craftWarehouse();
  if (result && result.error) {
    showAlert(result.error);
  }
  enhancedUpdateDisplay();
};

window.recruitVillager = () => {
  const result = recruitVillager();
  if (result && result.error) {
    showAlert(result.error);
  }
  enhancedUpdateDisplay();
};

window.appointChief = () => {
  const result = appointChief();
  if (result && result.error) {
    showAlert(result.error);
  }
  enhancedUpdateDisplay();
};

window.recruitTinker = () => {
  const result = recruitTinker();
  if (result && result.error) {
    showAlert(result.error);
  }
  enhancedUpdateDisplay();
  updateSeasonDisplay();
};

window.recruitPicker = () => {
  const result = recruitPicker();
  if (result && result.error) {
    showAlert(result.error);
  }
  enhancedUpdateDisplay();
};

window.recruitHunter = () => {
  const result = recruitHunter();
  if (result && result.error) {
    showAlert(result.error);
  }
  enhancedUpdateDisplay();
};

window.recruitResearcher = () => {
  const result = recruitResearcher();
  if (result && result.error) {
    showAlert(result.error);
  }
  enhancedUpdateDisplay();
};

window.sendExplorers = () => {
  const result = sendExplorers();
  if (result && result.error) {
    showAlert(result.error);
  }
  enhancedUpdateDisplay();
};

window.recruitMiner = () => {
  const result = recruitMiner();
  if (result && result.error) {
    showAlert(result.error);
  }
  enhancedUpdateDisplay();
};

window.recruitFarmer = () => {
  const result = recruitFarmer();
  if (result && result.error) {
    showAlert(result.error);
  }
  enhancedUpdateDisplay();
};

window.foundVillage = () => {
  const result = foundVillage();
  if (result && result.error) {
    showAlert(result.error);
  }
  enhancedUpdateDisplay();
  updateSeasonDisplay();
};

window.seekShard = () => {
  const result = seekShard();
  if (result && result.error) {
    showAlert(result.error);
  }
  enhancedUpdateDisplay();
};

window.saveGame = saveGame;
window.loadGame = loadGame;
window.exportSave = exportSave;
window.importSavePrompt = importSavePrompt;

window.buyHint = () => {
  buyHint();
  enhancedUpdateDisplay();
};

window.toggleHints = toggleHints;

initGame();
setTimeout(() => {
  enhancedUpdateDisplay();
  updateSeasonDisplay();
  enableDragAndDrop();
  applyCraftOrder();
}, 0);

// Initialisation de currentHint
const availableHint = dynamicHints.find(
  (hint) => hint.condition() && !purchasedHints.includes(hint.id)
);
if (availableHint) {
  setCurrentHint(availableHint);
}

setInterval(() => {
  const result = gameLoop();
  if (result && result.alert) {
    showAlert(result.alert);
  } else if (result && result.hideAlert) {
    hideAlert();
  }
  if (result && (result.ageChanged || result.seasonChanged)) {
    enhancedUpdateDisplay();
    updateSeasonDisplay();
  }
  updateExplorationDisplay(); // Appel à chaque tick pour mettre à jour la barre
}, 1000);