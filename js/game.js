import { updateDisplay, updateSeasonDisplay, showAlert, hideAlert, updateHintButton } from './ui.js';

export let villageFounded = false;
export let berries = 0,
  wood = 0,
  stone = 0,
  water = 0,
  meat = 0,
  fibers = 0,
  metals = 0,
  herbs = 0,
  wheat = 0,
  flour = 0,
  bread = 0;
export let maxWater = 100,
  maxFibers = 200,
  maxMetals = 100,
  maxHerbs = 50,
  maxWheat = 100,
  maxFlour = 100,
  maxBread = 100;
export let axes = 0,
  buckets = 0,
  wells = 0,
  pickaxes = 0,
  bows = 0,
  coats = 0,
  metalAxes = 0,
  remedies = 0;
export let mines = 0,
  workshops = 0,
  sawmills = 0,
  stoneQuarries = 0,
  herbalists = 0,
  wheatFields = 0,
  mills = 0;
export let villagers = 0,
  chief = 0,
  tinkers = 0,
  researchers = 0,
  pickers = 0,
  hunters = 0,
  explorers = 0,
  miners = 0,
  farmers = 0;
export let villages = 0,
  techUnlocked = false,
  eternityShards = 0,
  deathTimer = 0;
  export let explorationTimer = 0,
  explorationActive = false;
export let discoveredFibers = false,
  discoveredMetals = false,
  discoveredHerbs = false;
export let warehouses = 0; // Nombre d’entrepôts
export let maxWoodStorage = 1000; // Stockage supplémentaire pour le bois
export let maxStoneStorage = 1000; // Stockage pour la pierre
export let maxWaterStorage = 0; // Stockage pour l’eau
export let maxMetalsStorage = 0; // Stockage pour les métaux
export let maxHerbsStorage = 0; // Stockage pour les herbes
export let maxWheatStorage = 0; // Stockage pour le blé
export let maxFlourStorage = 0; // Stockage pour la farine
export let bakeries = 0; // Nombre de boulangeries

export let unlockedAges = ["Âge de Pierre"];
export let currentAge = "Âge de Pierre";

export const seasonNames = ["Printemps", "Été", "Automne", "Hiver"];
export const seasonIcons = ["🌱", "☀️", "🍂", "❄️"];
export let currentSeason = 0;
export let seasonTimer = 0;
export const seasonDuration = 1800;

export const seasonModifiers = [
  {
    berries: 1.3,
    wood: 1.0,
    stone: 1.0,
    water: 1.2,
    meat: 1.1,
    fibers: 1.0,
    metals: 1.0,
    herbs: 1.3,
    wheat: 1.0,
  },
  {
    berries: 1.0,
    wood: 1.2,
    stone: 1.1,
    water: 0.7,
    meat: 1.2,
    fibers: 1.0,
    metals: 1.2,
    herbs: 0.0,
    wheat: 1.0,
  },
  {
    berries: 1.2,
    wood: 1.1,
    stone: 1.1,
    water: 1.0,
    meat: 1.0,
    fibers: 1.2,
    metals: 1.0,
    herbs: 1.2,
    wheat: 1.2,
  },
  {
    berries: 0.6,
    wood: 0.8,
    stone: 0.8,
    water: 0.8,
    meat: 0.7,
    fibers: 0.8,
    metals: 0.8,
    herbs: 0.0,
    wheat: 0.8,
  },
];

export const shardEffects = [
  { name: "Don de la Terre", harvestBonus: 1.2 },
  { name: "Souffle de Vie", waterConsumptionReduction: 0.75 },
  { name: "Force des Anciens", foodConsumptionReduction: 0.8 },
  { name: "Équilibre Saisonnal", seasonPenaltyReduction: 0.5 },
  { name: "Harmonie Éternelle", noDeath: true },
];

export const dynamicHints = [
  // Nouvel indice pour inciter à fabriquer 25 haches dès le début
  {
    condition: () => chief === 0 && axes < 25, // Avant d’avoir un chef et moins de 25 haches
    message: "Fabrique au moins 25 haches !",
    cost: { wood: 50 }, // Coût léger pour encourager l’achat tôt
    id: "prepareForChief",
  },
  {
    condition: () => true,
    message: "Une saison dure 30 minutes.",
    cost: { berries: 30 },
    id: "seasonDuration",
  },
  {
    condition: () => villagers >= 10,
    canBuy: () => pickers >= 10,
    message: "La viande est plus nourrissante que les baies.",
    cost: {},
    id: "meatValue",
  },
  {
    condition: () => axes >= 20 && villagers >= 20,
    message:
      "Tu es prêt pour un chef ! Nomme-le avec 25 haches et 25 villageois.",
    cost: { wood: 100, axes: 1 },
    id: "chiefReady",
  },
  {
    condition: () => chief >= 1,
    canBuy: () => villagers >= 40,
    message: "Attire un bricoleur pour améliorer tes outils.",
    cost: {},
    id: "tinkerHint",
  },
  {
    condition: () => water >= 100,
    message: "Construis un puits pour augmenter ton stock d’eau.",
    cost: { water: 50 },
    id: "wellHint",
  },
  {
    condition: () => tinkers >= 1 && wood >= 100 && stone >= 100,
    message: "Essaie d’avoir 10 bricoleurs.",
    cost: {},
    id: "tenTinkers",
  },
  {
    condition: () => wells >= 1 && buckets >= 50,
    message: "Ajoute plus de puits pour récolter davantage d’eau.",
    cost: { water: 100 },
    id: "moreWells",
  },
  {
    condition: () => discoveredFibers && fibers >= 150 && workshops === 0, // Quand les fibres approchent de la limite
    message: "Construis un atelier pour augmenter la limite des fibres !",
    cost: { fibers: 100 }, // Coût de 100 fibres
    id: "workshopFiberLimit",
  },
  {
    condition: () => eternityShards >= 5, // Disponible si le joueur a 5 éclats ou plus
    message: "Affiche l'effet des dons débloqués.",
    cost: { eternityShards: 5 }, // Coût de 5 éclats
    id: "shardEffectsReveal",
  },
  {
    condition: () => currentAge === "Âge de l’Agriculture" && bakeries === 0,
    message: "Construis une boulangerie pour produire du pain automatiquement !",
    cost: { flour: 5 },
    id: "bakeryHint"
  },
  {
    condition: () =>
      tinkers >= 1 ||
      discoveredMetals ||
      discoveredFibers ||
      discoveredHerbs, // Quand un bâtiment devient visible
    message:
      "Tu peux réorganiser les sections Fabrication et Bâtiments par glisser-déposer !",
    cost: {}, // Gratuit
    id: "reorganizeHint",
  },
];
export let purchasedHints = [];
export let currentHint = null;

