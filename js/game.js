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
    condition: () => eternityShards >= 5,
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
    enhancedUpdateDisplay();
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

export function gatherBerries() {
  let harvestBonus = eternityShards >= 1 ? shardEffects[0].harvestBonus : 1;
  berries += 1 * seasonModifiers[currentSeason].berries * harvestBonus;
  if (berries >= 5 && villagers === 0)
    document.getElementById("narrative").textContent = "Tu as assez de baies ! Attire un villageois maintenant.";
  enhancedUpdateDisplay();
}

export function gatherWood() {
  let harvestBonus = eternityShards >= 1 ? shardEffects[0].harvestBonus : 1;
  wood += (metalAxes > 0 ? 3 : axes > 0 ? 2 : 1) * seasonModifiers[currentSeason].wood * harvestBonus;
  enhancedUpdateDisplay();
}

export function gatherStone() {
  let harvestBonus = eternityShards >= 1 ? shardEffects[0].harvestBonus : 1;
  stone += (pickaxes > 0 ? 2 : 1) * seasonModifiers[currentSeason].stone * harvestBonus * (currentAge === "Âge des Métaux" ? 1.1 : 1);
  enhancedUpdateDisplay();
}

export function gatherWater() {
  let harvestBonus = eternityShards >= 1 ? shardEffects[0].harvestBonus : 1;
  water = Math.min(water + (buckets > 0 ? 2 : 1) * seasonModifiers[currentSeason].water * harvestBonus, maxWater);
  enhancedUpdateDisplay();
}

export function gatherMeat() {
  let harvestBonus = eternityShards >= 1 ? shardEffects[0].harvestBonus : 1;
  meat += (bows > 0 ? 2 : 1) * seasonModifiers[currentSeason].meat * harvestBonus;
  enhancedUpdateDisplay();
}

export function gatherFibers() {
  let harvestBonus = eternityShards >= 1 ? shardEffects[0].harvestBonus : 1;
  fibers = Math.min(fibers + 1 * seasonModifiers[currentSeason].fibers * harvestBonus, maxFibers);
  enhancedUpdateDisplay();
}

export function gatherMetals() {
  let harvestBonus = eternityShards >= 1 ? shardEffects[0].harvestBonus : 1;
  metals = Math.min(
    metals + (pickaxes > 0 ? 3 : mines > 0 ? 2 : 1) * seasonModifiers[currentSeason].metals * harvestBonus * (currentAge === "Âge des Métaux" ? 1.1 : 1),
    maxMetals
  );
  enhancedUpdateDisplay();
}

export function craftAxe() {
  if (wood >= 5 && stone >= 2) {
    wood -= 5;
    stone -= 2;
    axes += 1;
    if (axes >= 25 && villagers >= 25)
      document.getElementById("chiefSection").style.display = "block";
    document.getElementById("narrative").textContent = "Tu as une hache ! Elle coupe le bois plus vite.";
    enhancedUpdateDisplay();
  } else
    showAlert("Il te faut 5 bois et 2 pierres pour faire une hache !");
}

export function craftBucket() {
  if (wood >= 5 && stone >= 2) {
    wood -= 5;
    stone -= 2;
    buckets += 1;
    document.getElementById("narrative").textContent = "Tu as un seau ! Il récolte plus d’eau.";
    enhancedUpdateDisplay();
  } else showAlert("Il te faut 5 bois et 2 pierres pour un seau !");
}

export function craftWell() {
  if (wood >= 10 && stone >= 5) {
    wood -= 10;
    stone -= 5;
    wells += 1;
    maxWater += 1000;
    document.getElementById("narrative").textContent = "Un puits est construit ! Il stocke plus d’eau.";
    enhancedUpdateDisplay();
  } else showAlert("Il te faut 10 bois et 5 pierres pour un puits !");
}

export function craftPickaxe() {
  if (wood >= 10 && stone >= 5) {
    wood -= 10;
    stone -= 5;
    pickaxes += 1;
    document.getElementById("narrative").textContent = "Tu as une pioche ! Elle récolte plus de pierre.";
    enhancedUpdateDisplay();
  } else
    showAlert("Il te faut 10 bois et 5 pierres pour faire une pioche !");
}

export function craftBow() {
  if (wood >= 10 && stone >= 5) {
    wood -= 10;
    stone -= 5;
    bows += 1;
    document.getElementById("narrative").textContent = "Tu as un arc ! Il récolte plus de viande.";
    enhancedUpdateDisplay();
  } else showAlert("Il te faut 10 bois et 5 pierres pour faire un arc !");
}

