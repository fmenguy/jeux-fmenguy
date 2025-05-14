import { decideAction, findPath } from './ecosystem-ai.js';

// Configuration du canvas
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
let gridSize = 20; // Taille initiale de la grille
const tileSize = 30;
canvas.width = gridSize * tileSize;
canvas.height = gridSize * tileSize;

// État du jeu
let creatures = [];
let foodItems = [];
let frameCount = 0; // Pour l'animation des tentacules et le flottement
let bubbles = []; // Pour les bulles
let algae = []; // Liste des abris (algues)
let walls = []; // Liste des murs
let particles = []; // Liste des particules
let bloomZone = null; // Zone de bloom de nourriture
let stormActive = false; // État de la tempête
let humans = []; // Liste des humains
let humansSpawned = false; // Indicateur pour l'apparition des humains

// Données pour la courbe (stocke tout depuis le début)
const statsHistory = { creatures: [], food: [] };

// Cooldown de base pour le déplacement, modifiable par les boutons radio
let baseCooldown = 60; // 2 secondes à 30 FPS (par défaut : lent)

// État du mode "ajout de mur"
let addWallMode = false;

// Liste des espèces présentes pour la légende
let activeSpecies = new Set();

// Limites de créatures
const maxCreaturesPerSpecies = 100; // 100 créatures max par espèce (non prédateurs)
const maxPredators = 50; // 50 prédateurs max
const humansSpawnThreshold = 50; // Seuil pour l'apparition des humains

// Score du joueur
let score = 0;

// Mettre à jour baseCooldown avec les boutons radio
window.updateSpeed = (value) => {
  baseCooldown = parseInt(value);
};

// Générer des algues comme abris
function generateAlgae() {
  const numAlgae = 5; // Nombre d'algues
  for (let i = 0; i < numAlgae; i++) {
    algae.push({
      x: Math.floor(Math.random() * gridSize),
      y: Math.floor(Math.random() * gridSize)
    });
  }
}

// Générer des humains (quand l'écosystème est développé)
function generateHumans() {
  const numHumans = 3; // Nombre d'humains
  for (let i = 0; i < numHumans; i++) {
    humans.push({
      x: i * (gridSize / numHumans),
      y: 1, // Sur la terre (en haut)
      gender: Math.random() < 0.5 ? 'male' : 'female',
      direction: Math.random() < 0.5 ? 1 : -1, // Déplacement horizontal
      fishing: false,
      fishingCooldown: 0,
      foodCollected: 0,
      lastBubbleTime: 0
    });
  }
  canvas.className = 'humans-present'; // Appliquer la classe pour le style de la map
}
generateAlgae(); // Appeler pour générer les algues au démarrage

// Différentes espèces de méduses
let speciesTypes = [
  { name: 'Lunaria', shape: 'circle', color: ['#1E90FF', '#00B7EB', '#00CED1', '#48D1CC', '#87CEEB', '#B0E0E6'], tentacleCount: 3, traits: { speedBonus: 0, lifespanBonus: 0, detectionBonus: 0 }, foodValue: 1 }, // Bleus luminescents
  { name: 'Coralix', shape: 'hexagon', color: ['#FF4040', '#FF6347', '#FF7F50', '#FF8C00', '#FFA07A', '#FFDAB9'], tentacleCount: 4, traits: { speedBonus: 0, lifespanBonus: 0, detectionBonus: 0 }, foodValue: 2 }, // Corail vibrant
  { name: 'Abyssal', shape: 'triangle', color: ['#2F0047', '#4B0082', '#483D8B', '#6A5ACD', '#7B68EE', '#9370DB'], tentacleCount: 5, traits: { speedBonus: 0, lifespanBonus: 0, detectionBonus: 0 }, foodValue: 3 } // Tons abyssaux
];

// Type de créature (méduse-like)
const creatureType = {
  species: speciesTypes[0], // Espèce par défaut
  color: speciesTypes[0].color[0], // Couleur initiale
  size: 15, // Taille adulte initiale
  speed: 1, // Saut d'une case par tick (ralenti par un cooldown)
  foodEaten: 0, // Compteur de nourriture consommée
  lifespan: 1800, // 60 secondes à 30 FPS (60 * 30 = 1800 ticks) pour tester
  isOriginal: true, // Indique si c'est la créature initiale
  isAdult: true, // Indique si la créature est adulte
  floatOffset: 0, // Pour le flottement
  moveCooldown: 0, // Cooldown pour ralentir le déplacement
  generation: 0, // Génération initiale
  isPredator: false, // Indique si la créature est devenue un prédateur
  lastBubbleTime: 0, // Compteur pour les bulles
  wanderDirection: { dx: Math.random() * 2 - 1, dy: Math.random() * 2 - 1 }, // Direction aléatoire pour le mouvement
  lastPath: [], // Dernier chemin calculé
  lastTarget: null, // Dernière cible utilisée pour le pathfinding
  traits: { speedBonus: 0, lifespanBonus: 0, detectionBonus: 0 } // Traits évolutifs
};

// Taille maximale d'une créature
const maxSize = 50; // Taille maximale (en pixels)

// Initialisation avec une seule créature
const initialCreature = {
  x: Math.floor(gridSize / 2),
  y: Math.floor(gridSize / 2),
  ...creatureType,
  lastBubbleTime: 0
};
creatures.push(initialCreature);
activeSpecies.add(speciesTypes[0].name); // Ajouter l'espèce initiale à la légende
updateSpeciesLegend();
console.log('Créature initiale ajoutée :', initialCreature); // Debug

// Ajouter de la nourriture
window.addFood = (isKeyboard = false) => {
  const baseFoodCount = creatures.length >= 100 ? Math.floor(creatures.length / 20) : 1; // Proportionnel au nombre de créatures
  const multiplier = isKeyboard ? 5 : 1; // Ajoute 5x plus de nourriture avec la touche Entrée
  let foodCount = baseFoodCount * multiplier;

  if (bloomZone) {
    // Ajouter de la nourriture dans la zone de bloom
    for (let i = 0; i < foodCount; i++) {
      const offsetX = Math.floor(Math.random() * 5) - 2; // ±2 cases autour du centre
      const offsetY = Math.floor(Math.random() * 5) - 2;
      const foodX = Math.min(Math.max(bloomZone.x + offsetX, 0), gridSize - 1);
      const foodY = Math.min(Math.max(bloomZone.y + offsetY, 0), gridSize - 1);
      foodItems.push({
        x: foodX,
        y: foodY,
        energy: 50
      });
    }
  } else {
    // Ajout normal
    for (let i = 0; i < foodCount; i++) {
      const food = {
        x: Math.floor(Math.random() * gridSize),
        y: Math.floor(Math.random() * gridSize),
        energy: 50
      };
      foodItems.push(food);
    }
  }
  updateCounts();
};

