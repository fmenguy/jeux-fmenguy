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

// Calculer le chemin vers la nourriture la plus proche (algorithme simple : A*)
export function findPath(creature, foodItems, gridSize) {
  // Trouver la nourriture la plus proche
  let nearestFood = null;
  let minDistance = Infinity;

  foodItems.forEach(food => {
    const distance = Math.abs(creature.x - food.x) + Math.abs(creature.y - food.y);
    if (distance < minDistance) {
      minDistance = distance;
      nearestFood = food;
    }
  });

  if (!nearestFood) return []; // Pas de nourriture, pas de chemin

  // Algorithme A* simplifié
  const openSet = [{ x: creature.x, y: creature.y, g: 0, h: minDistance, f: minDistance, parent: null }];
  const closedSet = new Set();
  const path = [];

  while (openSet.length > 0) {
    // Trouver le nœud avec le plus petit f
    let current = openSet.reduce((min, node) => (node.f < min.f ? node : min), openSet[0]);
    const currentIndex = openSet.indexOf(current);
    openSet.splice(currentIndex, 1);
    closedSet.add(`${current.x},${current.y}`);

    // Si on a atteint la nourriture, reconstruire le chemin
    if (current.x === nearestFood.x && current.y === nearestFood.y) {
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
        closedSet.has(`${neighbor.x},${neighbor.y}`)
      ) return;

      const g = current.g + 1;
      const h = Math.abs(neighbor.x - nearestFood.x) + Math.abs(neighbor.y - nearestFood.y);
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