export function craftCoat() {
  const fiberCost = workshops > 0 ? 8 : 10;
  const woodCost = workshops > 0 ? 4 : 5;
  if (fibers >= fiberCost && wood >= woodCost && coats < villagers && discoveredFibers) {
    fibers -= fiberCost;
    wood -= woodCost;
    coats += 1;
    document.getElementById("narrative").textContent = "Un manteau est prêt pour l’Hiver !";
    enhancedUpdateDisplay();
  } else
    showAlert(`Il te faut ${fiberCost} fibres, ${woodCost} bois et moins de manteaux que de villageois !`);
}

export function craftMetalAxe() {
  if (metals >= 5 && wood >= 5 && discoveredMetals) {
    metals -= 5;
    wood -= 5;
    metalAxes += 1;
    document.getElementById("narrative").textContent = "Une hache en métal, plus tranchante !";
    enhancedUpdateDisplay();
  } else
    showAlert("Il te faut 5 métaux, 5 bois et les métaux découverts !");
}

export function craftRemedy() {
  const herbCost = herbalists > 0 ? 4 : 5;
  const waterCost = herbalists > 0 ? 4 : 5;
  if (herbs >= herbCost && water >= waterCost && remedies < villagers && discoveredHerbs) {
    herbs -= herbCost;
    water -= waterCost;
    remedies += 1;
    document.getElementById("narrative").textContent = "Un remède pour protéger ton peuple !";
    enhancedUpdateDisplay();
  } else
    showAlert(`Il te faut ${herbCost} herbes, ${waterCost} eau et moins de remèdes que de villageois !`);
}

export function craftMine() {
  if (wood >= 50 && stone >= 20 && tinkers >= 1 && discoveredMetals) {
    wood -= 50;
    stone -= 20;
    mines += 1;
    currentAge = "Âge des Métaux";
    document.getElementById("minerSection").style.display = "block";
    document.getElementById("narrative").textContent = "Une mine est construite ! L’Âge des Métaux commence.";
    enhancedUpdateDisplay();
  } else
    showAlert("Il te faut 50 bois, 20 pierre, 1 bricoleur et les métaux découverts !");
}

export function craftWorkshop() {
  if (wood >= 20 && stone >= 10 && fibers >= 5 && discoveredFibers) {
    wood -= 20;
    stone -= 10;
    fibers -= 5;
    workshops += 1;
    maxFibers += 1000;
    document.getElementById("narrative").textContent = "Un atelier est construit ! La limite de fibres augmente à " + maxFibers + ".";
    enhancedUpdateDisplay();
  } else
    showAlert("Il te faut 20 bois, 10 pierre, 5 fibres et les fibres découvertes !");
}

export function craftHerbalist() {
  if (wood >= 15 && stone >= 5 && herbs >= 5 && discoveredHerbs) {
    wood -= 15;
    stone -= 5;
    herbs -= 5;
    herbalists += 1;
    maxHerbs = 200;
    document.getElementById("wheatFieldSection").style.display = "block";
    document.getElementById("narrative").textContent = "Une herboristerie est construite ! Les remèdes s’améliorent.";
    enhancedUpdateDisplay();
  } else
    showAlert("Il te faut 15 bois, 5 pierre, 5 herbes et les herbes découvertes !");
}

export function craftWheatField() {
  if (wood >= 20 && stone >= 10 && herbs >= 5 && discoveredHerbs) {
    wood -= 20;
    stone -= 10;
    herbs -= 5;
    wheatFields += 1;
    document.getElementById("narrative").textContent = "Un champ de blé est construit ! Cultive du blé.";
    updateAge("Âge de l’Agriculture");
    enhancedUpdateDisplay();
  } else {
    showAlert("Il te faut 20 bois, 10 pierre, 5 herbes et avoir découvert les herbes !");
  }
}

export function craftMill() {
  if (wood >= 50 && stone >= 20 && metals >= 5 && wheatFields > 0) {
    wood -= 50;
    stone -= 20;
    metals -= 5;
    mills += 1;
    currentAge = "Âge de l’Agriculture";
    document.getElementById("wheatSection").style.display = "inline-block";
    document.getElementById("flourSection").style.display = "inline-block";
    document.getElementById("breadSection").style.display = "block";
    document.getElementById("narrative").textContent = "Un moulin est construit ! L’Âge de l’Agriculture commence.";
    enhancedUpdateDisplay();
  } else
    showAlert("Il te faut 50 bois, 20 pierre, 5 métaux et des champs de blé !");
}