// Ajouter un écouteur pour la touche Entrée
document.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    window.addFood(true);
  }
});

// Faire réapparaître une créature initiale
window.respawnCreature = () => {
  if (creatures.length === 0) {
    const newCreature = {
      x: Math.floor(gridSize / 2),
      y: Math.floor(gridSize / 2),
      ...creatureType,
      lastBubbleTime: 0
    };
    creatures.push(newCreature);
    activeSpecies.add(newCreature.species.name); // Mettre à jour la légende
    updateSpeciesLegend();
    console.log('Créature réapparue :', newCreature); // Debug
    updateCounts();
  }
};

// Activer/désactiver le mode d'ajout de mur
window.toggleAddWallMode = () => {
  addWallMode = !addWallMode;
  const button = document.getElementById('addWallButton');
  button.style.backgroundColor = addWallMode ? '#FF4500' : '#1E3A8A'; // Rouge si actif, bleu sinon
};

// Ajouter un mur avec le clic gauche
canvas.addEventListener('click', (event) => {
  if (!addWallMode) return;

  const rect = canvas.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  const gridX = Math.floor(x / tileSize);
  const gridY = Math.floor(y / tileSize);

  // Vérifier si la position est déjà occupée par un mur
  if (!walls.some(wall => wall.x === gridX && wall.y === gridY)) {
    walls.push({ x: gridX, y: gridY });
  }
});

// Supprimer un mur avec le clic droit
canvas.addEventListener('contextmenu', (event) => {
  event.preventDefault(); // Empêcher le menu contextuel par défaut
  const rect = canvas.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  const gridX = Math.floor(x / tileSize);
  const gridY = Math.floor(y / tileSize);

  // Vérifier si la position contient un mur
  const wallIndex = walls.findIndex(wall => wall.x === gridX && wall.y === gridY);
  if (wallIndex !== -1) {
    walls.splice(wallIndex, 1); // Supprimer le mur
  }
});

// Gérer les bulles de demande
let requestSide = 'left'; // Alterner les côtés des bulles

// Liste de blagues/messages amusants pour inciter à ajouter de la nourriture
const funnyMessages = [
  "Je suis affamé, un petit snack me ferait nager de bonheur !",
  "Pourquoi les méduses ne partagent pas leur nourriture ? Parce qu'elles sont trop jelly !",
  "J’ai tellement faim que je pourrais manger un mur… mais je préfère de la nourriture !",
  "Un peu de nourriture, et je te promets un spectacle de tentacules !",
  "Je suis à sec, donne-moi un coup de pouce… ou de nourriture !"
];

// Messages si le chemin est bloqué
const blockedMessages = [
  "Un mur me bloque, je ne peux pas atteindre la nourriture… Aide-moi à nager librement !",
  "Ces murs me donnent le tournis, je veux juste un peu de nourriture…",
  "Je suis coincé derrière un mur, fais quelque chose, s’il te plaît !",
  "Ce mur est une vraie barrière à mon repas, peux-tu m’aider ?"
];

// Messages des créatures après l'apparition des humains
const humanPresentMessages = [
  "Les humains sont là… J’espère qu’ils ne me pêcheront pas avant que j’aie mangé !",
  "Ces humains me regardent bizarrement, vite, donne-moi de la nourriture pour que je me cache !",
  "Je sens une canne à pêche… Un peu de nourriture pour me donner des forces ?"
];

// Messages initiaux des humains
const humanIntroMessages = [
  "On est là pour pêcher, préparez-vous, les poissons !",
  "Mmmh, ça sent le poisson frais par ici… On va se régaler !",
  "Les cannes à pêche sont prêtes, qui sera notre premier repas ?"
];

// Afficher un message dans une bulle
function showBubble(entityType, message, entity) {
  const requestsDiv = document.getElementById('foodRequests');
  const bubble = document.createElement('div');
  bubble.className = `food-request-bubble ${entityType}-bubble`; // Ajouter une classe pour différencier les bulles

  bubble.textContent = message;

  // Positionner la bulle différemment selon le type d'entité
  const side = requestSide;
  requestSide = requestSide === 'left' ? 'right' : 'left'; // Alterner pour la prochaine bulle
  if (entityType === 'human') {
    bubble.style[side] = '20px';
    bubble.style.top = '50px'; // Bulles des humains en haut
  } else {
    bubble.style[side] = '20px';
    bubble.style.top = `${Math.random() * (window.innerHeight - 150) + 100}px`; // Bulles des créatures plus bas
  }

  requestsDiv.appendChild(bubble);

  // Supprimer la bulle après 5 secondes
  setTimeout(() => {
    bubble.remove();
  }, 5000);
}

// Afficher un message de limite dans la console
function showLimitMessage(message) {
  console.log(message);
}

// Mettre à jour la légende des espèces
function updateSpeciesLegend() {
  const speciesListDiv = document.getElementById('speciesList');
  speciesListDiv.innerHTML = ''; // Vider la légende actuelle

  // Compteur des prédateurs (noirs)
  const predatorCount = creatures.filter(creature => creature.size >= maxSize).length;
  const predatorItem = document.createElement('div');
  predatorItem.className = 'species-item';
  const predatorColorDiv = document.createElement('div');
  predatorColorDiv.className = 'species-color';
  predatorColorDiv.style.backgroundColor = '#000000'; // Noir pour les prédateurs
  const predatorSpan = document.createElement('span');
  predatorSpan.textContent = `Prédateurs: ${predatorCount}`;
  predatorItem.appendChild(predatorColorDiv);
  predatorItem.appendChild(predatorSpan);
  speciesListDiv.appendChild(predatorItem);

  // Compteur des humains (si présents)
  if (humans.length > 0) {
    const humanCount = humans.length;
    const humanFood = humans.reduce((sum, human) => sum + human.foodCollected, 0);
    const humanItem = document.createElement('div');
    humanItem.className = 'species-item';
    const humanColorDiv = document.createElement('div');
    humanColorDiv.className = 'species-color';
    humanColorDiv.style.backgroundColor = '#FFD700'; // Jaune pour représenter les humains
    const humanSpan = document.createElement('span');
    humanSpan.textContent = `Humains: ${humanCount} (Nourriture: ${humanFood})`;
    humanItem.appendChild(humanColorDiv);
    humanItem.appendChild(humanSpan);
    speciesListDiv.appendChild(humanItem);
  }

  // Compteur par espèce
  activeSpecies.forEach(speciesName => {
    const species = speciesTypes.find(s => s.name === speciesName);
    if (species) {
      const speciesCount = creatures.filter(creature => creature.species.name === speciesName && creature.size < maxSize).length; // Exclure les prédateurs
      const speciesItem = document.createElement('div');
      speciesItem.className = 'species-item';

      const colorDiv = document.createElement('div');
      colorDiv.className = 'species-color';
      colorDiv.style.backgroundColor = species.color[0];

      const nameSpan = document.createElement('span');
      nameSpan.textContent = `${species.name}: ${speciesCount} (${species.traits.speedBonus > 0 ? '+Vitesse' : ''}${species.traits.lifespanBonus > 0 ? '+Vie' : ''}${species.traits.detectionBonus > 0 ? '+Détection' : ''})`;

      speciesItem.appendChild(colorDiv);
      speciesItem.appendChild(nameSpan);
      speciesListDiv.appendChild(speciesItem);
    }
  });

  // Mettre à jour le score
  const speciesDiversity = activeSpecies.size * 10; // 10 points par espèce
  const generationScore = creatures.reduce((sum, creature) => sum + creature.generation, 0); // 1 point par génération
  const predatorScore = predatorCount * 50; // 50 points par prédateur
  score = speciesDiversity + generationScore + predatorScore;
  document.getElementById('scoreDisplay').textContent = `Score: ${score}`;
}

