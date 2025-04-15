import {
  villageFounded, berries, wood, stone, water, meat, fibers, metals, herbs, wheat, flour, bread,
  maxWater, maxFibers, maxMetals, maxHerbs, maxWheat, maxFlour, maxBread,
  axes, buckets, wells, pickaxes, bows, coats, metalAxes, remedies,
  mines, workshops, sawmills, stoneQuarries, herbalists, wheatFields, mills, bakeries,
  villagers, chief, tinkers, researchers, pickers, hunters, explorers, miners, farmers, villages,
  techUnlocked, eternityShards, currentSeason, seasonTimer, seasonDuration, seasonNames, seasonIcons,
  discoveredFibers, discoveredMetals, discoveredHerbs, currentAge, purchasedHints, dynamicHints, currentHint,
  warehouses, maxWoodStorage, maxStoneStorage, maxWaterStorage, maxMetalsStorage, maxHerbsStorage, maxWheatStorage, maxFlourStorage,
  unlockedAges, shardEffects, updateAge
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
  "warehouseSection"
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
  techBanner.style.display = "block"; // Toujours visible
  currentAgeDisplay.textContent = techUnlocked ? currentAge : "Âge de Pierre";

  // Bordure dynamique selon l'âge
  switch (techUnlocked ? currentAge : "Âge de Pierre") {
    case "Âge de Pierre":
      techBanner.style.border = "1px solid #8c8c8c"; // Gris pierre
      break;
    case "Âge des Métaux":
      techBanner.style.border = "1px solid #cd7f32"; // Bronze
      break;
    case "Âge de l’Agriculture":
      techBanner.style.border = "1px solid #4CAF50"; // Vert fertile
      break;
    default:
      techBanner.style.border = "1px solid #d4a017"; // Par défaut
  }

  // Aide pour l'Âge de l'Agriculture
  if (currentAge !== "Âge de l’Agriculture" && wheatFields > 0) {
    document.getElementById("narrative").textContent =
      "Construis des moulins et recrute des fermiers pour atteindre l’Âge de l’Agriculture !";
  }

  // Aide pour la farine
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
  seasonElement.innerHTML = `<span class="icon">${seasonIcons[currentSeason]
    }</span> ${seasonNames[currentSeason]
    } <div class="progress-bar"><div class="progress" style="width: ${(seasonTimer / seasonDuration) * 100
    }%"></div></div>`;
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
  const hintBtn = document.getElementById("hintBtn");
  const hintCost = document.getElementById("hintCost");
  if (!currentHint || purchasedHints.includes(currentHint.id)) {
    hintBtn.disabled = true;
    hintCost.textContent = "Aucun indice disponible pour le moment.";
    return;
  }
  hintBtn.disabled = false;
  if (Object.keys(currentHint.cost).length > 0) {
    let costText = "Coût : ";
    Object.entries(currentHint.cost).forEach(([resource, amount]) => {
      let resourceName =
        resource === "stone"
          ? "pierres"
          : resource === "berries"
            ? "baies"
            : resource === "wood"
              ? "bois"
              : resource === "axes"
                ? "haches"
                : resource === "fibers"
                  ? "fibres"
                  : resource === "water"
                    ? "eau"
                    : resource;
      costText += `${amount} ${resourceName}, `;
    });
    hintCost.textContent = costText.slice(0, -2);
  } else if (currentHint.canBuy) {
    if (currentHint.id === "meatValue") {
      hintCost.textContent = "Avoir au moins 10 cueilleurs";
    } else if (currentHint.id === "tinkerHint") {
      hintCost.textContent = "Avoir au moins 40 villageois";
    } else {
      hintCost.textContent = "Condition spéciale requise";
    }
  } else if (currentHint.id === "tenTinkers") {
    hintCost.textContent = "Objectif : 10 bricoleurs";
  } else {
    hintCost.textContent = "Aucune ressource requise";
  }
}

export function toggleHints() {
  const hintList = document.getElementById("purchasedHintsList");
  hintList.style.display =
    hintList.style.display === "none" ? "block" : "none";
}