export function updateAge(newAge) {
  if (newAge !== currentAge && !unlockedAges.includes(newAge)) {
    currentAge = newAge;
    unlockedAges.push(newAge);
    document.getElementById("narrative").textContent =
      `Tu entres dans l’${newAge} !`;
    updateDisplay();
  }
}

export function getAgeTooltip(age) {
  switch (age) {
    case "Âge de Pierre":
      return "Les débuts de la civilisation, axés sur la survie et les ressources de base.";
    case "Âge des Métaux":
      return "Découverte des métaux, permettant des outils et bâtiments avancés.";
    case "Âge de l’Agriculture":
      return "Maîtrise de l’agriculture, avec production de blé, farine et pain.";
    default:
      return "";
  }
}

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

export function gatherBerries() {
  let harvestBonus =
    eternityShards >= 1 ? shardEffects[0].harvestBonus : 1;
  berries += 1 * seasonModifiers[currentSeason].berries * harvestBonus;
  if (berries >= 5 && villagers === 0)
    document.getElementById("narrative").textContent =
      "Tu as assez de baies ! Attire un villageois maintenant.";
  updateDisplay();
}

export function gatherWood() {
  let harvestBonus =
    eternityShards >= 1 ? shardEffects[0].harvestBonus : 1;
  wood +=
    (metalAxes > 0 ? 3 : axes > 0 ? 2 : 1) *
    seasonModifiers[currentSeason].wood *
    harvestBonus;
  updateDisplay();
}

export function gatherStone() {
  let harvestBonus =
    eternityShards >= 1 ? shardEffects[0].harvestBonus : 1;
  stone +=
    (pickaxes > 0 ? 2 : 1) *
    seasonModifiers[currentSeason].stone *
    harvestBonus *
    (currentAge === "Âge des Métaux" ? 1.1 : 1);
  updateDisplay();
}

export function gatherWater() {
  let harvestBonus =
    eternityShards >= 1 ? shardEffects[0].harvestBonus : 1;
  water = Math.min(
    water +
    (buckets > 0 ? 2 : 1) *
    seasonModifiers[currentSeason].water *
    harvestBonus,
    maxWater
  );
  updateDisplay();
}

export function gatherMeat() {
  let harvestBonus =
    eternityShards >= 1 ? shardEffects[0].harvestBonus : 1;
  meat +=
    (bows > 0 ? 2 : 1) *
    seasonModifiers[currentSeason].meat *
    harvestBonus;
  updateDisplay();
}

export function gatherFibers() {
  let harvestBonus =
    eternityShards >= 1 ? shardEffects[0].harvestBonus : 1;
  fibers = Math.min(
    fibers + 1 * seasonModifiers[currentSeason].fibers * harvestBonus,
    maxFibers
  );
  updateDisplay();
}

export function gatherMetals() {
  let harvestBonus =
    eternityShards >= 1 ? shardEffects[0].harvestBonus : 1;
  metals = Math.min(
    metals +
    (pickaxes > 0 ? 3 : mines > 0 ? 2 : 1) *
    seasonModifiers[currentSeason].metals *
    harvestBonus *
    (currentAge === "Âge des Métaux" ? 1.1 : 1),
    maxMetals
  );
  updateDisplay();
}

export function craftAxe() {
  if (wood >= 5 && stone >= 2) {
    wood -= 5;
    stone -= 2;
    axes += 1;
    if (axes >= 25 && villagers >= 25)
      document.getElementById("chiefSection").style.display = "block";
    document.getElementById("narrative").textContent =
      "Tu as une hache ! Elle coupe le bois plus vite.";
    updateDisplay();
  } else
    showAlert("Il te faut 5 bois et 2 pierres pour faire une hache !");
}

export function craftBucket() {
  if (wood >= 5 && stone >= 2) {
    wood -= 5;
    stone -= 2;
    buckets += 1;
    document.getElementById("narrative").textContent =
      "Tu as un seau ! Il récolte plus d’eau.";
    updateDisplay();
  } else showAlert("Il te faut 5 bois et 2 pierres pour un seau !");
}

export function craftWell() {
  if (wood >= 10 && stone >= 5) {
    wood -= 10;
    stone -= 5;
    wells += 1;
    maxWater += 1000;
    document.getElementById("narrative").textContent =
      "Un puits est construit ! Il stocke plus d’eau.";
    updateDisplay();
  } else showAlert("Il te faut 10 bois et 5 pierres pour un puits !");
}

export function craftPickaxe() {
  if (wood >= 10 && stone >= 5) {
    wood -= 10;
    stone -= 5;
    pickaxes += 1;
    document.getElementById("narrative").textContent =
      "Tu as une pioche ! Elle récolte plus de pierre.";
    updateDisplay();
  } else
    showAlert("Il te faut 10 bois et 5 pierres pour faire une pioche !");
}

export function craftBow() {
  if (wood >= 10 && stone >= 5) {
    wood -= 10;
    stone -= 5;
    bows += 1;
    document.getElementById("narrative").textContent =
      "Tu as un arc ! Il récolte plus de viande.";
    updateDisplay();
  } else showAlert("Il te faut 10 bois et 5 pierres pour faire un arc !");
}

export function craftCoat() {
  const fiberCost = workshops > 0 ? 8 : 10;
  const woodCost = workshops > 0 ? 4 : 5;
  if (
    fibers >= fiberCost &&
    wood >= woodCost &&
    coats < villagers &&
    discoveredFibers
  ) {
    fibers -= fiberCost;
    wood -= woodCost;
    coats += 1;
    document.getElementById("narrative").textContent =
      "Un manteau est prêt pour l’Hiver !";
    updateDisplay();
  } else
    showAlert(
      `Il te faut ${fiberCost} fibres, ${woodCost} bois et moins de manteaux que de villageois !`
    );
}

export function craftMetalAxe() {
  if (metals >= 5 && wood >= 5 && discoveredMetals) {
    metals -= 5;
    wood -= 5;
    metalAxes += 1;
    document.getElementById("narrative").textContent =
      "Une hache en métal, plus tranchante !";
    updateDisplay();
  } else
    showAlert("Il te faut 5 métaux, 5 bois et les métaux découverts !");
}

export function craftRemedy() {
  const herbCost = herbalists > 0 ? 4 : 5;
  const waterCost = herbalists > 0 ? 4 : 5;
  if (
    herbs >= herbCost &&
    water >= waterCost &&
    remedies < villagers &&
    discoveredHerbs
  ) {
    herbs -= herbCost;
    water -= waterCost;
    remedies += 1;
    document.getElementById("narrative").textContent =
      "Un remède pour protéger ton peuple !";
    updateDisplay();
  } else
    showAlert(
      `Il te faut ${herbCost} herbes, ${waterCost} eau et moins de remèdes que de villageois !`
    );
}

