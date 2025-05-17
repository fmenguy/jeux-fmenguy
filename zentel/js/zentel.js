// Constantes
const GRID_WIDTH = 15;
const GRID_HEIGHT = 10;
const CELL_SIZE = 40;
const BASE_HP = 100;

const TEXT_COLOR = '#e0e0ff';
const BUTTON_COLOR = '#6a5acd';
const ENEMY_COLOR = '#ff5555';
const BOSS_COLOR = '#000000';
const TURRET_COLOR = '#55ff55';

const TURRET_TYPES = {
  melee: { name: "Sabreur Quantique", symbol: "⚔️", damage: 10, range: 60, attackRate: 60, cost: 10, level: 1 },
  projectile: { name: "Archer Plasma", symbol: "🏹", damage: 5, range: 150, attackRate: 90, cost: 20, level: 1 },
  wall: { name: "Barrière Énergétique", symbol: "█", color: '#808080', cost: 5 }
};

const ENEMY_TYPES = [
  { hp: 10, speed: 0.5 * 1.5, xp: 5, energy: 2 },
  { hp: 20, speed: 0.7 * 1.5, xp: 10, energy: 3 },
  { hp: 30, speed: 0.3 * 1.5, xp: 15, energy: 5 },
];

let grid = [];
let modules = [];
let enemies = [];
let energy = 20;
let xp = 0;
let wave = 0;
let gameState = 'playing';
let selectedModule = null;
let base = { x: GRID_WIDTH - 1, hp: BASE_HP };
let projectiles = [];
let upgrades = { range: 1, attackSpeed: 1, damage: 1 };
let selectedTurret = null; // Pour gérer la suppression ou l'amélioration

function calculateCellCost(x, y) {
  let cost = 1;
  for (let module of modules) {
    if (module.type === 'wall') continue;
    let turretRange = TURRET_TYPES[module.type].range * upgrades.range;
    let distance = dist(x * CELL_SIZE + CELL_SIZE / 2, y * CELL_SIZE + CELL_SIZE / 2, module.x * CELL_SIZE + CELL_SIZE / 2, module.y * CELL_SIZE + CELL_SIZE / 2);
    if (distance <= turretRange) {
      let proximityFactor = 1 - (distance / turretRange);
      cost += 5 * proximityFactor;
    }
  }
  return cost;
}

function setup() {
  let canvas = createCanvas(GRID_WIDTH * CELL_SIZE, GRID_HEIGHT * CELL_SIZE);
  canvas.parent('game-area');
  textAlign(CENTER, CENTER);
  textSize(14);
  initializeGrid();
  updateStats();
}

function initializeGrid() {
  for (let x = 0; x < GRID_WIDTH; x++) {
    grid[x] = [];
    for (let y = 0; y < GRID_HEIGHT; y++) {
      grid[x][y] = null;
    }
  }
  for (let y = 0; y < GRID_HEIGHT; y++) {
    grid[GRID_WIDTH - 1][y] = 'base';
  }
}