export function craftBakery() {
  if (wood >= 50 && stone >= 20 && flour >= 5 && currentAge === "Âge de l’Agriculture") {
    wood -= 50;
    stone -= 20;
    flour -= 5;
    bakeries += 1;
    document.getElementById("narrative").textContent = "Une boulangerie est construite ! Elle produit du pain automatiquement.";
    enhancedUpdateDisplay();
  } else {
    let reasons = [];
    if (wood < 50) reasons.push("pas assez de bois (" + wood + "/50)");
    if (stone < 20) reasons.push("pas assez de pierre (" + stone + "/20)");
    if (flour < 5) reasons.push("pas assez de farine (" + flour + "/5)");
    if (currentAge !== "Âge de l’Agriculture") reasons.push("mauvais âge (" + currentAge + ")");
    showAlert("Il te faut 50 bois, 20 pierre, 5 farine et être dans l’Âge de l’Agriculture ! " + reasons.join(", "));
  }
}

export function craftSawmill() {
  if (wood >= 50 && stone >= 20 && metals >= 5 && (currentAge === "Âge des Métaux" || currentAge === "Âge de l’Agriculture")) {
    wood -= 50;
    stone -= 20;
    metals -= 5;
    sawmills += 1;
    document.getElementById("narrative").textContent = "Une scierie est construite ! Elle produit 0.5 bois par seconde.";
    enhancedUpdateDisplay();
  } else {
    showAlert("Il te faut 50 bois, 20 pierre, 5 métaux et être dans l’Âge des Métaux ou l’Âge de l’Agriculture !");
  }
}

export function craftStoneQuarry() {
  if (wood >= 50 && stone >= 20 && metals >= 5 && (currentAge === "Âge des Métaux" || currentAge === "Âge de l’Agriculture")) {
    wood -= 50;
    stone -= 20;
    metals -= 5;
    stoneQuarries += 1;
    document.getElementById("narrative").textContent = "Une carrière de pierre est construite ! Elle produit 0.5 pierre par seconde.";
    enhancedUpdateDisplay();
  } else {
    showAlert("Il te faut 50 bois, 20 pierre, 5 métaux et être dans l’Âge des Métaux ou l’Âge de l’Agriculture !");
  }
}

export function craftWarehouse() {
  if (wood >= 50 && stone >= 20 && metals >= 5 && (currentAge === "Âge des Métaux" || currentAge === "Âge de l’Agriculture")) {
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
    document.getElementById("narrative").textContent = `Un entrepôt est construit ! Capacité de stockage ${warehouses === 1 ? "fixée à" : "augmentée de"} 50 000 pour bois, pierre, eau, métaux, herbes, blé et farine.`;
    enhancedUpdateDisplay();
  } else {
    showAlert("Il te faut 100 bois, 50 pierre, 10 métaux et être dans l’Âge des Métaux ou l’Âge de l’Agriculture !");
  }
}

export function recruitVillager() {
  if (berries >= 5) {
    berries -= 5;
    villagers += 1;
    if (villagers === 1)
      document.getElementById("narrative").textContent = "Un villageois arrive ! Il va t’aider.";
    if (villagers >= 10)
      document.getElementById("pickerSection").style.display = "block";
    if (villagers >= 20)
      document.getElementById("hunterSection").style.display = "block";
    if (villagers >= 25 && axes >= 25)
      document.getElementById("chiefSection").style.display = "block";
    enhancedUpdateDisplay();
  } else showAlert("Il te faut 5 baies pour attirer un villageois !");
}

export function appointChief() {
  if (axes >= 25 && villagers >= 25) {
    chief += 1;
    document.getElementById("villageSection").style.display = "block";
    document.getElementById("narrative").textContent = "Tu as un nouveau chef ! Il guide une partie de ton peuple.";
    enhancedUpdateDisplay();
  } else {
    showAlert("Il te faut 25 haches et au moins 25 villageois pour nommer un chef !");
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
    document.getElementById("narrative").textContent = "Un bricoleur arrive ! L’Automne s’installe.";
    currentSeason = 2;
    updateAge("Âge des Métaux");
    enhancedUpdateDisplay();
    updateSeasonDisplay();
  } else {
    showAlert("Il te faut 100 bois, 100 pierres et un village pour un bricoleur !");
  }
}