export function craftMine() {
  if (wood >= 50 && stone >= 20 && tinkers >= 1 && discoveredMetals) {
    wood -= 50;
    stone -= 20;
    mines += 1;
    currentAge = "Âge des Métaux";
    document.getElementById("minerSection").style.display = "block";
    document.getElementById("narrative").textContent =
      "Une mine est construite ! L’Âge des Métaux commence.";
    updateDisplay();
  } else
    showAlert(
      "Il te faut 50 bois, 20 pierre, 1 bricoleur et les métaux découverts !"
    );
}

export function craftWorkshop() {
  if (wood >= 20 && stone >= 10 && fibers >= 5 && discoveredFibers) {
    wood -= 20;
    stone -= 10;
    fibers -= 5;
    workshops += 1;
    maxFibers += 1000; // Ajoute 1000 par atelier
    document.getElementById("narrative").textContent =
      "Un atelier est construit ! La limite de fibres augmente à " +
      maxFibers +
      ".";
    updateDisplay();
  } else
    showAlert(
      "Il te faut 20 bois, 10 pierre, 5 fibres et les fibres découvertes !"
    );
}

export function craftHerbalist() {
  if (wood >= 15 && stone >= 5 && herbs >= 5 && discoveredHerbs) {
    wood -= 15;
    stone -= 5;
    herbs -= 5;
    herbalists += 1;
    maxHerbs = 200;
    document.getElementById("wheatFieldSection").style.display = "block";
    document.getElementById("narrative").textContent =
      "Une herboristerie est construite ! Les remèdes s’améliorent.";
    updateDisplay();
  } else
    showAlert(
      "Il te faut 15 bois, 5 pierre, 5 herbes et les herbes découvertes !"
    );
}

export function craftWheatField() {
  if (
    wood >= 20 &&
    stone >= 10 &&
    herbs >= 5 &&
    discoveredHerbs
  ) {
    wood -= 20;
    stone -= 10;
    herbs -= 5;
    wheatFields += 1;
    document.getElementById("narrative").textContent =
      "Un champ de blé est construit ! Cultive du blé.";
    updateAge("Âge de l’Agriculture");
    updateDisplay();
  } else {
    showAlert(
      "Il te faut 20 bois, 10 pierre, 5 herbes et avoir découvert les herbes !"
    );
  }
}

export function craftMill() {
  if (wood >= 50 && stone >= 20 && metals >= 5 && wheatFields > 0) {
    wood -= 50;
    stone -= 20;
    metals -= 5;
    mills += 1;
    currentAge = "Âge de l’Agriculture";
    document.getElementById("wheatSection").style.display =
      "inline-block";
    document.getElementById("flourSection").style.display =
      "inline-block";
    document.getElementById("breadSection").style.display = "block";
    document.getElementById("narrative").textContent =
      "Un moulin est construit ! L’Âge de l’Agriculture commence.";
    updateDisplay();
  } else
    showAlert(
      "Il te faut 50 bois, 20 pierre, 5 métaux et des champs de blé !"
    );
}

export function craftBakery() {
  if (
    wood >= 50 &&
    stone >= 20 &&
    flour >= 5 &&
    currentAge === "Âge de l’Agriculture"
  ) {
    wood -= 50;
    stone -= 20;
    flour -= 5;
    bakeries += 1;
    document.getElementById("narrative").textContent =
      "Une boulangerie est construite ! Elle produit du pain automatiquement.";
    updateDisplay();
  } else {
    let reasons = [];
    if (wood < 50) reasons.push("pas assez de bois (" + wood + "/50)");
    if (stone < 20) reasons.push("pas assez de pierre (" + stone + "/20)");
    if (flour < 5) reasons.push("pas assez de farine (" + flour + "/5)");
    if (currentAge !== "Âge de l’Agriculture") reasons.push("mauvais âge (" + currentAge + ")");
    showAlert(
      "Il te faut 50 bois, 20 pierre, 5 farine et être dans l’Âge de l’Agriculture ! " +
      reasons.join(", ")
    );
  }
}

export function craftSawmill() {
  if (
    wood >= 50 &&
    stone >= 20 &&
    metals >= 5 &&
    (currentAge === "Âge des Métaux" || currentAge === "Âge de l’Agriculture")
  ) {
    wood -= 50;
    stone -= 20;
    metals -= 5;
    sawmills += 1;
    document.getElementById("narrative").textContent =
      "Une scierie est construite ! Elle produit 0.5 bois par seconde.";
    updateDisplay();
  } else {
    showAlert(
      "Il te faut 50 bois, 20 pierre, 5 métaux et être dans l’Âge des Métaux ou l’Âge de l’Agriculture !"
    );
  }
}

export function craftStoneQuarry() {
  if (
    wood >= 50 &&
    stone >= 20 &&
    metals >= 5 &&
    (currentAge === "Âge des Métaux" || currentAge === "Âge de l’Agriculture")
  ) {
    wood -= 50;
    stone -= 20;
    metals -= 5;
    stoneQuarries += 1;
    document.getElementById("narrative").textContent =
      "Une carrière de pierre est construite ! Elle produit 0.5 pierre par seconde.";
    updateDisplay();
  } else {
    showAlert(
      "Il te faut 50 bois, 20 pierre, 5 métaux et être dans l’Âge des Métaux ou l’Âge de l’Agriculture !"
    );
  }
}

export function craftWarehouse() {
  if (
    wood >= 50 &&
    stone >= 20 &&
    metals >= 5 &&
    (currentAge === "Âge des Métaux" || currentAge === "Âge de l’Agriculture")
  ) {
    wood -= 100;
    stone -= 50;
    metals -= 10;
    warehouses += 1;
    if (warehouses === 1) {
      maxWoodStorage = 50000;
      maxStoneStorage = 50000;
      maxWaterStorage = 50000;
      maxMetalsStorage = 50000;
      maxHerbsStorage = 50000;
      maxWheatStorage = 50000;
      maxFlourStorage = 50000;
    } else {
      maxWoodStorage += 50000;
      maxStoneStorage += 50000;
      maxWaterStorage += 50000;
      maxMetalsStorage += 50000;
      maxHerbsStorage += 50000;
      maxWheatStorage += 50000;
      maxFlourStorage += 50000;
    }
    document.getElementById("narrative").textContent =
      `Un entrepôt est construit ! Capacité de stockage ${warehouses === 1 ? "fixée à" : "augmentée de"} 50 000 pour bois, pierre, eau, métaux, herbes, blé et farine.`;
    updateDisplay();
  } else {
    showAlert(
      "Il te faut 100 bois, 50 pierre, 10 métaux et être dans l’Âge des Métaux ou l’Âge de l’Agriculture !"
    );
  }
}

