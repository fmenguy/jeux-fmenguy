import {
  berries, wood, stone, water, meat, fibers, metals, herbs, wheat, flour, bread,
  maxWater, maxFibers, maxHerbs, maxMetals, maxMetalsStorage, // Ajoutez maxMetalsStorage ici
  axes, buckets, wells, pickaxes, bows, coats, metalAxes, remedies,
  mines, workshops, sawmills, stoneQuarries, herbalists, wheatFields, mills, bakeries,
  villagers, chief, tinkers, researchers, pickers, hunters, explorers, miners, farmers, villages,
  techUnlocked, eternityShards, currentSeason, seasonTimer, seasonDuration, seasonNames, seasonIcons,
  discoveredFibers, discoveredMetals, discoveredHerbs, currentAge, purchasedHints, dynamicHints, currentHint,
  warehouses,
  setBerries, setWood, setStone, setWater, setMeat, setFibers, setMetals, setHerbs, setWheat, setFlour, setBread,
  setAxes, setBuckets, setWells, setPickaxes, setBows, setCoats, setMetalAxes, setRemedies, setMines, setWorkshops,
  setSawmills, setStoneQuarries, setHerbalists, setWheatFields, setMills, setVillagers, setChief, setTinkers,
  setResearchers, setPickers, setHunters, setExplorers, setMiners, setFarmers, setVillages, setTechUnlocked,
  setEternityShards, setCurrentAge, setCurrentSeason, setSeasonTimer, setPurchasedHints, setCurrentHint,
  shardEffects,
  explorationActive, explorationTimer,
  villageFounded,
  villagesData, maxPopulationPerVillage, maxBuildingsPerVillage, getTotalPopulation,
} from './game.js';

// Variables pour stocker l’ordre des sections
export let fabricationOrder = [
  "axeSection",
  "bucketSection",
  "pickaxeSection",
  "bowSection",
  "coatSection",
  "metalAxeSection",
  "remedySection",
];
export let buildingsOrder = [
  "wellSection",
  "mineSection",
  "workshopSection",
  "herbalistSection",
  "wheatFieldSection",
  "millSection",
  "bakerySection",
  "sawmillSection",
  "stoneQuarrySection",
  "warehouseSection"
];

