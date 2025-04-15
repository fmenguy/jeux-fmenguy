// Structure pour représenter un village
export let villagesData = []; // Tableau de villages, chaque village contient sa population et ses bâtiments

// Fonctions pour gérer villagesData
export function addVillage() {
  villagesData.push({
    population: {
      villagers: 0,
      chief: 0,
      pickers: 0,
      hunters: 0,
      miners: 0,
      farmers: 0,
      tinkers: 0,
      researchers: 0,
      explorers: 0,
    },
    buildings: [], // Liste des bâtiments (par exemple, ["mine", "workshop"])
  });
}

export function setVillagesData(value) { villagesData = value; }

export function getTotalPopulation() {
  return villagers + chief + pickers + hunters + miners + farmers + tinkers + researchers + explorers;
}

// Ajout des imports/setters pour les nouvelles variables
export let maxPopulationPerVillage = 250;
export let maxBuildingsPerVillage = 2;

export function setMaxPopulationPerVillage(value) { maxPopulationPerVillage = value; }
export function setMaxBuildingsPerVillage(value) { maxBuildingsPerVillage = value; }

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
  {
    condition: () => chief === 0 && axes < 25,
    message: "Fabrique au moins 25 haches !",
    cost: { wood: 50 },
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
    message: "Tu es prêt pour un chef ! Nomme-le avec 25 haches et 25 villageois.",
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
    condition: () => discoveredFibers && fibers >= 150 && workshops === 0,
    message: "Construis un atelier pour augmenter la limite des fibres !",
    cost: { fibers: 100 },
    id: "workshopFiberLimit",
  },
  {
    condition: () => eternityShards >= 5 && villageFounded, // Ajout de villageFounded comme condition
    message: "Affiche l'effet des dons débloqués.",
    cost: { eternityShards: 5 },
    id: "shardEffectsReveal",
  },
  {
    condition: () => currentAge === "Âge de l’Agriculture" && bakeries === 0,
    message: "Construis une boulangerie pour produire du pain automatiquement !",
    cost: { flour: 5 },
    id: "bakeryHint",
  },
  {
    condition: () => tinkers >= 1 || discoveredMetals || discoveredFibers || discoveredHerbs,
    message: "Tu peux réorganiser les sections Fabrication et Bâtiments par glisser-déposer !",
    cost: {},
    id: "reorganizeHint",
  },
];
export let purchasedHints = [];
export let currentHint = null;

export function updateAge(newAge) {
  if (newAge !== currentAge && !unlockedAges.includes(newAge)) {
    currentAge = newAge;
    unlockedAges.push(newAge);
    document.getElementById("narrative").textContent = `Tu entres dans l’${newAge} !`;
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
    case "Âge des Cités": // Ajoutez ceci
      return "Les villages se transforment en cités, marquant une ère de prospérité et d’organisation.";
    default:
      return "";
  }
}

export function gatherBerries() {
  let harvestBonus = eternityShards >= 1 ? shardEffects[0].harvestBonus : 1;
  setBerries(berries + 1 * seasonModifiers[currentSeason].berries * harvestBonus);
  if (berries >= 5 && villagers === 0) {
    document.getElementById("narrative").textContent = "Tu as assez de baies ! Attire un villageois maintenant.";
  }
}

export function gatherWood() {
  let harvestBonus = eternityShards >= 1 ? shardEffects[0].harvestBonus : 1;
  setWood(wood + (metalAxes > 0 ? 3 : axes > 0 ? 2 : 1) * seasonModifiers[currentSeason].wood * harvestBonus);
}

export function gatherStone() {
  let harvestBonus = eternityShards >= 1 ? shardEffects[0].harvestBonus : 1;
  setStone(stone + (pickaxes > 0 ? 2 : 1) * seasonModifiers[currentSeason].stone * harvestBonus * (discoveredMetals ? 1.1 : 1));
}

export function gatherWater() {
  let harvestBonus = eternityShards >= 1 ? shardEffects[0].harvestBonus : 1;
  setWater(Math.min(water + (buckets > 0 ? 2 : 1) * seasonModifiers[currentSeason].water * harvestBonus, maxWater));

}

export function gatherMeat() {
  let harvestBonus = eternityShards >= 1 ? shardEffects[0].harvestBonus : 1;
  setMeat(meat + (bows > 0 ? 2 : 1) * seasonModifiers[currentSeason].meat * harvestBonus);

}

export function gatherFibers() {
  let harvestBonus = eternityShards >= 1 ? shardEffects[0].harvestBonus : 1;
  setFibers(Math.min(fibers + 1 * seasonModifiers[currentSeason].fibers * harvestBonus, maxFibers));

}

export function gatherMetals() {
  let harvestBonus = eternityShards >= 1 ? shardEffects[0].harvestBonus : 1;
  setMetals(Math.min(
    metals + (pickaxes > 0 ? 3 : mines > 0 ? 2 : 1) * seasonModifiers[currentSeason].metals * harvestBonus * (discoveredMetals ? 1.1 : 1),
    maxMetals
  ));

}