// Mettre à jour les compteurs et l'état du bouton
function updateCounts() {
  document.getElementById('creatureCount').textContent = creatures.length;
  document.getElementById('foodCount').textContent = foodItems.length;
  const respawnButton = document.getElementById('respawnButton');
  respawnButton.disabled = creatures.length > 0; // Désactiver si des créatures sont présentes

  // Ajouter les données à l'historique pour la courbe
  statsHistory.creatures.push(creatures.length);
  statsHistory.food.push(foodItems.length);

  // Mettre à jour la légende
  updateSpeciesLegend();

  // Dessiner la courbe
  drawStatsCurve();
}

// Trouver une position libre autour d'une position donnée
function findFreePosition(x, y) {
  const directions = [
    { dx: 0, dy: -1 }, // Haut
    { dx: 0, dy: 1 },  // Bas
    { dx: -1, dy: 0 }, // Gauche
    { dx: 1, dy: 0 },  // Droite
    { dx: -1, dy: -1 }, // Haut-gauche
    { dx: 1, dy: -1 },  // Haut-droite
    { dx: -1, dy: 1 },  // Bas-gauche
    { dx: 1, dy: 1 }    // Bas-droite
  ];

  for (const dir of directions) {
    const newX = x + dir.dx;
    const newY = y + dir.dy;
    if (
      newX >= 0 && newX < gridSize &&
      newY >= 0 && newY < gridSize &&
      (humans.length === 0 || newY > gridSize * 0.2 / tileSize) && // Rester dans l'eau si les humains sont présents
      !creatures.some(c => Math.round(c.x) === newX && Math.round(c.y) === newY) &&
      !walls.some(wall => wall.x === newX && wall.y === newY)
    ) {
      return { x: newX, y: newY };
    }
  }
  // Si aucune position libre, retourner la position actuelle (risque de superposition minimisé)
  return { x, y };
}

// Générer des bulles aléatoires
function generateBubble() {
  return {
    x: Math.random() * canvas.width,
    y: canvas.height,
    size: Math.random() * 5 + 2, // Taille entre 2 et 7 pixels
    speed: Math.random() * 2 + 1 // Vitesse de montée entre 1 et 3 pixels par tick
  };
}

// Générer des particules
function generateParticle(x, y) {
  return {
    x: x,
    y: y,
    size: Math.random() * 3 + 1,
    speedX: (Math.random() - 0.5) * 2,
    speedY: (Math.random() - 0.5) * 2,
    life: 60 // Durée de vie en ticks
  };
}

// Dessiner une étoile à 5 branches
function drawStar(cx, cy, spikes, outerRadius, innerRadius) {
  let rot = Math.PI / 2 * 3;
  let x = cx;
  let y = cy;
  const step = Math.PI / spikes;

  ctx.beginPath();
  ctx.moveTo(cx, cy - outerRadius);
  for (let i = 0; i < spikes; i++) {
    x = cx + Math.cos(rot) * outerRadius;
    y = cy + Math.sin(rot) * outerRadius;
    ctx.lineTo(x, y);
    rot += step;

    x = cx + Math.cos(rot) * innerRadius;
    y = cy + Math.sin(rot) * innerRadius;
    ctx.lineTo(x, y);
    rot += step;
  }
  ctx.lineTo(cx, cy - outerRadius);
  ctx.closePath();
  ctx.fill();
}

// Dessiner un hexagone
function drawHexagon(cx, cy, size) {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i + Math.PI / 6;
    const x = cx + size * Math.cos(angle);
    const y = cy + size * Math.sin(angle);
    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }
  ctx.closePath();
  ctx.fill();
}

// Dessiner un triangle
function drawTriangle(cx, cy, size) {
  ctx.beginPath();
  for (let i = 0; i < 3; i++) {
    const angle = (Math.PI * 2 / 3) * i + Math.PI / 2;
    const x = cx + size * Math.cos(angle);
    const y = cy + size * Math.sin(angle);
    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }
  ctx.closePath();
  ctx.fill();
}

