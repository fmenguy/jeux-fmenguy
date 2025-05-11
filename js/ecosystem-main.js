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
let frameCount = 0; // Pour l'animation des jambes

// Type de créature (seulement herbivore)
const creatureType = {
  color: '#4CAF50', // Vert pour les herbivores
  size: 15, // Augmenté de 10 à 15 pour plus de visibilité
  energy: 100,
  maxEnergy: 100,
  speed: 1,
  foodEaten: 0 // Compteur de nourriture consommée
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

// Mettre à jour les compteurs
function updateCounts() {
  document.getElementById('creatureCount').textContent = creatures.length;
  document.getElementById('foodCount').textContent = foodItems.length;
}

// Dessiner le jeu
function draw() {
  // Effacer le canvas
  ctx.fillStyle = '#d2b48c';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Dessiner les chemins des créatures
  creatures.forEach(creature => {
    const path = findPath(creature, foodItems, gridSize);
    if (path.length > 1) {
      ctx.beginPath();
      ctx.moveTo(creature.x * tileSize + tileSize / 2, creature.y * tileSize + tileSize / 2);
      for (let i = 1; i < path.length; i++) {
        const point = path[i];
        ctx.lineTo(point.x * tileSize + tileSize / 2, point.y * tileSize + tileSize / 2);
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

  // Dessiner les créatures avec des jambes
  creatures.forEach(creature => {
    const x = creature.x * tileSize + tileSize / 2;
    const y = creature.y * tileSize + tileSize / 2;

    // Corps (cercle)
    ctx.fillStyle = creature.color;
    ctx.beginPath();
    ctx.arc(x, y, creature.size, 0, Math.PI * 2);
    ctx.fill();

    // Jambes (deux lignes animées)
    const legLength = creature.size * 0.8;
    const legOffset = creature.size * 0.5;
    const animationPhase = Math.sin(frameCount * 0.2); // Animation basée sur frameCount

    // Jambe gauche
    ctx.strokeStyle = '#2E7D32'; // Vert plus foncé pour les jambes
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x - legOffset, y + creature.size);
    ctx.lineTo(x - legOffset + animationPhase * 5, y + creature.size + legLength);
    ctx.stroke();

    // Jambe droite
    ctx.beginPath();
    ctx.moveTo(x + legOffset, y + creature.size);
    ctx.lineTo(x + legOffset - animationPhase * 5, y + creature.size + legLength);
    ctx.stroke();
  });
}

// Boucle de jeu
function gameLoop() {
  frameCount++; // Incrémenter pour l'animation des jambes

  creatures.forEach((creature, index) => {
    // Perdre de l'énergie
    creature.energy -= 1.5;

    // Mort par manque d'énergie
    if (creature.energy <= 0) {
      creatures.splice(index, 1);
      updateCounts();
      return;
    }

    // Décider de l'action via l'IA
    const action = decideAction(creature, foodItems, gridSize);

    // Exécuter l'action
    if (action === 'move') {
      const path = findPath(creature, foodItems, gridSize);
      if (path.length > 1) {
        // Se déplacer vers la prochaine case du chemin
        const nextStep = path[1];
        creature.x = nextStep.x;
        creature.y = nextStep.y;
      }
    } else if (action === 'eat') {
      const foodIndex = foodItems.findIndex(food => food.x === creature.x && food.y === creature.y);
      if (foodIndex !== -1) {
        creature.energy = Math.min(creature.energy + foodItems[foodIndex].energy, creature.maxEnergy);
        creature.foodEaten += 1; // Incrémenter le compteur de nourriture consommée
        foodItems.splice(foodIndex, 1);

        // Duplication après 5 unités de nourriture
        if (creature.foodEaten >= 5) {
          const newCreature = {
            x: creature.x,
            y: creature.y,
            ...creatureType,
            foodEaten: 0 // Nouvelle créature commence avec 0 nourriture consommée
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