export function craftAxe() {
  if (wood >= 5 && stone >= 2) {
    setWood(wood - 5);
    setStone(stone - 2);
    setAxes(axes + 1);
    if (axes >= 25 && villagers >= 25) {
      document.getElementById("chiefSection").style.display = "block";
    }
    document.getElementById("narrative").textContent = "Tu as une hache ! Elle coupe le bois plus vite.";
    // Supprimez : enhancedUpdateDisplay();
  } else {
    // Supprimez : showAlert("Il te faut 5 bois et 2 pierres pour faire une hache !");
    return { error: "Il te faut 5 bois et 2 pierres pour faire une hache !" };
  }
}

export function craftBucket() {
  if (wood >= 5 && stone >= 2) {
    setWood(wood - 5);
    setStone(stone - 2);
    setBuckets(buckets + 1);
    document.getElementById("narrative").textContent = "Tu as un seau ! Il récolte plus d’eau.";
    // Supprimez : enhancedUpdateDisplay();
  } else {
    // Supprimez : showAlert("Il te faut 5 bois et 2 pierres pour un seau !");
    return { error: "Il te faut 5 bois et 2 pierres pour un seau !" };
  }
}

export function craftWell() {
  if (wood >= 10 && stone >= 5) {
    setWood(wood - 10);
    setStone(stone - 5);
    setWells(wells + 1);
    setMaxWater(maxWater + 1000);
    document.getElementById("narrative").textContent = "Un puits est construit ! Il stocke plus d’eau.";
    // Supprimez : enhancedUpdateDisplay();
  } else {
    // Supprimez : showAlert("Il te faut 10 bois et 5 pierres pour un puits !");
    return { error: "Il te faut 10 bois et 5 pierres pour un puits !" };
  }
}

export function craftPickaxe() {
  if (wood >= 10 && stone >= 5) {
    setWood(wood - 10);
    setStone(stone - 5);
    setPickaxes(pickaxes + 1);
    document.getElementById("narrative").textContent = "Tu as une pioche ! Elle récolte plus de pierre.";
    // Supprimez : enhancedUpdateDisplay();
  } else {
    // Supprimez : showAlert("Il te faut 10 bois et 5 pierres pour faire une pioche !");
    return { error: "Il te faut 10 bois et 5 pierres pour faire une pioche !" };
  }
}

export function craftBow() {
  if (wood >= 10 && stone >= 5) {
    setWood(wood - 10);
    setStone(stone - 5);
    setBows(bows + 1);
    document.getElementById("narrative").textContent = "Tu as un arc ! Il récolte plus de viande.";
    // Supprimez : enhancedUpdateDisplay();
  } else {
    // Supprimez : showAlert("Il te faut 10 bois et 5 pierres pour faire un arc !");
    return { error: "Il te faut 10 bois et 5 pierres pour faire un arc !" };
  }
}

export function craftCoat() {
  const fiberCost = workshops > 0 ? 8 : 10;
  const woodCost = workshops > 0 ? 4 : 5;
  if (fibers >= fiberCost && wood >= woodCost && coats < villagers && discoveredFibers) {
    setFibers(fibers - fiberCost);
    setWood(wood - woodCost);
    setCoats(coats + 1);
    document.getElementById("narrative").textContent = "Un manteau est prêt pour l’Hiver !";
    // Supprimez : enhancedUpdateDisplay();
  } else {
    // Supprimez : showAlert(`Il te faut ${fiberCost} fibres, ${woodCost} bois et moins de manteaux que de villageois !`);
    return { error: `Il te faut ${fiberCost} fibres, ${woodCost} bois et moins de manteaux que de villageois !` };
  }
}

export function craftMetalAxe() {
  if (metals >= 5 && wood >= 5 && discoveredMetals) {
    setMetals(metals - 5);
    setWood(wood - 5);
    setMetalAxes(metalAxes + 1);
    document.getElementById("narrative").textContent = "Une hache en métal, plus tranchante !";
    // Supprimez : enhancedUpdateDisplay();
  } else {
    // Supprimez : showAlert("Il te faut 5 métaux, 5 bois et les métaux découverts !");
    return { error: "Il te faut 5 métaux, 5 bois et les métaux découverts !" };
  }
}

export function craftRemedy() {
  const herbCost = herbalists > 0 ? 4 : 5;
  const waterCost = herbalists > 0 ? 4 : 5;
  if (herbs >= herbCost && water >= waterCost && remedies < villagers && discoveredHerbs) {
    setHerbs(herbs - herbCost);
    setWater(water - waterCost);
    setRemedies(remedies + 1);
    document.getElementById("narrative").textContent = "Un remède pour protéger ton peuple !";
    // Supprimez : enhancedUpdateDisplay();
  } else {
    // Supprimez : showAlert(`Il te faut ${herbCost} herbes, ${waterCost} eau et moins de remèdes que de villageois !`);
    return { error: `Il te faut ${herbCost} herbes, ${waterCost} eau et moins de remèdes que de villageois !` };
  }
}