// Dessiner le jeu
function draw() {
  // Créer un dégradé pour le fond
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  if (humans.length === 0) {
    gradient.addColorStop(0, '#0D1B2A'); // Bleu très sombre (haut)
    gradient.addColorStop(1, '#1B263B'); // Bleu sombre (bas)
  } else {
    gradient.addColorStop(0, '#8B4513'); // Terre (brun) en haut
    gradient.addColorStop(0.2, '#8B4513');
    gradient.addColorStop(0.2, '#0D1B2A'); // Eau (bleu) en bas
    gradient.addColorStop(1, '#1B263B');
  }

  // Effacer le canvas avec le dégradé
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Dessiner la zone de bloom si active
  if (bloomZone) {
    ctx.fillStyle = 'rgba(255, 215, 0, 0.3)';
    ctx.beginPath();
    ctx.arc(bloomZone.x * tileSize + tileSize / 2, bloomZone.y * tileSize + tileSize / 2, 3 * tileSize, 0, Math.PI * 2);
    ctx.fill();
  }

  // Dessiner l'effet de tempête si active
  if (stormActive) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  // Générer des bulles aléatoirement (1 chance sur 50 par tick)
  if (Math.random() < 0.02) {
    bubbles.push(generateBubble());
  }

  // Dessiner et animer les bulles
  bubbles.forEach((bubble, index) => {
    bubble.y -= bubble.speed; // Faire remonter la bulle
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.beginPath();
    ctx.arc(bubble.x, bubble.y, bubble.size, 0, Math.PI * 2);
    ctx.fill();

    // Supprimer les bulles qui sortent de l'écran
    if (bubble.y < -bubble.size) {
      bubbles.splice(index, 1);
    }
  });

  // Dessiner les algues (carrés verts pour représenter les abris)
  algae.forEach(alga => {
    const pulse = 1 + Math.sin(frameCount * 0.05) * 0.1; // Effet de pulsation
    ctx.fillStyle = '#2E7D32'; // Vert foncé pour les algues
    ctx.globalAlpha = pulse;
    ctx.fillRect(alga.x * tileSize, alga.y * tileSize, tileSize, tileSize);
    ctx.globalAlpha = 1; // Réinitialiser l'opacité
  });

  // Dessiner les murs
  walls.forEach(wall => {
    ctx.fillStyle = '#696969'; // Gris pour les murs
    ctx.fillRect(wall.x * tileSize, wall.y * tileSize, tileSize, tileSize);
  });

  // Dessiner les chemins des créatures
  creatures.forEach(creature => {
    let path = creature.lastPath;
    let isAttacking = false;

    // Vérifier si la créature est un prédateur et se dirige vers une autre créature
    if (foodItems.length === 0 && creature.isAdult) {
      const nearestSmall = creatures.find(c => !c.isAdult && c.size < creature.size);
      const nearestAdult = creature.isPredator ? creatures.find(c => c !== creature && c.isAdult && c.size < creature.size) : null;
      const targetCreature = nearestSmall || nearestAdult;
      if (targetCreature && (creature.lastTarget !== targetCreature || path.length === 0)) {
        path = findPath(creature, [{ x: Math.round(targetCreature.x), y: Math.round(targetCreature.y) }], gridSize, walls);
        creature.lastPath = path;
        creature.lastTarget = targetCreature;
        isAttacking = true;
      }
    } else if (foodItems.length > 0) {
      // Recalculer le chemin vers la nourriture si la cible a changé ou si le chemin est terminé
      if (creature.lastTarget !== foodItems[0] || path.length === 0) {
        path = findPath(creature, foodItems, gridSize, walls);
        creature.lastPath = path;
        creature.lastTarget = foodItems[0];
      }
    }

    if (path.length > 1) {
      ctx.beginPath();
      ctx.moveTo(creature.x * tileSize + tileSize / 2, creature.y * tileSize + tileSize / 2 + creature.floatOffset);
      for (let i = 1; i < path.length; i++) {
        const point = path[i];
        ctx.lineTo(point.x * tileSize + tileSize / 2, point.y * tileSize + tileSize / 2 + creature.floatOffset);
      }
      ctx.strokeStyle = isAttacking ? '#FF0000' : '#FFFFFF'; // Rouge si attaque, blanc sinon
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]); // Ligne pointillée
      ctx.stroke();
      ctx.setLineDash([]); // Réinitialiser pour les autres dessins
    }
  });

  // Dessiner la nourriture
  foodItems.forEach(food => {
    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    ctx.arc(food.x * tileSize + tileSize / 2, food.y * tileSize + tileSize / 2, 5, 0, Math.PI * 2);
    ctx.fill();
  });

  // Dessiner les particules (seulement celles visibles)
  particles.forEach((particle, index) => {
    particle.x += particle.speedX;
    particle.y += particle.speedY;
    particle.life--;

    if (
      particle.x >= 0 && particle.x <= canvas.width &&
      particle.y >= 0 && particle.y <= canvas.height
    ) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      ctx.fill();
    }

    // Supprimer les particules mortes
    if (particle.life <= 0) {
      particles.splice(index, 1);
    }
  });

  // Dessiner les créatures avec des tentacules (seulement celles visibles)
  creatures.forEach(creature => {
    const x = creature.x * tileSize + tileSize / 2;
    const y = creature.y * tileSize + tileSize / 2 + creature.floatOffset; // Ajout du flottement
    const size = creature.size; // Taille dynamique

    // Vérifier si la créature est visible à l'écran
    if (
      x + size < 0 || x - size > canvas.width ||
      y + size < 0 || y - size > canvas.height
    ) {
      return; // Ne pas dessiner si hors écran
    }

    const waveEffect = Math.sin(frameCount * 0.1 + creature.x + creature.y) * 2; // Effet de vague
    const isMaxSize = creature.size >= maxSize;

    // Générer des particules autour de la créature (moins fréquemment)
    if (Math.random() < 0.05) { // Réduit de 0.1 à 0.05
      particles.push(generateParticle(x + waveEffect, y));
    }

    // Corps (selon l'espèce et le statut de prédateur)
    ctx.fillStyle = isMaxSize ? '#000000' : creature.species.color[Math.min(creature.generation, creature.species.color.length - 1)];
    if (creature.species.shape === 'circle') {
      ctx.beginPath();
      ctx.arc(x + waveEffect, y, size, 0, Math.PI * 2);
      ctx.fill();
    } else if (creature.species.shape === 'hexagon') {
      drawHexagon(x + waveEffect, y, size);
    } else if (creature.species.shape === 'triangle') {
      drawTriangle(x + waveEffect, y, size);
    }

    // Ajouter un contour lumineux
    ctx.strokeStyle = '#BBDEFB';
    ctx.lineWidth = 1;
    if (creature.species.shape === 'circle') {
      ctx.beginPath();
      ctx.arc(x + waveEffect, y, size, 0, Math.PI * 2);
      ctx.stroke();
    } else if (creature.species.shape === 'hexagon') {
      drawHexagon(x + waveEffect, y, size);
      ctx.stroke();
    } else if (creature.species.shape === 'triangle') {
      drawTriangle(x + waveEffect, y, size);
      ctx.stroke();
    }

    // Tentacules (selon l'espèce et les traits)
    const tentacleLength = size * 0.8 * (1 + creature.traits.detectionBonus * 0.5); // Plus long si détection augmentée
    const tentacleOffset = size * 0.5;
    const animationPhase = Math.sin(frameCount * 0.2); // Animation basée sur frameCount
    const tentacleCount = creature.species.tentacleCount;

    // Dessiner les tentacules selon le nombre défini par l'espèce
    for (let i = 0; i < tentacleCount; i++) {
      const angle = (i / tentacleCount) * Math.PI * 2;
      const tentacleX = x + waveEffect + Math.cos(angle) * tentacleOffset;
      const tentacleY = y + Math.sin(angle) * tentacleOffset;
      const tentacleEndX = tentacleX + Math.cos(angle + animationPhase * 0.5) * tentacleLength;
      const tentacleEndY = tentacleY + Math.sin(angle + animationPhase * 0.5) * tentacleLength;

      ctx.strokeStyle = '#4A148C'; // Violet foncé pour les tentacules
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(tentacleX, tentacleY);
      ctx.lineTo(tentacleEndX, tentacleEndY);
      ctx.stroke();
    }

    // Afficher la génération au centre du corps
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`${creature.generation}`, x + waveEffect, y + 4); // +4 pour centrer verticalement

    // Afficher le compteur de durée de vie au-dessus de la tête
    const remainingSeconds = Math.ceil(creature.lifespan / 30); // Convertir ticks en secondes (30 FPS)
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`${remainingSeconds}s`, x + waveEffect, y - size - 10);
  });

  // Dessiner les humains et leurs lignes de pêche (si présents)
  if (humans.length > 0) {
    humans.forEach(human => {
      const x = human.x * tileSize + tileSize / 2;
      const y = human.y * tileSize + tileSize / 2;

      // Dessiner l'humain
      ctx.fillStyle = human.gender === 'male' ? '#FFD700' : '#FF69B4';
      ctx.fillRect(x - 10, y - 10, 20, 20);

      // Dessiner la ligne de pêche si en train de pêcher
      if (human.fishing) {
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 2]);
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, canvas.height - tileSize); // Ligne jusqu'au bas de l'eau
        ctx.stroke();
        ctx.setLineDash([]);
      }
    });
  }
}