export function recruitResearcher() {
  if (tinkers >= 10) {
    tinkers -= 10;
    researchers += 1;
    document.getElementById("researcherSection").style.display = "block";
    document.getElementById("narrative").textContent = "Un chercheur rejoint ton village ! De nouvelles technologies arrivent.";
    enhancedUpdateDisplay();
  } else
    showAlert("Il te faut 10 bricoleurs pour recruter un chercheur !");
}

export function recruitPicker() {
  if (berries >= 10 && wood >= 5) {
    berries -= 10;
    wood -= 5;
    pickers += 1;
    document.getElementById("narrative").textContent = "Un cueilleur arrive ! Il ramasse des baies pour toi.";
    enhancedUpdateDisplay();
  } else showAlert("Il te faut 10 baies et 5 bois pour un cueilleur !");
}

export function recruitHunter() {
  if (wood >= 10 && meat >= 5) {
    wood -= 10;
    meat -= 5;
    hunters += 1;
    document.getElementById("narrative").textContent = "Un chasseur arrive ! Il trouve de la viande.";
    enhancedUpdateDisplay();
  } else showAlert("Il te faut 10 bois et 5 viande pour un chasseur !");
}

export function sendExplorers() {
  if (berries >= 50 && wood >= 20 && villagers >= 10 && !explorationActive && (!discoveredFibers || !discoveredMetals || !discoveredHerbs)) {
    berries -= 50;
    wood -= 20;
    villagers -= 10;
    explorers += 10;
    explorationActive = true;
    explorationTimer = 30;
    console.log("Exploration démarrée, timer =", explorationTimer);
    document.getElementById("narrative").textContent = "Les explorateurs partent à la découverte...";
    enhancedUpdateDisplay();
  } else {
    let reasons = [];
    if (berries < 50) reasons.push("pas assez de baies (" + berries + "/50)");
    if (wood < 20) reasons.push("pas assez de bois (" + wood + "/20)");
    if (villagers < 10) reasons.push("pas assez de villageois (" + villagers + "/10)");
    if (explorationActive) reasons.push("exploration déjà en cours");
    if (discoveredFibers && discoveredMetals && discoveredHerbs) reasons.push("toutes les ressources découvertes");
    showAlert("Impossible d'envoyer des explorateurs : " + reasons.join(", ") + " !");
  }
}

export function recruitMiner() {
  if (wood >= 10 && metals >= 5 && mines > 0) {
    wood -= 10;
    metals -= 5;
    miners += 1;
    document.getElementById("narrative").textContent = "Un mineur arrive ! Il extrait des métaux.";
    enhancedUpdateDisplay();
  } else showAlert("Il te faut 10 bois, 5 métaux et une mine !");
}

export function recruitFarmer() {
  if (berries >= 10 && wood >= 5 && wheatFields > 0) {
    berries -= 10;
    wood -= 5;
    farmers += 1;
    document.getElementById("narrative").textContent = "Un fermier arrive ! Il cultive le blé.";
    enhancedUpdateDisplay();
  } else showAlert("Il te faut 10 baies, 5 bois et des champs de blé !");
}

export function foundVillage() {
  const requiredVillagers = (villages + 1) * 50;
  const requiredChiefs = villages + 1;
  if (villagers >= requiredVillagers && chief >= requiredChiefs && villages < 10) {
    villages += 1;
    villageFounded = true;
    document.getElementById("narrative").textContent = `Village ${villages} fondé ! L’Été s’installe pour ce nouveau groupe.`;
    document.getElementById("tinkerSection").style.display = "block";
    document.getElementById("relicSection").style.display = "block";
    currentSeason = 1;
    enhancedUpdateDisplay();
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
      shardMessage += `Effet débloqué : ${shardEffects[eternityShards - 1].name}.`;
    if (eternityShards === 1) {
      currentSeason = 3;
      shardMessage += " L’Hiver s’abat sur ton peuple.";
      updateSeasonDisplay();
    }
    document.getElementById("narrative").textContent = shardMessage;
    document.getElementById("eternityShards").textContent = eternityShards;
    enhancedUpdateDisplay();
  } else
    showAlert("Il te faut 200 bois, 100 pierres et 50 eau pour un éclat !");
}