export function craftMine() {
  const canAddBuilding = villagesData.some(village => village.buildings.length < maxBuildingsPerVillage);
  const minersRequired = mines > 0 ? 25 : 0; // 25 mineurs requis uniquement pour les mines supplémentaires
  if (wood >= 50 && stone >= 20 && tinkers >= 1 && miners >= minersRequired && discoveredMetals && canAddBuilding) {
    setWood(wood - 50);
    setStone(stone - 20);
    setMines(mines + 1);
    document.getElementById("narrative").textContent = "Une mine est construite ! Tu peux maintenant extraire des métaux.";

    const villageIndex = villagesData.findIndex(village => village.buildings.length < maxBuildingsPerVillage);
    if (villageIndex !== -1) {
      villagesData[villageIndex].buildings.push("mine");
    }
  } else {
    let reasons = [];
    if (wood < 50) reasons.push("pas assez de bois (" + wood + "/50)");
    if (stone < 20) reasons.push("pas assez de pierre (" + stone + "/20)");
    if (tinkers < 1) reasons.push("pas assez de bricoleurs (" + tinkers + "/1)");
    if (miners < minersRequired) reasons.push("pas assez de mineurs (" + miners + "/" + minersRequired + ")");
    if (!discoveredMetals) reasons.push("métaux non découverts");
    if (!canAddBuilding) reasons.push("limite de bâtiments atteinte dans tous les villages");
    return { error: "Il te faut 50 bois, 20 pierre, 1 bricoleur" + (minersRequired > 0 ? ", 25 mineurs" : "") + " et les métaux découverts ! " + reasons.join(", ") };
  }
}

export function craftWorkshop() {
  if (wood >= 20 && stone >= 10 && fibers >= 5 && discoveredFibers) {
    setWood(wood - 20);
    setStone(stone - 10);
    setFibers(fibers - 5);
    setWorkshops(workshops + 1);
    setMaxFibers(maxFibers + 1000);
    document.getElementById("narrative").textContent = "Un atelier est construit ! La limite de fibres augmente à " + maxFibers + ".";
    // Supprimez : enhancedUpdateDisplay();
  } else {
    // Supprimez : showAlert("Il te faut 20 bois, 10 pierre, 5 fibres et les fibres découvertes !");
    return { error: "Il te faut 20 bois, 10 pierre, 5 fibres et les fibres découvertes !" };
  }
}

export function craftHerbalist() {
  if (wood >= 15 && stone >= 5 && herbs >= 5 && discoveredHerbs) {
    setWood(wood - 15);
    setStone(stone - 5);
    setHerbs(herbs - 5);
    setHerbalists(herbalists + 1);
    setMaxHerbs(200);
    document.getElementById("wheatFieldSection").style.display = "block";
    document.getElementById("narrative").textContent = "Une herboristerie est construite ! Les remèdes s’améliorent.";
    // Supprimez : enhancedUpdateDisplay();
  } else {
    // Supprimez : showAlert("Il te faut 15 bois, 5 pierre, 5 herbes et les herbes découvertes !");
    return { error: "Il te faut 15 bois, 5 pierre, 5 herbes et les herbes découvertes !" };
  }
}

export function craftWheatField() {
  if (wood >= 20 && stone >= 10 && herbs >= 5 && discoveredHerbs) {
    setWood(wood - 20);
    setStone(stone - 10);
    setHerbs(herbs - 5);
    setWheatFields(wheatFields + 1);
    document.getElementById("narrative").textContent = "Un champ de blé est construit ! Cultive du blé.";
    updateAge("Âge de l’Agriculture");
    // Supprimez : enhancedUpdateDisplay();
  } else {
    // Supprimez : showAlert("Il te faut 20 bois, 10 pierre, 5 herbes et avoir découvert les herbes !");
    return { error: "Il te faut 20 bois, 10 pierre, 5 herbes et avoir découvert les herbes !" };
  }
}

export function craftMill() {
  if (wood >= 50 && stone >= 20 && metals >= 5 && wheatFields > 0) {
    setWood(wood - 50);
    setStone(stone - 20);
    setMetals(metals - 5);
    setMills(mills + 1);
    setCurrentAge("Âge de l’Agriculture");
    document.getElementById("wheatSection").style.display = "inline-block";
    document.getElementById("flourSection").style.display = "inline-block";
    document.getElementById("breadSection").style.display = "block";
    document.getElementById("narrative").textContent = "Un moulin est construit ! L’Âge de l’Agriculture commence.";
    // Supprimez : enhancedUpdateDisplay();
  } else {
    // Supprimez : showAlert("Il te faut 50 bois, 20 pierre, 5 métaux et des champs de blé !");
    return { error: "Il te faut 50 bois, 20 pierre, 5 métaux et des champs de blé !" };
  }
}

export function craftBakery() {
  if (wood >= 50 && stone >= 20 && flour >= 5 && currentAge === "Âge de l’Agriculture") {
    setWood(wood - 50);
    setStone(stone - 20);
    setFlour(flour - 5);
    setBakeries(bakeries + 1);
    document.getElementById("narrative").textContent = "Une boulangerie est construite ! Elle produit du pain automatiquement.";
    // Supprimez : enhancedUpdateDisplay();
  } else {
    let reasons = [];
    if (wood < 50) reasons.push("pas assez de bois (" + wood + "/50)");
    if (stone < 20) reasons.push("pas assez de pierre (" + stone + "/20)");
    if (flour < 5) reasons.push("pas assez de farine (" + flour + "/5)");
    if (currentAge !== "Âge de l’Agriculture") reasons.push("mauvais âge (" + currentAge + ")");
    // Supprimez : showAlert("Il te faut 50 bois, 20 pierre, 5 farine et être dans l’Âge de l’Agriculture ! " + reasons.join(", "));
    return { error: "Il te faut 50 bois, 20 pierre, 5 farine et être dans l’Âge de l’Agriculture ! " + reasons.join(", ") };
  }
}