// Boucle de jeu
function gameLoop() {
  frameCount++; // Incrémenter pour l'animation des tentacules et le flottement

  // Événement : Bloom de nourriture toutes les 2 minutes
  if (frameCount % 3600 === 0) { // 2 minutes (3600 ticks à 30 FPS)
    bloomZone = {
      x: Math.floor(Math.random() * gridSize),
      y: humans.length > 0 ? Math.floor(Math.random() * (gridSize - 4)) + 4 : Math.floor(Math.random() * gridSize), // Dans l'eau si humains présents
    };
    window.addFood(); // Ajouter de la nourriture dans la zone de bloom
    setTimeout(() => {
      bloomZone = null;
    }, 15000); // Bloom dure 15 secondes
  }

  // Événement : Tempête toutes les 3 minutes
  if (frameCount % 5400 === 0) { // 3 minutes (5400 ticks à 30 FPS)
    stormActive = true;
    setTimeout(() => {
      stormActive = false;
    }, 20000); // Tempête dure 20 secondes
  }

  // Introduire de nouvelles espèces après un certain temps
  if (frameCount % 1800 === 0) { // Toutes les 1 minute (1800 ticks à 30 FPS)
    const newSpeciesIndex = Math.floor(frameCount / 1800) % speciesTypes.length;
    const newSpecies = speciesTypes[newSpeciesIndex];
    const speciesCount = creatures.filter(creature => creature.species.name === newSpecies.name && creature.size < maxSize).length;
    if (speciesCount < maxCreaturesPerSpecies) { // Vérifier la limite par espèce
      creatures.forEach(creature => {
        if (Math.random() < 0.5) { // 50% de chances pour chaque créature de changer d'espèce
          const currentSpeciesCount = creatures.filter(c => c.species.name === newSpecies.name && c.size < maxSize).length;
          if (currentSpeciesCount < maxCreaturesPerSpecies) {
            creature.species = newSpecies;
            creature.color = newSpecies.color[Math.min(creature.generation, newSpecies.color.length - 1)];
            activeSpecies.add(newSpecies.name); // Mettre à jour la légende
            updateSpeciesLegend();
          }
        }
      });
    }
  }

  // Apparition des humains lorsque l'écosystème est développé
  if (!humansSpawned && creatures.length >= humansSpawnThreshold) {
    generateHumans();
    humansSpawned = true;
    humans.forEach(human => {
      const message = humanIntroMessages[Math.floor(Math.random() * humanIntroMessages.length)];
      showBubble('human', message, human);
    });
  }

  // Gérer les humains (si présents)
  if (humans.length > 0) {
    humans.forEach(human => {
      // Déplacement horizontal
      human.x += human.direction * 0.1;
      if (human.x <= 0 || human.x >= gridSize - 1) {
        human.direction *= -1; // Inverser la direction
      }

      // Gestion de la pêche
      if (human.fishingCooldown > 0) {
        human.fishingCooldown--;
      } else {
        if (!human.fishing) {
          human.fishing = true;
          human.fishingCooldown = 300; // Pêche pendant 10 secondes
        } else {
          human.fishing = false;
          human.fishingCooldown = 150; // Attendre 5 secondes avant de repêcher
        }
      }

      // Pêcher une créature de manière aléatoire si elle est à proximité
      if (human.fishing) {
        const humanPixelX = human.x * tileSize + tileSize / 2;
        const humanPixelY = human.y * tileSize + tileSize / 2;
        const fishingRange = 2 * tileSize; // Portée de la ligne de pêche

        const nearbyCreatures = creatures.filter(creature => {
          const creaturePixelX = creature.x * tileSize + tileSize / 2;
          const creaturePixelY = creature.y * tileSize + tileSize / 2;
          const distance = Math.sqrt((humanPixelX - creaturePixelX) ** 2 + (humanPixelY - creaturePixelY) ** 2);
          return distance <= fishingRange && creature.y > gridSize * 0.2 / tileSize; // Créature dans l'eau
        });

        if (nearbyCreatures.length > 0 && Math.random() < 0.05) { // 5% de chance de pêcher par tick
          const creatureIndex = Math.floor(Math.random() * nearbyCreatures.length);
          const creature = nearbyCreatures[creatureIndex];
          const isPredator = creature.size >= maxSize;
          const catchProbability = isPredator ? 0.3 : 0.7; // Prédateurs plus difficiles à attraper

          if (Math.random() < catchProbability) {
            const creatureIdx = creatures.indexOf(creature);
            if (creatureIdx !== -1) {
              const foodValue = isPredator ? 5 : creature.species.foodValue; // Valeur de nourriture selon l'espèce
              human.foodCollected += foodValue;
              creatures.splice(creatureIdx, 1); // Supprimer la créature
              updateSpeciesLegend();
            }
          }
        }
      }
    });
  }

  creatures.forEach(creature => {
    // Ajouter un effet de flottement
    creature.floatOffset = Math.sin(frameCount * 0.05 + creature.x + creature.y) * 5; // Léger mouvement vertical

    // Réduire la durée de vie
    creature.lifespan -= 1;

    // Ajuster le cooldown de déplacement en fonction de la taille et des traits
    const sizeFactor = Math.max(1, creature.size / 15); // Plus la créature est grosse, plus elle est lente
    const speedFactor = 1 + creature.traits.speedBonus * 0.5; // Bonus de vitesse
    creature.moveCooldown = Math.max(0, creature.moveCooldown - speedFactor); // Décrémentation ajustée

    // Système de messages amusants pour inciter à ajouter de la nourriture (toutes les 15 secondes)
    creature.lastBubbleTime++;
    if (creature.lastBubbleTime > 450) { // 15 secondes à 30 FPS
      let message;
      // Vérifier si le chemin est bloqué
      let pathToFood = [];
      if (foodItems.length > 0) {
        pathToFood = findPath(creature, foodItems, gridSize, walls);
      }
      const isPathBlocked = foodItems.length > 0 && pathToFood.length === 0;

      if (isPathBlocked) {
        message = blockedMessages[Math.floor(Math.random() * blockedMessages.length)];
      } else if (humans.length > 0) {
        message = humanPresentMessages[Math.floor(Math.random() * humanPresentMessages.length)];
      } else {
        message = funnyMessages[Math.floor(Math.random() * funnyMessages.length)];
      }

      showBubble('creature', message, creature);
      creature.lastBubbleTime = 0; // Réinitialiser le compteur
    }

    // Mouvement aléatoire si pas d'action (errance)
    if (creature.moveCooldown <= 0) {
      const detectionRange = stormActive ? 2 : 5; // Réduire la portée pendant une tempête
      const hasFoodTarget = foodItems.length > 0;
      const hasPredatorNearby = creatures.some(c => c.isPredator && c.size > creature.size && Math.sqrt((creature.x - c.x) ** 2 + (creature.y - c.y) ** 2) < detectionRange + creature.traits.detectionBonus);
      const hasPreyTarget = foodItems.length === 0 && creature.isAdult && (creatures.some(c => !c.isAdult && c.size < creature.size && Math.sqrt((creature.x - c.x) ** 2 + (creature.y - c.y) ** 2) < detectionRange + creature.traits.detectionBonus) || (creature.isPredator && creatures.some(c => c !== creature && c.isAdult && c.size < creature.size && Math.sqrt((creature.x - c.x) ** 2 + (creature.y - c.y) ** 2) < detectionRange + creature.traits.detectionBonus)));

      if (!hasFoodTarget && !hasPredatorNearby && !hasPreyTarget) {
        // Changer de direction aléatoirement toutes les 5 secondes
        if (frameCount % 150 === 0) {
          creature.wanderDirection = { dx: Math.random() * 2 - 1, dy: Math.random() * 2 - 1 };
        }

        const newX = Math.round(creature.x + creature.wanderDirection.dx);
        const newY = Math.round(creature.y + creature.wanderDirection.dy);

        // Vérifier si la nouvelle position est valide
        if (
          newX >= 0 && newX < gridSize &&
          newY >= 0 && newY < gridSize &&
          (humans.length === 0 || newY > gridSize * 0.2 / tileSize) && // Rester dans l'eau si humains présents
          !creatures.some(c => Math.round(c.x) === newX && Math.round(c.y) === newY) &&
          !walls.some(wall => wall.x === newX && wall.y === newY)
        ) {
          // Vérifier que le chemin est libre (pas de mur sur le trajet)
          const path = findPath(creature, [{ x: newX, y: newY }], gridSize, walls);
          if (path.length > 1) {
            creature.x = newX;
            creature.y = newY;
            creature.moveCooldown = baseCooldown * sizeFactor;
            creature.lastPath = path;
            creature.lastTarget = null; // Pas de cible spécifique
          }
        }
      }
    }
  });

  // Supprimer les créatures mortes
  const deadCreatures = creatures.filter(creature => creature.lifespan <= 0);
  creatures = creatures.filter(creature => creature.lifespan > 0);

  // Lâcher de la nourriture en fonction de la taille quand une créature meurt
  deadCreatures.forEach(deadCreature => {
    const foodCount = Math.floor(deadCreature.size / 10); // 1 nourriture par tranche de 10 pixels de taille
    for (let i = 0; i < foodCount; i++) {
      const offsetX = (Math.random() - 0.5) * 2; // Décalage aléatoire entre -1 et 1
      const offsetY = (Math.random() - 0.5) * 2;
      const foodX = Math.min(Math.max(Math.round(deadCreature.x + offsetX), 0), gridSize - 1);
      const foodY = Math.min(Math.max(Math.round(deadCreature.y + offsetY), 0), gridSize - 1);
      foodItems.push({
        x: foodX,
        y: foodY,
        energy: 50
      });
    }
  });

  creatures.forEach(creature => {
    // Si prédateur, manger toutes les nourritures dans le rayon
    if (creature.isPredator) {
      const eatRadius = creature.size / 2; // Rayon de consommation basé sur la taille
      const creaturePixelX = creature.x * tileSize + tileSize / 2;
      const creaturePixelY = creature.y * tileSize + tileSize / 2;

      foodItems.forEach((food, index) => {
        const foodPixelX = food.x * tileSize + tileSize / 2;
        const foodPixelY = food.y * tileSize + tileSize / 2;
        const distance = Math.sqrt((creaturePixelX - foodPixelX) ** 2 + (creaturePixelY - foodPixelY) ** 2);

        if (distance <= eatRadius) {
          // Manger la nourriture
          foodItems.splice(index, 1);
          if (creature.size < maxSize) {
            creature.size += 1; // Grossir de 1 pixel (réduit par rapport à 2)
            creature.lifespan = Math.min(creature.lifespan + 300, 1800 + creature.traits.lifespanBonus * 900); // Ajouter 10 secondes de vie (max 60s)
          }
        }
      });
    }

    // IA pour se cacher sous les algues si un prédateur est à proximité
    if (!creature.isPredator && creature.moveCooldown <= 0) {
      const detectionRange = stormActive ? 2 : 5; // Réduire la portée pendant une tempête
      const nearestPredator = creatures.find(c => c.isPredator && c.size > creature.size);
      if (nearestPredator) {
        const predatorDistance = Math.sqrt((creature.x - nearestPredator.x) ** 2 + (creature.y - nearestPredator.y) ** 2);
        if (predatorDistance < detectionRange + creature.traits.detectionBonus) { // Se cacher si prédateur à moins de 5 cases
          const nearestAlga = algae.reduce((closest, alga) => {
            const distance = Math.sqrt((creature.x - alga.x) ** 2 + (creature.y - alga.y) ** 2);
            return distance < Math.sqrt((creature.x - closest.x) ** 2 + (creature.y - closest.y) ** 2) ? alga : closest;
          }, algae[0]);
          const path = findPath(creature, [{ x: nearestAlga.x, y: nearestAlga.y }], gridSize, walls);
          if (path.length > 1) {
            const nextStep = path[1];
            creature.x = nextStep.x;
            creature.y = nextStep.y;
            const sizeFactor = Math.max(1, creature.size / 15);
            creature.moveCooldown = baseCooldown * sizeFactor;
            creature.lastPath = path;
            creature.lastTarget = nearestAlga;
            return; // Arrêter ici pour éviter d'autres actions
          }
        }
      }
    }

    // Décider de l'action via l'IA
    let action = decideAction(creature, foodItems, gridSize, walls);

    // Si pas de nourriture et adulte, chercher à manger un petit ou un autre adulte
    if (foodItems.length === 0 && creature.isAdult && creature.moveCooldown <= 0) {
      const detectionRange = stormActive ? 2 : 5; // Réduire la portée pendant une tempête
      // Chercher un petit à manger
      let target = creatures.find(c => !c.isAdult && Math.round(c.x) === Math.round(creature.x) && Math.round(c.y) === Math.round(creature.y) && c.size < creature.size);
      if (target) {
        // Manger le petit
        creatures.splice(creatures.indexOf(target), 1);
        creature.isPredator = true; // Devenir prédateur
        if (creature.size < maxSize) {
          creature.size += 1; // Grossir de 1 pixel
          creature.lifespan = Math.min(creature.lifespan + 300, 1800 + creature.traits.lifespanBonus * 900); // Ajouter 10 secondes de vie (max 60s)
        }
        return;
      }

      // Si prédateur, chercher un autre adulte à manger
      if (creature.isPredator) {
        target = creatures.find(c => c !== creature && c.isAdult && Math.round(c.x) === Math.round(creature.x) && Math.round(c.y) === Math.round(creature.y) && c.size < creature.size);
        if (target) {
          // Manger l'autre adulte
          creatures.splice(creatures.indexOf(target), 1);
          if (creature.size < maxSize) {
            creature.size += 1; // Grossir de 1 pixel
            creature.lifespan = Math.min(creature.lifespan + 300, 1800 + creature.traits.lifespanBonus * 900); // Ajouter 10 secondes de vie (max 60s)
          }
          return;
        }

        // Si pas de cible sur la même case, chercher une cible à proximité et se déplacer
        const nearestSmall = creatures.find(c => !c.isAdult && c.size < creature.size && Math.sqrt((creature.x - c.x) ** 2 + (creature.y - c.y) ** 2) < detectionRange + creature.traits.detectionBonus);
        const nearestAdult = creature.isPredator ? creatures.find(c => c !== creature && c.isAdult && c.size < creature.size && Math.sqrt((creature.x - c.x) ** 2 + (creature.y - c.y) ** 2) < detectionRange + creature.traits.detectionBonus) : null;
        const targetCreature = nearestSmall || nearestAdult;
        if (targetCreature) {
          // Ne pas attaquer si la cible est sous une algue
          const isTargetUnderAlgae = algae.some(alga => Math.round(targetCreature.x) === alga.x && Math.round(targetCreature.y) === alga.y);
          if (isTargetUnderAlgae) return; // Ne pas attaquer si la cible est protégée

          const path = findPath(creature, [{ x: Math.round(targetCreature.x), y: Math.round(targetCreature.y) }], gridSize, walls);
          if (path.length > 1) {
            const nextStep = path[1];
            creature.x = nextStep.x;
            creature.y = nextStep.y;
            const sizeFactor = Math.max(1, creature.size / 15);
            creature.moveCooldown = baseCooldown * sizeFactor; // Cooldown ajusté
            creature.lastPath = path;
            creature.lastTarget = targetCreature;
          }
          return;
        }
      }
    }

    // Exécuter l'action normale (aller vers la nourriture)
    if (action === 'move' && creature.moveCooldown <= 0) {
      const path = findPath(creature, foodItems, gridSize, walls);
      if (path.length > 1) {
        // Sauter directement à la prochaine case du chemin
        const nextStep = path[1];
        creature.x = nextStep.x;
        creature.y = nextStep.y;
        const sizeFactor = Math.max(1, creature.size / 15);
        creature.moveCooldown = baseCooldown * sizeFactor; // Cooldown ajusté
        creature.lastPath = path;
        creature.lastTarget = foodItems[0];
      }
    } else if (action === 'eat') {
      const foodIndex = foodItems.findIndex(food => Math.round(creature.x) === food.x && Math.round(creature.y) === food.y);
      if (foodIndex !== -1) {
        creature.foodEaten += 1; // Incrémenter le compteur de nourriture consommée
        foodItems.splice(foodIndex, 1);

        // Croissance après avoir mangé 2 unités de nourriture
        if (!creature.isAdult && creature.foodEaten >= 2) {
          creature.isAdult = true;
        }

        // Grossir si adulte
        if (creature.isAdult) {
          if (creature.size < maxSize) {
            creature.size += 1; // Grossir de 1 pixel (réduit par rapport à 2)
            creature.lifespan = Math.min(creature.lifespan + 300, 1800 + creature.traits.lifespanBonus * 900); // Ajouter 10 secondes de vie (max 60s)
          }
        }

        // Duplication après 5 unités de nourriture
        if (creature.foodEaten >= 5) {
          const speciesCount = creatures.filter(c => c.species.name === creature.species.name && c.size < maxSize).length;
          const predatorCount = creatures.filter(c => c.size >= maxSize).length;

          if (speciesCount >= maxCreaturesPerSpecies) {
            showLimitMessage(`Limite de ${maxCreaturesPerSpecies} créatures atteinte pour l'espèce ${creature.species.name} !`);
            return;
          }
          if (predatorCount >= maxPredators && creature.size >= maxSize) {
            showLimitMessage(`Limite de ${maxPredators} prédateurs atteinte !`);
            return;
          }

          const newPosition = findFreePosition(Math.round(creature.x), Math.round(creature.y));
          const newSpecies = Math.random() < 0.1 ? speciesTypes[Math.floor(Math.random() * speciesTypes.length)] : creature.species; // 10% de chance de muter

          // Vérifier la limite pour la nouvelle espèce
          const newSpeciesCount = creatures.filter(c => c.species.name === newSpecies.name && c.size < maxSize).length;
          if (newSpeciesCount >= maxCreaturesPerSpecies) {
            showLimitMessage(`Limite de ${maxCreaturesPerSpecies} créatures atteinte pour l'espèce ${newSpecies.name} !`);
            return;
          }

          const newCreature = {
            x: newPosition.x,
            y: humans.length > 0 && newPosition.y <= gridSize * 0.2 / tileSize ? gridSize - 1 : newPosition.y, // Forcer dans l'eau si humains présents
            ...creatureType,
            species: newSpecies, // Hérite ou mute
            color: newSpecies.color[Math.min(creature.generation + 1, newSpecies.color.length - 1)],
            foodEaten: 0,
            isOriginal: false,
            isAdult: false,
            floatOffset: Math.random() * 10,
            generation: creature.generation + 1,
            wanderDirection: { dx: Math.random() * 2 - 1, dy: Math.random() * 2 - 1 },
            traits: { ...creature.traits },
            lastBubbleTime: 0
          };

          // Évolution des traits
          if (Math.random() < 0.2) { // 20% de chance d'évolution
            const trait = Math.floor(Math.random() * 3);
            if (trait === 0) newCreature.traits.speedBonus += 1;
            else if (trait === 1) newCreature.traits.lifespanBonus += 1;
            else newCreature.traits.detectionBonus += 1;

            // Appliquer les traits à l'espèce
            const speciesToUpdate = speciesTypes.find(s => s.name === newCreature.species.name);
            speciesToUpdate.traits = { ...newCreature.traits };
          }

          creatures.push(newCreature);
          activeSpecies.add(newCreature.species.name); // Mettre à jour la légende
          updateSpeciesLegend();
          creature.foodEaten = 0; // Réinitialiser le compteur pour la créature originale
        }
      }
    }
  });

  draw();
  updateCounts();
}

