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
function findPath(creature, targets, gridSize, walls = []) {
  const start = { x: Math.round(creature.x), y: Math.round(creature.y) };
  const openList = [{ x: start.x, y: start.y, g: 0, h: 0, f: 0, parent: null }];
  const closedList = [];

  const getHeuristic = (x, y, target) => {
    return Math.abs(x - target.x) + Math.abs(y - target.y);
  };

  const getNeighbors = (x, y) => {
    const neighbors = [];
    const directions = [
      { dx: 0, dy: -1 }, // Haut
      { dx: 0, dy: 1 },  // Bas
      { dx: -1, dy: 0 }, // Gauche
      { dx: 1, dy: 0 },  // Droite
    ];

    for (const dir of directions) {
      const newX = x + dir.dx;
      const newY = y + dir.dy;
      if (
        newX >= 0 && newX < gridSize &&
        newY >= 0 && newY < gridSize &&
        !walls.some(wall => wall.x === newX && wall.y === newY) // Vérifier les murs
      ) {
        neighbors.push({ x: newX, y: newY });
      }
    }
    return neighbors;
  };

  let nearestTarget = targets.reduce((closest, target) => {
    const distance = Math.sqrt((start.x - target.x) ** 2 + (start.y - target.y) ** 2);
    return distance < Math.sqrt((start.x - closest.x) ** 2 + (start.y - closest.y) ** 2) ? target : closest;
  }, targets[0]);

  while (openList.length > 0) {
    const current = openList.reduce((min, node) => node.f < min.f ? node : min, openList[0]);
    const currentIndex = openList.findIndex(node => node.x === current.x && node.y === current.y);
    openList.splice(currentIndex, 1);
    closedList.push(current);

    if (current.x === nearestTarget.x && current.y === nearestTarget.y) {
      const path = [];
      let node = current;
      while (node) {
        path.push({ x: node.x, y: node.y });
        node = node.parent;
      }
      return path.reverse();
    }

    const neighbors = getNeighbors(current.x, current.y);
    for (const neighbor of neighbors) {
      if (closedList.some(node => node.x === neighbor.x && node.y === neighbor.y)) {
        continue;
      }

      const g = current.g + 1;
      const h = getHeuristic(neighbor.x, neighbor.y, nearestTarget);
      const f = g + h;

      let existingNode = openList.find(node => node.x === neighbor.x && node.y === neighbor.y);
      if (!existingNode) {
        openList.push({ x: neighbor.x, y: neighbor.y, g, h, f, parent: current });
      } else if (g < existingNode.g) {
        existingNode.g = g;
        existingNode.f = f;
        existingNode.parent = current;
      }
    }
  }

  return []; // Aucun chemin trouvé
}