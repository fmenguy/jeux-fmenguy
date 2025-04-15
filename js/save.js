import { fabricationOrder, buildingsOrder, updateSeasonDisplay, enhancedUpdateDisplay } from './ui.js';

import { berries, wood, stone, water, maxWater, meat, fibers, metals, herbs, wheat, flour, bread, maxFibers, maxMetals, maxHerbs, maxWheat, maxFlour, maxBread, axes, buckets, wells, pickaxes, bows, coats, metalAxes, remedies, mines, workshops, herbalists, wheatFields, mills, sawmills, stoneQuarries, villagers, chief, tinkers, researchers, pickers, hunters, explorers, miners, farmers, villageFounded, techUnlocked, eternityShards, currentSeason, seasonTimer, deathTimer, explorationTimer, explorationActive, discoveredFibers, discoveredMetals, discoveredHerbs, currentAge, purchasedHints, warehouses, maxWoodStorage, maxStoneStorage, maxWaterStorage, maxMetalsStorage, maxHerbsStorage, maxWheatStorage, maxFlourStorage, bakeries, unlockedAges, dynamicHints, setBerries, setWood, setStone, setWater, setMaxWater, setMeat, setFibers, setMetals, setHerbs, setWheat, setFlour, setBread, setMaxFibers, setMaxMetals, setMaxHerbs, setMaxWheat, setMaxFlour, setMaxBread, setAxes, setBuckets, setWells, setPickaxes, setBows, setCoats, setMetalAxes, setRemedies, setMines, setWorkshops, setSawmills, setStoneQuarries, setHerbalists, setWheatFields, setMills, setVillagers, setChief, setTinkers, setResearchers, setPickers, setHunters, setExplorers, setMiners, setFarmers, setVillages, setVillageFounded, setTechUnlocked, setEternityShards, setCurrentSeason, setSeasonTimer, setDeathTimer, setExplorationTimer, setExplorationActive, setDiscoveredFibers, setDiscoveredMetals, setDiscoveredHerbs, setCurrentAge, setPurchasedHints, setWarehouses, setMaxWoodStorage, setMaxStoneStorage, setMaxWaterStorage, setMaxMetalsStorage, setMaxHerbsStorage, setMaxWheatStorage, setMaxFlourStorage, setBakeries, setUnlockedAges, setCurrentHint } from './game.js';

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
    setBerries(saveData.berries);
    setWood(saveData.wood);
    setStone(saveData.stone);
    setWater(saveData.water);
    setMaxWater(saveData.maxWater || 100);
    setMeat(saveData.meat);
    setFibers(saveData.fibers || 0);
    setMetals(saveData.metals || 0);
    setHerbs(saveData.herbs || 0);
    setWheat(saveData.wheat || 0);
    setFlour(saveData.flour || 0);
    setBread(saveData.bread || 0);
    setMaxFibers(saveData.maxFibers || 200);
    setMaxMetals(saveData.maxMetals || 100);
    setMaxHerbs(saveData.maxHerbs || 50);
    setMaxWheat(saveData.maxWheat || 100);
    setMaxFlour(saveData.maxFlour || 100);
    setMaxBread(saveData.maxBread || 100);
    setAxes(saveData.axes);
    setBuckets(saveData.buckets || 0);
    setWells(saveData.wells || 0);
    setPickaxes(saveData.pickaxes || 0);
    setBows(saveData.bows || 0);
    setCoats(saveData.coats || 0);
    setMetalAxes(saveData.metalAxes || 0);
    setRemedies(saveData.remedies || 0);
    setMines(saveData.mines || 0);
    setWorkshops(saveData.workshops || 0);
    setHerbalists(saveData.herbalists || 0);
    setWheatFields(saveData.wheatFields || 0);
    setMills(saveData.mills || 0);
    setSawmills(saveData.sawmills || 0);
    setStoneQuarries(saveData.stoneQuarries || 0);
    setVillagers(saveData.villagers);
    setChief(saveData.chief);
    setTinkers(saveData.tinkers);
    setResearchers(saveData.researchers || 0);
    setPickers(saveData.pickers);
    setHunters(saveData.hunters);
    setExplorers(saveData.explorers || 0);
    setMiners(saveData.miners || 0);
    setFarmers(saveData.farmers || 0);
    setVillageFounded(saveData.villageFounded);
    setTechUnlocked(saveData.techUnlocked);
    setEternityShards(saveData.eternityShards);
    setCurrentSeason(saveData.currentSeason);
    setSeasonTimer(saveData.seasonTimer);
    setDeathTimer(saveData.deathTimer || 0);
    setExplorationTimer(saveData.explorationTimer || 0);
    setExplorationActive(saveData.explorationActive || false);
    setDiscoveredFibers(saveData.discoveredFibers || false);
    setDiscoveredMetals(saveData.discoveredMetals || false);
    setDiscoveredHerbs(saveData.discoveredHerbs || false);
    setCurrentAge(saveData.currentAge || "Âge de Pierre");
    setPurchasedHints(saveData.purchasedHints || []);
    setWarehouses(saveData.warehouses || 0);
    setMaxWoodStorage(saveData.maxWoodStorage || 1000);
    setMaxStoneStorage(saveData.maxStoneStorage || 1000);
    setMaxWaterStorage(saveData.maxWaterStorage || 0);
    setMaxMetalsStorage(saveData.maxMetalsStorage || 0);
    setMaxHerbsStorage(saveData.maxHerbsStorage || 0);
    setMaxWheatStorage(saveData.maxWheatStorage || 0);
    setMaxFlourStorage(saveData.maxFlourStorage || 0);
    setBakeries(saveData.bakeries || 0);
    setUnlockedAges(saveData.unlockedAges || ["Âge de Pierre"]);

    const newFabricationOrder = saveData.fabricationOrder || [
      "metalAxeSection",
      "axeSection",
      "bucketSection",
      "pickaxeSection",
      "bowSection",
      "coatSection",
      "remedySection",
      "breadSection",
    ];
    const newBuildingsOrder = saveData.buildingsOrder || [
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
    
    // Mettre à jour les tableaux sans réassignation
    while (fabricationOrder.length > 0) fabricationOrder.pop();
    while (buildingsOrder.length > 0) buildingsOrder.pop();
    
    fabricationOrder.push(...newFabricationOrder);
    buildingsOrder.push(...newBuildingsOrder);

    enhancedUpdateDisplay();
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
    setBerries(saveData.berries);
    setWood(saveData.wood);
    setStone(saveData.stone);
    setWater(saveData.water);
    setMaxWater(saveData.maxWater || 100);
    setMeat(saveData.meat);
    setFibers(saveData.fibers || 0);
    setMetals(saveData.metals || 0);
    setHerbs(saveData.herbs || 0);
    setWheat(saveData.wheat || 0);
    setFlour(saveData.flour || 0);
    setBread(saveData.bread || 0);
    setMaxFibers(saveData.maxFibers || 200);
    setMaxMetals(saveData.maxMetals || 100);
    setMaxHerbs(saveData.maxHerbs || 50);
    setMaxWheat(saveData.maxWheat || 100);
    setMaxFlour(saveData.maxFlour || 100);
    setMaxBread(saveData.maxBread || 100);
    setAxes(saveData.axes);
    setBuckets(saveData.buckets || 0);
    setWells(saveData.wells || 0);
    setPickaxes(saveData.pickaxes || 0);
    setBows(saveData.bows || 0);
    setCoats(saveData.coats || 0);
    setMetalAxes(saveData.metalAxes || 0);
    setRemedies(saveData.remedies || 0);
    setMines(saveData.mines || 0);
    setWorkshops(saveData.workshops || 0);
    setHerbalists(saveData.herbalists || 0);
    setWheatFields(saveData.wheatFields || 0);
    setMills(saveData.mills || 0);
    setSawmills(saveData.sawmills || 0);
    setStoneQuarries(saveData.stoneQuarries || 0);
    setVillagers(saveData.villagers);
    setChief(saveData.chief);
    setTinkers(saveData.tinkers);
    setResearchers(saveData.researchers || 0);
    setPickers(saveData.pickers);
    setHunters(saveData.hunters);
    setExplorers(saveData.explorers || 0);
    setMiners(saveData.miners || 0);
    setFarmers(saveData.farmers || 0);
    setVillageFounded(saveData.villageFounded);
    setTechUnlocked(saveData.techUnlocked);
    setEternityShards(saveData.eternityShards);
    setCurrentSeason(saveData.currentSeason);
    setSeasonTimer(saveData.seasonTimer);
    setDeathTimer(saveData.deathTimer || 0);
    setExplorationTimer(saveData.explorationTimer || 0);
    setExplorationActive(saveData.explorationActive || false);
    setDiscoveredFibers(saveData.discoveredFibers || false);
    setDiscoveredMetals(saveData.discoveredMetals || false);
    setDiscoveredHerbs(saveData.discoveredHerbs || false);
    setCurrentAge(saveData.currentAge || "Âge de Pierre");
    setPurchasedHints(saveData.purchasedHints || []);
    setWarehouses(saveData.warehouses || 0);
    setMaxWoodStorage(saveData.maxWoodStorage || 1000);
    setMaxStoneStorage(saveData.maxStoneStorage || 1000);
    setMaxWaterStorage(saveData.maxWaterStorage || 0);
    setMaxMetalsStorage(saveData.maxMetalsStorage || 0);
    setMaxHerbsStorage(saveData.maxHerbsStorage || 0);
    setMaxWheatStorage(saveData.maxWheatStorage || 0);
    setMaxFlourStorage(saveData.maxFlourStorage || 0);
    setBakeries(saveData.bakeries || 0);
    setUnlockedAges(saveData.unlockedAges || ["Âge de Pierre"]);
    const newFabricationOrder = saveData.fabricationOrder || [
      "axeSection",
      "bucketSection",
      "pickaxeSection",
      "bowSection",
      "coatSection",
      "metalAxeSection",
      "remedySection",
      "breadSection",
    ];
    const newBuildingsOrder = saveData.buildingsOrder || [
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
    
    // Mettre à jour les tableaux sans réassignation
    while (fabricationOrder.length > 0) fabricationOrder.pop();
    while (buildingsOrder.length > 0) buildingsOrder.pop();
    
    fabricationOrder.push(...newFabricationOrder);
    buildingsOrder.push(...newBuildingsOrder);
    
    const allHintsPurchased = dynamicHints.every((hint) =>
      purchasedHints.includes(hint.id)
    );
    if (allHintsPurchased) {
      setCurrentHint(null);
    } else {
      setCurrentHint(
        dynamicHints.find(
          (hint) => hint.condition() && !purchasedHints.includes(hint.id)
        ) || null
      );
    }
    enhancedUpdateDisplay();
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