// Dessiner la courbe des statistiques
function drawStatsCurve() {
  const statsCanvas = document.getElementById('statsCanvas');
  const statsCtx = statsCanvas.getContext('2d');
  statsCanvas.width = gridSize * tileSize + 60; // Ajout de place pour les annotations
  statsCanvas.height = 150; // Hauteur augmentée pour la courbe

  // Effacer le canvas
  statsCtx.fillStyle = 'rgba(30, 58, 138, 0.7)';
  statsCtx.fillRect(0, 0, statsCanvas.width, statsCanvas.height);

  // Trouver les valeurs maximales pour normaliser la courbe
  const maxCreatures = Math.max(1, ...statsHistory.creatures);
  const maxFood = Math.max(1, ...statsHistory.food);
  const maxValue = Math.max(maxCreatures, maxFood, 10); // Minimum 10 pour l'échelle

  // Dessiner l'axe Y (ordonnée) à gauche
  const axisXOffset = 40; // Espace pour l'axe Y
  const axisYOffset = 10; // Espace pour l'axe X
  statsCtx.fillStyle = '#E0E0E0';
  statsCtx.font = '10px Arial';
  statsCtx.textAlign = 'right';
  statsCtx.textBaseline = 'middle';
  const numTicksY = 5; // Nombre de graduations sur l'axe Y
  for (let i = 0; i <= numTicksY; i++) {
    const value = (i / numTicksY) * maxValue;
    const y = (statsCanvas.height - axisYOffset) - (i / numTicksY) * (statsCanvas.height - axisYOffset - 10);
    statsCtx.fillText(Math.round(value), axisXOffset - 5, y);
  }

  // Dessiner l'axe X (abscisse) en bas
  statsCtx.fillStyle = '#E0E0E0';
  statsCtx.font = '10px Arial';
  statsCtx.textAlign = 'center';
  statsCtx.textBaseline = 'top';
  const numTicksX = 5; // Nombre de graduations sur l'axe X
  const totalPoints = statsHistory.creatures.length;
  for (let i = 0; i <= numTicksX; i++) {
    const x = axisXOffset + (i / numTicksX) * (statsCanvas.width - axisXOffset - 10);
    const time = Math.round((i / numTicksX) * (totalPoints / 30)); // Temps en secondes
    statsCtx.fillText(time + 's', x, statsCanvas.height - axisYOffset + 5);
  }

  // Dessiner la courbe des créatures (vert clair)
  statsCtx.beginPath();
  statsCtx.strokeStyle = '#00FF00'; // Vert clair
  statsCtx.lineWidth = 2;
  for (let i = 0; i < statsHistory.creatures.length; i++) {
    const x = axisXOffset + (i / (statsHistory.creatures.length - 1)) * (statsCanvas.width - axisXOffset - 10);
    const y = (statsCanvas.height - axisYOffset) - (statsHistory.creatures[i] / maxValue) * (statsCanvas.height - axisYOffset - 10);
    if (i === 0 || isNaN(x)) {
      statsCtx.moveTo(x, statsCanvas.height - axisYOffset);
    } else {
      statsCtx.lineTo(x, y);
    }
  }
  statsCtx.stroke();

  // Dessiner la courbe de la nourriture (orange)
  statsCtx.beginPath();
  statsCtx.strokeStyle = '#FF4500'; // Orange
  statsCtx.lineWidth = 2;
  for (let i = 0; i < statsHistory.food.length; i++) {
    const x = axisXOffset + (i / (statsHistory.food.length - 1)) * (statsCanvas.width - axisXOffset - 10);
    const y = (statsCanvas.height - axisYOffset) - (statsHistory.food[i] / maxValue) * (statsCanvas.height - axisYOffset - 10);
    if (i === 0 || isNaN(x)) {
      statsCtx.moveTo(x, statsCanvas.height - axisYOffset);
    } else {
      statsCtx.lineTo(x, y);
    }
  }
  statsCtx.stroke();

  // Ajouter une légende
  statsCtx.fillStyle = '#E0E0E0';
  statsCtx.font = '12px Arial';
  statsCtx.textAlign = 'left';
  statsCtx.textBaseline = 'middle';
  statsCtx.fillText('Créatures', 10, 20);
  statsCtx.fillStyle = '#00FF00';
  statsCtx.fillRect(70, 15, 20, 10);
  statsCtx.fillStyle = '#E0E0E0';
  statsCtx.fillText('Nourriture', 100, 20);
  statsCtx.fillStyle = '#FF4500';
  statsCtx.fillRect(160, 15, 20, 10);
}

// Lancer le jeu
setInterval(gameLoop, 1000 / 30); // 30 FPS
draw();
updateCounts();