export function updateDisplay() {
  // Synchronisation de villagesData avec les totaux globaux
  if (villagesData.length > 0) {
    const totalVillagers = villagers;
    const totalChiefs = chief;
    const totalPickers = pickers;
    const totalHunters = hunters;
    const totalMiners = miners;
    const totalFarmers = farmers;
    const totalTinkers = tinkers;
    const totalResearchers = researchers;
    const totalExplorers = explorers;

    const numVillages = villagesData.length;
    const baseVillagersPerVillage = Math.floor(totalVillagers / numVillages);
    const baseChiefsPerVillage = Math.floor(totalChiefs / numVillages);
    const basePickersPerVillage = Math.floor(totalPickers / numVillages);
    const baseHuntersPerVillage = Math.floor(totalHunters / numVillages);
    const baseMinersPerVillage = Math.floor(totalMiners / numVillages);
    const baseFarmersPerVillage = Math.floor(totalFarmers / numVillages);
    const baseTinkersPerVillage = Math.floor(totalTinkers / numVillages);
    const baseResearchersPerVillage = Math.floor(totalResearchers / numVillages);
    const baseExplorersPerVillage = Math.floor(totalExplorers / numVillages);

    let remainingVillagers = totalVillagers % numVillages;
    let remainingChiefs = totalChiefs % numVillages;
    let remainingPickers = totalPickers % numVillages;
    let remainingHunters = totalHunters % numVillages;
    let remainingMiners = totalMiners % numVillages;
    let remainingFarmers = totalFarmers % numVillages;
    let remainingTinkers = totalTinkers % numVillages;
    let remainingResearchers = totalResearchers % numVillages;
    let remainingExplorers = totalExplorers % numVillages;

    villagesData.forEach((village, index) => {
      village.population.villagers = baseVillagersPerVillage + (remainingVillagers > 0 ? 1 : 0);
      village.population.chief = baseChiefsPerVillage + (remainingChiefs > 0 ? 1 : 0);
      village.population.pickers = basePickersPerVillage + (remainingPickers > 0 ? 1 : 0);
      village.population.hunters = baseHuntersPerVillage + (remainingHunters > 0 ? 1 : 0);
      village.population.miners = baseMinersPerVillage + (remainingMiners > 0 ? 1 : 0);
      village.population.farmers = baseFarmersPerVillage + (remainingFarmers > 0 ? 1 : 0);
      village.population.tinkers = baseTinkersPerVillage + (remainingTinkers > 0 ? 1 : 0);
      village.population.researchers = baseResearchersPerVillage + (remainingResearchers > 0 ? 1 : 0);
      village.population.explorers = baseExplorersPerVillage + (remainingExplorers > 0 ? 1 : 0);

      if (remainingVillagers > 0) remainingVillagers--;
      if (remainingChiefs > 0) remainingChiefs--;
      if (remainingPickers > 0) remainingPickers--;
      if (remainingHunters > 0) remainingHunters--;
      if (remainingMiners > 0) remainingMiners--;
      if (remainingFarmers > 0) remainingFarmers--;
      if (remainingTinkers > 0) remainingTinkers--;
      if (remainingResearchers > 0) remainingResearchers--;
      if (remainingExplorers > 0) remainingExplorers--;
    });
  }

  document.getElementById("berries").textContent = Math.floor(berries);
  // ... (autres mises à jour d'affichage)

  document.getElementById("villagesDisplay").style.display = villageFounded ? "block" : "none";
  const villageListNode = document.getElementById("villagesList"); // Renommé pour éviter tout conflit
  if (!villageListNode) {
    console.error("L'élément villagesList n'existe pas dans le DOM");
    return;
  }
  villageListNode.innerHTML = "";
  if (villagesData && Array.isArray(villagesData)) {
    if (villagesData.length > 0) {
      const totalVillagers = villagers;
      const totalChiefs = chief;
      const totalPickers = pickers;
      const totalHunters = hunters;
      const totalMiners = miners;
      const totalFarmers = farmers;
      const totalTinkers = tinkers;
      const totalResearchers = researchers;
      const totalExplorers = explorers;

      const numVillages = villagesData.length;
      const baseVillagersPerVillage = Math.floor(totalVillagers / numVillages);
      const baseChiefsPerVillage = Math.floor(totalChiefs / numVillages);
      const basePickersPerVillage = Math.floor(totalPickers / numVillages);
      const baseHuntersPerVillage = Math.floor(totalHunters / numVillages);
      const baseMinersPerVillage = Math.floor(totalMiners / numVillages);
      const baseFarmersPerVillage = Math.floor(totalFarmers / numVillages);
      const baseTinkersPerVillage = Math.floor(totalTinkers / numVillages);
      const baseResearchersPerVillage = Math.floor(totalResearchers / numVillages);
      const baseExplorersPerVillage = Math.floor(totalExplorers / numVillages);

      let remainingVillagers = totalVillagers % numVillages;
      let remainingChiefs = totalChiefs % numVillages;
      let remainingPickers = totalPickers % numVillages;
      let remainingHunters = totalHunters % numVillages;
      let remainingMiners = totalMiners % numVillages;
      let remainingFarmers = totalFarmers % numVillages;
      let remainingTinkers = totalTinkers % numVillages;
      let remainingResearchers = totalResearchers % numVillages;
      let remainingExplorers = totalExplorers % numVillages;

      villagesData.forEach((village, index) => {
        village.population.villagers = baseVillagersPerVillage + (remainingVillagers > 0 ? 1 : 0);
        village.population.chief = baseChiefsPerVillage + (remainingChiefs > 0 ? 1 : 0);
        village.population.pickers = basePickersPerVillage + (remainingPickers > 0 ? 1 : 0);
        village.population.hunters = baseHuntersPerVillage + (remainingHunters > 0 ? 1 : 0);
        village.population.miners = baseMinersPerVillage + (remainingMiners > 0 ? 1 : 0);
        village.population.farmers = baseFarmersPerVillage + (remainingFarmers > 0 ? 1 : 0);
        village.population.tinkers = baseTinkersPerVillage + (remainingTinkers > 0 ? 1 : 0);
        village.population.researchers = baseResearchersPerVillage + (remainingResearchers > 0 ? 1 : 0);
        village.population.explorers = baseExplorersPerVillage + (remainingExplorers > 0 ? 1 : 0);

        if (remainingVillagers > 0) remainingVillagers--;
        if (remainingChiefs > 0) remainingChiefs--;
        if (remainingPickers > 0) remainingPickers--;
        if (remainingHunters > 0) remainingHunters--;
        if (remainingMiners > 0) remainingMiners--;
        if (remainingFarmers > 0) remainingFarmers--;
        if (remainingTinkers > 0) remainingTinkers--;
        if (remainingResearchers > 0) remainingResearchers--;
        if (remainingExplorers > 0) remainingExplorers--;

        const villagePop = Object.values(village.population).reduce((sum, count) => sum + count, 0);
        const buildingCount = village.buildings.filter(building => building !== "well").length;
villageListNode.innerHTML += `<li>Village ${index + 1} : Population ${villagePop}/${maxPopulationPerVillage}, Bâtiments ${buildingCount}/${maxBuildingsPerVillage}</li>`;
      });
    } else {
      villageListNode.innerHTML = "<li>Aucun village fondé.</li>";
    }
    document.getElementById("totalPopulation").textContent = getTotalPopulation();
  }

  document.getElementById("berries").textContent = Math.floor(berries);
  document.getElementById("wood").textContent = Math.floor(wood);
  document.getElementById("stone").textContent = Math.floor(stone);
  document.getElementById("water").textContent = Math.floor(water);
  document.getElementById("meat").textContent = Math.floor(meat);
  document.getElementById("fibers").textContent = Math.floor(fibers);
  document.getElementById("metals").textContent = Math.floor(metals);
  document.getElementById("maxMetalsLimit").textContent = maxMetals + maxMetalsStorage;
  document.getElementById("herbs").textContent = Math.floor(herbs);
  document.getElementById("wheat").textContent = Math.floor(wheat);
  document.getElementById("flour").textContent = Math.floor(flour);
  document.getElementById("bread").textContent = Math.floor(bread);
  document.getElementById("axes").textContent = axes;
  document.getElementById("buckets").textContent = buckets;
  document.getElementById("wells").textContent = wells;
  document.getElementById("pickaxes").textContent = pickaxes;
  document.getElementById("bows").textContent = bows;
  document.getElementById("coats").textContent = coats;
  document.getElementById("metalAxes").textContent = metalAxes;
  document.getElementById("remedies").textContent = remedies;
  document.getElementById("mines").textContent = mines;
  document.getElementById("workshops").textContent = workshops;
  document.getElementById("herbalists").textContent = herbalists;
  document.getElementById("wheatFields").textContent = wheatFields;
  document.getElementById("mills").textContent = mills;
  document.getElementById("sawmills").textContent = sawmills;
  document.getElementById("stoneQuarries").textContent = stoneQuarries;
  document.getElementById("villagers").textContent = villagers;
  document.getElementById("chief").textContent = chief;
  document.getElementById("tinkers").textContent = tinkers;
  document.getElementById("villages").textContent = villages;
  document.getElementById("pickers").textContent = pickers;
  document.getElementById("hunters").textContent = hunters;
  document.getElementById("researchers").textContent = researchers;
  document.getElementById("explorers").textContent = explorers;
  document.getElementById("miners").textContent = miners;
  document.getElementById("farmers").textContent = farmers;
  document.getElementById("eternityShards").textContent = eternityShards;
  document.getElementById("warehouses").textContent = warehouses;
  document.getElementById("bakeries").textContent = bakeries;

  document.getElementById("mineSection").style.display = discoveredMetals ? "block" : "none";
  document.getElementById("craftSawmillBtn").disabled = !(wood >= 50 && stone >= 20 && metals >= 5 && (discoveredMetals || currentAge === "Âge de l’Agriculture"));
  document.getElementById("craftStoneQuarryBtn").disabled = !(wood >= 50 && stone >= 20 && metals >= 5 && (discoveredMetals || currentAge === "Âge de l’Agriculture"));
  document.getElementById("craftWarehouseBtn").disabled = !(wood >= 100 && stone >= 50 && metals >= 10 && (discoveredMetals || currentAge === "Âge de l’Agriculture"));
  document.getElementById("craftAxeBtn").disabled = !(wood >= 5 && stone >= 2);
  document.getElementById("craftBucketBtn").disabled = !(wood >= 5 && stone >= 2);
  document.getElementById("craftWellBtn").disabled = !(wood >= 10 && stone >= 5);
  document.getElementById("craftPickaxeBtn").disabled = !(wood >= 10 && stone >= 5);
  document.getElementById("craftBowBtn").disabled = !(wood >= 10 && stone >= 5);
  document.getElementById("craftCoatBtn").disabled = !(fibers >= (workshops > 0 ? 8 : 10) && wood >= (workshops > 0 ? 4 : 5) && coats < villagers && discoveredFibers);
  document.getElementById("craftMetalAxeBtn").disabled = !(metals >= 5 && wood >= 5 && discoveredMetals);
  document.getElementById("craftRemedyBtn").disabled = !(herbs >= (herbalists > 0 ? 4 : 5) && water >= (herbalists > 0 ? 4 : 5) && remedies < villagers && discoveredHerbs);
  document.getElementById("craftMineBtn").disabled = !(wood >= 50 && stone >= 20 && tinkers >= 1 && miners >= (mines > 0 ? 25 : 0) && discoveredMetals);
  document.getElementById("craftWorkshopBtn").disabled = !(wood >= 20 && stone >= 10 && fibers >= 5 && discoveredFibers);
  document.getElementById("craftHerbalistBtn").disabled = !(wood >= 15 && stone >= 5 && herbs >= 5 && discoveredHerbs);
  document.getElementById("craftWheatFieldBtn").disabled = !(wood >= 20 && stone >= 10 && herbs >= 5 && discoveredHerbs);
  document.getElementById("craftMillBtn").disabled = !(wood >= 50 && stone >= 20 && metals >= 5 && wheatFields > 0);

  document.getElementById("recruitVillagerBtn").disabled = berries < 5;
  const maxChiefs = Math.floor(villagers / 25);
  document.getElementById("appointChiefBtn").disabled = !(axes >= 25 && villagers >= 25 && chief < maxChiefs);
  document.getElementById("recruitTinkerBtn").disabled = !(wood >= 100 && stone >= 100 && villageFounded);
  document.getElementById("recruitPickerBtn").disabled = !(berries >= 10 && wood >= 5);
  document.getElementById("recruitHunterBtn").disabled = !(wood >= 10 && meat >= 5);
  document.getElementById("recruitResearcherBtn").disabled = !(tinkers >= 10);
  document.getElementById("sendExplorersBtn").disabled = !(berries >= 50 && wood >= 20 && villagers >= 10 && (!discoveredFibers || !discoveredMetals || !discoveredHerbs)) || explorationActive;
  document.getElementById("recruitMinerBtn").disabled = !(wood >= 10 && metals >= 5 && mines > 0);
  document.getElementById("recruitFarmerBtn").disabled = !(berries >= 10 && wood >= 5 && wheatFields > 0);
  document.getElementById("foundVillageBtn").disabled = !(villagers >= (villages + 1) * 50 && chief >= villages + 1 && villages < 10);
  document.getElementById("seekShardBtn").disabled = !(wood >= 200 && stone >= 100 && water >= 50);
  document.getElementById("gatherMetalsBtn").disabled = mines < 1;

  const techBanner = document.getElementById("techBanner");
  const currentAgeDisplay = document.getElementById("currentAgeDisplay");
  techBanner.style.display = "block";
  currentAgeDisplay.textContent = techUnlocked ? currentAge : "Âge de Pierre";

  switch (techUnlocked ? currentAge : "Âge de Pierre") {
    case "Âge de Pierre":
      techBanner.style.border = "1px solid #8c8c8c";
      break;
    case "Âge des Métaux":
      techBanner.style.border = "1px solid #cd7f32";
      break;
    case "Âge de l’Agriculture":
      techBanner.style.border = "1px solid #4CAF50";
      break;
    default:
      techBanner.style.border = "1px solid #d4a017";
  }

  if (currentAge !== "Âge de l’Agriculture" && wheatFields > 0) {
    document.getElementById("narrative").textContent =
      "Construis des moulins et recrute des fermiers pour atteindre l’Âge de l’Agriculture !";
  }

  if (currentAge === "Âge de l’Agriculture" && flour < 5 && mills > 0) {
    document.getElementById("narrative").textContent =
      "Produis plus de farine avec tes moulins pour construire une boulangerie !";
  }

  document.getElementById("fibersSection").style.display = discoveredFibers ? "inline-block" : "none";
  document.getElementById("metalsSection").style.display = discoveredMetals ? "inline-block" : "none";
  document.getElementById("herbsSection").style.display = discoveredHerbs ? "inline-block" : "none";
  document.getElementById("wheatSection").style.display = currentAge === "Âge de l’Agriculture" ? "inline-block" : "none";
  document.getElementById("flourSection").style.display = currentAge === "Âge de l’Agriculture" ? "inline-block" : "none";
  document.getElementById("breadSection").style.display = currentAge === "Âge de l’Agriculture" ? "inline-block" : "none";
  document.getElementById("chiefSection").style.display = axes >= 25 && villagers >= 25 ? "block" : "none";
  document.getElementById("tinkerSection").style.display = villageFounded ? "block" : "none";
  document.getElementById("pickerSection").style.display = villagers >= 10 ? "block" : "none";
  document.getElementById("hunterSection").style.display = villagers >= 20 ? "block" : "none";
  document.getElementById("researcherSection").style.display = researchers > 0 ? "block" : "none";
  document.getElementById("explorerSection").style.display = villageFounded ? "block" : "none";
  document.getElementById("farmerSection").style.display = wheatFields > 0 ? "block" : "none";
  document.getElementById("villageSection").style.display = chief >= 1 ? "block" : "none";
  document.getElementById("pickaxeSection").style.display = tinkers >= 1 ? "block" : "none";
  document.getElementById("bowSection").style.display = tinkers >= 1 ? "block" : "none";
  document.getElementById("coatSection").style.display = tinkers >= 1 && discoveredFibers ? "block" : "none";
  document.getElementById("metalAxeSection").style.display = tinkers >= 1 && discoveredMetals ? "block" : "none";
  document.getElementById("remedySection").style.display = tinkers >= 1 && discoveredHerbs ? "block" : "none";
  document.getElementById("relicSection").style.display = villageFounded ? "block" : "none";
  document.getElementById("wellSection").style.display = tinkers >= 1 ? "block" : "none";
  document.getElementById("workshopSection").style.display = discoveredFibers ? "block" : "none";
  document.getElementById("herbalistSection").style.display = discoveredHerbs ? "block" : "none";
  document.getElementById("wheatFieldSection").style.display = discoveredHerbs ? "block" : "none";
  document.getElementById("millSection").style.display = wheatFields > 0 ? "block" : "none";
  document.getElementById("sawmillSection").style.display = discoveredMetals || currentAge === "Âge de l’Agriculture" ? "block" : "none";
  document.getElementById("stoneQuarrySection").style.display = discoveredMetals || currentAge === "Âge de l’Agriculture" ? "block" : "none";
  document.getElementById("warehouseSection").style.display = discoveredMetals || currentAge === "Âge de l’Agriculture" ? "block" : "none";
  document.getElementById("saveGameBtn").disabled = false;
  document.getElementById("loadGameBtn").disabled = false;
  document.getElementById("exportSaveBtn").disabled = false;
  document.getElementById("importSaveBtn").disabled = false;

  document.getElementById("villagesDisplay").style.display = villageFounded ? "block" : "none";
  const villagesListElement = document.getElementById("villagesList");
  if (!villagesListElement) {
    console.error("L'élément villagesList n'existe pas dans le DOM");
    return;
  }
  villagesListElement.innerHTML = "";
  if (villagesData && Array.isArray(villagesData)) {
    if (villagesData.length > 0) {
      const totalVillagers = villagers;
      const totalChiefs = chief;
      const totalPickers = pickers;
      const totalHunters = hunters;
      const totalMiners = miners;
      const totalFarmers = farmers;
      const totalTinkers = tinkers;
      const totalResearchers = researchers;
      const totalExplorers = explorers;

      const numVillages = villagesData.length;
      const baseVillagersPerVillage = Math.floor(totalVillagers / numVillages);
      const baseChiefsPerVillage = Math.floor(totalChiefs / numVillages);
      const basePickersPerVillage = Math.floor(totalPickers / numVillages);
      const baseHuntersPerVillage = Math.floor(totalHunters / numVillages);
      const baseMinersPerVillage = Math.floor(totalMiners / numVillages);
      const baseFarmersPerVillage = Math.floor(totalFarmers / numVillages);
      const baseTinkersPerVillage = Math.floor(totalTinkers / numVillages);
      const baseResearchersPerVillage = Math.floor(totalResearchers / numVillages);
      const baseExplorersPerVillage = Math.floor(totalExplorers / numVillages);

      let remainingVillagers = totalVillagers % numVillages;
      let remainingChiefs = totalChiefs % numVillages;
      let remainingPickers = totalPickers % numVillages;
      let remainingHunters = totalHunters % numVillages;
      let remainingMiners = totalMiners % numVillages;
      let remainingFarmers = totalFarmers % numVillages;
      let remainingTinkers = totalTinkers % numVillages;
      let remainingResearchers = totalResearchers % numVillages;
      let remainingExplorers = totalExplorers % numVillages;

      villagesData.forEach((village, index) => {
        village.population.villagers = baseVillagersPerVillage + (remainingVillagers > 0 ? 1 : 0);
        village.population.chief = baseChiefsPerVillage + (remainingChiefs > 0 ? 1 : 0);
        village.population.pickers = basePickersPerVillage + (remainingPickers > 0 ? 1 : 0);
        village.population.hunters = baseHuntersPerVillage + (remainingHunters > 0 ? 1 : 0);
        village.population.miners = baseMinersPerVillage + (remainingMiners > 0 ? 1 : 0);
        village.population.farmers = baseFarmersPerVillage + (remainingFarmers > 0 ? 1 : 0);
        village.population.tinkers = baseTinkersPerVillage + (remainingTinkers > 0 ? 1 : 0);
        village.population.researchers = baseResearchersPerVillage + (remainingResearchers > 0 ? 1 : 0);
        village.population.explorers = baseExplorersPerVillage + (remainingExplorers > 0 ? 1 : 0);

        if (remainingVillagers > 0) remainingVillagers--;
        if (remainingChiefs > 0) remainingChiefs--;
        if (remainingPickers > 0) remainingPickers--;
        if (remainingHunters > 0) remainingHunters--;
        if (remainingMiners > 0) remainingMiners--;
        if (remainingFarmers > 0) remainingFarmers--;
        if (remainingTinkers > 0) remainingTinkers--;
        if (remainingResearchers > 0) remainingResearchers--;
        if (remainingExplorers > 0) remainingExplorers--;

        const villagePop = Object.values(village.population).reduce((sum, count) => sum + count, 0);
        // Calcule le nombre total de bâtiments pour ce village en utilisant les totaux globaux
        const totalBuildings = wells + mines + workshops + herbalists + wheatFields + mills + bakeries + sawmills + stoneQuarries + warehouses;
        // Répartis proportionnellement les bâtiments entre les villages (similaire à la population)
        const baseBuildingsPerVillage = Math.floor(totalBuildings / villagesData.length);
        let remainingBuildings = totalBuildings % villagesData.length;
        const buildingCount = baseBuildingsPerVillage + (remainingBuildings > 0 ? 1 : 0);
        if (remainingBuildings > 0) remainingBuildings--;

        villagesList.innerHTML += `<li>Village ${index + 1} : Population ${villagePop}/${maxPopulationPerVillage}, Bâtiments ${buildingCount}/${maxBuildingsPerVillage}</li>`;
      });
    } else {
      villagesListElement.innerHTML = "<li>Aucun village fondé.</li>";
    }
    document.getElementById("totalPopulation").textContent = getTotalPopulation();
  }

  // Vérification avant d’appeler updateHintButton
  const hintSection = document.getElementById("hintSection");
  if (hintSection) {
    updateHintButton();
  } else {
    console.warn("updateDisplay: La section #hintSection n'existe pas dans le DOM, updateHintButton n'est pas appelé.");
  }
}

