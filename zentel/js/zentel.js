const GRID_WIDTH = 15;
const GRID_HEIGHT = 10;
const CELL_SIZE = 40;
const ENEMY_SPEED = 0.5;
const BASE_HP = 100;

const TEXT_COLOR = '#4682b4';
const BUTTON_COLOR = '#6a5acd';
const ENEMY_COLOR = '#ff0000';
const TURRET_COLOR = '#00ff00';

const TURRET_TYPES = {
  melee: { name: "Sabreur Quantique", symbol: "⚔️", damage: 10, range: 50, attackRate: 60, xpRequired: 0, cost: 10 },
  defense: { name: "Bouclier Nova", symbol: "🛡️", damage: 0, range: 0, hpBoost: 20, xpRequired: 20, cost: 15 },
  projectile: { name: "Archer Plasma", symbol: "🏹", damage: 5, range: 150, attackRate: 90, xpRequired: 50, cost: 20 },
  wall: { name: "Barrière Énergétique", symbol: "█", color: '#808080', xpRequired: 0, cost: 5 }
};

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

function setup() {
  createCanvas(GRID_WIDTH * CELL_SIZE + 200, GRID_HEIGHT * CELL_SIZE + 200);
  textAlign(CENTER, CENTER);
  textSize(14);
  initializeGrid();
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
  for (let i = 0; i < wave * 2; i++) {
    let startY = floor(random(GRID_HEIGHT));
    let path = findPath(0, startY, GRID_WIDTH - 1, startY);
    enemies.push({
      x: 0,
      y: startY * CELL_SIZE + CELL_SIZE / 2,
      hp: 10 + wave * 5,
      speed: ENEMY_SPEED,
      path: path,
      pathIndex: 0
    });
  }
}