export function craftSawmill() {
  if (wood >= 50 && stone >= 20 && metals >= 5 && (discoveredMetals || currentAge === "Âge de l’Agriculture")) {
    setWood(wood - 50);
    setStone(stone - 20);
    setMetals(metals - 5);
    setSawmills(sawmills + 1);
    document.getElementById("narrative").textContent = "Une scierie est construite ! Elle produit 0.5 bois par seconde.";
    // Supprimez : enhancedUpdateDisplay();
  } else {
    // Supprimez : showAlert("Il te faut 50 bois, 20 pierre, 5 métaux et avoir découvert les métaux ou être dans l’Âge de l’Agriculture !");
    return { error: "Il te faut 50 bois, 20 pierre, 5 métaux et avoir découvert les métaux ou être dans l’Âge de l’Agriculture !" };
  }
}

export function craftStoneQuarry() {
  if (wood >= 50 && stone >= 20 && metals >= 5 && (discoveredMetals || currentAge === "Âge de l’Agriculture")) {
    setWood(wood - 50);
    setStone(stone - 20);
    setMetals(metals - 5);
    setStoneQuarries(stoneQuarries + 1);
    document.getElementById("narrative").textContent = "Une carrière de pierre est construite ! Elle produit 0.5 pierre par seconde.";
    // Supprimez : enhancedUpdateDisplay();
  } else {
    // Supprimez : showAlert("Il te faut 50 bois, 20 pierre, 5 métaux et être dans l’Âge des Métaux ou l’Âge de l’Agriculture !");
    return { error: "Il te faut 50 bois, 20 pierre, 5 métaux et être dans l’Âge des Métaux ou l’Âge de l’Agriculture !" };
  }
}

export function craftWarehouse() {
  if (wood >= 50 && stone >= 20 && metals >= 5 && (discoveredMetals || currentAge === "Âge de l’Agriculture")) {
    setWood(wood - 100);
    setStone(stone - 50);
    setMetals(metals - 10);
    setWarehouses(warehouses + 1);
    if (warehouses === 1) {
      setMaxWoodStorage(50000);
      setMaxStoneStorage(50000);
      setMaxWaterStorage(50000);
      setMaxMetalsStorage(50000);
      setMaxHerbsStorage(50000);
      setMaxWheatStorage(50000);
      setMaxFlourStorage(50000);
    } else {
      setMaxWoodStorage(maxWoodStorage + 50000);
      setMaxStoneStorage(maxStoneStorage + 50000);
      setMaxWaterStorage(maxWaterStorage + 50000);
      setMaxMetalsStorage(maxMetalsStorage + 50000);
      setMaxHerbsStorage(maxHerbsStorage + 50000);
      setMaxWheatStorage(maxWheatStorage + 50000);
      setMaxFlourStorage(maxFlourStorage + 50000);
    }
    document.getElementById("narrative").textContent = `Un entrepôt est construit ! Capacité de stockage ${warehouses === 1 ? "fixée à" : "augmentée de"} 50 000 pour bois, pierre, eau, métaux, herbes, blé et farine.`;
    // Supprimez : enhancedUpdateDisplay();
  } else {
    // Supprimez : showAlert("Il te faut 100 bois, 50 pierre, 10 métaux et être dans l’Âge des Métaux ou l’Âge de l’Agriculture !");
    return { error: "Il te faut 100 bois, 50 pierre, 10 métaux et être dans l’Âge des Métaux ou l’Âge de l’Agriculture !" };
  }
}

export function recruitVillager() {
  if (berries >= 5) {
    setBerries(berries - 5);
    setVillagers(villagers + 1);
    if (villagers === 1) {
      document.getElementById("narrative").textContent = "Un villageois arrive ! Il va t’aider.";
    }
    if (villagers >= 10) {
      document.getElementById("pickerSection").style.display = "block";
    }
    if (villagers >= 20) {
      document.getElementById("hunterSection").style.display = "block";
    }
    if (villagers >= 25 && axes >= 25) {
      document.getElementById("chiefSection").style.display = "block";
    }
    // Supprimez : enhancedUpdateDisplay();
  } else {
    // Supprimez : showAlert("Il te faut 5 baies pour attirer un villageois !");
    return { error: "Il te faut 5 baies pour attirer un villageois !" };
  }
}

export function appointChief() {
  const maxChiefs = Math.floor(villagers / 25);
  if (axes >= 25 && villagers >= 25 && chief < maxChiefs) {
    setChief(chief + 1);
    document.getElementById("villageSection").style.display = "block";
    document.getElementById("narrative").textContent = "Tu as un nouveau chef ! Il guide une partie de ton peuple.";
    // Supprimez : enhancedUpdateDisplay();
  } else {
    let reasons = [];
    if (axes < 25) reasons.push("pas assez de haches (" + axes + "/25)");
    if (villagers < 25) reasons.push("pas assez de villageois (" + villagers + "/25)");
    if (chief >= maxChiefs) reasons.push("trop de chefs pour le nombre de villageois (" + chief + "/" + maxChiefs + ")");
    // Supprimez : showAlert("Impossible de nommer un chef : " + reasons.join(", ") + " !");
    return { error: "Impossible de nommer un chef : " + reasons.join(", ") + " !" };
  }
}

