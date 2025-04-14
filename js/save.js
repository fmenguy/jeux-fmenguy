import { berries, wood, stone, water, maxWater, meat, fibers, metals, herbs, wheat, flour, bread, maxFibers, maxMetals, maxHerbs, maxWheat, maxFlour, maxBread, axes, buckets, wells, pickaxes, bows, coats, metalAxes, remedies, mines, workshops, herbalists, wheatFields, mills, sawmills, stoneQuarries, villagers, chief, tinkers, researchers, pickers, hunters, explorers, miners, farmers, villageFounded, techUnlocked, eternityShards, currentSeason, seasonTimer, deathTimer, explorationTimer, explorationActive, discoveredFibers, discoveredMetals, discoveredHerbs, currentAge, purchasedHints, warehouses, maxWoodStorage, maxStoneStorage, maxWaterStorage, maxMetalsStorage, maxHerbsStorage, maxWheatStorage, maxFlourStorage, bakeries, unlockedAges } from './game.js';
import { fabricationOrder, buildingsOrder, updateDisplay, updateSeasonDisplay } from './ui.js';

export function saveGame(slot) {
  const saveData = {
    berries,
    wood,
    stone,
    water,
    maxWater,
    meat,
    fibers,
    metals,
    herbs,
    wheat,
    flour,
    bread,
    maxFibers,
    maxMetals,
    maxHerbs,
    maxWheat,
    maxFlour,
    maxBread,
    axes,
    buckets,
    wells,
    pickaxes,
    bows,
    coats,
    metalAxes,
    remedies,
    mines,
    workshops,
    herbalists,
    wheatFields,
    mills,
    sawmills,
    stoneQuarries,
    villagers,
    chief,
    tinkers,
    researchers,
    pickers,
    hunters,
    explorers,
    miners,
    farmers,
    villageFounded,
    techUnlocked,
    eternityShards,
    currentSeason,
    seasonTimer,
    deathTimer,
    explorationTimer,
    explorationActive,
    discoveredFibers,
    discoveredMetals,
    discoveredHerbs,
    currentAge,
    purchasedHints,
    warehouses,
    maxWoodStorage,
    maxStoneStorage,
    maxWaterStorage,
    maxMetalsStorage,
    maxHerbsStorage,
    maxWheatStorage,
    maxFlourStorage,
    fabricationOrder,
    buildingsOrder,
    bakeries,
    unlockedAges,
  };
  localStorage.setItem(`forgeSave${slot}`, JSON.stringify(saveData));
  alert("Jeu sauvegardé !");
}