export function updateSeasonDisplay() {
  const seasonElement = document.getElementById("seasonDisplay");
  seasonElement.innerHTML = `<span class="icon">${seasonIcons[currentSeason]
    }</span> ${seasonNames[currentSeason]
    } <div class="progress-bar"><div class="progress" style="width: ${(seasonTimer / seasonDuration) * 100
    }%"></div></div>`;
}

export function updateExplorationDisplay() {
  const explorationElement = document.getElementById("explorationDisplay");
  console.log("updateExplorationDisplay appelé, explorationActive:", explorationActive, "explorationTimer:", explorationTimer);
  if (explorationActive) {
    const explorationDuration = 30;
    const progressPercentage = ((explorationDuration - explorationTimer) / explorationDuration) * 100;
    explorationElement.style.display = "block";
    explorationElement.innerHTML = `
      <div class="exploration-text"><span class="icon">🗺️</span> Exploration</div>
      <div class="exploration-progress-bar"><div class="exploration-progress" style="width: ${progressPercentage}%"></div></div>
    `;
    console.log("Barre d'exploration affichée, style.display:", explorationElement.style.display, "progressPercentage:", progressPercentage);
  } else {
    explorationElement.style.display = "none";
    console.log("Barre d'exploration cachée");
  }
}

export function showAlert(message) {
  const alertBox = document.getElementById("alert");
  alertBox.textContent = message;
  alertBox.style.display = "block";
}