export function recruitTinker() {
  if (wood >= 100 && stone >= 100 && villageFounded) {
    setWood(wood - 100);
    setStone(stone - 100);
    setTinkers(tinkers + 1);
    document.getElementById("wellSection").style.display = "block";
    document.getElementById("pickaxeSection").style.display = "block";
    document.getElementById("bowSection").style.display = "block";
    document.getElementById("coatSection").style.display = "block";
    document.getElementById("metalAxeSection").style.display = "block";
    document.getElementById("remedySection").style.display = "block";
    setTechUnlocked(true);
    document.getElementById("narrative").textContent = "Un bricoleur arrive ! L’Automne s’installe.";
    setCurrentSeason(2);
    // Supprimez : enhancedUpdateDisplay();
    // Supprimez : updateSeasonDisplay();
  } else {
    // Supprimez : showAlert("Il te faut 100 bois, 100 pierres et un village pour un bricoleur !");
    return { error: "Il te faut 100 bois, 100 pierres et un village pour un bricoleur !" };
  }
}

export function recruitResearcher() {
  if (tinkers >= 10) {
    setTinkers(tinkers - 10);
    setResearchers(researchers + 1);
    document.getElementById("researcherSection").style.display = "block";
    document.getElementById("narrative").textContent = "Un chercheur rejoint ton village ! De nouvelles technologies arrivent.";
    // Supprimez : enhancedUpdateDisplay();
  } else {
    // Supprimez : showAlert("Il te faut 10 bricoleurs pour recruter un chercheur !");
    return { error: "Il te faut 10 bricoleurs pour recruter un chercheur !" };
  }
}

export function recruitPicker() {
  if (berries >= 10 && wood >= 5) {
    setBerries(berries - 10);
    setWood(wood - 5);
    setPickers(pickers + 1);
    document.getElementById("narrative").textContent = "Un cueilleur arrive ! Il ramasse des baies pour toi.";
    // Supprimez : enhancedUpdateDisplay();
  } else {
    // Supprimez : showAlert("Il te faut 10 baies et 5 bois pour un cueilleur !");
    return { error: "Il te faut 10 baies et 5 bois pour un cueilleur !" };
  }
}

export function recruitHunter() {
  if (wood >= 10 && meat >= 5) {
    setWood(wood - 10);
    setMeat(meat - 5);
    setHunters(hunters + 1);
    document.getElementById("narrative").textContent = "Un chasseur arrive ! Il trouve de la viande.";
    // Supprimez : enhancedUpdateDisplay();
  } else {
    // Supprimez : showAlert("Il te faut 10 bois et 5 viande pour un chasseur !");
    return { error: "Il te faut 10 bois et 5 viande pour un chasseur !" };
  }
}

export function sendExplorers() {
  if (berries >= 50 && wood >= 20 && villagers >= 10 && !explorationActive && (!discoveredFibers || !discoveredMetals || !discoveredHerbs)) {
    setBerries(berries - 50);
    setWood(wood - 20);
    setVillagers(villagers - 10);
    setExplorers(explorers + 10);
    setExplorationActive(true);
    setExplorationTimer(30);

    document.getElementById("narrative").textContent = "Les explorateurs partent à la découverte...";
    // Supprimez : enhancedUpdateDisplay();
  } else {
    let reasons = [];
    if (berries < 50) reasons.push("pas assez de baies (" + berries + "/50)");
    if (wood < 20) reasons.push("pas assez de bois (" + wood + "/20)");
    if (villagers < 10) reasons.push("pas assez de villageois (" + villagers + "/10)");
    if (explorationActive) reasons.push("exploration déjà en cours");
    if (discoveredFibers && discoveredMetals && discoveredHerbs) reasons.push("toutes les ressources découvertes");
    // Supprimez : showAlert("Impossible d'envoyer des explorateurs : " + reasons.join(", ") + " !");
    return { error: "Impossible d'envoyer des explorateurs : " + reasons.join(", ") + " !" };
  }
}

export function recruitMiner() {
  if (wood >= 10 && metals >= 5 && mines > 0) {
    setWood(wood - 10);
    setMetals(metals - 5);
    setMiners(miners + 1);
    document.getElementById("narrative").textContent = "Un mineur arrive ! Il extrait des métaux.";
    // Supprimez : enhancedUpdateDisplay();
  } else {
    // Supprimez : showAlert("Il te faut 10 bois, 5 métaux et une mine !");
    return { error: "Il te faut 10 bois, 5 métaux et une mine !" };
  }
}

export function recruitFarmer() {
  if (berries >= 10 && wood >= 5 && wheatFields > 0) {
    setBerries(berries - 10);
    setWood(wood - 5);
    setFarmers(farmers + 1);
    document.getElementById("narrative").textContent = "Un fermier arrive ! Il cultive le blé.";
    // Supprimez : enhancedUpdateDisplay();
  } else {
    // Supprimez : showAlert("Il te faut 10 baies, 5 bois et des champs de blé !");
    return { error: "Il te faut 10 baies, 5 bois et des champs de blé !" };
  }
}

