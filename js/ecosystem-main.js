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

// Palette de couleurs pour les générations
const generationColors = [
  '#4B0082', // Génération 0 : Indigo foncé
  '#6A0DAD', // Génération 1 : Violet foncé
  '#AB47BC', // Génération 2 : Violet moyen
  '#CE93D8', // Génération 3 : Violet clair
  '#E1BEE7', // Génération 4 : Violet très clair
  '#F3E5F5'  // Génération 5+ : Presque blanc
];

// Type de créature (méduse-like)
const creatureType = {
  color: generationColors[0], // Couleur initiale (génération 0)
  size: 15, // Taille adulte initiale
  speed: 1, // Saut d'une case par tick (ralenti par un cooldown)
  foodEaten: 0, // Compteur de nourriture consommée
  lifespan: 1800, // 60 secondes à 30 FPS (60 * 30 = 1800 ticks) pour tester
  isOriginal: true, // Indique si c'est la créature initiale
  isAdult: true, // Indique si la créature est adulte
  floatOffset: 0, // Pour le flottement
  moveCooldown: 0, // Cooldown pour ralentir le déplacement
  generation: 0, // Génération initiale
  isPredator: false // Indique si la créature est devenue un prédateur
};

// Taille maximale d'une créature
const maxSize = 50; // Taille maximale (en pixels)

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

  // Agrandir la grille si plus de 30 créatures
  if (creatures.length > 30 && gridSize < 40) { // Limite maximale arbitraire à 40x40
    gridSize += 10; // Augmenter la grille de 10 unités
    canvas.width = gridSize * tileSize;
    canvas.height = gridSize * tileSize;

    // Repositionner les créatures et la nourriture si elles dépassent la grille
    creatures.forEach(creature => {
      creature.x = Math.min(creature.x, gridSize - 1);
      creature.y = Math.min(creature.y, gridSize - 1);
    });
    foodItems.forEach(food => {
      food.x = Math.min(food.x, gridSize - 1);
      food.y = Math.min(food.y, gridSize - 1);
    });
  }
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