export function hideAlert() {
  document.getElementById("alert").style.display = "none";
}

export function updateHintButton() {
  const buyHintBtn = document.getElementById("buyHintBtn");
  const hintCost = document.getElementById("hintCost");
  const noHintMessage = document.getElementById("noHintMessage");

  if (currentHint) {
    noHintMessage.style.display = "none";
    buyHintBtn.style.display = "block";
    hintCost.style.display = "block";
    let costText = "";
    const cost = currentHint.cost || {};
    const costEntries = Object.entries(cost);

    // Vérification de la condition canBuy
    const canBuy = !currentHint.canBuy || currentHint.canBuy();
    if (!canBuy) {
      if (currentHint.id === "meatValue") {
        costText = `Condition : 10 cueilleurs requis (${pickers}/10)`;
      } else if (currentHint.id === "tinkerHint") {
        costText = `Condition : 40 villageois requis (${villagers}/40)`;
      } else {
        costText = "Condition non remplie";
      }
      buyHintBtn.disabled = true;
    } else {
      // Vérifier si le coût est passif
      if (cost.passive) {
        costText = "Posséder : ";
        costText += costEntries
          .filter(([resource]) => resource !== "passive")
          .map(([resource, amount]) => {
            switch (resource) {
              case "berries":
                return `${amount} baies`;
              case "wood":
                return `${amount} bois`;
              case "stone":
                return `${amount} pierre`;
              case "water":
                return `${amount} eau`;
              case "fibers":
                return `${amount} fibres`;
              case "axes":
                return `${amount} haches`;
              case "eternityShards":
                return `${amount} éclats d’éternité`;
              case "flour":
                return `${amount} farine`;
              case "pickers":
                return `${amount} cueilleurs`;
              case "villagers":
                return `${amount} villageois`;
              case "tinkers":
                return `${amount} bricoleurs`;
              case "wells":
                return `${amount} puits`;
              case "buckets":
                return `${amount} seaux`;
              default:
                return `${amount} ${resource}`;
            }
          })
          .join(", ");
      } else {
        costText = "Coût : ";
        if (costEntries.length === 0) {
          costText += "Gratuit";
        } else {
          costText += costEntries
            .map(([resource, amount]) => {
              switch (resource) {
                case "berries":
                  return `${amount} baies`;
                case "wood":
                  return `${amount} bois`;
                case "stone":
                  return `${amount} pierre`;
                case "water":
                  return `${amount} eau`;
                case "fibers":
                  return `${amount} fibres`;
                case "axes":
                  return `${amount} haches`;
                case "eternityShards":
                  return `${amount} éclats d’éternité`;
                case "flour":
                  return `${amount} farine`;
                default:
                  return `${amount} ${resource}`;
              }
            })
            .join(", ");
        }
      }
      buyHintBtn.disabled = false;
    }
    hintCost.textContent = costText;
  } else {
    noHintMessage.style.display = "block";
    buyHintBtn.style.display = "none";
    hintCost.style.display = "none";
  }
}