export function foundVillage() {
  const requiredVillagers = (villages + 1) * 50;
  const requiredChiefs = villages + 1;
  if (villages >= 10) {
    return { error: "Tu as atteint la limite de 10 villages !" };
  }
  if (villagers < requiredVillagers || chief < requiredChiefs) {
    return { error: `Il te faut ${requiredVillagers} villageois et ${requiredChiefs} chefs pour fonder le village ${villages + 1} !` };
  }

  setVillages(villages + 1);
  addVillage();

  const newVillageIndex = villagesData.length - 1;
  const villagersToMove = Math.min(50, villagers);
  const chiefToMove = Math.min(1, chief);
  assignBuildingsToVillages();
  villagesData[newVillageIndex].population.villagers = villagersToMove;
  villagesData[newVillageIndex].population.chief = chiefToMove;

  // Supprimez ces lignes pour ne pas consommer les villageois et chefs
  // setVillagers(villagers - villagersToMove);
  // setChief(chief - chiefToMove);

  const proportion = 0.5;
  const pickersToMove = Math.floor(pickers * proportion);
  const huntersToMove = Math.floor(hunters * proportion);
  const minersToMove = Math.floor(miners * proportion);
  const farmersToMove = Math.floor(farmers * proportion);
  const tinkersToMove = Math.floor(tinkers * proportion);
  const researchersToMove = Math.floor(researchers * proportion);
  const explorersToMove = Math.floor(explorers * proportion);

  villagesData[newVillageIndex].population.pickers = pickersToMove;
  villagesData[newVillageIndex].population.hunters = huntersToMove;
  villagesData[newVillageIndex].population.miners = minersToMove;
  villagesData[newVillageIndex].population.farmers = farmersToMove;
  villagesData[newVillageIndex].population.tinkers = tinkersToMove;
  villagesData[newVillageIndex].population.researchers = researchersToMove;
  villagesData[newVillageIndex].population.explorers = explorersToMove;

  // Supprimez ces lignes pour ne pas consommer les travailleurs
  // setPickers(pickers - pickersToMove);
  // setHunters(hunters - huntersToMove);
  // setMiners(miners - minersToMove);
  // setFarmers(farmers - farmersToMove);
  // setTinkers(tinkers - tinkersToMove);
  // setResearchers(researchers - researchersToMove);
  // setExplorers(explorers - explorersToMove);

  setVillageFounded(true);
  document.getElementById("tinkerSection").style.display = "block";
  document.getElementById("relicSection").style.display = "block";
  setCurrentSeason(1);

  const totalPopulation = getTotalPopulation();
  if (totalPopulation >= 500) {
    transformToCity();
  } else {
    document.getElementById("narrative").textContent = `Village ${villages} fondé ! Population totale : ${totalPopulation}/1000.`;
  }
}


export function assignBuildingsToVillages() {
  // Liste des bâtiments existants et leur nombre
  const buildingTypes = [
    { type: "well", count: wells },
    { type: "mine", count: mines },
    { type: "workshop", count: workshops },
    { type: "herbalist", count: herbalists },
    { type: "wheatField", count: wheatFields },
    { type: "mill", count: mills },
    { type: "bakery", count: bakeries },
    { type: "sawmill", count: sawmills },
    { type: "stoneQuarry", count: stoneQuarries },
    { type: "warehouse", count: warehouses },
  ];

  // Réinitialiser les bâtiments dans villagesData
  villagesData.forEach(village => {
    village.buildings = [];
  });

  // Répartir les bâtiments existants entre les villages
  let currentVillageIndex = 0;
  for (const building of buildingTypes) {
    for (let i = 0; i < building.count; i++) {
      if (currentVillageIndex >= villagesData.length) currentVillageIndex = 0; // Boucle sur les villages
      if (villagesData[currentVillageIndex].buildings.length < maxBuildingsPerVillage) {
        villagesData[currentVillageIndex].buildings.push(building.type);
      } else {
        currentVillageIndex++; // Passe au village suivant
        i--; // Recommence pour ce bâtiment
      }
    }
  }
}

export function seekShard() {
  if (wood >= 200 && stone >= 100 && water >= 50) {
    setWood(wood - 200);
    setStone(stone - 100);
    setWater(water - 50);
    setEternityShards(eternityShards + 1);
    let shardMessage = "Tu trouves un éclat spécial ! ";
    if (eternityShards <= shardEffects.length) {
      shardMessage += `Effet débloqué : ${shardEffects[eternityShards - 1].name}.`;
    }
    if (eternityShards === 1) {
      setCurrentSeason(3);
      shardMessage += " L’Hiver s’abat sur ton peuple.";
    }
    document.getElementById("narrative").textContent = shardMessage;
    document.getElementById("eternityShards").textContent = eternityShards;
    // Supprimez : enhancedUpdateDisplay();
  } else {
    // Supprimez : showAlert("Il te faut 200 bois, 100 pierres et 50 eau pour un éclat !");
    return { error: "Il te faut 200 bois, 100 pierres et 50 eau pour un éclat !" };
  }
}


