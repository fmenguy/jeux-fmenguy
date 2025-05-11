import { decideAction, findPath } from './ecosystem-ai.js';

// Configuration du canvas
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const gridSize = 20;
const tileSize = 30;
canvas.width = gridSize * tileSize;
canvas.height = gridSize * tileSize;

// État du jeu
let creatures = [];
let foodItems = [];
let frameCount = 0; // Pour l'animation des tentacules et le flottement

// Type de créature (méduse-like)
const creatureType = {
  color: '#AB47BC', // Violet pour la créature initiale
  size: 15, // Taille adulte
  speed: 1, // Saut d'une case par tick (ralenti par un cooldown)
  foodEaten: 0, // Compteur de nourriture consommée
  lifespan: 1800, // 60 secondes à 30 FPS (60 * 30 = 1800 ticks) pour tester
  isOriginal: true, // Indique si c'est la créature initiale
  isAdult: true, // Indique si la créature est adulte
  floatOffset: 0, // Pour le flottement
  moveCooldown: 0 // Cooldown pour ralentir le déplacement
};

// Initialisation avec une seule créature
const initialCreature = {
  x: Math.floor(gridSize / 2),
  y: Math.floor(gridSize / 2),
  ...creatureType
};
creatures.push(initialCreature);
console.log('Créature initiale ajoutée :', initialCreature); // Debug

// Ajouter de la nourriture
window.addFood = () => {
  const food = {
    x: Math.floor(Math.random() * gridSize),
    y: Math.floor(Math.random() * gridSize),
    energy: 50
  };
  foodItems.push(food);
  updateCounts();
};

// Faire réapparaître une créature initiale
window.respawnCreature = () => {
  if (creatures.length === 0) {
    const newCreature = {
      x: Math.floor(gridSize / 2),
      y: Math.floor(gridSize / 2),
      ...creatureType
    };
    creatures.push(newCreature);
    console.log('Créature réapparue :', newCreature); // Debug
    updateCounts();
  }
};

// Mettre à jour les compteurs et l'état du bouton
function updateCounts() {
  document.getElementById('creatureCount').textContent = creatures.length;
  document.getElementById('foodCount').textContent = foodItems.length;
  const respawnButton = document.getElementById('respawnButton');
  respawnButton.disabled = creatures.length > 0; // Désactiver si des créatures sont présentes
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
      !creatures.some(c => Math.round(c.x) === newX && Math.round(c.y) === newY)
    ) {
      return { x: newX, y: newY };
    }
  }
  // Si aucune position libre, retourner la position actuelle (risque de superposition minimisé)
  return { x, y };
}

// Dessiner le jeu
function draw() {
  // Effacer le canvas avec un fond bleu (sous-marin)
  ctx.fillStyle = '#1E88E5';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Dessiner les chemins des créatures
  creatures.forEach(creature => {
    const path = findPath(creature, foodItems, gridSize);
    if (path.length > 1) {
      ctx.beginPath();
      ctx.moveTo(creature.x * tileSize + tileSize / 2, creature.y * tileSize + tileSize / 2 + creature.floatOffset);
      for (let i = 1; i < path.length; i++) {
        const point = path[i];
        ctx.lineTo(point.x * tileSize + tileSize / 2, point.y * tileSize + tileSize / 2 + creature.floatOffset);
      }
      ctx.strokeStyle = '#FFFFFF';
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

  // Dessiner les créatures avec des tentacules
  creatures.forEach(creature => {
    const x = creature.x * tileSize + tileSize / 2;
    const y = creature.y * tileSize + tileSize / 2 + creature.floatOffset; // Ajout du flottement
    const size = creature.isAdult ? creatureType.size : creatureType.size * 0.6; // Taille réduite pour les bébés

    // Corps (cercle)
    ctx.fillStyle = creature.isOriginal ? creatureType.color : '#CE93D8'; // Violet clair pour les duplicatas
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();

    // Tentacules (trois lignes animées)
    const tentacleLength = size * 0.8;
    const tentacleOffset = size * 0.5;
    const animationPhase = Math.sin(frameCount * 0.2); // Animation basée sur frameCount

    // Tentacule gauche
    ctx.strokeStyle = '#4A148C'; // Violet foncé pour les tentacules
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x - tentacleOffset, y + size);
    ctx.lineTo(x - tentacleOffset + animationPhase * 5, y + size + tentacleLength);
    ctx.stroke();

    // Tentacule droite
    ctx.beginPath();
    ctx.moveTo(x + tentacleOffset, y + size);
    ctx.lineTo(x + tentacleOffset - animationPhase * 5, y + size + tentacleLength);
    ctx.stroke();

    // Tentacule central
    ctx.beginPath();
    ctx.moveTo(x, y + size);
    ctx.lineTo(x + animationPhase * 3, y + size + tentacleLength);
    ctx.stroke();

    // Afficher le compteur de durée de vie au-dessus de la tête
    const remainingSeconds = Math.ceil(creature.lifespan / 30); // Convertir ticks en secondes (30 FPS)
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`${remainingSeconds}s`, x, y - size - 10);
  });
}

// Boucle de jeu
function gameLoop() {
  frameCount++; // Incrémenter pour l'animation des tentacules et le flottement

  creatures.forEach(creature => {
    // Ajouter un effet de flottement
    creature.floatOffset = Math.sin(frameCount * 0.05 + creature.x + creature.y) * 5; // Léger mouvement vertical

    // Réduire la durée de vie
    creature.lifespan -= 1;

    // Réduire le cooldown de déplacement
    if (creature.moveCooldown > 0) {
      creature.moveCooldown -= 1;
    }
  });

  // Supprimer les créatures mortes
  creatures = creatures.filter(creature => creature.lifespan > 0);

  creatures.forEach(creature => {
    // Décider de l'action via l'IA
    const action = decideAction(creature, foodItems, gridSize);

    // Exécuter l'action
    if (action === 'move' && creature.moveCooldown <= 0) {
      const path = findPath(creature, foodItems, gridSize);
      if (path.length > 1) {
        // Sauter directement à la prochaine case du chemin
        const nextStep = path[1];
        creature.x = nextStep.x;
        creature.y = nextStep.y;
        creature.moveCooldown = 15; // Cooldown de 15 ticks (0.5 seconde à 30 FPS)
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

        // Duplication après 5 unités de nourriture
        if (creature.foodEaten >= 5) {
          const newPosition = findFreePosition(Math.round(creature.x), Math.round(creature.y));
          const newCreature = {
            x: newPosition.x,
            y: newPosition.y,
            ...creatureType,
            foodEaten: 0, // Nouvelle créature commence avec 0 nourriture consommée
            isOriginal: false, // Marquer comme duplicata
            isAdult: false, // Commence comme bébé
            floatOffset: Math.random() * 10 // Offset de flottement aléatoire
          };
          creatures.push(newCreature);
          creature.foodEaten = 0; // Réinitialiser le compteur pour la créature originale
        }
      }
    }
  });

  draw();
  updateCounts();
}

// Lancer le jeu
setInterval(gameLoop, 1000 / 30); // 30 FPS
draw();
updateCounts();