export function toggleHints() {
  const hintList = document.getElementById("purchasedHintsList");
  hintList.style.display =
    hintList.style.display === "none" ? "block" : "none";
}

export function buyHint() {
  if (!currentHint) {
    console.log("buyHint: Aucun indice courant.");
    return;
  }

  const cost = currentHint.cost || {};
  const isPassive = cost.passive === true;

  // Vérification des coûts (même pour les coûts passifs)
  const canAfford = Object.keys(cost).every((resource) => {
    if (resource === "passive") return true; // Ignorer la clé passive
    switch (resource) {
      case "berries":
        return berries >= cost[resource];
      case "wood":
        return wood >= cost[resource];
      case "stone":
        return stone >= cost[resource];
      case "water":
        return water >= cost[resource];
      case "fibers":
        return fibers >= cost[resource];
      case "axes":
        return axes >= cost[resource];
      case "eternityShards":
        return eternityShards >= cost[resource];
      case "flour":
        return flour >= cost[resource];
      case "pickers":
        return pickers >= cost[resource];
      case "villagers":
        return villagers >= cost[resource];
      case "tinkers":
        return tinkers >= cost[resource];
      case "wells":
        return wells >= cost[resource];
      case "buckets":
        return buckets >= cost[resource];
      default:
        return false;
    }
  });

  if (canAfford && (!currentHint.canBuy || currentHint.canBuy())) {
    // Consommation des ressources uniquement si ce n’est pas un coût passif
    if (!isPassive) {
      Object.keys(cost).forEach((resource) => {
        switch (resource) {
          case "berries":
            setBerries(berries - cost[resource]);
            break;
          case "wood":
            setWood(wood - cost[resource]);
            break;
          case "stone":
            setStone(stone - cost[resource]);
            break;
          case "water":
            setWater(water - cost[resource]);
            break;
          case "fibers":
            setFibers(fibers - cost[resource]);
            break;
          case "axes":
            setAxes(axes - cost[resource]);
            break;
          case "eternityShards":
            setEternityShards(eternityShards - cost[resource]);
            break;
          case "flour":
            setFlour(flour - cost[resource]);
            break;
        }
      });
    }

    try {
      if (purchasedHintsList) {
        if (currentHint.id === "shardEffectsReveal") {
          let effectsText = "Effets des dons débloqués :<br>";
          const shardEffects = [
            { name: "Don de la Terre", harvestBonus: 1.2 },
            { name: "Souffle de Vie", waterConsumptionReduction: 0.75 },
            { name: "Force des Anciens", foodConsumptionReduction: 0.8 },
            { name: "Équilibre Saisonnal", seasonPenaltyReduction: 0.5 },
            { name: "Harmonie Éternelle", noDeath: true },
          ];

          shardEffects.forEach((effect, index) => {
            if (eternityShards >= index + 1) {
              if (effect.harvestBonus) {
                effectsText += `- ${effect.name} : Bonus de récolte de ${effect.harvestBonus}x<br>`;
              } else if (effect.waterConsumptionReduction) {
                effectsText += `- ${effect.name} : Réduction de la consommation d'eau à ${effect.waterConsumptionReduction}x<br>`;
              } else if (effect.foodConsumptionReduction) {
                effectsText += `- ${effect.name} : Réduction de la consommation de nourriture à ${effect.foodConsumptionReduction}x<br>`;
              } else if (effect.seasonPenaltyReduction) {
                effectsText += `- ${effect.name} : Réduction des pénalités saisonnières de ${effect.seasonPenaltyReduction}x<br>`;
              } else if (effect.noDeath) {
                effectsText += `- ${effect.name} : Plus de morts par manque de ressources<br>`;
              }
            }
          });
          purchasedHintsList.innerHTML += `<li>${effectsText}</li>`;
        } else {
          purchasedHintsList.innerHTML += `<li>${currentHint.message}</li>`;
        }
        purchasedHints.push(currentHint.id);
        setCurrentHint(null);
      } else {
        console.error("buyHint: L'élément purchasedHintsList n'existe pas.");
      }
    } catch (error) {
      console.error("buyHint: Erreur lors de l'affichage de l'indice", error);
    }
  }
}