export function loadGame(slot) {
  const saveData = JSON.parse(localStorage.getItem(`forgeSave${slot}`));
  if (saveData) {
    berries = saveData.berries;
    wood = saveData.wood;
    stone = saveData.stone;
    water = saveData.water;
    maxWater = saveData.maxWater || 100;
    meat = saveData.meat;
    fibers = saveData.fibers || 0;
    metals = saveData.metals || 0;
    herbs = saveData.herbs || 0;
    wheat = saveData.wheat || 0;
    flour = saveData.flour || 0;
    bread = saveData.bread || 0;
    maxFibers = saveData.maxFibers || 200;
    maxMetals = saveData.maxMetals || 100;
    maxHerbs = saveData.maxHerbs || 50;
    maxWheat = saveData.maxWheat || 100;
    maxFlour = saveData.maxFlour || 100;
    maxBread = saveData.maxBread || 100;
    axes = saveData.axes;
    buckets = saveData.buckets || 0;
    wells = saveData.wells || 0;
    pickaxes = saveData.pickaxes || 0;
    bows = saveData.bows || 0;
    coats = saveData.coats || 0;
    metalAxes = saveData.metalAxes || 0;
    remedies = saveData.remedies || 0;
    mines = saveData.mines || 0;
    workshops = saveData.workshops || 0;
    herbalists = saveData.herbalists || 0;
    wheatFields = saveData.wheatFields || 0;
    mills = saveData.mills || 0;
    sawmills = saveData.sawmills || 0;
    stoneQuarries = saveData.stoneQuarries || 0;
    villagers = saveData.villagers;
    chief = saveData.chief;
    tinkers = saveData.tinkers;
    researchers = saveData.researchers || 0;
    pickers = saveData.pickers;
    hunters = saveData.hunters;
    explorers = saveData.explorers || 0;
    miners = saveData.miners || 0;
    farmers = saveData.farmers || 0;
    villageFounded = saveData.villageFounded;
    techUnlocked = saveData.techUnlocked;
    eternityShards = saveData.eternityShards;
    currentSeason = saveData.currentSeason;
    seasonTimer = saveData.seasonTimer;
    deathTimer = saveData.deathTimer || 0;
    explorationTimer = saveData.explorationTimer || 0;
    explorationActive = saveData.explorationActive || false;
    discoveredFibers = saveData.discoveredFibers || false;
    discoveredMetals = saveData.discoveredMetals || false;
    discoveredHerbs = saveData.discoveredHerbs || false;
    currentAge = saveData.currentAge || "Âge de Pierre";
    purchasedHints = saveData.purchasedHints || [];
    warehouses = saveData.warehouses || 0;
    maxWoodStorage = saveData.maxWoodStorage || 1000;
    maxStoneStorage = saveData.maxStoneStorage || 1000;
    maxWaterStorage = saveData.maxWaterStorage || 0;
    maxMetalsStorage = saveData.maxMetalsStorage || 0;
    maxHerbsStorage = saveData.maxHerbsStorage || 0;
    maxWheatStorage = saveData.maxWheatStorage || 0;
    maxFlourStorage = saveData.maxFlourStorage || 0;
    bakeries = saveData.bakeries || 0;
    unlockedAges = saveData.unlockedAges || ["Âge de Pierre"];
    fabricationOrder = saveData.fabricationOrder || [
      "metalAxeSection",
      "axeSection",
      "bucketSection",
      "pickaxeSection",
      "bowSection",
      "coatSection",
      "remedySection",
      "breadSection",
    ];
    buildingsOrder = saveData.buildingsOrder || [
      "wellSection",
      "mineSection",
      "workshopSection",
      "herbalistSection",
      "wheatFieldSection",
      "millSection",
      "sawmillSection",
      "stoneQuarrySection",
      "warehouseSection",
    ];

    updateDisplay();
    updateSeasonDisplay();
    // Ajoute cette condition pour mettre à jour le tooltip des cueilleurs
if (discoveredFibers) {
  document.querySelector("#pickerSection .tooltip").textContent =
    "Un cueilleur ramasse des baies et des fibres pour toi.";
} else {
  document.querySelector("#pickerSection .tooltip").textContent =
    "Un cueilleur ramasse des baies pour toi.";
}

const purchasedHintsList = document.getElementById("purchasedHintsList");
purchasedHintsList.innerHTML = "";
purchasedHints.forEach((hintId) => {
  const hint = dynamicHints.find((h) => h.id === hintId);
  if (hint) purchasedHintsList.innerHTML += `<li>${hint.message}</li>`;
});

document.getElementById("chiefSection").style.display = axes >= 25 && villagers >= 25 ? "block" : "none";
document.getElementById("tinkerSection").style.display = villageFounded ? "block" : "none";
document.getElementById("pickerSection").style.display = villagers >= 10 ? "block" : "none";
document.getElementById("hunterSection").style.display = villagers >= 20 ? "block" : "none";
document.getElementById("researcherSection").style.display = researchers > 0 ? "block" : "none";
document.getElementById("explorerSection").style.display = villageFounded ? "block" : "none";
document.getElementById("minerSection").style.display = mines > 0 ? "block" : "none";
document.getElementById("farmerSection").style.display = wheatFields > 0 ? "block" : "none";
document.getElementById("villageSection").style.display = chief >= 1 ? "block" : "none";
document.getElementById("wellSection").style.display = tinkers >= 1 ? "block" : "none";
document.getElementById("pickaxeSection").style.display = tinkers >= 1 ? "block" : "none";
document.getElementById("bowSection").style.display = tinkers >= 1 ? "block" : "none";
document.getElementById("coatSection").style.display = tinkers >= 1 && discoveredFibers ? "block" : "none";
document.getElementById("metalAxeSection").style.display = tinkers >= 1 && discoveredMetals ? "block" : "none";
document.getElementById("remedySection").style.display = tinkers >= 1 && discoveredHerbs ? "block" : "none";
document.getElementById("mineSection").style.display = discoveredMetals ? "block" : "none";
document.getElementById("workshopSection").style.display = discoveredFibers ? "block" : "none";
document.getElementById("herbalistSection").style.display = discoveredHerbs ? "block" : "none";
document.getElementById("wheatFieldSection").style.display = discoveredHerbs ? "block" : "none";
document.getElementById("millSection").style.display = wheatFields > 0 ? "block" : "none";
document.getElementById("breadSection").style.display = currentAge === "Âge de l’Agriculture" ? "inline-block" : "none";
document.getElementById("bakerySection").style.display = currentAge === "Âge de l’Agriculture" ? "block" : "none";
document.getElementById("relicSection").style.display = villageFounded ? "block" : "none";
    alert("Jeu chargé !");
  }
}