export function buyHint() {
  if (!currentHint) {
    showAlert("Aucun indice disponible !");
    return;
  }
  if (!currentHint.condition()) {
    showAlert("La condition de cet indice n’est plus remplie !");
    currentHint = null;
    updateHintButton();
    updateDisplay();
    return;
  }
  if (currentHint.canBuy && !currentHint.canBuy()) {
    showAlert(
      "Tu ne remplis pas les conditions pour acheter cet indice !"
    );
    return;
  }
  const canAfford =
    Object.keys(currentHint.cost).length === 0 ||
    Object.entries(currentHint.cost).every(([resource, amount]) => {
      let resourceValue;
      switch (resource) {
        case "berries":
          resourceValue = berries;
          break;
        case "wood":
          resourceValue = wood;
          break;
        case "stone":
          resourceValue = stone;
          break;
        case "axes":
          resourceValue = axes;
          break;
        case "fibers":
          resourceValue = fibers;
          break;
        case "water":
          resourceValue = water;
          break;
        case "eternityShards": // Ajout pour gérer les éclats
          resourceValue = eternityShards;
          break;
        default:
          resourceValue = 0;
      }
      return resourceValue >= amount;
    });

  if (canAfford) {
    if (Object.keys(currentHint.cost).length > 0) {
      Object.entries(currentHint.cost).forEach(([resource, amount]) => {
        switch (resource) {
          case "berries":
            berries -= amount;
            break;
          case "wood":
            wood -= amount;
            break;
          case "stone":
            stone -= amount;
            break;
          case "axes":
            axes -= amount;
            break;
          case "fibers":
            fibers -= amount;
            break;
          case "water":
            water -= amount;
            break;
          case "eternityShards": // Retrait des éclats
            eternityShards -= amount;
            break;
        }
      });
    }
    purchasedHints.push(currentHint.id);
    const purchasedHintsList =
      document.getElementById("purchasedHintsList");

    // Gestion spéciale pour l’indice des effets des éclats
    if (currentHint.id === "shardEffectsReveal") {
      let effectsText = "Effets des Éclats d’Éternité débloqués :<br>";
      for (
        let i = 0;
        i < eternityShards && i < shardEffects.length;
        i++
      ) {
        const effect = shardEffects[i];
        if (effect.harvestBonus) {
          effectsText += `- ${effect.name} : Bonus de récolte de ${(
            (effect.harvestBonus - 1) *
            100
          ).toFixed(0)}%.<br>`;
        } else if (effect.waterConsumptionReduction) {
          effectsText += `- ${effect.name
            } : Réduction de la consommation d’eau à ${Math.round(
              effect.waterConsumptionReduction * 100
            )}%.<br>`;
        } else if (effect.foodConsumptionReduction) {
          effectsText += `- ${effect.name
            } : Réduction de la consommation de nourriture à ${Math.round(
              effect.foodConsumptionReduction * 100
            )}%.<br>`;
        } else if (effect.seasonPenaltyReduction) {
          effectsText += `- ${effect.name
            } : Réduction des pénalités saisonnières de ${Math.round(
              effect.seasonPenaltyReduction * 100
            )}%.<br>`;
        } else if (effect.noDeath) {
          effectsText += `- ${effect.name} : Plus de morts par manque de ressources.<br>`;
        }
      }
      purchasedHintsList.innerHTML += `<li>${effectsText}</li>`;
      document.getElementById("narrative").textContent =
        "Les effets des Éclats d’Éternité sont révélés dans les indices !";
    } else {
      purchasedHintsList.innerHTML += `<li>${currentHint.message}</li>`;
      document.getElementById(
        "narrative"
      ).textContent = `Indice acheté : ${currentHint.message}`;
    }

    currentHint = null;
    updateHintButton();
    updateDisplay();
  } else {
    let missing = "Il te faut ";
    let parts = [];
    Object.entries(currentHint.cost).forEach(([resource, amount]) => {
      let resourceValue;
      switch (resource) {
        case "berries":
          resourceValue = berries;
          break;
        case "wood":
          resourceValue = wood;
          break;
        case "stone":
          resourceValue = stone;
          break;
        case "axes":
          resourceValue = axes;
          break;
        case "fibers":
          resourceValue = fibers;
          break;
        case "water":
          resourceValue = water;
          break;
        case "eternityShards":
          resourceValue = eternityShards;
          break;
        default:
          resourceValue = 0;
      }
      let resourceName =
        resource === "stone"
          ? "pierres"
          : resource === "berries"
            ? "baies"
            : resource === "wood"
              ? "bois"
              : resource === "axes"
                ? "haches"
                : resource === "fibers"
                  ? "fibres"
                  : resource === "water"
                    ? "eau"
                    : resource === "eternityShards"
                      ? "éclats d’éternité"
                      : resource;
      if (resourceValue < amount) parts.push(`${amount} ${resourceName}`);
    });
    missing +=
      parts.length > 0
        ? parts.join(", ").replace(/, ([^,]*)$/, " et $1")
        : "plus de ressources";
    showAlert(`${missing} pour cet indice !`);
  }
}


export function enableDragAndDrop() {
  const fabricationSection =
    document.getElementById("fabricationSection");
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

        // Vérifie que l’élément appartient à la même section
        if (draggedElement.parentElement === section) {
          const craftsArray = Array.from(
            section.querySelectorAll(".craft")
          );
          const draggedIndex = craftsArray.indexOf(draggedElement);
          const dropTarget = e.target.closest(".craft");

          if (dropTarget && dropTarget !== draggedElement) {
            const targetIndex = craftsArray.indexOf(dropTarget);
            if (draggedIndex < targetIndex) {
              dropTarget.after(draggedElement);
            } else {
              dropTarget.before(draggedElement);
            }
            // Mettre à jour l’ordre
            const newOrder = Array.from(
              section.querySelectorAll(".craft")
            ).map((craft) => craft.id);
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
    berries += 100;
    meat += 100;
    wood += 100;
    stone += 100;
    water += 100;
    updateDisplay();
  }
});

const originalUpdateDisplay = updateDisplay;
updateDisplay = function () {
  originalUpdateDisplay();
  applyCraftOrder();
  enableDragAndDrop();
};