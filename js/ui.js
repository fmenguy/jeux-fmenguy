import { berries, wood, stone, water, meat, fibers, metals, herbs, wheat, flour, bread, axes, buckets, wells, pickaxes, bows, coats, metalAxes, remedies, mines, workshops, herbalists, wheatFields, mills, sawmills, stoneQuarries, villagers, chief, tinkers, researchers, pickers, hunters, explorers, miners, farmers, villages, eternityShards, warehouses, bakeries, techUnlocked, currentAge, seasonNames, seasonIcons, currentSeason, seasonTimer, seasonDuration, discoveredFibers, discoveredMetals, discoveredHerbs } from './game.js';

export let fabricationOrder = [
  "axeSection",
  "bucketSection",
  "pickaxeSection",
  "bowSection",
  "coatSection",
  "metalAxeSection",
  "remedySection",
  "breadSection",
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
  "warehouseSection",
];

export function updateDisplay() {
  document.getElementById("berries").textContent = Math.floor(berries);
  document.getElementById("wood").textContent = Math.floor(wood);
  document.getElementById("stone").textContent = Math.floor(stone);
  document.getElementById("water").textContent = Math.floor(water);
  document.getElementById("meat").textContent = Math.floor(meat);
  document.getElementById("fibers").textContent = Math.floor(fibers);
  document.getElementById("metals").textContent = Math.floor(metals);
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

  // Gestion de l'affichage conditionnel
  document.getElementById("mineSection").style.display = discoveredMetals ? "block" : "none";
  document.getElementById("craftSawmillBtn").disabled = !(wood >= 50 && stone >= 20 && metals >= 5 && (currentAge === "Âge des Métaux" || currentAge === "Âge de l’Agriculture"));
  document.getElementById("craftStoneQuarryBtn").disabled = !(wood >= 50 && stone >= 20 && metals >= 5 && (currentAge === "Âge des Métaux" || currentAge === "Âge de l’Agriculture"));
  document.getElementById("craftWarehouseBtn").disabled = !(wood >= 100 && stone >= 50 && metals >= 10 && (currentAge === "Âge des Métaux" || currentAge === "Âge de l’Agriculture"));
  document.getElementById("craftAxeBtn").disabled = !(wood >= 5 && stone >= 2);
  document.getElementById("craftBucketBtn").disabled = !(wood >= 5 && stone >= 2);
  document.getElementById("craftWellBtn").disabled = !(wood >= 10 && stone >= 5);
  document.getElementById("craftPickaxeBtn").disabled = !(wood >= 10 && stone >= 5);
  document.getElementById("craftBowBtn").disabled = !(wood >= 10 && stone >= 5);
  document.getElementById("craftCoatBtn").disabled = !(fibers >= (workshops > 0 ? 8 : 10) && wood >= (workshops > 0 ? 4 : 5) && coats < villagers && discoveredFibers);
  document.getElementById("craftMetalAxeBtn").disabled = !(metals >= 5 && wood >= 5 && discoveredMetals);
  document.getElementById("craftRemedyBtn").disabled = !(herbs >= (herbalists > 0 ? 4 : 5) && water >= (herbalists > 0 ? 4 : 5) && remedies < villagers && discoveredHerbs);
  document.getElementById("craftMineBtn").disabled = !(wood >= 50 && stone >= 20 && tinkers >= 1 && discoveredMetals);
  document.getElementById("craftWorkshopBtn").disabled = !(wood >= 20 && stone >= 10 && fibers >= 5 && discoveredFibers);
  document.getElementById("craftHerbalistBtn").disabled = !(wood >= 15 && stone >= 5 && herbs >= 5 && discoveredHerbs);
  document.getElementById("craftWheatFieldBtn").disabled = !(wood >= 20 && stone >= 10 && herbs >= 5 && discoveredHerbs);
  document.getElementById("craftMillBtn").disabled = !(wood >= 50 && stone >= 20 && metals >= 5 && wheatFields > 0);

  document.getElementById("recruitVillagerBtn").disabled = berries < 5;
  document.getElementById("appointChiefBtn").disabled = !(axes >= 25 && villagers >= 25);
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

  // Affichage du bandeau Technologie
  const techBanner = document.getElementById("techBanner");
  const currentAgeDisplay = document.getElementById("currentAgeDisplay");
  techBanner.style.display = "block";
  currentAgeDisplay.textContent = techUnlocked ? currentAge : "Âge de Pierre";

  // Bordure dynamique selon l'âge
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

  // Aide pour l'Âge de l'Agriculture
  if (currentAge !== "Âge de l’Agriculture" && wheatFields > 0) {
    document.getElementById("narrative").textContent = "Construis des moulins et recrute des fermiers pour atteindre l’Âge de l’Agriculture !";
  }

  // Aide pour la farine
  if (currentAge === "Âge de l’Agriculture" && flour < 5 && mills > 0) {
    document.getElementById("narrative").textContent = "Produis plus de farine avec tes moulins pour construire une boulangerie !";
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
  document.getElementById("sawmillSection").style.display = currentAge === "Âge des Métaux" || currentAge === "Âge de l’Agriculture" ? "block" : "none";
  document.getElementById("stoneQuarrySection").style.display = currentAge === "Âge des Métaux" || currentAge === "Âge de l’Agriculture" ? "block" : "none";
  document.getElementById("warehouseSection").style.display = currentAge === "Âge des Métaux" || currentAge === "Âge de l’Agriculture" ? "block" : "none";
  document.getElementById("saveGameBtn").disabled = false;
  document.getElementById("loadGameBtn").disabled = false;
  document.getElementById("exportSaveBtn").disabled = false;
  document.getElementById("importSaveBtn").disabled = false;

  updateHintButton();
}

export function updateSeasonDisplay() {
  const seasonElement = document.getElementById("seasonDisplay");
  seasonElement.innerHTML = `<span class="icon">${seasonIcons[currentSeason]}</span> ${seasonNames[currentSeason]} <div class="progress-bar"><div class="progress" style="width: ${(seasonTimer / seasonDuration) * 100}%"></div></div>`;
}

export function showAlert(message) {
  const alertBox = document.getElementById("alert");
  alertBox.textContent = message;
  alertBox.style.display = "block";
}

export function hideAlert() {
  document.getElementById("alert").style.display = "none";
}

export function enableDragAndDrop() {
  const fabricationSection = document.getElementById("fabricationSection");
  const batimentsSection = document.getElementById("buildingsSection");
  const sections = [fabricationSection, batimentsSection];

  sections.forEach((section) => {
    if (!section) return;
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
        e.preventDefault();
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
              fabricationOrder = newOrder;
            } else if (section.id === "buildingsSection") {
              buildingsOrder = newOrder;
            }
          }
        }
      });
    });
  });
}

export function applyCraftOrder() {
  const fabricationSection = document.getElementById("fabricationSection");
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