export function gameLoop() {
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
    water = Math.min(water + waterGained, maxWater + maxWaterStorage);
  }
  berries += pickers * 0.5 * adjustedSeasonModifiers[currentSeason].berries * harvestBonus;
  meat += hunters * 0.2 * adjustedSeasonModifiers[currentSeason].meat * harvestBonus;
  if (discoveredFibers) {
    let fiberGain = pickers * 0.2 * adjustedSeasonModifiers[currentSeason].fibers * harvestBonus;
    fibers = Math.min(fibers + fiberGain, maxFibers);
  }
  herbs += pickers * 0.1 * adjustedSeasonModifiers[currentSeason].herbs * harvestBonus;
  herbs = Math.min(herbs, maxHerbs + maxHerbsStorage);
  metals += (mines * 0.1 + miners * 0.2) * adjustedSeasonModifiers[currentSeason].metals * harvestBonus;
  metals = Math.min(metals, maxMetals + maxMetalsStorage);
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
        document.getElementById("narrative").textContent = "Les explorateurs ont découvert les fibres !";
        document.querySelector("#pickerSection .tooltip").textContent = "Un cueilleur ramasse des baies et des fibres pour toi.";
      } else if (!discoveredMetals) {
        discoveredMetals = true;
        document.getElementById("metalsSection").style.display = "inline-block";
        document.getElementById("mineSection").style.display = "block";
        document.getElementById("narrative").textContent = "Les explorateurs ont découvert les métaux !";
        updateAge("Âge des Métaux");
      } else if (!discoveredHerbs) {
        discoveredHerbs = true;
        document.getElementById("herbsSection").style.display = "inline-block";
        document.getElementById("herbalistSection").style.display = "block";
        document.getElementById("narrative").textContent = "Les explorateurs ont découvert les herbes !";
      }
      enhancedUpdateDisplay();
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
    if (breadInBerryUnits >= berriesStock && breadInBerryUnits >= meatInBerryUnits) {
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
          if (currentAge === "Âge de l’Agriculture" && bread >= Math.ceil(stillNeeded / 5)) {
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
          if (currentAge === "Âge de l’Agriculture" && bread >= Math.ceil(stillNeeded / 5)) {
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
    if (berries <= 0 && meat <= 0 && (currentAge !== "Âge de l’Agriculture" || bread <= 0))
      alertMessage = "Plus de nourriture ! Récolte vite des baies ou de la viande !";
    if (water <= 0)
      alertMessage += alertMessage ? " Plus d’eau ! Récolte vite !" : "Plus d’eau ! Récolte vite !";
    if (alertMessage) showAlert(alertMessage);
    else hideAlert();

    if (berries <= 0 && meat <= 0 && water <= 0 && (currentAge !== "Âge de l’Agriculture" || bread <= 0) && !noDeath) {
      deathTimer += 1;
      let deathThreshold = remedies >= villagers ? 120 : 60;
      if (deathTimer >= deathThreshold) {
        villagers -= 1;
        deathTimer = 0;
        document.getElementById("narrative").textContent = "Un villageois est mort de faim et de soif !";
      }
    } else deathTimer = 0;
  } else {
    hideAlert();
    deathTimer = 0;
  }

  if (villagers >= 1 && water === 0) {
    document.getElementById("narrative").textContent = "Attention, un villageois consomme de l’eau ! Puise de l’eau.";
  }

  seasonTimer += 1;
  if (seasonTimer >= seasonDuration) {
    seasonTimer = 0;
    currentSeason = (currentSeason + 1) % 4;
    document.getElementById("narrative").textContent = `La saison change : ${seasonNames[currentSeason]}.`;
  }

// Ajout de la logique pour gérer currentHint
if (currentHint && !currentHint.condition()) {
  setCurrentHint(null);
  console.log("Indice invalide, réinitialisé.");
}

const availableHint = dynamicHints.find(
  (hint) => hint.condition() && !purchasedHints.includes(hint.id)
);
if (availableHint && !currentHint) {
  setCurrentHint(availableHint);
}

enhancedUpdateDisplay();
updateSeasonDisplay();
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

// Appeler au démarrage initial
applyCraftOrder();
enableDragAndDrop();

// Surcharger updateDisplay pour réappliquer le drag-and-drop après chaque mise à jour
const enhancedUpdateDisplay = function () {
  updateDisplay();
  applyCraftOrder();
  enableDragAndDrop();
};

export function initGame() {
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