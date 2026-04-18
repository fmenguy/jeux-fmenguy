export function decideAction(creature, foodItems, gridSize) {
  // Trouver la nourriture la plus proche
  let nearestFood = null;
  let minDistance = Infinity;

  foodItems.forEach(food => {
    const distance = Math.abs(creature.x - food.x) + Math.abs(creature.y - food.y); // Distance de Manhattan
    if (distance < minDistance) {
      minDistance = distance;
      nearestFood = food;
    }
  });

  // Si on est sur une nourriture, manger
  if (nearestFood && creature.x === nearestFood.x && creature.y === nearestFood.y) {
    return 'eat';
  }

  // Sinon, se déplacer vers la nourriture la plus proche
  return 'move';
}

// Calculer le chemin vers la cible la plus proche (algorithme A*)
export function findPath(creature, targets, gridSize, walls = []) {
  // Trouver la cible la plus proche
  let nearestTarget = null;
  let minDistance = Infinity;

  targets.forEach(target => {
    const distance = Math.abs(creature.x - target.x) + Math.abs(creature.y - target.y);
    if (distance < minDistance) {
      minDistance = distance;
      nearestTarget = target;
    }
  });

  if (!nearestTarget) return []; // Pas de cible, pas de chemin

  // Algorithme A*
  const openSet = [{ x: Math.round(creature.x), y: Math.round(creature.y), g: 0, h: minDistance, f: minDistance, parent: null }];
  const closedSet = new Set();
  const path = [];

  while (openSet.length > 0) {
    // Trouver le nœud avec le plus petit f
    let current = openSet.reduce((min, node) => (node.f < min.f ? node : min), openSet[0]);
    const currentIndex = openSet.indexOf(current);
    openSet.splice(currentIndex, 1);
    closedSet.add(`${current.x},${current.y}`);

    // Si on a atteint la cible, reconstruire le chemin
    if (current.x === nearestTarget.x && current.y === nearestTarget.y) {
      let node = current;
      while (node) {
        path.push({ x: node.x, y: node.y });
        node = node.parent;
      }
      return path.reverse();
    }

    // Explorer les voisins
    const neighbors = [
      { x: current.x, y: current.y - 1 }, // Haut
      { x: current.x, y: current.y + 1 }, // Bas
      { x: current.x - 1, y: current.y }, // Gauche
      { x: current.x + 1, y: current.y }  // Droite
    ];

    neighbors.forEach(neighbor => {
      if (
        neighbor.x < 0 || neighbor.x >= gridSize ||
        neighbor.y < 0 || neighbor.y >= gridSize ||
        closedSet.has(`${neighbor.x},${neighbor.y}`) ||
        walls.some(wall => wall.x === neighbor.x && wall.y === neighbor.y) // Vérifier les murs
      ) return;

      const g = current.g + 1;
      const h = Math.abs(neighbor.x - nearestTarget.x) + Math.abs(neighbor.y - nearestTarget.y);
      const f = g + h;

      const existingNode = openSet.find(node => node.x === neighbor.x && node.y === neighbor.y);
      if (existingNode) {
        if (g < existingNode.g) {
          existingNode.g = g;
          existingNode.f = f;
          existingNode.parent = current;
        }
      } else {
        openSet.push({ x: neighbor.x, y: neighbor.y, g, h, f, parent: current });
      }
    });
  }

  return []; // Pas de chemin trouvé
}