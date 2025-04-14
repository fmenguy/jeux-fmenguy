import { initGame, gameLoop, gatherBerries, gatherWood, gatherStone, gatherWater, gatherMeat, gatherFibers, gatherMetals, craftAxe, craftBucket, craftPickaxe, craftBow, craftCoat, craftMetalAxe, craftRemedy, craftWell, craftMine, craftWorkshop, craftHerbalist, craftWheatField, craftMill, craftBakery, craftSawmill, craftStoneQuarry, craftWarehouse, recruitVillager, appointChief, recruitTinker, recruitPicker, recruitHunter, recruitResearcher, sendExplorers, recruitMiner, recruitFarmer, foundVillage, seekShard } from './game.js';
import { updateDisplay, updateSeasonDisplay, showAlert, hideAlert, enableDragAndDrop, applyCraftOrder, buyHint, toggleHints } from './ui.js';
import { saveGame, loadGame, exportSave, importSavePrompt } from './save.js';

// Exporter les fonctions globales pour les événements onclick
window.gatherBerries = gatherBerries;
window.gatherWood = gatherWood;
window.gatherStone = gatherStone;
window.gatherWater = gatherWater;
window.gatherMeat = gatherMeat;
window.gatherFibers = gatherFibers;
window.gatherMetals = gatherMetals;
window.craftAxe = craftAxe;
window.craftBucket = craftBucket;
window.craftPickaxe = craftPickaxe;
window.craftBow = craftBow;
window.craftCoat = craftCoat;
window.craftMetalAxe = craftMetalAxe;
window.craftRemedy = craftRemedy;
window.craftWell = craftWell;
window.craftMine = craftMine;
window.craftWorkshop = craftWorkshop;
window.craftHerbalist = craftHerbalist;
window.craftWheatField = craftWheatField;
window.craftMill = craftMill;
window.craftBakery = craftBakery;
window.craftSawmill = craftSawmill;
window.craftStoneQuarry = craftStoneQuarry;
window.craftWarehouse = craftWarehouse;
window.recruitVillager = recruitVillager;
window.appointChief = appointChief;
window.recruitTinker = recruitTinker;
window.recruitPicker = recruitPicker;
window.recruitHunter = recruitHunter;
window.recruitResearcher = recruitResearcher;
window.sendExplorers = sendExplorers;
window.recruitMiner = recruitMiner;
window.recruitFarmer = recruitFarmer;
window.foundVillage = foundVillage;
window.seekShard = seekShard;
window.saveGame = saveGame;
window.loadGame = loadGame;
window.exportSave = exportSave;
window.importSavePrompt = importSavePrompt;
window.buyHint = buyHint;
window.toggleHints = toggleHints;

// Initialisation du jeu
initGame();
updateDisplay();
updateSeasonDisplay();
enableDragAndDrop();
applyCraftOrder();

// Lancer la boucle de jeu
setInterval(gameLoop, 1000);