function spawnWave() {
  wave++;
  let enemyCount = wave * 2;
  let enemyTypeIndex = min(wave - 1, ENEMY_TYPES.length - 1);
  let enemyType = ENEMY_TYPES[enemyTypeIndex];
  let baseHp = enemyType.hp + wave * 5;
  let bossHpMultiplier = 2; // Boss normal (vague 5+)

  // À la vague 10, un boss avec 10x plus de vie que le boss de la vague 5
  if (wave === 10) {
    bossHpMultiplier = 10;
  }

  // Vague 6 : uniquement des boss identiques à ceux de la vague 5
  if (wave === 6) {
    for (let i = 0; i < enemyCount; i++) {
      let startY = floor(random(GRID_HEIGHT));
      let path = findPath(0, startY, GRID_WIDTH - 1, startY);
      enemies.push({
        x: 0,
        y: startY * CELL_SIZE + CELL_SIZE / 2,
        hp: baseHp * 2, // Identique au boss de la vague 5
        maxHp: baseHp * 2,
        speed: enemyType.speed * 0.8,
        path: path,
        pathIndex: 0,
        xp: enemyType.xp * 2,
        energy: enemyType.energy * 2,
        isBoss: true
      });
    }
  } else {
    // Vagues normales
    for (let i = 0; i < enemyCount; i++) {
      let startY = floor(random(GRID_HEIGHT));
      let path = findPath(0, startY, GRID_WIDTH - 1, startY);
      enemies.push({
        x: 0,
        y: startY * CELL_SIZE + CELL_SIZE / 2,
        hp: baseHp * (1 + wave * 0.1), // Augmentation des HP (10% par vague)
        maxHp: baseHp * (1 + wave * 0.1),
        speed: enemyType.speed,
        path: path,
        pathIndex: 0,
        xp: enemyType.xp,
        energy: enemyType.energy,
        isBoss: false
      });
    }
    // Ajout d'un boss toutes les 5 vagues (sauf vague 6)
    if (wave >= 5 && wave % 5 === 0 && wave !== 6) {
      let startY = floor(random(GRID_HEIGHT));
      let path = findPath(0, startY, GRID_WIDTH - 1, startY);
      enemies.push({
        x: 0,
        y: startY * CELL_SIZE + CELL_SIZE / 2,
        hp: baseHp * bossHpMultiplier,
        maxHp: baseHp * bossHpMultiplier,
        speed: enemyType.speed * 0.8,
        path: path,
        pathIndex: 0,
        xp: enemyType.xp * bossHpMultiplier,
        energy: enemyType.energy * bossHpMultiplier,
        isBoss: true
      });
    }
  }
  updateStats();
}

function findPath(startX, startY, goalX, goalY) {
  let queue = [{ x: startX, y: startY, cost: 0, path: [{ x: startX, y: startY }] }];
  let visited = new Set();
  let costs = Array(GRID_WIDTH).fill().map(() => Array(GRID_HEIGHT).fill(Infinity));
  costs[startX][startY] = 0;
  visited.add(`${startX},${startY}`);

  while (queue.length > 0) {
    queue.sort((a, b) => a.cost - b.cost);
    let { x, y, cost, path } = queue.shift();
    if (x === goalX) {
      return path;
    }

    let directions = [
      { dx: 1, dy: 0 },
      { dx: 0, dy: 1 },
      { dx: 0, dy: -1 },
      { dx: -1, dy: 0 }
    ];

    for (let dir of directions) {
      let newX = x + dir.dx;
      let newY = y + dir.dy;
      let key = `${newX},${newY}`;

      if (
        newX >= 0 && newX < GRID_WIDTH &&
        newY >= 0 && newY < GRID_HEIGHT &&
        !visited.has(key) &&
        (grid[newX][newY] === null || grid[newX][newY] === 'base')
      ) {
        let cellCost = calculateCellCost(newX, newY);
        let newCost = cost + cellCost;

        if (newCost < costs[newX][newY]) {
          costs[newX][newY] = newCost;
          visited.add(key);
          queue.push({
            x: newX,
            y: newY,
            cost: newCost,
            path: [...path, { x: newX, y: newY }]
          });
        }
      }
    }
  }
  queue = [{ x: startX, y: startY, path: [{ x: startX, y: startY }] }];
  visited.clear();
  visited.add(`${startX},${startY}`);
  while (queue.length > 0) {
    let { x, y, path } = queue.shift();
    if (x === goalX) {
      return path;
    }
    let directions = [
      { dx: 1, dy: 0 },
      { dx: 0, dy: 1 },
      { dx: 0, dy: -1 },
      { dx: -1, dy: 0 }
    ];
    for (let dir of directions) {
      let newX = x + dir.dx;
      let newY = y + dir.dy;
      let key = `${newX},${newY}`;
      if (
        newX >= 0 && newX < GRID_WIDTH &&
        newY >= 0 && newY < GRID_HEIGHT &&
        !visited.has(key) &&
        (grid[newX][newY] === null || grid[newX][newY] === 'base')
      ) {
        visited.add(key);
        queue.push({
          x: newX,
          y: newY,
          path: [...path, { x: newX, y: newY }]
        });
      }
    }
  }
  return [];
}