export function enableDragAndDrop() {
  const fabricationSection = document.getElementById("fabricationSection");
  const batimentsSection = document.getElementById("buildingsSection");
  const sections = [fabricationSection, batimentsSection];

  sections.forEach((section) => {
    if (!section) return; // Sauter si la section n’existe pas
    const crafts = section.querySelectorAll(".craft");
    crafts.forEach((craft) => {
      craft.addEventListener("dragstart", (e) => {
        craft.classList.add("dragging");
        e.dataTransfer.setData("text/plain", craft.id);
      });

      craft.addEventListener("dragend", () => {
        craft.classList.remove("dragging");
      });

      craft.addEventListener("dragover", (e) => {
        e.preventDefault(); // Permet le drop
      });

      craft.addEventListener("drop", (e) => {
        e.preventDefault();
        const draggedId = e.dataTransfer.getData("text/plain");
        const draggedElement = document.getElementById(draggedId);

        if (draggedElement.parentElement === section) {
          const craftsArray = Array.from(section.querySelectorAll(".craft"));
          const draggedIndex = craftsArray.indexOf(draggedElement);
          const dropTarget = e.target.closest(".craft");

          if (dropTarget && dropTarget !== draggedElement) {
            const targetIndex = craftsArray.indexOf(dropTarget);
            if (draggedIndex < targetIndex) {
              dropTarget.after(draggedElement);
            } else {
              dropTarget.before(draggedElement);
            }
            const newOrder = Array.from(section.querySelectorAll(".craft")).map((craft) => craft.id);
            if (section.id === "fabricationSection") {
              while (fabricationOrder.length > 0) fabricationOrder.pop();
              fabricationOrder.push(...newOrder);
            } else if (section.id === "buildingsSection") {
              while (buildingsOrder.length > 0) buildingsOrder.pop();
              buildingsOrder.push(...newOrder);
            }
          }
        }
      });
    });
  });
}