function findPath(startX, startY, goalX, goalY) {
  let queue = [{ x: startX, y: startY, path: [{ x: startX, y: startY }] }];
  let visited = new Set();
  visited.add(`${startX},${startY}`);

  while (queue.length > 0) {
    let { x, y, path } = queue.shift();
    if (x === goalX && y === goalY) {
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

function draw() {
  background('#0a0a1e');
  
  drawStats();
  drawControlButtons();
  drawGrid();
  drawModules();
  drawEnemies();
  drawProjectiles();
  drawBase();
  drawTurretButtons();
  
  if (gameState !== 'paused') {
    updateGame();
  }
}

function drawStats() {
  fill(TEXT_COLOR);
  noStroke();
  text(`Vague: ${wave}`, width - 100, 20);
  text(`Énergie: ${energy}`, width - 100, 40);
  text(`XP: ${xp}`, width - 100, 60);
}

function drawControlButtons() {
  let buttonX = (width - 320) / 2;
  let buttonY = 20;

  fill(enemies.length === 0 ? BUTTON_COLOR : TEXT_COLOR);
  stroke(255);
  strokeWeight(1);
  rect(buttonX, buttonY, 100, 30, 5);
  noStroke();
  fill(255);
  text('Lancer', buttonX + 50, buttonY + 15);

  fill(gameState === 'paused' ? BUTTON_COLOR : TEXT_COLOR);
  stroke(255);
  rect(buttonX + 110, buttonY, 100, 30, 5);
  noStroke();
  fill(255);
  text('Pause', buttonX + 160, buttonY + 15);

  fill(BUTTON_COLOR);
  stroke(255);
  rect(buttonX + 220, buttonY, 100, 30, 5);
  noStroke();
  fill(255);
  text('Relancer', buttonX + 270, buttonY + 15);
}

function drawGrid() {
  stroke('#d2b48c');
  strokeWeight(1);
  let offsetX = (width - GRID_WIDTH * CELL_SIZE) / 2;
  let offsetY = (height - GRID_HEIGHT * CELL_SIZE) / 2 + 30;
  for (let x = 0; x < GRID_WIDTH; x++) {
    for (let y = 0; y < GRID_HEIGHT; y++) {
      fill(grid[x][y] === 'base' ? '#4682b4' : '#f5deb3');
      rect(offsetX + x * CELL_SIZE, offsetY + y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
    }
  }
}

function drawModules() {
  let offsetX = (width - GRID_WIDTH * CELL_SIZE) / 2;
  let offsetY = (height - GRID_HEIGHT * CELL_SIZE) / 2 + 30;
  for (let module of modules) {
    if (module.type === 'wall') {
      fill(TURRET_TYPES.wall.color);
      noStroke();
      rect(offsetX + module.x * CELL_SIZE, offsetY + module.y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
      fill(255);
      text(TURRET_TYPES.wall.symbol, offsetX + module.x * CELL_SIZE + CELL_SIZE / 2, offsetY + module.y * CELL_SIZE + CELL_SIZE / 2);
    } else {
      fill(TURRET_COLOR);
      noStroke();
      let symbol = TURRET_TYPES[module.type].symbol;
      ellipse(offsetX + module.x * CELL_SIZE + CELL_SIZE / 2, offsetY + module.y * CELL_SIZE + CELL_SIZE / 2, 25);
      fill(255);
      text(symbol, offsetX + module.x * CELL_SIZE + CELL_SIZE / 2, offsetY + module.y * CELL_SIZE + CELL_SIZE / 2);

      if (frameCount % TURRET_TYPES[module.type].attackRate === 0 && gameState !== 'paused') {
        for (let enemy of enemies) {
          let d = dist(offsetX + module.x * CELL_SIZE + CELL_SIZE / 2, offsetY + module.y * CELL_SIZE + CELL_SIZE / 2, enemy.x, enemy.y);
          if (module.type === 'melee' && d < TURRET_TYPES.melee.range) {
            enemy.hp -= TURRET_TYPES.melee.damage;
          } else if (module.type === 'projectile' && d < TURRET_TYPES.projectile.range) {
            projectiles.push({
              x: offsetX + module.x * CELL_SIZE + CELL_SIZE / 2,
              y: offsetY + module.y * CELL_SIZE + CELL_SIZE / 2,
              target: enemy,
              speed: 3,
              damage: TURRET_TYPES.projectile.damage
            });
          }
        }
      }
    }
  }
}

function drawEnemies() {
  let offsetX = (width - GRID_WIDTH * CELL_SIZE) / 2;
  let offsetY = (height - GRID_HEIGHT * CELL_SIZE) / 2 + 30;
  for (let enemy of enemies) {
    fill(ENEMY_COLOR);
    noStroke();
    ellipse(enemy.x, enemy.y, 20);
    if (gameState !== 'paused' && enemy.path.length > 0) {
      let nextPoint = enemy.path[enemy.pathIndex];
      let targetX = offsetX + nextPoint.x * CELL_SIZE + CELL_SIZE / 2;
      let targetY = offsetY + nextPoint.y * CELL_SIZE + CELL_SIZE / 2;
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
  let offsetX = (width - GRID_WIDTH * CELL_SIZE) / 2;
  let offsetY = (height - GRID_HEIGHT * CELL_SIZE) / 2 + 30;
  fill(255);
  text(`Base HP: ${base.hp}`, offsetX + (GRID_WIDTH - 1) * CELL_SIZE + CELL_SIZE / 2, offsetY + GRID_HEIGHT * CELL_SIZE + 20);
}

function drawTurretButtons() {
  let offsetX = (width - 480) / 2;
  let buttonY = height - 60;
  let buttonSpacing = 120;

  fill(selectedModule === 'melee' ? BUTTON_COLOR : TEXT_COLOR);
  stroke(255);
  strokeWeight(1);
  rect(offsetX, buttonY, 110, 35, 5);
  noStroke();
  fill(255);
  text(`${TURRET_TYPES.melee.symbol} Sabreur (${TURRET_TYPES.melee.cost})`, offsetX + 55, buttonY + 17);

  fill(xp >= TURRET_TYPES.defense.xpRequired ? (selectedModule === 'defense' ? BUTTON_COLOR : TEXT_COLOR) : '#555555');
  stroke(255);
  rect(offsetX + buttonSpacing, buttonY, 110, 35, 5);
  noStroke();
  fill(255);
  text(`${TURRET_TYPES.defense.symbol} Bouclier (${TURRET_TYPES.defense.cost})`, offsetX + buttonSpacing + 55, buttonY + 17);

  fill(xp >= TURRET_TYPES.projectile.xpRequired ? (selectedModule === 'projectile' ? BUTTON_COLOR : TEXT_COLOR) : '#555555');
  stroke(255);
  rect(offsetX + buttonSpacing * 2, buttonY, 110, 35, 5);
  noStroke();
  fill(255);
  text(`${TURRET_TYPES.projectile.symbol} Archer (${TURRET_TYPES.projectile.cost})`, offsetX + buttonSpacing * 2 + 55, buttonY + 17);

  fill(selectedModule === 'wall' ? BUTTON_COLOR : TEXT_COLOR);
  stroke(255);
  rect(offsetX + buttonSpacing * 3, buttonY, 110, 35, 5);
  noStroke();
  fill(255);
  text(`${TURRET_TYPES.wall.symbol} Barrière (${TURRET_TYPES.wall.cost})`, offsetX + buttonSpacing * 3 + 55, buttonY + 17);
}

function updateGame() {
  for (let enemy of enemies) {
    if (enemy.x > (width - GRID_WIDTH * CELL_SIZE) / 2 + (GRID_WIDTH - 1) * CELL_SIZE - 5 && enemy.path.length === 0) {
      base.hp -= 10;
      enemy.hp = 0;
    }
  }
  
  enemies = enemies.filter(enemy => {
    if (enemy.hp <= 0) {
      xp += 5;
      energy += 2;
      return false;
    }
    return true;
  });
  
  if (base.hp <= 0) {
    gameState = 'gameover';
    fill(BUTTON_COLOR);
    text('Game Over', width / 2, height / 2);
    noLoop();
  }
  
  for (let module of modules) {
    if (module.type === 'defense') {
      base.hp = min(BASE_HP + TURRET_TYPES.defense.hpBoost, base.hp + 1);
    }
  }
}

function mousePressed() {
  let offsetX = (width - GRID_WIDTH * CELL_SIZE) / 2;
  let offsetY = (height - GRID_HEIGHT * CELL_SIZE) / 2 + 30;
  let gridX = floor((mouseX - offsetX) / CELL_SIZE);
  let gridY = floor((mouseY - offsetY) / CELL_SIZE);
  let buttonY = height - 60;
  let buttonSpacing = 120;

  let controlButtonX = (width - 320) / 2;
  let controlButtonY = 20;
  if (mouseY >= controlButtonY && mouseY <= controlButtonY + 30) {
    if (mouseX >= controlButtonX && mouseX <= controlButtonX + 100 && enemies.length === 0 && gameState === 'playing') {
      spawnWave();
    } else if (mouseX >= controlButtonX + 110 && mouseX <= controlButtonX + 210) {
      gameState = gameState === 'playing' ? 'paused' : 'playing';
    } else if (mouseX >= controlButtonX + 220 && mouseX <= controlButtonX + 320) {
      resetGame();
    }
  }

  let turretButtonX = (width - 480) / 2;
  if (mouseY >= buttonY && mouseY <= buttonY + 35) {
    if (mouseX >= turretButtonX && mouseX <= turretButtonX + 110) {
      selectedModule = 'melee';
    } else if (mouseX >= turretButtonX + buttonSpacing && mouseX <= turretButtonX + buttonSpacing + 110 && xp >= TURRET_TYPES.defense.xpRequired) {
      selectedModule = 'defense';
    } else if (mouseX >= turretButtonX + buttonSpacing * 2 && mouseX <= turretButtonX + buttonSpacing * 2 + 110 && xp >= TURRET_TYPES.projectile.xpRequired) {
      selectedModule = 'projectile';
    } else if (mouseX >= turretButtonX + buttonSpacing * 3 && mouseX <= turretButtonX + buttonSpacing * 3 + 110) {
      selectedModule = 'wall';
    }
  }

  if (gridX >= 0 && gridX < GRID_WIDTH - 1 && gridY >= 0 && gridY < GRID_HEIGHT && (gameState === 'playing' || gameState === 'paused')) {
    if (selectedModule && !grid[gridX][gridY] && energy >= TURRET_TYPES[selectedModule].cost) {
      grid[gridX][gridY] = selectedModule;
      modules.push({ x: gridX, y: gridY, type: selectedModule });
      energy -= TURRET_TYPES[selectedModule].cost;
    } else if (grid[gridX][gridY]) {
      console.log("Emplacement déjà occupé");
    } else if (energy < TURRET_TYPES[selectedModule].cost) {
      console.log("Pas assez d'énergie");
    }
  }
}

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
  initializeGrid();
  loop();
}

document.addEventListener('DOMContentLoaded', function() {
  const deviceModal = document.getElementById('device-modal');
  const pcButton = document.getElementById('pc-button');
  const mobileButton = document.getElementById('mobile-button');

  pcButton.addEventListener('click', function() {
    deviceModal.style.display = 'none';
    document.body.classList.add('pc');
  });

  mobileButton.addEventListener('click', function() {
    deviceModal.style.display = 'none';
    document.body.classList.add('mobile');
  });
});