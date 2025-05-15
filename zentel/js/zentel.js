// Constantes
const GRID_WIDTH = 15;
const GRID_HEIGHT = 10;
const CELL_SIZE = 40;
const BASE_HP = 100;

const TEXT_COLOR = '#e0e0ff';
const BUTTON_COLOR = '#6a5acd';
const ENEMY_COLOR = '#ff5555';
const TURRET_COLOR = '#55ff55';

const TURRET_TYPES = {
  melee: { name: "Sabreur Quantique", symbol: "⚔️", damage: 10, range: 60, attackRate: 60, cost: 10 },
  defense: { name: "Bouclier Nova", symbol: "🛡️", damage: 0, range: 0, hpBoost: 20, cost: 15 },
  projectile: { name: "Archer Plasma", symbol: "🏹", damage: 5, range: 150, attackRate: 90, cost: 20 },
  wall: { name: "Barrière Énergétique", symbol: "█", color: '#808080', cost: 5 }
};

const ENEMY_TYPES = [
  { hp: 10, speed: 0.5 * 1.5, xp: 5, energy: 2 },  // Vitesse augmentée (x1.5)
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
  for (let i = 0; i < enemyCount; i++) {
    let startY = floor(random(GRID_HEIGHT));
    let path = findPath(0, startY, GRID_WIDTH - 1, startY);
    let enemyType = ENEMY_TYPES[enemyTypeIndex];
    enemies.push({
      x: 0,
      y: startY * CELL_SIZE + CELL_SIZE / 2,
      hp: enemyType.hp + wave * 5,
      speed: enemyType.speed,
      path: path,
      pathIndex: 0,
      xp: enemyType.xp,
      energy: enemyType.energy
    });
  }
  updateStats();
}

function findPath(startX, startY, goalX, goalY) {
  let queue = [{ x: startX, y: startY, path: [{ x: startX, y: startY }] }];
  let visited = new Set();
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
        queue.push({ x: newX, y: newY, path: [...path, { x: newX, y: newY }] });
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

      if (frameCount % (TURRET_TYPES[module.type].attackRate / upgrades.attackSpeed) === 0 && gameState !== 'paused') {
        for (let enemy of enemies) {
          let d = dist(module.x * CELL_SIZE + CELL_SIZE / 2, module.y * CELL_SIZE + CELL_SIZE / 2, enemy.x, enemy.y);
          if (module.type === 'melee' && d < TURRET_TYPES.melee.range * upgrades.range) {
            enemy.hp -= TURRET_TYPES.melee.damage * upgrades.damage;
          } else if (module.type === 'projectile' && d < TURRET_TYPES.projectile.range * upgrades.range) {
            projectiles.push({
              x: module.x * CELL_SIZE + CELL_SIZE / 2,
              y: module.y * CELL_SIZE + CELL_SIZE / 2,
              target: enemy,
              speed: 3,
              damage: TURRET_TYPES.projectile.damage * upgrades.damage
            });
          }
        }
      }
    }
  }
}

function drawEnemies() {
  for (let enemy of enemies) {
    fill(ENEMY_COLOR);
    noStroke();
    ellipse(enemy.x, enemy.y, 20);
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
        xp += wave * 10 + 10; // Plus d'XP par vague
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

  for (let module of modules) {
    if (module.type === 'defense') {
      base.hp = min(BASE_HP + TURRET_TYPES.defense.hpBoost, base.hp + 1);
    }
  }
}

function updateStats() {
  document.getElementById('wave').textContent = wave;
  document.getElementById('energy').textContent = energy;
  document.getElementById('xp').textContent = xp;
  document.getElementById('base-hp').textContent = base.hp;

  ['melee', 'defense', 'projectile', 'wall'].forEach(type => {
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

  // Désactiver le bouton d'échange si pas assez d'XP
  const exchangeBtn = document.getElementById('exchange-xp-energy');
  if (xp < 5) {
    exchangeBtn.classList.add('locked');
    exchangeBtn.textContent = `Échanger XP > Énergie (manque ${5 - xp} XP)`;
  } else {
    exchangeBtn.classList.remove('locked');
    exchangeBtn.textContent = `Échanger XP > Énergie`;
  }
}

function mousePressed() {
  let gridX = floor(mouseX / CELL_SIZE);
  let gridY = floor(mouseY / CELL_SIZE);

  if (gridX >= 0 && gridX < GRID_WIDTH - 1 && gridY >= 0 && gridY < GRID_HEIGHT && (gameState === 'playing' || gameState === 'paused')) {
    if (selectedModule && !grid[gridX][gridY] && energy >= TURRET_TYPES[selectedModule].cost) {
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
      modules.push({ x: gridX, y: gridY, type: selectedModule });
      energy -= TURRET_TYPES[selectedModule].cost;
      if (selectedModule === 'wall') {
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
document.getElementById('defense-btn').addEventListener('click', () => {
  selectedModule = selectedModule === 'defense' ? null : 'defense';
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
  if (xp >= 5) {
    xp -= 5;
    energy += 10;
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