export function recruitVillager() {
  if (berries >= 5) {
    berries -= 5;
    villagers += 1;
    if (villagers === 1)
      document.getElementById("narrative").textContent =
        "Un villageois arrive ! Il va t’aider.";
    if (villagers >= 10)
      document.getElementById("pickerSection").style.display = "block";
    if (villagers >= 20)
      document.getElementById("hunterSection").style.display = "block";
    if (villagers >= 25 && axes >= 25)
      document.getElementById("chiefSection").style.display = "block";
    updateDisplay();
  } else showAlert("Il te faut 5 baies pour attirer un villageois !");
}

export function appointChief() {
  if (axes >= 25 && villagers >= 25) {
    // Retiré "chief < 1"
    chief += 1;
    document.getElementById("villageSection").style.display = "block";
    document.getElementById("narrative").textContent =
      "Tu as un nouveau chef ! Il guide une partie de ton peuple.";
    updateDisplay();
  } else {
    showAlert(
      "Il te faut 25 haches et au moins 25 villageois pour nommer un chef !"
    );
  }
}

export function recruitTinker() {
  if (wood >= 100 && stone >= 100 && villageFounded) {
    wood -= 100;
    stone -= 100;
    tinkers += 1;
    document.getElementById("wellSection").style.display = "block";
    document.getElementById("pickaxeSection").style.display = "block";
    document.getElementById("bowSection").style.display = "block";
    document.getElementById("coatSection").style.display = "block";
    document.getElementById("metalAxeSection").style.display = "block";
    document.getElementById("remedySection").style.display = "block";
    techUnlocked = true;
    document.getElementById("narrative").textContent =
      "Un bricoleur arrive ! L’Automne s’installe.";
    currentSeason = 2;
    updateAge("Âge des Métaux");
    updateDisplay();
    updateSeasonDisplay();
  } else {
    showAlert(
      "Il te faut 100 bois, 100 pierres et un village pour un bricoleur !"
    );
  }
}

export function recruitResearcher() {
  if (tinkers >= 10) {
    tinkers -= 10;
    researchers += 1;
    document.getElementById("researcherSection").style.display = "block";
    document.getElementById("narrative").textContent =
      "Un chercheur rejoint ton village ! De nouvelles technologies arrivent.";
    updateDisplay();
  } else
    showAlert("Il te faut 10 bricoleurs pour recruter un chercheur !");
}

export function recruitPicker() {
  if (berries >= 10 && wood >= 5) {
    berries -= 10;
    wood -= 5;
    pickers += 1;
    document.getElementById("narrative").textContent =
      "Un cueilleur arrive ! Il ramasse des baies pour toi.";
    updateDisplay();
  } else showAlert("Il te faut 10 baies et 5 bois pour un cueilleur !");
}

export function recruitHunter() {
  if (wood >= 10 && meat >= 5) {
    wood -= 10;
    meat -= 5;
    hunters += 1;
    document.getElementById("narrative").textContent =
      "Un chasseur arrive ! Il trouve de la viande.";
    updateDisplay();
  } else showAlert("Il te faut 10 bois et 5 viande pour un chasseur !");
}

export function sendExplorers() {
  if (
    berries >= 50 &&
    wood >= 20 &&
    villagers >= 10 &&
    !explorationActive &&
    (!discoveredFibers || !discoveredMetals || !discoveredHerbs)
  ) {
    berries -= 50;
    wood -= 20;
    villagers -= 10;
    explorers += 10;
    explorationActive = true;
    explorationTimer = 30;
    console.log("Exploration démarrée, timer =", explorationTimer);
    document.getElementById("narrative").textContent =
      "Les explorateurs partent à la découverte...";
    updateDisplay();
  } else {
    let reasons = [];
    if (berries < 50) reasons.push("pas assez de baies (" + berries + "/50)");
    if (wood < 20) reasons.push("pas assez de bois (" + wood + "/20)");
    if (villagers < 10) reasons.push("pas assez de villageois (" + villagers + "/10)");
    if (explorationActive) reasons.push("exploration déjà en cours");
    if (discoveredFibers && discoveredMetals && discoveredHerbs) reasons.push("toutes les ressources découvertes");
    showAlert(
      "Impossible d'envoyer des explorateurs : " + reasons.join(", ") + " !"
    );
  }
}

export function recruitMiner() {
  if (wood >= 10 && metals >= 5 && mines > 0) {
    wood -= 10;
    metals -= 5;
    miners += 1;
    document.getElementById("narrative").textContent =
      "Un mineur arrive ! Il extrait des métaux.";
    updateDisplay();
  } else showAlert("Il te faut 10 bois, 5 métaux et une mine !");
}

export function recruitFarmer() {
  if (berries >= 10 && wood >= 5 && wheatFields > 0) {
    berries -= 10;
    wood -= 5;
    farmers += 1;
    document.getElementById("narrative").textContent =
      "Un fermier arrive ! Il cultive le blé.";
    updateDisplay();
  } else showAlert("Il te faut 10 baies, 5 bois et des champs de blé !");
}

export function foundVillage() {
  const requiredVillagers = (villages + 1) * 50;
  const requiredChiefs = villages + 1;
  if (
    villagers >= requiredVillagers &&
    chief >= requiredChiefs &&
    villages < 10
  ) {
    villages += 1;
    villageFounded = true; // Toujours nécessaire pour les bricoleurs
    document.getElementById("narrative").textContent = `Village ${villages} fondé ! L’Été s’installe pour ce nouveau groupe.`;
    document.getElementById("tinkerSection").style.display = "block";
    document.getElementById("relicSection").style.display = "block";
    currentSeason = 1;
    updateDisplay();
    updateSeasonDisplay();
  } else if (villages >= 10) {
    showAlert("Tu as atteint la limite de 10 villages !");
  } else {
    showAlert(`Il te faut ${requiredVillagers} villageois et ${requiredChiefs} chefs pour fonder le village ${villages + 1} !`);
  }
}