export function applyCraftOrder() {
  const fabricationSection =
    document.getElementById("fabricationSection");
  const batimentsSection = document.getElementById("buildingsSection");

  if (fabricationSection) {
    fabricationOrder.forEach((id) => {
      const element = document.getElementById(id);
      if (element) fabricationSection.appendChild(element);
    });
  }
  if (batimentsSection) {
    buildingsOrder.forEach((id) => {
      const element = document.getElementById(id);
      if (element) batimentsSection.appendChild(element);
    });
  }
}


export const enhancedUpdateDisplay = function () {
  updateDisplay();
  applyCraftOrder();
  enableDragAndDrop();
};



// Variable pour stocker les touches tapées
let cheatCodeBuffer = "";
export const cheatCode = "fmenguy";
let cheatModeActive = false;

// Écouteur pour les touches
document.addEventListener("keydown", (event) => {
  // Ajoute la touche tapée au buffer (en minuscule)
  cheatCodeBuffer += event.key.toLowerCase();

  // Garde seulement les 7 derniers caractères (longueur de "fmenguy")
  if (cheatCodeBuffer.length > cheatCode.length) {
    cheatCodeBuffer = cheatCodeBuffer.slice(-cheatCode.length);
  }

  // Vérifie si le cheatcode est complet
  if (cheatCodeBuffer === cheatCode) {
    cheatModeActive = true;
    cheatCodeBuffer = ""; // Réinitialise le buffer
    document.getElementById("narrative").textContent = "Cheatcode activé : clique pour +100 ressources !";
  }
});

// Écouteur pour les clics quand le cheat est actif
document.addEventListener("click", () => {
  if (cheatModeActive) {
    setBerries(berries + 100);
    setMeat(meat + 100);
    setWood(wood + 100);
    setStone(stone + 100);
    setWater(water + 100);
    enhancedUpdateDisplay();
  }
});