function hasPathToBase() {
  for (let startY = 0; startY < GRID_HEIGHT; startY++) {
    let path = findPath(0, startY, GRID_WIDTH - 1, startY);
    if (path.length > 0) {
      return true;
    }
  }
  return false;
}

// Vérifier si la carte est pleine (plus de place pour placer des tourelles ou murs)
function isMapFull() {
  for (let x = 0; x < GRID_WIDTH - 1; x++) { // -1 pour exclure la colonne de la base
    for (let y = 0; y < GRID_HEIGHT; y++) {
      if (grid[x][y] === null) {
        return false; // Il reste de la place
      }
    }
  }
  return true; // Carte pleine
}

function draw() {
  background('#0a0a1e');
  drawGrid();
  drawModules();
  drawEnemies();
  drawProjectiles();
  drawBase();

  if (gameState !== 'paused') {
    updateGame();
  }
}

function drawGrid() {
  stroke('#2a2a4a');
  strokeWeight(1);
  for (let x = 0; x < GRID_WIDTH; x++) {
    for (let y = 0; y < GRID_HEIGHT; y++) {
      fill(grid[x][y] === 'base' ? '#4682b4' : '#1a1a2e');
      rect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
    }
  }
}

function drawModules() {
  for (let module of modules) {
    if (module.type === 'wall') {
      fill(TURRET_TYPES.wall.color);
      noStroke();
      rect(module.x * CELL_SIZE, module.y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
      fill(255);
      text(TURRET_TYPES.wall.symbol, module.x * CELL_SIZE + CELL_SIZE / 2, module.y * CELL_SIZE + CELL_SIZE / 2);
    } else {
      fill(TURRET_COLOR);
      noStroke();
      let symbol = TURRET_TYPES[module.type].symbol;
      ellipse(module.x * CELL_SIZE + CELL_SIZE / 2, module.y * CELL_SIZE + CELL_SIZE / 2, 25);
      fill(255);
      text(symbol, module.x * CELL_SIZE + CELL_SIZE / 2, module.y * CELL_SIZE + CELL_SIZE / 2);

      // Afficher le niveau de la tourelle si supérieur à 1
      if (module.level > 1) {
        fill('#ffcc00');
        textSize(10);
        text(module.level, module.x * CELL_SIZE + CELL_SIZE / 2, module.y * CELL_SIZE + CELL_SIZE / 2 + 15);
        textSize(14);
      }

      if (frameCount % (TURRET_TYPES[module.type].attackRate / upgrades.attackSpeed) === 0 && gameState !== 'paused') {
        for (let enemy of enemies) {
          let d = dist(module.x * CELL_SIZE + CELL_SIZE / 2, module.y * CELL_SIZE + CELL_SIZE / 2, enemy.x, enemy.y);
          let effectiveDamage = TURRET_TYPES[module.type].damage * upgrades.damage * (1 + wave * 0.05); // Augmentation des dégâts (5% par vague)
          let effectiveRange = TURRET_TYPES[module.type].range * upgrades.range * (1 + wave * 0.02); // Augmentation de la portée (2% par vague)
          if (module.level > 1) {
            effectiveDamage *= (1 + module.level * 0.3); // 30% de dégâts en plus par niveau
            effectiveRange *= (1 + module.level * 0.1); // 10% de portée en plus par niveau
          }
          if (wave >= 5) {
            effectiveDamage *= 1.5;
          }
          if (module.type === 'melee' && d < effectiveRange) {
            enemy.hp -= effectiveDamage;
          } else if (module.type === 'projectile' && d < effectiveRange) {
            projectiles.push({
              x: module.x * CELL_SIZE + CELL_SIZE / 2,
              y: module.y * CELL_SIZE + CELL_SIZE / 2,
              target: enemy,
              speed: 3,
              damage: effectiveDamage
            });
          }
        }
      }
    }
  }
}

function drawEnemies() {
  for (let enemy of enemies) {
    fill(enemy.isBoss ? BOSS_COLOR : ENEMY_COLOR);
    noStroke();
    ellipse(enemy.x, enemy.y, 20);

    let hpRatio = enemy.hp / enemy.maxHp;
    let healthColor = hpRatio > 0.6 ? '#55ff55' : hpRatio > 0.3 ? '#ffff55' : '#ff5555';
    stroke(healthColor);
    strokeWeight(2);
    noFill();
    let angle = map(hpRatio, 0, 1, 0, TWO_PI);
    arc(enemy.x, enemy.y, 16, 16, -PI/2, angle - PI/2);

    if (gameState !== 'paused' && enemy.path.length > 0) {
      let nextPoint = enemy.path[enemy.pathIndex];
      let targetX = nextPoint.x * CELL_SIZE + CELL_SIZE / 2;
      let targetY = nextPoint.y * CELL_SIZE + CELL_SIZE / 2;
      let dx = targetX - enemy.x;
      let dy = targetY - enemy.y;
      let distToTarget = dist(enemy.x, enemy.y, targetX, targetY);
      if (distToTarget < 5) {
        enemy.pathIndex++;
        if (enemy.pathIndex >= enemy.path.length) {
          enemy.path = [];
        }
      } else {
        enemy.x += (dx / distToTarget) * enemy.speed;
        enemy.y += (dy / distToTarget) * enemy.speed;
      }
    }
  }
  enemies = enemies.filter(enemy => enemy.hp > 0 && enemy.x < width);
}

function drawProjectiles() {
  for (let i = projectiles.length - 1; i >= 0; i--) {
    let p = projectiles[i];
    fill(TURRET_COLOR);
    ellipse(p.x, p.y, 10);
    let angle = atan2(p.target.y - p.y, p.target.x - p.x);
    p.x += p.speed * cos(angle);
    p.y += p.speed * sin(angle);
    let d = dist(p.x, p.y, p.target.x, p.target.y);
    if (d < 10) {
      p.target.hp -= p.damage;
      projectiles.splice(i, 1);
    }
  }
}

function drawBase() {
  document.getElementById('base-hp').textContent = base.hp;
}

function updateGame() {
  for (let enemy of enemies) {
    if (enemy.x > (GRID_WIDTH - 1) * CELL_SIZE - 5 && enemy.path.length === 0) {
      base.hp -= 10;
      enemy.hp = 0;
    }
  }

  enemies = enemies.filter(enemy => {
    if (enemy.hp <= 0) {
      xp += enemy.xp;
      energy += enemy.energy;
      updateStats();
      if (enemies.length === 0) {
        xp += wave * 10 + 10;
        document.getElementById('upgrade-modal').style.display = 'flex';
        document.getElementById('xp-available').textContent = `XP disponible: ${xp}`;
      }
      return false;
    }
    return true;
  });

  if (base.hp <= 0) {
    gameState = 'gameover';
    document.getElementById('final-wave').textContent = wave;
    document.getElementById('game-over-modal').style.display = 'flex';
    noLoop();
  }
}

function updateStats() {
  document.getElementById('wave').textContent = wave;
  document.getElementById('energy').textContent = energy;
  document.getElementById('xp').textContent = xp;
  document.getElementById('base-hp').textContent = base.hp;

  ['melee', 'projectile', 'wall'].forEach(type => {
    const btn = document.getElementById(`${type}-btn`);
    const cost = TURRET_TYPES[type].cost;
    if (energy < cost) {
      btn.classList.add('locked');
      btn.querySelector('.turret-cost').textContent = `${cost} E (manque ${cost - energy})`;
    } else {
      btn.classList.remove('locked');
      btn.querySelector('.turret-cost').textContent = `${cost} E`;
    }
    if (selectedModule === type) {
      btn.classList.add('selected');
    } else {
      btn.classList.remove('selected');
    }
  });

  const exchangeBtn = document.getElementById('exchange-xp-energy');
  const amount = document.querySelector('input[name="exchange-amount"]:checked').value;
  const requiredXp = amount === '1xp' ? 1 : amount === '50xp' ? 50 : 100;
  if (xp < requiredXp) {
    exchangeBtn.classList.add('locked');
    exchangeBtn.textContent = `Échange (manque ${requiredXp - xp} XP)`;
  } else {
    exchangeBtn.classList.remove('locked');
    exchangeBtn.textContent = `Échange`;
  }

  const healBtn = document.getElementById('heal-base');
  if (wave < 5 || xp < 500 || base.hp >= BASE_HP) {
    healBtn.classList.add('locked');
    healBtn.textContent = wave < 5 ? `Soigner Base (vague 5+)` : xp < 500 ? `Soigner Base (manque ${500 - xp} XP)` : `Soigner Base (HP max)`;
  } else {
    healBtn.classList.remove('locked');
    healBtn.textContent = `Soigner Base (500 XP → 10 HP)`;
  }
}

function mousePressed() {
  let gridX = floor(mouseX / CELL_SIZE);
  let gridY = floor(mouseY / CELL_SIZE);

  if (gridX >= 0 && gridX < GRID_WIDTH - 1 && gridY >= 0 && gridY < GRID_HEIGHT && (gameState === 'playing' || gameState === 'paused')) {
    // Si la carte est pleine et qu'on clique sur une tourelle, on peut l'améliorer
    if (isMapFull() && grid[gridX][gridY] && grid[gridX][gridY] !== 'wall' && grid[gridX][gridY] !== 'base') {
      let module = modules.find(m => m.x === gridX && m.y === gridY);
      if (module && xp >= 10) { // Coût pour améliorer au niveau suivant : 10 XP
        xp -= 10;
        module.level += 1;
        updateStats();
        return;
      }
    }

    // Si on a sélectionné "supprimer", on supprime la tourelle et récupère 50% de l'énergie
    if (selectedModule === 'delete' && grid[gridX][gridY] && grid[gridX][gridY] !== 'base') {
      let moduleIndex = modules.findIndex(m => m.x === gridX && m.y === gridY);
      if (moduleIndex !== -1) {
        let moduleType = grid[gridX][gridY];
        let refundEnergy = Math.floor(TURRET_TYPES[moduleType].cost / 2); // Récupère 50% de l'énergie
        energy += refundEnergy;
        modules.splice(moduleIndex, 1);
        grid[gridX][gridY] = null;
        enemies.forEach(enemy => {
          if (enemy.path.length > 0) {
            let startX = floor(enemy.x / CELL_SIZE);
            let startY = floor(enemy.y / CELL_SIZE);
            enemy.path = findPath(startX, startY, GRID_WIDTH - 1, startY);
            enemy.pathIndex = 0;
          }
        });
        selectedModule = null; // Réinitialiser la sélection après suppression
        updateStats();
        return;
      }
    }

    // Placement normal d'une tourelle ou mur
    if (selectedModule && selectedModule !== 'delete' && !grid[gridX][gridY] && energy >= TURRET_TYPES[selectedModule].cost) {
      if (selectedModule === 'wall') {
        grid[gridX][gridY] = selectedModule;
        if (!hasPathToBase()) {
          grid[gridX][gridY] = null;
          return;
        }
      }
      if (grid[gridX][gridY] === 'wall' && selectedModule !== 'wall') {
        return;
      }
      grid[gridX][gridY] = selectedModule;
      modules.push({ x: gridX, y: gridY, type: selectedModule, level: 1 });
      energy -= TURRET_TYPES[selectedModule].cost;
      if (selectedModule === 'wall' || selectedModule === 'melee' || selectedModule === 'projectile') {
        enemies.forEach(enemy => {
          if (enemy.path.length > 0) {
            let startX = floor(enemy.x / CELL_SIZE);
            let startY = floor(enemy.y / CELL_SIZE);
            enemy.path = findPath(startX, startY, GRID_WIDTH - 1, startY);
            enemy.pathIndex = 0;
          }
        });
      }
      updateStats();
    }
  }
}

// Gestion des boutons de tourelles
document.getElementById('melee-btn').addEventListener('click', () => {
  selectedModule = selectedModule === 'melee' ? null : 'melee';
  updateStats();
});
document.getElementById('projectile-btn').addEventListener('click', () => {
  selectedModule = selectedModule === 'projectile' ? null : 'projectile';
  updateStats();
});
document.getElementById('wall-btn').addEventListener('click', () => {
  selectedModule = selectedModule === 'wall' ? null : 'wall';
  updateStats();
});

// Bouton pour supprimer une tourelle
document.getElementById('delete-turret-btn').addEventListener('click', () => {
  selectedModule = selectedModule === 'delete' ? null : 'delete';
  updateStats();
});

// Boutons de contrôle
document.getElementById('start-wave').addEventListener('click', () => {
  if (enemies.length === 0 && gameState === 'playing') {
    spawnWave();
  }
});

document.getElementById('pause').addEventListener('click', () => {
  gameState = gameState === 'playing' ? 'paused' : 'playing';
  document.getElementById('pause').textContent = gameState === 'paused' ? 'Reprendre' : 'Pause';
});

document.getElementById('restart').addEventListener('click', () => {
  resetGame();
});

document.getElementById('continue-game').addEventListener('click', () => {
  document.getElementById('upgrade-modal').style.display = 'none';
  if (enemies.length === 0) {
    spawnWave();
  }
});

document.getElementById('restart-game').addEventListener('click', () => {
  resetGame();
  document.getElementById('game-over-modal').style.display = 'none';
});

// Gestion des améliorations
document.getElementById('upgrade-range').addEventListener('click', () => {
  if (xp >= 5) {
    upgrades.range += 0.1;
    xp -= 5;
    enemies.forEach(enemy => {
      if (enemy.path.length > 0) {
        let startX = floor(enemy.x / CELL_SIZE);
        let startY = floor(enemy.y / CELL_SIZE);
        enemy.path = findPath(startX, startY, GRID_WIDTH - 1, startY);
        enemy.pathIndex = 0;
      }
    });
    updateStats();
    document.getElementById('xp-available').textContent = `XP disponible: ${xp}`;
  }
});

document.getElementById('upgrade-attack-speed').addEventListener('click', () => {
  if (xp >= 5) {
    upgrades.attackSpeed += 0.1;
    xp -= 5;
    updateStats();
    document.getElementById('xp-available').textContent = `XP disponible: ${xp}`;
  }
});

document.getElementById('upgrade-damage').addEventListener('click', () => {
  if (xp >= 5) {
    upgrades.damage += 0.1;
    xp -= 5;
    updateStats();
    document.getElementById('xp-available').textContent = `XP disponible: ${xp}`;
  }
});

// Échange XP contre énergie
document.getElementById('exchange-xp-energy').addEventListener('click', () => {
  const amount = document.querySelector('input[name="exchange-amount"]:checked').value;
  const requiredXp = amount === '1xp' ? 1 : amount === '50xp' ? 50 : 100;
  if (xp >= requiredXp) {
    const xpToConvert = amount === '1xp' ? 1 : amount === '50xp' ? 50 : 100;
    xp -= xpToConvert;
    energy += xpToConvert * 2;
    updateStats();
  }
});

// Soigner la base
document.getElementById('heal-base').addEventListener('click', () => {
  if (wave >= 5 && xp >= 500 && base.hp < BASE_HP) {
    xp -= 500;
    base.hp = min(BASE_HP, base.hp + 10);
    updateStats();
  }
});

function resetGame() {
  grid = [];
  modules = [];
  enemies = [];
  projectiles = [];
  energy = 20;
  xp = 0;
  wave = 0;
  base.hp = BASE_HP;
  gameState = 'playing';
  selectedModule = null;
  upgrades = { range: 1, attackSpeed: 1, damage: 1 };
  initializeGrid();
  updateStats();
  loop();
}