export function exportSave(slot) {
  const saveData = {
    berries,
    wood,
    stone,
    water,
    maxWater,
    meat,
    fibers,
    metals,
    herbs,
    wheat,
    flour,
    bread,
    maxFibers,
    maxMetals,
    maxHerbs,
    maxWheat,
    maxFlour,
    maxBread,
    axes,
    buckets,
    wells,
    pickaxes,
    bows,
    coats,
    metalAxes,
    remedies,
    mines,
    workshops,
    herbalists,
    wheatFields,
    mills,
    sawmills,
    stoneQuarries,
    villagers,
    chief,
    tinkers,
    researchers,
    pickers,
    hunters,
    explorers,
    miners,
    farmers,
    villageFounded,
    techUnlocked,
    eternityShards,
    currentSeason,
    seasonTimer,
    deathTimer,
    explorationTimer,
    explorationActive,
    discoveredFibers,
    discoveredMetals,
    discoveredHerbs,
    currentAge,
    purchasedHints,
    warehouses,
    maxWoodStorage,
    maxStoneStorage,
    maxWaterStorage,
    maxMetalsStorage,
    maxHerbsStorage,
    maxWheatStorage,
    maxFlourStorage,
    fabricationOrder,
    buildingsOrder,
    bakeries,
    unlockedAges,
  };
  const saveString = btoa(JSON.stringify(saveData));
  prompt("Voici votre sauvegarde. Copiez ce texte :", saveString);
}

