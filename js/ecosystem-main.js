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

// Données pour la courbe (stocke tout depuis le début)
const statsHistory = { creatures: [], food: [] };

// Cooldown de base pour le déplacement, modifiable par les boutons radio
let baseCooldown = 60; // 2 secondes à 30 FPS (par défaut : lent)

// État du mode "ajout de mur"
let addWallMode = false;

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
generateAlgae(); // Appeler pour générer les algues au démarrage

// Palette de couleurs pour les générations
const generationColors = [
  '#4B0082', // Génération 0 : Indigo foncé
  '#6A0DAD', // Génération 1 : Violet foncé
  '#AB47BC', // Génération 2 : Violet moyen
  '#CE93D8', // Génération 3 : Violet clair
  '#E1BEE7', // Génération 4 : Violet très clair
  '#F3E5F5'  // Génération 5+ : Presque blanc
];

// Différentes espèces de méduses
const speciesTypes = [
  { name: 'Classic', color: generationColors, tentacleCount: 3 }, // Espèce par défaut
  { name: 'Glow', color: ['#00CED1', '#20B2AA', '#48D1CC', '#40E0D0', '#7FFFD4', '#B0E0E6'], tentacleCount: 4 }, // Espèce lumineuse
  { name: 'Spiky', color: ['#FF6347', '#FF4500', '#FF7F50', '#FF8C00', '#FFA07A', '#FFD700'], tentacleCount: 5 } // Espèce piquante
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
  lastFoodRequest: 0, // Compteur pour la demande de nourriture
  isRequestingFood: false, // Indicateur pour l'affichage visuel
  wanderDirection: { dx: Math.random() * 2 - 1, dy: Math.random() * 2 - 1 } // Direction aléatoire pour le mouvement
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
  const baseFoodCount = creatures.length >= 100 ? Math.floor(creatures.length / 20) : 1; // Proportionnel au nombre de créatures
  for (let i = 0; i < baseFoodCount; i++) {
    const food = {
      x: Math.floor(Math.random() * gridSize),
      y: Math.floor(Math.random() * gridSize),
      energy: 50
    };
    foodItems.push(food);
  }
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

// Activer/désactiver le mode d'ajout de mur
window.toggleAddWallMode = () => {
  addWallMode = !addWallMode;
  const button = document.getElementById('addWallButton');
  button.style.backgroundColor = addWallMode ? '#FF4500' : '#1E3A8A'; // Rouge si actif, bleu sinon
};

// Ajouter un mur avec la souris
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

// Gérer les bulles de demande de nourriture
let requestSide = 'left'; // Alterner les côtés des bulles
function showFoodRequest(generation) {
  const requestsDiv = document.getElementById('foodRequests');
  const bubble = document.createElement('div');
  bubble.className = 'food-request-bubble';
  bubble.textContent = `Créature (Gen ${generation}) demande de la nourriture !`;

  // Positionner la bulle à gauche ou à droite
  const side = requestSide;
  requestSide = requestSide === 'left' ? 'right' : 'left'; // Alterner pour la prochaine bulle
  bubble.style[side] = '20px';
  bubble.style.top = `${Math.random() * (window.innerHeight - 100) + 50}px`; // Position aléatoire en hauteur

  requestsDiv.appendChild(bubble);

  // Supprimer la bulle après 5 secondes
  setTimeout(() => {
    bubble.remove();
  }, 5000);
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

  // Dessiner la courbe
  drawStatsCurve();

  // Agrandir la grille si plus de 100 créatures
  if (creatures.length > 100 && gridSize < 40) { // Limite maximale arbitraire à 40x40
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
    let path = findPath(creature, foodItems, gridSize, walls);
    let isAttacking = false;

    // Vérifier si la créature est un prédateur et se dirige vers une autre créature
    if (foodItems.length === 0 && creature.isAdult) {
      const nearestSmall = creatures.find(c => !c.isAdult && c.size < creature.size);
      const nearestAdult = creature.isPredator ? creatures.find(c => c !== creature && c.isAdult && c.size < creature.size) : null;
      const targetCreature = nearestSmall || nearestAdult;
      if (targetCreature) {
        path = findPath(creature, [{ x: Math.round(targetCreature.x), y: Math.round(targetCreature.y) }], gridSize, walls);
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

  // Dessiner les particules
  particles.forEach((particle, index) => {
    particle.x += particle.speedX;
    particle.y += particle.speedY;
    particle.life--;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
    ctx.fill();

    // Supprimer les particules mortes
    if (particle.life <= 0) {
      particles.splice(index, 1);
    }
  });

  // Dessiner les créatures avec des tentacules
  creatures.forEach(creature => {
    const x = creature.x * tileSize + tileSize / 2;
    const y = creature.y * tileSize + tileSize / 2 + creature.floatOffset; // Ajout du flottement
    const size = creature.size; // Taille dynamique
    const waveEffect = Math.sin(frameCount * 0.1 + creature.x + creature.y) * 2; // Effet de vague
    const isMaxSize = creature.size >= maxSize;

    // Générer des particules autour de la créature
    if (Math.random() < 0.1) {
      particles.push(generateParticle(x + waveEffect, y));
    }

    // Corps (cercle ou étoile selon le statut de prédateur et la taille maximale)
    ctx.fillStyle = isMaxSize ? '#000000' : creature.species.color[Math.min(creature.generation, creature.species.color.length - 1)];
    if (creature.isPredator && !isMaxSize) {
      drawStar(x + waveEffect, y, 5, size, size / 2); // Étoile à 5 branches
    } else {
      ctx.beginPath();
      ctx.arc(x + waveEffect, y, size, 0, Math.PI * 2);
      ctx.fill();
    }

    // Ajouter un contour lumineux
    ctx.strokeStyle = '#BBDEFB';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(x + waveEffect, y, size, 0, Math.PI * 2);
    ctx.stroke();

    // Ajouter un indicateur visuel si la créature demande de la nourriture
    if (creature.isRequestingFood) {
      ctx.strokeStyle = '#FF0000';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x + waveEffect, y, size + 5, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Tentacules (selon l'espèce)
    const tentacleLength = size * 0.8;
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
}

// Boucle de jeu
function gameLoop() {
  frameCount++; // Incrémenter pour l'animation des tentacules et le flottement

  // Introduire de nouvelles espèces après un certain temps
  if (frameCount % 9000 === 0) { // Toutes les 5 minutes (9000 ticks à 30 FPS)
    const newSpeciesIndex = Math.floor(frameCount / 9000) % speciesTypes.length;
    const newSpecies = speciesTypes[newSpeciesIndex];
    creatures.forEach(creature => {
      if (Math.random() < 0.2) { // 20% de chances pour chaque créature de changer d'espèce
        creature.species = newSpecies;
        creature.color = newSpecies.color[Math.min(creature.generation, newSpecies.color.length - 1)];
      }
    });
  }

  creatures.forEach(creature => {
    // Ajouter un effet de flottement
    creature.floatOffset = Math.sin(frameCount * 0.05 + creature.x + creature.y) * 5; // Léger mouvement vertical

    // Réduire la durée de vie
    creature.lifespan -= 1;

    // Ajuster le cooldown de déplacement en fonction de la taille (plus gros = plus lent)
    const sizeFactor = Math.max(1, creature.size / 15); // Plus la créature est grosse, plus elle est lente
    creature.moveCooldown = Math.max(0, creature.moveCooldown - 1); // Décrémentation linéaire

    // Système de demande de nourriture si affamée (pas mangé depuis 15 secondes)
    if (!creature.lastFoodRequest) creature.lastFoodRequest = 0;
    creature.lastFoodRequest++;
    if (creature.lastFoodRequest > 450 && foodItems.length === 0) { // 15 secondes à 30 FPS
      showFoodRequest(creature.generation);
      creature.isRequestingFood = true;
      creature.lastFoodRequest = 0; // Réinitialiser le compteur
      setTimeout(() => {
        creature.isRequestingFood = false;
      }, 5000); // Correspond à la durée de la bulle
    }

    // Mouvement aléatoire si pas d'action (errance)
// Mouvement aléatoire si pas d'action (errance)
if (creature.moveCooldown <= 0) {
  const hasFoodTarget = foodItems.length > 0;
  const hasPredatorNearby = creatures.some(c => c.isPredator && c.size > creature.size && Math.sqrt((creature.x - c.x) ** 2 + (creature.y - c.y) ** 2) < 5);
  const hasPreyTarget = foodItems.length === 0 && creature.isAdult && (creatures.some(c => !c.isAdult && c.size < creature.size) || (creature.isPredator && creatures.some(c => c !== creature && c.isAdult && c.size < creature.size)));

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
      !creatures.some(c => Math.round(c.x) === newX && Math.round(c.y) === newY) &&
      !walls.some(wall => wall.x === newX && wall.y === newY)
    ) {
      // Vérifier que le chemin est libre (pas de mur sur le trajet)
      const path = findPath(creature, [{ x: newX, y: newY }], gridSize, walls);
      if (path.length > 1) {
        creature.x = newX;
        creature.y = newY;
        creature.moveCooldown = baseCooldown * sizeFactor;
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
            creature.lifespan = Math.min(creature.lifespan + 300, 1800); // Ajouter 10 secondes de vie (max 60s)
          }
        }
      });
    }

    // IA pour se cacher sous les algues si un prédateur est à proximité
    if (!creature.isPredator && creature.moveCooldown <= 0) {
      const nearestPredator = creatures.find(c => c.isPredator && c.size > creature.size);
      if (nearestPredator) {
        const predatorDistance = Math.sqrt((creature.x - nearestPredator.x) ** 2 + (creature.y - nearestPredator.y) ** 2);
        if (predatorDistance < 5) { // Se cacher si prédateur à moins de 5 cases
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
            return; // Arrêter ici pour éviter d'autres actions
          }
        }
      }
    }

    // Décider de l'action via l'IA
    let action = decideAction(creature, foodItems, gridSize, walls);

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
      }
    } else if (action === 'eat') {
      const foodIndex = foodItems.findIndex(food => Math.round(creature.x) === food.x && Math.round(creature.y) === food.y);
      if (foodIndex !== -1) {
        creature.foodEaten += 1; // Incrémenter le compteur de nourriture consommée
        foodItems.splice(foodIndex, 1);
        creature.lastFoodRequest = 0; // Réinitialiser le compteur de demande
        creature.isRequestingFood = false; // Arrêter l'indicateur visuel

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
            species: creature.species, // Hérite de l'espèce du parent
            color: creature.species.color[Math.min(creature.generation + 1, creature.species.color.length - 1)],
            foodEaten: 0, // Nouvelle créature commence avec 0 nourriture consommée
            isOriginal: false, // Marquer comme duplicata
            isAdult: false, // Commence comme bébé
            floatOffset: Math.random() * 10, // Offset de flottement aléatoire
            generation: creature.generation + 1, // Incrémenter la génération
            wanderDirection: { dx: Math.random() * 2 - 1, dy: Math.random() * 2 - 1 }
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