export function seekShard() {
  if (wood >= 200 && stone >= 100 && water >= 50) {
    wood -= 200;
    stone -= 100;
    water -= 50;
    eternityShards += 1;
    let shardMessage = "Tu trouves un éclat spécial ! ";
    if (eternityShards <= shardEffects.length)
      shardMessage += `Effet débloqué : ${shardEffects[eternityShards - 1].name
        }.`;
    if (eternityShards === 1) {
      currentSeason = 3;
      shardMessage += " L’Hiver s’abat sur ton peuple.";
      updateSeasonDisplay();
    }
    document.getElementById("narrative").textContent = shardMessage;
    document.getElementById("eternityShards").textContent =
      eternityShards;
    updateDisplay();
  } else
    showAlert(
      "Il te faut 200 bois, 100 pierres et 50 eau pour un éclat !"
    );
}

export function gameLoop() {
  let harvestBonus =
    eternityShards >= 1 ? shardEffects[0].harvestBonus : 1;
  harvestBonus *=
    currentAge === "Âge des Métaux" ||
      currentAge === "Âge de l’Agriculture"
      ? 1.1
      : 1;
  let waterConsumptionReduction =
    eternityShards >= 2 ? shardEffects[1].waterConsumptionReduction : 1;
  let foodConsumptionReduction =
    eternityShards >= 3 ? shardEffects[2].foodConsumptionReduction : 1;
  let seasonPenaltyReduction =
    eternityShards >= 4 ? shardEffects[3].seasonPenaltyReduction : 0;
  let noDeath = eternityShards >= 5 && shardEffects[4].noDeath;

  let adjustedSeasonModifiers = [...seasonModifiers];
  if (seasonPenaltyReduction > 0) {
    adjustedSeasonModifiers[currentSeason] = {
      berries:
        1 -
        (1 - seasonModifiers[currentSeason].berries) *
        (1 - seasonPenaltyReduction),
      wood:
        1 -
        (1 - seasonModifiers[currentSeason].wood) *
        (1 - seasonPenaltyReduction),
      stone:
        1 -
        (1 - seasonModifiers[currentSeason].stone) *
        (1 - seasonPenaltyReduction),
      water:
        1 -
        (1 - seasonModifiers[currentSeason].water) *
        (1 - seasonPenaltyReduction),
      meat:
        1 -
        (1 - seasonModifiers[currentSeason].meat) *
        (1 - seasonPenaltyReduction),
      fibers:
        1 -
        (1 - seasonModifiers[currentSeason].fibers) *
        (1 - seasonPenaltyReduction),
      metals:
        1 -
        (1 - seasonModifiers[currentSeason].metals) *
        (1 - seasonPenaltyReduction),
      herbs:
        1 -
        (1 - seasonModifiers[currentSeason].herbs) *
        (1 - seasonPenaltyReduction),
      wheat:
        1 -
        (1 - seasonModifiers[currentSeason].wheat) *
        (1 - seasonPenaltyReduction),
    };
  }

  if (wells > 0) {
    let bucketEfficiency = 0.2 + tinkers * 0.1;
    let waterGained =
      buckets *
      bucketEfficiency *
      adjustedSeasonModifiers[currentSeason].water *
      harvestBonus;
    water = Math.min(water + waterGained, maxWater + maxWaterStorage); // Ajout de maxWaterStorage
  }
  berries +=
    pickers *
    0.5 *
    adjustedSeasonModifiers[currentSeason].berries *
    harvestBonus; // Pas de limite d’entrepôt pour la nourriture
  meat +=
    hunters *
    0.2 *
    adjustedSeasonModifiers[currentSeason].meat *
    harvestBonus; // Pas de limite
  if (discoveredFibers) {
    let fiberGain =
      pickers *
      0.2 *
      adjustedSeasonModifiers[currentSeason].fibers *
      harvestBonus;
    fibers = Math.min(fibers + fiberGain, maxFibers); // Fibres exclues des entrepôts
  }
  herbs +=
    pickers *
    0.1 *
    adjustedSeasonModifiers[currentSeason].herbs *
    harvestBonus;
  herbs = Math.min(herbs, maxHerbs + maxHerbsStorage); // Limite avec entrepôt
  metals +=
    (mines * 0.1 + miners * 0.2) *
    adjustedSeasonModifiers[currentSeason].metals *
    harvestBonus;
  metals = Math.min(metals, maxMetals + maxMetalsStorage); // Limite avec entrepôt
  if (currentAge === "Âge des Métaux" || currentAge === "Âge de l’Agriculture") {
    wood += sawmills * 0.5 * adjustedSeasonModifiers[currentSeason].wood * harvestBonus;
    wood = Math.min(wood, maxWoodStorage);
    stone += stoneQuarries * 0.5 * adjustedSeasonModifiers[currentSeason].stone * harvestBonus;
    stone = Math.min(stone, maxStoneStorage);
  }
  if (currentAge === "Âge de l’Agriculture") {
    wheat += farmers * 0.2 * adjustedSeasonModifiers[currentSeason].wheat * harvestBonus;
    wheat = Math.min(wheat, maxWheat + maxWheatStorage);
    if (mills > 0 && wheat >= mills) {
      wheat -= mills;
      flour += mills;
      flour = Math.min(flour, maxFlour + maxFlourStorage);
    }
    if (bakeries > 0 && flour >= bakeries * 2 && water >= bakeries) {
      flour -= bakeries * 2;
      water -= bakeries;
      bread += bakeries;
      bread = Math.min(bread, maxBread + maxFlourStorage);
    }
  }

  if (explorationActive) {
    explorationTimer -= 1;
    console.log("Exploration en cours, timer =", explorationTimer);
    if (explorationTimer <= 0) {
      explorers -= 10;
      villagers += 10;
      explorationActive = false;
      console.log("Exploration terminée, découverte en cours...");
      if (!discoveredFibers) {
        discoveredFibers = true;
        fibers = 0;
        document.getElementById("fibersSection").style.display = "inline-block";
        document.getElementById("workshopSection").style.display = "block";
        document.getElementById("narrative").textContent =
          "Les explorateurs ont découvert les fibres !";
        document.querySelector("#pickerSection .tooltip").textContent =
          "Un cueilleur ramasse des baies et des fibres pour toi.";
      } else if (!discoveredMetals) {
        discoveredMetals = true;
        document.getElementById("metalsSection").style.display = "inline-block";
        document.getElementById("mineSection").style.display = "block";
        document.getElementById("narrative").textContent =
          "Les explorateurs ont découvert les métaux !";
        updateAge("Âge des Métaux");
      } else if (!discoveredHerbs) {
        discoveredHerbs = true;
        document.getElementById("herbsSection").style.display = "inline-block";
        document.getElementById("herbalistSection").style.display = "block";
        document.getElementById("narrative").textContent =
          "Les explorateurs ont découvert les herbes !";
      }
      updateDisplay();
    }
  }

  if (villagers > 0) {
    let baseFoodConsumption = 0.1 * foodConsumptionReduction;
    let baseWaterConsumption =
      (currentSeason === 3
        ? coats >= villagers
          ? 0.05
          : 0.15
        : currentSeason === 1
          ? 0.15
          : 0.1) * waterConsumptionReduction;
    let foodConsumed = villagers * baseFoodConsumption;
    let waterConsumed = villagers * baseWaterConsumption;

    // Convertir tout en équivalent baies pour comparer les stocks
    let berriesStock = berries;
    let meatInBerryUnits = meat * 3;
    let breadInBerryUnits =
      currentAge === "Âge de l’Agriculture" ? bread * 5 : 0;

    // Trouver le stock le plus grand
    if (
      breadInBerryUnits >= berriesStock &&
      breadInBerryUnits >= meatInBerryUnits
    ) {
      // Pain est le plus grand stock
      let breadNeeded = Math.ceil(foodConsumed / 5);
      if (bread >= breadNeeded) {
        bread -= breadNeeded;
      } else {
        let remainingFoodNeeded = foodConsumed - bread * 5;
        bread = 0;
        if (berries >= remainingFoodNeeded) {
          berries -= remainingFoodNeeded;
        } else {
          let stillNeeded = remainingFoodNeeded - berries;
          berries = 0;
          let meatEquivalent = stillNeeded / 3;
          if (meat >= meatEquivalent) meat -= meatEquivalent;
          else meat = 0;
        }
      }
    } else if (meatInBerryUnits >= berriesStock) {
      // Viande est le plus grand stock
      let meatEquivalent = foodConsumed / 3;
      if (meat >= meatEquivalent) {
        meat -= meatEquivalent;
      } else {
        let remainingFoodNeeded = foodConsumed - meat * 3;
        meat = 0;
        if (berries >= remainingFoodNeeded) {
          berries -= remainingFoodNeeded;
        } else {
          let stillNeeded = remainingFoodNeeded - berries;
          berries = 0;
          if (
            currentAge === "Âge de l’Agriculture" &&
            bread >= Math.ceil(stillNeeded / 5)
          ) {
            bread -= Math.ceil(stillNeeded / 5);
          } else {
            bread = 0;
          }
        }
      }
    } else {
      // Baies sont le plus grand stock
      if (berries >= foodConsumed) {
        berries -= foodConsumed;
      } else {
        let remainingFoodNeeded = foodConsumed - berries;
        berries = 0;
        let meatEquivalent = remainingFoodNeeded / 3;
        if (meat >= meatEquivalent) {
          meat -= meatEquivalent;
        } else {
          let stillNeeded = remainingFoodNeeded - meat * 3;
          meat = 0;
          if (
            currentAge === "Âge de l’Agriculture" &&
            bread >= Math.ceil(stillNeeded / 5)
          ) {
            bread -= Math.ceil(stillNeeded / 5);
          } else {
            bread = 0;
          }
        }
      }
    }

    if (water >= waterConsumed) water -= waterConsumed;
    else water = 0;

    let alertMessage = "";
    if (
      berries <= 0 &&
      meat <= 0 &&
      (currentAge !== "Âge de l’Agriculture" || bread <= 0)
    )
      alertMessage =
        "Plus de nourriture ! Récolte vite des baies ou de la viande !";
    if (water <= 0)
      alertMessage += alertMessage
        ? " Plus d’eau ! Récolte vite !"
        : "Plus d’eau ! Récolte vite !";
    if (alertMessage) showAlert(alertMessage);
    else hideAlert();

    if (
      berries <= 0 &&
      meat <= 0 &&
      water <= 0 &&
      (currentAge !== "Âge de l’Agriculture" || bread <= 0) &&
      !noDeath
    ) {
      deathTimer += 1;
      let deathThreshold = remedies >= villagers ? 120 : 60;
      if (deathTimer >= deathThreshold) {
        villagers -= 1;
        deathTimer = 0;
        document.getElementById("narrative").textContent =
          "Un villageois est mort de faim et de soif !";
      }
    } else deathTimer = 0;
  } else {
    hideAlert();
    deathTimer = 0;
  }

  if (villagers >= 1 && water === 0) {
    document.getElementById("narrative").textContent =
      "Attention, un villageois consomme de l’eau ! Puise de l’eau.";
  }

  seasonTimer += 1;
  if (seasonTimer >= seasonDuration) {
    seasonTimer = 0;
    currentSeason = (currentSeason + 1) % 4;
    document.getElementById(
      "narrative"
    ).textContent = `La saison change : ${seasonNames[currentSeason]}.`;
  }

  updateDisplay();
  updateSeasonDisplay();
}

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
    waterTimer,
    chiefTimer,
    explorationTimer,
    explorationActive,
    discoveredFibers,
    discoveredMetals,
    discoveredHerbs,
    currentAge,
    purchasedHints,
    sawmills,
    stoneQuarries,
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
    purchasedHints,
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
    fibers = saveData.fibers;
    maxFibers = saveData.maxFibers || 200;
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
    waterTimer = saveData.waterTimer || 0;
    chiefTimer = saveData.chiefTimer || 0;
    explorationTimer = saveData.explorationTimer || 0;
    explorationActive = saveData.explorationActive || false;
    discoveredFibers = saveData.discoveredFibers || false;
    discoveredMetals = saveData.discoveredMetals || false;
    discoveredHerbs = saveData.discoveredHerbs || false;
    techUnlocked = saveData.techUnlocked || false;
    unlockedAges = saveData.unlockedAges || ["Âge de Pierre"];
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
    unlockedAges = saveData.unlockedAges || ["Âge de Pierre"];
    bakeries = saveData.bakeries || 0;
    purchasedHints = saveData.purchasedHints || [];
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
    applyCraftOrder();

    // Réinitialiser currentHint si tous les indices sont achetés
    const allHintsPurchased = dynamicHints.every((hint) =>
      purchasedHints.includes(hint.id)
    );
    if (allHintsPurchased) {
      currentHint = null;
    } else {
      currentHint =
        dynamicHints.find(
          (hint) => hint.condition() && !purchasedHints.includes(hint.id)
        ) || null;
    }

    // Ajoute cette condition pour mettre à jour le tooltip des cueilleurs
    if (discoveredFibers) {
      document.querySelector("#pickerSection .tooltip").textContent =
        "Un cueilleur ramasse des baies et des fibres pour toi.";
    } else {
      document.querySelector("#pickerSection .tooltip").textContent =
        "Un cueilleur ramasse des baies pour toi.";
    }

    const purchasedHintsList =
      document.getElementById("purchasedHintsList");
    purchasedHintsList.innerHTML = "";
    purchasedHints.forEach((hintId) => {
      const hint = dynamicHints.find((h) => h.id === hintId);
      if (hint)
        purchasedHintsList.innerHTML += `<li>${hint.message}</li>`;
    });

    document.getElementById("chiefSection").style.display =
      axes >= 25 && villagers >= 25 ? "block" : "none";
    document.getElementById("tinkerSection").style.display =
      villageFounded ? "block" : "none";
    document.getElementById("pickerSection").style.display =
      villagers >= 10 ? "block" : "none";
    document.getElementById("hunterSection").style.display =
      villagers >= 20 ? "block" : "none";
    document.getElementById("researcherSection").style.display =
      researchers > 0 ? "block" : "none";
    document.getElementById("explorerSection").style.display =
      villageFounded ? "block" : "none";
    document.getElementById("minerSection").style.display =
      mines > 0 ? "block" : "none";
    document.getElementById("farmerSection").style.display =
      wheatFields > 0 ? "block" : "none";
    document.getElementById("villageSection").style.display =
      chief >= 1 ? "block" : "none";
    document.getElementById("wellSection").style.display =
      tinkers >= 1 ? "block" : "none";
    document.getElementById("pickaxeSection").style.display =
      tinkers >= 1 ? "block" : "none";
    document.getElementById("bowSection").style.display =
      tinkers >= 1 ? "block" : "none";
    document.getElementById("coatSection").style.display =
      tinkers >= 1 && discoveredFibers ? "block" : "none";
    document.getElementById("metalAxeSection").style.display =
      tinkers >= 1 && discoveredMetals ? "block" : "none";
    document.getElementById("remedySection").style.display =
      tinkers >= 1 && discoveredHerbs ? "block" : "none";
    document.getElementById("mineSection").style.display =
      discoveredMetals ? "block" : "none";
    document.getElementById("workshopSection").style.display =
      discoveredFibers ? "block" : "none";
    document.getElementById("herbalistSection").style.display =
      discoveredHerbs ? "block" : "none";
    document.getElementById("wheatFieldSection").style.display =
      discoveredHerbs ? "block" : "none";
    document.getElementById("millSection").style.display =
      wheatFields > 0 ? "block" : "none";
    document.getElementById("breadSection").style.display =
      currentAge === "Âge de l’Agriculture" ? "inline-block" : "none";
    document.getElementById("bakerySection").style.display =
      currentAge === "Âge de l’Agriculture" ? "block" : "none";
    document.getElementById("mills").textContent = mills;
    document.getElementById("bakeries").textContent = bakeries;
    console.log("Mise à jour affichage boulangeries =", bakeries);
    document.getElementById("sawmills").textContent = sawmills;
    document.getElementById("stoneQuarries").textContent = stoneQuarries;
    const agesList = document.getElementById("agesList");
    agesList.innerHTML = "";
    unlockedAges.forEach(age => {
      const isCurrent = age === currentAge;
      const ageItem = document.createElement("div");
      ageItem.className = "tech";
      ageItem.innerHTML = `
        <p>
            <span class="icon">${isCurrent ? "⭐" : "✅"}</span>
            ${age}${isCurrent ? " (en cours)" : ""}
        </p>
        <span class="tooltip">${getAgeTooltip(age)}</span>
    `;
      agesList.appendChild(ageItem);
    });
    document.getElementById("relicSection").style.display = villageFounded
      ? "block"
      : "none";
    if (saveData.warehouses > 0) {
      maxWoodStorage = saveData.warehouses * 50000;
      maxStoneStorage = saveData.warehouses * 50000;
    }
    updateDisplay();
    updateSeasonDisplay();
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
    waterTimer,
    chiefTimer,
    explorationTimer,
    explorationActive,
    discoveredFibers,
    discoveredMetals,
    discoveredHerbs,
    currentAge,
    purchasedHints,
    stoneQuarries,
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
    purchasedHints,
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
    fibers = saveData.fibers;
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
    waterTimer = saveData.waterTimer || 0;
    chiefTimer = saveData.chiefTimer || 0;
    explorationTimer = saveData.explorationTimer || 0;
    explorationActive = saveData.explorationActive || false;
    discoveredFibers = saveData.discoveredFibers || false;
    discoveredMetals = saveData.discoveredMetals || false;
    discoveredHerbs = saveData.discoveredHerbs || false;
    techUnlocked = saveData.techUnlocked || false;
    unlockedAges = saveData.unlockedAges || ["Âge de Pierre"];
    currentAge = saveData.currentAge || "Âge de Pierre";
    purchasedHints = saveData.purchasedHints || [];
    warehouses = saveData.warehouses || 0;
    maxWoodStorage = saveData.maxWoodStorage || 1000; // 1000 par défaut
    maxStoneStorage = saveData.maxStoneStorage || 1000; // 1000 par défaut
    maxWaterStorage = saveData.maxWaterStorage || 0;
    maxMetalsStorage = saveData.maxMetalsStorage || 0;
    maxHerbsStorage = saveData.maxHerbsStorage || 0;
    maxWheatStorage = saveData.maxWheatStorage || 0;
    maxFlourStorage = saveData.maxFlourStorage || 0;
    bakeries = saveData.bakeries || 0;
    unlockedAges = saveData.unlockedAges || ["Âge de Pierre"];
    purchasedHints = saveData.purchasedHints || [];
    fabricationOrder = saveData.fabricationOrder || [
      "axeSection",
      "bucketSection",
      "pickaxeSection",
      "bowSection",
      "coatSection",
      "metalAxeSection",
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
    applyCraftOrder();

    const purchasedHintsList =
      document.getElementById("purchasedHintsList");
    purchasedHintsList.innerHTML = "";
    purchasedHints.forEach((hintId) => {
      const hint = dynamicHints.find((h) => h.id === hintId);
      if (hint)
        purchasedHintsList.innerHTML += `<li>${hint.message}</li>`;
    });

    // Ajoute cette condition pour mettre à jour le tooltip des cueilleurs
    if (discoveredFibers) {
      document.querySelector("#pickerSection .tooltip").textContent =
        "Un cueilleur ramasse des baies et des fibres pour toi.";
    } else {
      document.querySelector("#pickerSection .tooltip").textContent =
        "Un cueilleur ramasse des baies pour toi.";
    }

    document.getElementById("chiefSection").style.display =
      axes >= 25 && villagers >= 25 ? "block" : "none";
    document.getElementById("tinkerSection").style.display =
      villageFounded ? "block" : "none";
    document.getElementById("pickerSection").style.display =
      villagers >= 10 ? "block" : "none";
    document.getElementById("hunterSection").style.display =
      villagers >= 20 ? "block" : "none";
    document.getElementById("researcherSection").style.display =
      researchers > 0 ? "block" : "none";
    document.getElementById("explorerSection").style.display =
      villageFounded ? "block" : "none";
    document.getElementById("minerSection").style.display =
      mines > 0 ? "block" : "none";
    document.getElementById("farmerSection").style.display =
      wheatFields > 0 ? "block" : "none";
    document.getElementById("villageSection").style.display =
      chief >= 1 ? "block" : "none";
    document.getElementById("wellSection").style.display =
      tinkers >= 1 ? "block" : "none";
    document.getElementById("pickaxeSection").style.display =
      tinkers >= 1 ? "block" : "none";
    document.getElementById("bowSection").style.display =
      tinkers >= 1 ? "block" : "none";
    document.getElementById("coatSection").style.display =
      tinkers >= 1 && discoveredFibers ? "block" : "none";
    document.getElementById("metalAxeSection").style.display =
      tinkers >= 1 && discoveredMetals ? "block" : "none";
    document.getElementById("remedySection").style.display =
      tinkers >= 1 && discoveredHerbs ? "block" : "none";
    document.getElementById("mineSection").style.display =
      discoveredMetals ? "block" : "none";
    document.getElementById("workshopSection").style.display =
      discoveredFibers ? "block" : "none";
    document.getElementById("herbalistSection").style.display =
      discoveredHerbs ? "block" : "none";
    document.getElementById("wheatFieldSection").style.display =
      discoveredHerbs ? "block" : "none";
    document.getElementById("millSection").style.display =
      wheatFields > 0 ? "block" : "none";
    document.getElementById("breadSection").style.display =
      currentAge === "Âge de l’Agriculture" ? "block" : "none";
    document.getElementById("relicSection").style.display = villageFounded
      ? "block"
      : "none";
    if (saveData.warehouses > 0) {
      maxWoodStorage = saveData.warehouses * 50000;
      maxStoneStorage = saveData.warehouses * 50000;
    }
    updateDisplay();
    updateSeasonDisplay();
    alert("Sauvegarde importée !");
  }
}