export function importSavePrompt() {
  const saveString = prompt("Collez votre sauvegarde ici :");
  if (saveString) {
    const saveData = JSON.parse(atob(saveString));
    berries = saveData.berries;
    wood = saveData.wood;
    stone = saveData.stone;
    water = saveData.water;
    maxWater = saveData.maxWater || 100;
    meat = saveData.meat;
    fibers = saveData.fibers || 0;
    metals = saveData.metals || 0;
    herbs = saveData.herbs || 0;
    wheat = saveData.wheat || 0;
    flour = saveData.flour || 0;
    bread = saveData.bread || 0;
    maxFibers = saveData.maxFibers || 200;
    maxMetals = saveData.maxMetals || 100;
    maxHerbs = saveData.maxHerbs || 50;
    maxWheat = saveData.maxWheat || 100;
    maxFlour = saveData.maxFlour || 100;
    maxBread = saveData.maxBread || 100;
    axes = saveData.axes;
    buckets = saveData.buckets || 0;
    wells = saveData.wells || 0;
    pickaxes = saveData.pickaxes || 0;
    bows = saveData.bows || 0;
    coats = saveData.coats || 0;
    metalAxes = saveData.metalAxes || 0;
    remedies = saveData.remedies || 0;
    mines = saveData.mines || 0;
    workshops = saveData.workshops || 0;
    herbalists = saveData.herbalists || 0;
    wheatFields = saveData.wheatFields || 0;
    mills = saveData.mills || 0;
    sawmills = saveData.sawmills || 0;
    stoneQuarries = saveData.stoneQuarries || 0;
    villagers = saveData.villagers;
    chief = saveData.chief;
    tinkers = saveData.tinkers;
    researchers = saveData.researchers || 0;
    pickers = saveData.pickers;
    hunters = saveData.hunters;
    explorers = saveData.explorers || 0;
    miners = saveData.miners || 0;
    farmers = saveData.farmers || 0;
    villageFounded = saveData.villageFounded;
    techUnlocked = saveData.techUnlocked;
    eternityShards = saveData.eternityShards;
    currentSeason = saveData.currentSeason;
    seasonTimer = saveData.seasonTimer;
    deathTimer = saveData.deathTimer || 0;
    explorationTimer = saveData.explorationTimer || 0;
    explorationActive = saveData.explorationActive || false;
    discoveredFibers = saveData.discoveredFibers || false;
    discoveredMetals = saveData.discoveredMetals || false;
    discoveredHerbs = saveData.discoveredHerbs || false;
    currentAge = saveData.currentAge || "Âge de Pierre";
    purchasedHints = saveData.purchasedHints || [];
    warehouses = saveData.warehouses || 0;
    maxWoodStorage = saveData.maxWoodStorage || 1000;
    maxStoneStorage = saveData.maxStoneStorage || 1000;
    maxWaterStorage = saveData.maxWaterStorage || 0;
    maxMetalsStorage = saveData.maxMetalsStorage || 0;
    maxHerbsStorage = saveData.maxHerbsStorage || 0;
    maxWheatStorage = saveData.maxWheatStorage || 0;
    maxFlourStorage = saveData.maxFlourStorage || 0;
    bakeries = saveData.bakeries || 0;
    unlockedAges = saveData.unlockedAges || ["Âge de Pierre"];
    fabricationOrder = saveData.fabricationOrder || [
      "metalAxeSection",
      "axeSection",
      "bucketSection",
      "pickaxeSection",
      "bowSection",
      "coatSection",
      "remedySection",
      "breadSection",
    ];
    buildingsOrder = saveData.buildingsOrder || [
      "wellSection",
      "mineSection",
      "workshopSection",
      "herbalistSection",
      "wheatFieldSection",
      "millSection",
      "sawmillSection",
      "stoneQuarrySection",
      "warehouseSection",
    ];

    updateDisplay();
    updateSeasonDisplay();
    // Ajoute cette condition pour mettre à jour le tooltip des cueilleurs
if (discoveredFibers) {
  document.querySelector("#pickerSection .tooltip").textContent =
    "Un cueilleur ramasse des baies et des fibres pour toi.";
} else {
  document.querySelector("#pickerSection .tooltip").textContent =
    "Un cueilleur ramasse des baies pour toi.";
}

const purchasedHintsList = document.getElementById("purchasedHintsList");
purchasedHintsList.innerHTML = "";
purchasedHints.forEach((hintId) => {
  const hint = dynamicHints.find((h) => h.id === hintId);
  if (hint) purchasedHintsList.innerHTML += `<li>${hint.message}</li>`;
});

document.getElementById("chiefSection").style.display = axes >= 25 && villagers >= 25 ? "block" : "none";
document.getElementById("tinkerSection").style.display = villageFounded ? "block" : "none";
document.getElementById("pickerSection").style.display = villagers >= 10 ? "block" : "none";
document.getElementById("hunterSection").style.display = villagers >= 20 ? "block" : "none";
document.getElementById("researcherSection").style.display = researchers > 0 ? "block" : "none";
document.getElementById("explorerSection").style.display = villageFounded ? "block" : "none";
document.getElementById("minerSection").style.display = mines > 0 ? "block" : "none";
document.getElementById("farmerSection").style.display = wheatFields > 0 ? "block" : "none";
document.getElementById("villageSection").style.display = chief >= 1 ? "block" : "none";
document.getElementById("wellSection").style.display = tinkers >= 1 ? "block" : "none";
document.getElementById("pickaxeSection").style.display = tinkers >= 1 ? "block" : "none";
document.getElementById("bowSection").style.display = tinkers >= 1 ? "block" : "none";
document.getElementById("coatSection").style.display = tinkers >= 1 && discoveredFibers ? "block" : "none";
document.getElementById("metalAxeSection").style.display = tinkers >= 1 && discoveredMetals ? "block" : "none";
document.getElementById("remedySection").style.display = tinkers >= 1 && discoveredHerbs ? "block" : "none";
document.getElementById("mineSection").style.display = discoveredMetals ? "block" : "none";
document.getElementById("workshopSection").style.display = discoveredFibers ? "block" : "none";
document.getElementById("herbalistSection").style.display = discoveredHerbs ? "block" : "none";
document.getElementById("wheatFieldSection").style.display = discoveredHerbs ? "block" : "none";
document.getElementById("millSection").style.display = wheatFields > 0 ? "block" : "none";
document.getElementById("breadSection").style.display = currentAge === "Âge de l’Agriculture" ? "inline-block" : "none";
document.getElementById("bakerySection").style.display = currentAge === "Âge de l’Agriculture" ? "block" : "none";
document.getElementById("relicSection").style.display = villageFounded ? "block" : "none";
    alert("Sauvegarde importée !");
  }
}