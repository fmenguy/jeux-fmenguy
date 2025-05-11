export function decideAction(creature, creatures, foodItems, gridSize) {
    // IA simple basée sur des règles
    if (creature.energy < 30) {
      // Priorité : manger
      if (creature.type === 'herbivore') {
        const nearestFood = foodItems.find(food => food.x === creature.x && food.y === creature.y);
        if (nearestFood) return 'eat';
      } else if (creature.type === 'carnivore') {
        const nearestPrey = creatures.find(c => c.type === 'herbivore' && c.x === creature.x && c.y === creature.y);
        if (nearestPrey) return 'eat';
      }
    }
  
    // Si assez d'énergie, se reproduire
    if (creature.energy > creature.maxEnergy * 0.8) {
      return 'reproduce';
    }
  
    // Par défaut : se déplacer
    return 'move';
  }