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
let frameCount = 0; // Pour l'animation des tentacules

// Type de créature (méduse-like)
const creatureType = {
  color: '#AB47BC', // Violet pour la créature initiale
  size: 15,
  speed: 1,
  foodEaten: 0, // Compteur de nourriture consommée
  lifespan: 900, // 30 secondes à 30 FPS (30 * 30 = 900 ticks)
  isOriginal: true // Indique si c'est la créature initiale
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
  // Effacer le canvas avec un fond bleu (sous-marin)
  ctx.fillStyle = '#1E88E5';
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

  // Dessiner les créatures avec des tentacules
  creatures.forEach(creature => {
    const x = creature.x * tileSize + tileSize / 2;
    const y = creature.y * tileSize + tileSize / 2;

    // Corps (cercle)
    ctx.fillStyle = creature.isOriginal ? creatureType.color : '#CE93D8'; // Violet clair pour les duplicatas
    ctx.beginPath();
    ctx.arc(x, y, creature.size, 0, Math.PI * 2);
    ctx.fill();

    // Tentacules (trois lignes animées)
    const tentacleLength = creature.size * 0.8;
    const tentacleOffset = creature.size * 0.5;
    const animationPhase = Math.sin(frameCount * 0.2); // Animation basée sur frameCount

    // Tentacule gauche
    ctx.strokeStyle = '#4A148C'; // Violet foncé pour les tentacules
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x - tentacleOffset, y + creature.size);
    ctx.lineTo(x - tentacleOffset + animationPhase * 5, y + creature.size + tentacleLength);
    ctx.stroke();

    // Tentacule droite
    ctx.beginPath();
    ctx.moveTo(x + tentacleOffset, y + creature.size);
    ctx.lineTo(x + tentacleOffset - animationPhase * 5, y + creature.size + tentacleLength);
    ctx.stroke();

    // Tentacule central
    ctx.beginPath();
    ctx.moveTo(x, y + creature.size);
    ctx.lineTo(x + animationPhase * 3, y + creature.size + tentacleLength);
    ctx.stroke();

    // Afficher le compteur de durée de vie au-dessus de la tête
    const remainingSeconds = Math.ceil(creature.lifespan / 30); // Convertir ticks en secondes (30 FPS)
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`${remainingSeconds}s`, x, y - creature.size - 10);
  });
}

// Boucle de jeu
function gameLoop() {
  frameCount++; // Incrémenter pour l'animation des tentacules

  creatures.forEach((creature, index) => {
    // Réduire la durée de vie
    creature.lifespan -= 1;

    // Mort par fin de durée de vie
    if (creature.lifespan <= 0) {
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
        creature.foodEaten += 1; // Incrémenter le compteur de nourriture consommée
        foodItems.splice(foodIndex, 1);

        // Duplication après 5 unités de nourriture
        if (creature.foodEaten >= 5) {
          const newCreature = {
            x: creature.x,
            y: creature.y,
            ...creatureType,
            foodEaten: 0, // Nouvelle créature commence avec 0 nourriture consommée
            isOriginal: false // Marquer comme duplicata
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