// Générer des bulles aléatoires
function generateBubble() {
  return {
    x: Math.random() * canvas.width,
    y: canvas.height,
    size: Math.random() * 5 + 2, // Taille entre 2 et 7 pixels
    speed: Math.random() * 2 + 1 // Vitesse de montée entre 1 et 3 pixels par tick
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

// Dessiner le jeu
function draw() {
  // Créer un dégradé pour le fond (bleu sombre à bleu moyen)
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, '#0D1B2A'); // Bleu très sombre (haut)
  gradient.addColorStop(1, '#1B263B'); // Bleu sombre (bas)

  // Effacer le canvas avec le dégradé
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

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

  // Dessiner les chemins des créatures
  creatures.forEach(creature => {
    let path = findPath(creature, foodItems, gridSize);
    let isAttacking = false;

    // Vérifier si la créature est un prédateur et se dirige vers une autre créature
    if (foodItems.length === 0 && creature.isAdult) {
      const nearestSmall = creatures.find(c => !c.isAdult && c.size < creature.size);
      const nearestAdult = creature.isPredator ? creatures.find(c => c !== creature && c.isAdult && c.size < creature.size) : null;
      const targetCreature = nearestSmall || nearestAdult;
      if (targetCreature) {
        path = findPath(creature, [{ x: Math.round(targetCreature.x), y: Math.round(targetCreature.y) }], gridSize);
        isAttacking = true;
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

  // Dessiner les créatures avec des tentacules
  creatures.forEach(creature => {
    const x = creature.x * tileSize + tileSize / 2;
    const y = creature.y * tileSize + tileSize / 2 + creature.floatOffset; // Ajout du flottement
    const size = creature.size; // Taille dynamique
    const waveEffect = Math.sin(frameCount * 0.1 + creature.x + creature.y) * 2; // Effet de vague
    const isMaxSize = creature.size >= maxSize;

    // Corps (cercle ou étoile selon le statut de prédateur et la taille maximale)
    ctx.fillStyle = isMaxSize ? '#000000' : generationColors[Math.min(creature.generation, generationColors.length - 1)];
    if (creature.isPredator && !isMaxSize) {
      drawStar(x + waveEffect, y, 5, size, size / 2); // Étoile à 5 branches
    } else {
      ctx.beginPath();
      ctx.arc(x + waveEffect, y, size, 0, Math.PI * 2);
      ctx.fill();
    }

    // Tentacules (trois ou quatre lignes animées selon le statut de prédateur)
    const tentacleLength = size * 0.8;
    const tentacleOffset = size * 0.5;
    const animationPhase = Math.sin(frameCount * 0.2); // Animation basée sur frameCount

    // Tentacule gauche
    ctx.strokeStyle = '#4A148C'; // Violet foncé pour les tentacules
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x + waveEffect - tentacleOffset, y + size);
    ctx.lineTo(x + waveEffect - tentacleOffset + animationPhase * 5, y + size + tentacleLength);
    ctx.stroke();

    // Tentacule droite
    ctx.beginPath();
    ctx.moveTo(x + waveEffect + tentacleOffset, y + size);
    ctx.lineTo(x + waveEffect + tentacleOffset - animationPhase * 5, y + size + tentacleLength);
    ctx.stroke();

    // Tentacule central
    ctx.beginPath();
    ctx.moveTo(x + waveEffect, y + size);
    ctx.lineTo(x + waveEffect + animationPhase * 3, y + size + tentacleLength);
    ctx.stroke();

    // Tentacule supplémentaire si prédateur (sauf si taille maximale)
    if (creature.isPredator && !isMaxSize) {
      ctx.beginPath();
      ctx.moveTo(x + waveEffect, y + size);
      ctx.lineTo(x + waveEffect - animationPhase * 3, y + size + tentacleLength * 1.2); // Légèrement plus long
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
}

// Boucle de jeu
function gameLoop() {
  frameCount++; // Incrémenter pour l'animation des tentacules et le flottement

  creatures.forEach(creature => {
    // Ajouter un effet de flottement
    creature.floatOffset = Math.sin(frameCount * 0.05 + creature.x + creature.y) * 5; // Léger mouvement vertical

    // Réduire la durée de vie
    creature.lifespan -= 1;

    // Ajuster le cooldown de déplacement en fonction de la taille (plus gros = plus lent)
    const baseCooldown = 60; // Cooldown de base (2 secondes à 30 FPS)
    const sizeFactor = Math.max(1, creature.size / 15); // Plus la créature est grosse, plus elle est lente
    creature.moveCooldown = Math.max(0, creature.moveCooldown - 1 / sizeFactor);
  });

  // Supprimer les créatures mortes
  creatures = creatures.filter(creature => creature.lifespan > 0);

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
            creature.lifespan = Math.min(creature.lifespan + 300, 1800); // Ajouter 10 secondes de vie (max 60s)
          }
        }
      });
    }

    // Décider de l'action via l'IA
    let action = decideAction(creature, foodItems, gridSize);

    // Si pas de nourriture et adulte, chercher à manger un petit ou un autre adulte
    if (foodItems.length === 0 && creature.isAdult && creature.moveCooldown <= 0) {
      // Chercher un petit à manger
      let target = creatures.find(c => !c.isAdult && Math.round(c.x) === Math.round(creature.x) && Math.round(c.y) === Math.round(creature.y) && c.size < creature.size);
      if (target) {
        // Manger le petit
        creatures.splice(creatures.indexOf(target), 1);
        creature.isPredator = true; // Devenir prédateur
        if (creature.size < maxSize) {
          creature.size += 1; // Grossir de 1 pixel
          creature.lifespan = Math.min(creature.lifespan + 300, 1800); // Ajouter 10 secondes de vie (max 60s)
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
            creature.lifespan = Math.min(creature.lifespan + 300, 1800); // Ajouter 10 secondes de vie (max 60s)
          }
          return;
        }

        // Si pas de cible sur la même case, chercher une cible à proximité et se déplacer
        const nearestSmall = creatures.find(c => !c.isAdult && c.size < creature.size);
        const nearestAdult = creature.isPredator ? creatures.find(c => c !== creature && c.isAdult && c.size < creature.size) : null;
        const targetCreature = nearestSmall || nearestAdult;
        if (targetCreature) {
          const path = findPath(creature, [{ x: Math.round(targetCreature.x), y: Math.round(targetCreature.y) }], gridSize);
          if (path.length > 1) {
            const nextStep = path[1];
            creature.x = nextStep.x;
            creature.y = nextStep.y;
            const sizeFactor = Math.max(1, creature.size / 15);
            creature.moveCooldown = baseCooldown * sizeFactor; // Cooldown ajusté
          }
          return;
        }
      }
    }

    // Exécuter l'action normale (aller vers la nourriture)
    if (action === 'move' && creature.moveCooldown <= 0) {
      const path = findPath(creature, foodItems, gridSize);
      if (path.length > 1) {
        // Sauter directement à la prochaine case du chemin
        const nextStep = path[1];
        creature.x = nextStep.x;
        creature.y = nextStep.y;
        const sizeFactor = Math.max(1, creature.size / 15);
        creature.moveCooldown = baseCooldown * sizeFactor; // Cooldown ajusté
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
            creature.lifespan = Math.min(creature.lifespan + 300, 1800); // Ajouter 10 secondes de vie (max 60s)
          }
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
            floatOffset: Math.random() * 10, // Offset de flottement aléatoire
            generation: creature.generation + 1 // Incrémenter la génération
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