// Variables pour stocker l’ordre des sections
let fabricationOrder = [
  "axeSection",
  "bucketSection",
  "pickaxeSection",
  "bowSection",
  "coatSection",
  "metalAxeSection",
  "remedySection",
  "breadSection",
];
let buildingsOrder = [
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

// Appeler au démarrage initial
applyCraftOrder();
enableDragAndDrop();

// Surcharger updateDisplay pour réappliquer le drag-and-drop après chaque mise à jour
const originalUpdateDisplay = updateDisplay;
updateDisplay = function () {
  originalUpdateDisplay();
  applyCraftOrder();
  enableDragAndDrop();
};

export function initGame() {
  // Initialisation du jeu (peut être vide pour l’instant ou charger une sauvegarde si tu veux)
  console.log("Jeu initialisé");
}

export function setBerries(value) { berries = value; }
export function setWood(value) { wood = value; }
export function setStone(value) { stone = value; }
export function setWater(value) { water = value; }
export function setMeat(value) { meat = value; }
export function setFibers(value) { fibers = value; }
export function setMetals(value) { metals = value; }
export function setHerbs(value) { herbs = value; }
export function setWheat(value) { wheat = value; }
export function setFlour(value) { flour = value; }
export function setBread(value) { bread = value; }
export function setMaxWater(value) { maxWater = value; }
export function setMaxFibers(value) { maxFibers = value; }
export function setMaxMetals(value) { maxMetals = value; }
export function setMaxHerbs(value) { maxHerbs = value; }
export function setMaxWheat(value) { maxWheat = value; }
export function setMaxFlour(value) { maxFlour = value; }
export function setMaxBread(value) { maxBread = value; }
export function setAxes(value) { axes = value; }
export function setBuckets(value) { buckets = value; }
export function setWells(value) { wells = value; }
export function setPickaxes(value) { pickaxes = value; }
export function setBows(value) { bows = value; }
export function setCoats(value) { coats = value; }
export function setMetalAxes(value) { metalAxes = value; }
export function setRemedies(value) { remedies = value; }
export function setMines(value) { mines = value; }
export function setWorkshops(value) { workshops = value; }
export function setSawmills(value) { sawmills = value; }
export function setStoneQuarries(value) { stoneQuarries = value; }
export function setHerbalists(value) { herbalists = value; }
export function setWheatFields(value) { wheatFields = value; }
export function setMills(value) { mills = value; }
export function setVillagers(value) { villagers = value; }
export function setChief(value) { chief = value; }
export function setTinkers(value) { tinkers = value; }
export function setResearchers(value) { researchers = value; }
export function setPickers(value) { pickers = value; }
export function setHunters(value) { hunters = value; }
export function setExplorers(value) { explorers = value; }
export function setMiners(value) { miners = value; }
export function setFarmers(value) { farmers = value; }
export function setVillages(value) { villages = value; }
export function setVillageFounded(value) { villageFounded = value; }
export function setTechUnlocked(value) { techUnlocked = value; }
export function setEternityShards(value) { eternityShards = value; }
export function setCurrentSeason(value) { currentSeason = value; }
export function setSeasonTimer(value) { seasonTimer = value; }
export function setDeathTimer(value) { deathTimer = value; }
export function setExplorationTimer(value) { explorationTimer = value; }
export function setExplorationActive(value) { explorationActive = value; }
export function setDiscoveredFibers(value) { discoveredFibers = value; }
export function setDiscoveredMetals(value) { discoveredMetals = value; }
export function setDiscoveredHerbs(value) { discoveredHerbs = value; }
export function setCurrentAge(value) { currentAge = value; }
export function setPurchasedHints(value) { purchasedHints = value; }
export function setWarehouses(value) { warehouses = value; }
export function setMaxWoodStorage(value) { maxWoodStorage = value; }
export function setMaxStoneStorage(value) { maxStoneStorage = value; }
export function setMaxWaterStorage(value) { maxWaterStorage = value; }
export function setMaxMetalsStorage(value) { maxMetalsStorage = value; }
export function setMaxHerbsStorage(value) { maxHerbsStorage = value; }
export function setMaxWheatStorage(value) { maxWheatStorage = value; }
export function setMaxFlourStorage(value) { maxFlourStorage = value; }
export function setBakeries(value) { bakeries = value; }
export function setUnlockedAges(value) { unlockedAges = value; }
export function setCurrentHint(value) { currentHint = value; }