export function gameLoop() {
  let result = {};

  let harvestBonus = eternityShards >= 1 ? shardEffects[0].harvestBonus : 1;
  harvestBonus *= currentAge === "Âge des Métaux" || currentAge === "Âge de l’Agriculture" ? 1.1 : 1;
  let waterConsumptionReduction = eternityShards >= 2 ? shardEffects[1].waterConsumptionReduction : 1;
  let foodConsumptionReduction = eternityShards >= 3 ? shardEffects[2].foodConsumptionReduction : 1;
  let seasonPenaltyReduction = eternityShards >= 4 ? shardEffects[3].seasonPenaltyReduction : 0;
  let noDeath = eternityShards >= 5 && shardEffects[4].noDeath;

  let adjustedSeasonModifiers = [...seasonModifiers];
  if (seasonPenaltyReduction > 0) {
    adjustedSeasonModifiers[currentSeason] = {
      berries: 1 - (1 - seasonModifiers[currentSeason].berries) * (1 - seasonPenaltyReduction),
      wood: 1 - (1 - seasonModifiers[currentSeason].wood) * (1 - seasonPenaltyReduction),
      stone: 1 - (1 - seasonModifiers[currentSeason].stone) * (1 - seasonPenaltyReduction),
      water: 1 - (1 - seasonModifiers[currentSeason].water) * (1 - seasonPenaltyReduction),
      meat: 1 - (1 - seasonModifiers[currentSeason].meat) * (1 - seasonPenaltyReduction),
      fibers: 1 - (1 - seasonModifiers[currentSeason].fibers) * (1 - seasonPenaltyReduction),
      metals: 1 - (1 - seasonModifiers[currentSeason].metals) * (1 - seasonPenaltyReduction),
      herbs: 1 - (1 - seasonModifiers[currentSeason].herbs) * (1 - seasonPenaltyReduction),
      wheat: 1 - (1 - seasonModifiers[currentSeason].wheat) * (1 - seasonPenaltyReduction),
    };
  }

  if (wells > 0) {
    let bucketEfficiency = 0.2 + tinkers * 0.1;
    let waterGained = buckets * bucketEfficiency * adjustedSeasonModifiers[currentSeason].water * harvestBonus;
    setWater(Math.min(water + waterGained, maxWater + maxWaterStorage));
  }
  setBerries(berries + pickers * 0.5 * adjustedSeasonModifiers[currentSeason].berries * harvestBonus);
  setMeat(meat + hunters * 0.2 * adjustedSeasonModifiers[currentSeason].meat * harvestBonus);
  if (discoveredFibers) {
    let fiberGain = pickers * 0.2 * adjustedSeasonModifiers[currentSeason].fibers * harvestBonus;
    setFibers(Math.min(fibers + fiberGain, maxFibers));
  }
  setHerbs(herbs + pickers * 0.1 * adjustedSeasonModifiers[currentSeason].herbs * harvestBonus);
  setHerbs(Math.min(herbs, maxHerbs + maxHerbsStorage));
  setMetals(metals + (mines * 0.1 + miners * 0.2) * adjustedSeasonModifiers[currentSeason].metals * harvestBonus);
  setMetals(Math.min(metals, maxMetals + maxMetalsStorage));
  if (discoveredMetals || currentAge === "Âge de l’Agriculture") {
    setWood(wood + sawmills * 0.5 * adjustedSeasonModifiers[currentSeason].wood * harvestBonus);
    setWood(Math.min(wood, maxWoodStorage));
    setStone(stone + stoneQuarries * 0.5 * adjustedSeasonModifiers[currentSeason].stone * harvestBonus);
    setStone(Math.min(stone, maxStoneStorage));
  }
  if (currentAge === "Âge de l’Agriculture") {
    setWheat(wheat + farmers * 0.2 * adjustedSeasonModifiers[currentSeason].wheat * harvestBonus);
    setWheat(Math.min(wheat, maxWheat + maxWheatStorage));
    if (mills > 0 && wheat >= mills) {
      setWheat(wheat - mills);
      setFlour(flour + mills);
      setFlour(Math.min(flour, maxFlour + maxFlourStorage));
    }
    if (bakeries > 0 && flour >= bakeries * 2 && water >= bakeries) {
      setFlour(flour - bakeries * 2);
      setWater(water - bakeries);
      setBread(bread + bakeries);
      setBread(Math.min(bread, maxBread + maxFlourStorage));
    }
  }

  if (explorationActive) {
    setExplorationTimer(explorationTimer - 1);

    if (explorationTimer <= 0) {
      setExplorers(explorers - 10);
      setVillagers(villagers + 10);
      setExplorationActive(false);

      let previousAge = currentAge; // Sauvegarde de l’âge avant changement
      if (!discoveredFibers) {
        setDiscoveredFibers(true);
        setFibers(0);
        document.getElementById("fibersSection").style.display = "inline-block";
        document.getElementById("workshopSection").style.display = "block";
        document.getElementById("narrative").textContent = "Les explorateurs ont découvert les fibres !";
        document.querySelector("#pickerSection .tooltip").textContent = "Un cueilleur ramasse des baies et des fibres pour toi.";
      } else if (!discoveredMetals) {
        setDiscoveredMetals(true);
        document.getElementById("metalsSection").style.display = "inline-block";
        document.getElementById("mineSection").style.display = "block";
        document.getElementById("narrative").textContent = "Les explorateurs ont découvert les métaux !";
        updateAge("Âge des Métaux");
      } else if (!discoveredHerbs) {
        setDiscoveredHerbs(true);
        document.getElementById("herbsSection").style.display = "inline-block";
        document.getElementById("herbalistSection").style.display = "block";
        document.getElementById("narrative").textContent = "Les explorateurs ont découvert les herbes !";
      }
      if (previousAge !== currentAge) {
        result.ageChanged = true; // Indique un changement d’âge
      }
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

    let berriesStock = berries;
    let meatInBerryUnits = meat * 3;
    let breadInBerryUnits =
      currentAge === "Âge de l’Agriculture" ? bread * 5 : 0;

    if (breadInBerryUnits >= berriesStock && breadInBerryUnits >= meatInBerryUnits) {
      let breadNeeded = Math.ceil(foodConsumed / 5);
      if (bread >= breadNeeded) {
        setBread(bread - breadNeeded);
      } else {
        let remainingFoodNeeded = foodConsumed - bread * 5;
        setBread(0);
        if (berries >= remainingFoodNeeded) {
          setBerries(berries - remainingFoodNeeded);
        } else {
          let stillNeeded = remainingFoodNeeded - berries;
          setBerries(0);
          let meatEquivalent = stillNeeded / 3;
          if (meat >= meatEquivalent) setMeat(meat - meatEquivalent);
          else setMeat(0);
        }
      }
    } else if (meatInBerryUnits >= berriesStock) {
      let meatEquivalent = foodConsumed / 3;
      if (meat >= meatEquivalent) {
        setMeat(meat - meatEquivalent);
      } else {
        let remainingFoodNeeded = foodConsumed - meat * 3;
        setMeat(0);
        if (berries >= remainingFoodNeeded) {
          setBerries(berries - remainingFoodNeeded);
        } else {
          let stillNeeded = remainingFoodNeeded - berries;
          setBerries(0);
          if (currentAge === "Âge de l’Agriculture" && bread >= Math.ceil(stillNeeded / 5)) {
            setBread(bread - Math.ceil(stillNeeded / 5));
          } else {
            setBread(0);
          }
        }
      }
    } else {
      if (berries >= foodConsumed) {
        setBerries(berries - foodConsumed);
      } else {
        let remainingFoodNeeded = foodConsumed - berries;
        setBerries(0);
        let meatEquivalent = remainingFoodNeeded / 3;
        if (meat >= meatEquivalent) {
          setMeat(meat - meatEquivalent);
        } else {
          let stillNeeded = remainingFoodNeeded - meat * 3;
          setMeat(0);
          if (currentAge === "Âge de l’Agriculture" && bread >= Math.ceil(stillNeeded / 5)) {
            setBread(bread - Math.ceil(stillNeeded / 5));
          } else {
            setBread(0);
          }
        }
      }
    }

    if (water >= waterConsumed) setWater(water - waterConsumed);
    else setWater(0);

    let alertMessage = "";
    if (berries <= 0 && meat <= 0 && (currentAge !== "Âge de l’Agriculture" || bread <= 0)) {
      alertMessage = "Plus de nourriture ! Récolte vite des baies ou de la viande !";
    }
    if (water <= 0) {
      alertMessage += alertMessage ? " Plus d’eau ! Récolte vite !" : "Plus d’eau ! Récolte vite !";
    }
    if (alertMessage) {
      result.alert = alertMessage;
    }

    if (berries <= 0 && meat <= 0 && water <= 0 && (currentAge !== "Âge de l’Agriculture" || bread <= 0) && !noDeath) {
      setDeathTimer(deathTimer + 1);
      let deathThreshold = remedies >= villagers ? 120 : 60;
      if (deathTimer >= deathThreshold) {
        setVillagers(villagers - 1);
        setDeathTimer(0);
        document.getElementById("narrative").textContent = "Un villageois est mort de faim et de soif !";
      }
    } else {
      setDeathTimer(0);
    }
  } else {
    setDeathTimer(0);
    result.hideAlert = true;
  }

  if (villagers >= 1 && water === 0) {
    document.getElementById("narrative").textContent = "Attention, un villageois consomme de l’eau ! Puise de l’eau.";
  }

  setSeasonTimer(seasonTimer + 1);
  if (seasonTimer >= seasonDuration) {
    setSeasonTimer(0);
    setCurrentSeason((currentSeason + 1) % 4);
    document.getElementById("narrative").textContent = `La saison change : ${seasonNames[currentSeason]}.`;
    result.seasonChanged = true; // Indique un changement de saison
  }

  if (currentHint && !currentHint.condition()) {
    setCurrentHint(null);
  }

  const availableHint = dynamicHints.find(
    (hint) => hint.condition() && !purchasedHints.includes(hint.id)
  );
  if (availableHint && !currentHint) {
    setCurrentHint(availableHint);
  }

  return result;
}

export function transformToCity() {
  villagesData.length = 0;
  addVillage();
  villagesData[0].population.villagers = villagers;
  villagesData[0].population.chief = chief;
  villagesData[0].population.pickers = pickers;
  villagesData[0].population.hunters = hunters;
  villagesData[0].population.miners = miners;
  villagesData[0].population.farmers = farmers;
  villagesData[0].population.tinkers = tinkers;
  villagesData[0].population.researchers = researchers;
  villagesData[0].population.explorers = explorers;

  assignBuildingsToVillages();

  updateAge("Âge des Cités");

  document.getElementById("narrative").textContent = "Votre population a atteint 1000 ! Vos villages se transforment en une ville. Bienvenue dans l’Âge des Cités !";
  // Supprimez : enhancedUpdateDisplay();
}

export function initGame() {
  villagesData = []; // Initialisation explicite
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
export function setExplorationActive(value) { explorationActive = value; }
export function setSeasonTimer(value) { seasonTimer = value; }
export function setDeathTimer(value) { deathTimer = value; }
export function setExplorationTimer(value) { explorationTimer = value; }
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