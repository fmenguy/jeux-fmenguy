import { decideAction } from './ecosystem-ai.js';

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

// Types de créatures
const creatureTypes = {
  herbivore: { color: '#4CAF50', size: 10, energy: 100, maxEnergy: 100, speed: 1 },
  carnivore: { color: '#FF0000', size: 12, energy: 150, maxEnergy: 150, speed: 1.5 }
};

// Ajouter une créature
window.addCreature = (type) => {
  const creature = {
    type,
    x: Math.floor(Math.random() * gridSize),
    y: Math.floor(Math.random() * gridSize),
    ...creatureTypes[type],
    energy: creatureTypes[type].energy
  };
  creatures.push(creature);
  updateCounts();
};

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
  document.getElementById('herbivoreCount').textContent = creatures.filter(c => c.type === 'herbivore').length;
  document.getElementById('carnivoreCount').textContent = creatures.filter(c => c.type === 'carnivore').length;
  document.getElementById('foodCount').textContent = foodItems.length;
}

// Dessiner le jeu
function draw() {
  // Effacer le canvas
  ctx.fillStyle = '#d2b48c';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Dessiner la nourriture
  foodItems.forEach(food => {
    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    ctx.arc(food.x * tileSize + tileSize / 2, food.y * tileSize + tileSize / 2, 5, 0, Math.PI * 2);
    ctx.fill();
  });

  // Dessiner les créatures
  creatures.forEach(creature => {
    ctx.fillStyle = creature.color;
    ctx.beginPath();
    ctx.arc(creature.x * tileSize + tileSize / 2, creature.y * tileSize + tileSize / 2, creature.size, 0, Math.PI * 2);
    ctx.fill();
  });
}

// Boucle de jeu
function gameLoop() {
  creatures.forEach((creature, index) => {
    // Perdre de l'énergie
    creature.energy -= 0.5;

    // Mourir si plus d'énergie
    if (creature.energy <= 0) {
      creatures.splice(index, 1);
      updateCounts();
      return;
    }

    // Décider de l'action via l'IA
    const action = decideAction(creature, creatures, foodItems, gridSize);

    // Exécuter l'action
    if (action === 'move') {
      const directions = [
        { dx: 0, dy: -1 }, // Haut
        { dx: 0, dy: 1 },  // Bas
        { dx: -1, dy: 0 }, // Gauche
        { dx: 1, dy: 0 }   // Droite
      ];
      const dir = directions[Math.floor(Math.random() * directions.length)];
      const newX = creature.x + dir.dx * creature.speed;
      const newY = creature.y + dir.dy * creature.speed;
      if (newX >= 0 && newX < gridSize && newY >= 0 && newY < gridSize) {
        creature.x = newX;
        creature.y = newY;
      }
    } else if (action === 'eat') {
      if (creature.type === 'herbivore') {
        const foodIndex = foodItems.findIndex(food => food.x === creature.x && food.y === creature.y);
        if (foodIndex !== -1) {
          creature.energy = Math.min(creature.energy + foodItems[foodIndex].energy, creature.maxEnergy);
          foodItems.splice(foodIndex, 1);
        }
      } else if (creature.type === 'carnivore') {
        const preyIndex = creatures.findIndex(c => c.type === 'herbivore' && c.x === creature.x && c.y === creature.y);
        if (preyIndex !== -1) {
          creature.energy = Math.min(creature.energy + 50, creature.maxEnergy);
          creatures.splice(preyIndex, 1);
        }
      }
    } else if (action === 'reproduce' && creature.energy > creature.maxEnergy * 0.8) {
      addCreature(creature.type);
      creature.energy -= 30;
    }
  });

  // Régénérer de la nourriture aléatoirement
  if (Math.random() < 0.05) addFood();

  draw();
  updateCounts();
}

// Lancer le jeu
setInterval(gameLoop, 1000 / 30); // 30 FPS
draw();