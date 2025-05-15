const GRID_WIDTH = 15;
const GRID_HEIGHT = 10;
const CELL_SIZE = 40;
const ENEMY_SPEED = 0.5; // Réduit pour mieux voir le pathfinding
const MODULE_COST = 10;
const XP_PER_ENEMY = 5;
const BASE_HP = 100;

// Couleurs ajustées
const TEXT_COLOR = '#4682b4'; // Bleu acier
const BUTTON_COLOR = '#6a5acd'; // Violet ardoise
const ENEMY_COLOR = '#ff0000'; // Rouge pour les vaisseaux ennemis

// Types de tourelles et murs
const TURRET_TYPES = {
  melee: { name: "Corps à Corps", symbol: "⚔️", damage: 10, range: 50, color: null, attackRate: 60, xpRequired: 0 },
  defense: { name: "Défense", symbol: "🛡️", damage: 0, range: 0, color: null, hpBoost: 20, xpRequired: 20 },
  projectile: { name: "Distance", symbol: "🏹", damage: 5, range: 150, color: null, attackRate: 90, xpRequired: 50 },
  wall: { name: "Mur", symbol: "█", color: '#808080', xpRequired: 0 }
};

let grid = [];
let modules = [];
let enemies = [];
let energy = 20;
let xp = 0;
let wave = 0;
let gameState = 'colorSelect'; // 'colorSelect', 'setup', 'playing', 'paused', 'gameover'
let selectedModule = null;
let base = { x: GRID_WIDTH - 1, hp: BASE_HP };
let playerColor = null;
let projectiles = [];

function setup() {
  createCanvas(GRID_WIDTH * CELL_SIZE + 300, GRID_HEIGHT * CELL_SIZE + 150);
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
      { dx: 1, dy: 0 },  // Droite
      { dx: 0, dy: 1 },  // Bas
      { dx: 0, dy: -1 }, // Haut
      { dx: -1, dy: 0 }  // Gauche
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
  
  if (gameState === 'colorSelect') {
    drawColorSelect();
  } else {
    drawGrid();
    drawModules();
    drawEnemies();
    drawProjectiles();
    drawBase();
    drawUI();
    drawLegend();
    updateGame();
  }
}

function drawColorSelect() {
  fill(TEXT_COLOR);
  text('Choisissez la couleur de vos tourelles', width / 2, height / 2 - 50);
  fill(255, 0, 0);
  rect(width / 2 - 60, height / 2, 50, 30);
  fill(0, 255, 0);
  rect(width / 2, height / 2, 50, 30);
  fill(0, 0, 255);
  rect(width / 2 + 60, height / 2, 50, 30);
}

function drawGrid() {
  stroke('#d2b48c');
  strokeWeight(1);
  for (let x = 0; x < GRID_WIDTH; x++) {
    for (let y = 0; y < GRID_HEIGHT; y++) {
      fill(grid[x][y] === 'base' ? '#4682b4' : '#f5deb3');
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
      fill(playerColor || TEXT_COLOR);
      noStroke();
      let symbol = TURRET_TYPES[module.type].symbol;
      ellipse(module.x * CELL_SIZE + CELL_SIZE / 2, module.y * CELL_SIZE + CELL_SIZE / 2, 25);
      fill(255);
      text(symbol, module.x * CELL_SIZE + CELL_SIZE / 2, module.y * CELL_SIZE + CELL_SIZE / 2);

      if (frameCount % TURRET_TYPES[module.type].attackRate === 0) {
        for (let enemy of enemies) {
          let d = dist(module.x * CELL_SIZE + CELL_SIZE / 2, module.y * CELL_SIZE + CELL_SIZE / 2, enemy.x, enemy.y);
          if (module.type === 'melee' && d < TURRET_TYPES.melee.range) {
            enemy.hp -= TURRET_TYPES.melee.damage;
          } else if (module.type === 'projectile' && d < TURRET_TYPES.projectile.range) {
            projectiles.push({
              x: module.x * CELL_SIZE + CELL_SIZE / 2,
              y: module.y * CELL_SIZE + CELL_SIZE / 2,
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

function drawProjectiles() {
  for (let i = projectiles.length - 1; i >= 0; i--) {
    let p = projectiles[i];
    fill(playerColor || TEXT_COLOR);
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

function drawEnemies() {
  for (let enemy of enemies) {
    fill(ENEMY_COLOR);
    noStroke();
    ellipse(enemy.x, enemy.y, 20);
    if (gameState === 'playing' && enemy.path.length > 0) {
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

function drawBase() {
  fill(255);
  text(`Base HP: ${base.hp}`, (GRID_WIDTH - 1) * CELL_SIZE + CELL_SIZE / 2, GRID_HEIGHT * CELL_SIZE + 20);
}

function drawUI() {
  // Stats en haut à droite
  fill(TEXT_COLOR);
  noStroke();
  text(`ZENTEL  Niveau ${wave}`, width / 2, 20);
  text(`Énergie: ${energy}`, width - 120, 50);
  text(`XP: ${xp}`, width - 120, 70);

  // Menu des boutons (amélioré)
  let menuX = GRID_WIDTH * CELL_SIZE + 50;
  let menuY = 100;
  text('Placer:', menuX + 50, menuY - 20);

  // Bouton Corps à Corps
  fill(selectedModule === 'melee' ? BUTTON_COLOR : TEXT_COLOR);
  stroke(255);
  strokeWeight(1);
  rect(menuX, menuY, 100, 25, 5);
  noStroke();
  fill(255);
  text(`${TURRET_TYPES.melee.symbol} Corps à Corps`, menuX + 50, menuY + 12);

  // Bouton Défense (déblocable avec XP)
  fill(xp >= TURRET_TYPES.defense.xpRequired ? (selectedModule === 'defense' ? BUTTON_COLOR : TEXT_COLOR) : '#555555');
  stroke(255);
  rect(menuX, menuY + 35, 100, 25, 5);
  noStroke();
  fill(255);
  text(`${TURRET_TYPES.defense.symbol} Défense (${TURRET_TYPES.defense.xpRequired} XP)`, menuX + 50, menuY + 47);

  // Bouton Distance (déblocable avec XP)
  fill(xp >= TURRET_TYPES.projectile.xpRequired ? (selectedModule === 'projectile' ? BUTTON_COLOR : TEXT_COLOR) : '#555555');
  stroke(255);
  rect(menuX, menuY + 70, 100, 25, 5);
  noStroke();
  fill(255);
  text(`${TURRET_TYPES.projectile.symbol} Distance (${TURRET_TYPES.projectile.xpRequired} XP)`, menuX + 50, menuY + 82);

  // Bouton Mur
  fill(selectedModule === 'wall' ? BUTTON_COLOR : TEXT_COLOR);
  stroke(255);
  rect(menuX, menuY + 105, 100, 25, 5);
  noStroke();
  fill(255);
  text(`${TURRET_TYPES.wall.symbol} Mur`, menuX + 50, menuY + 117);

  // Boutons de contrôle (Lancer, Pause, Relancer)
  menuY += 150;
  fill(gameState === 'setup' ? BUTTON_COLOR : TEXT_COLOR);
  stroke(255);
  rect(menuX, menuY, 100, 25, 5);
  noStroke();
  fill(255);
  text('Lancer', menuX + 50, menuY + 12);

  fill(gameState === 'paused' ? BUTTON_COLOR : TEXT_COLOR);
  stroke(255);
  rect(menuX, menuY + 35, 100, 25, 5);
  noStroke();
  fill(255);
  text('Pause', menuX + 50, menuY + 47);

  fill(BUTTON_COLOR);
  stroke(255);
  rect(menuX, menuY + 70, 100, 25, 5);
  noStroke();
  fill(255);
  text('Relancer', menuX + 50, menuY + 82);
}

function drawLegend() {
  let legendX = GRID_WIDTH * CELL_SIZE + 50;
  let legendY = 400; // Plus espacé
  fill(TEXT_COLOR);
  text('Légende des Tourelles', legendX + 50, legendY);
  text(`${TURRET_TYPES.melee.symbol} Corps à Corps : ${TURRET_TYPES.melee.damage} dégâts, portée ${TURRET_TYPES.melee.range}`, legendX + 50, legendY + 25);
  text(`${TURRET_TYPES.defense.symbol} Défense : +${TURRET_TYPES.defense.hpBoost} HP à la base`, legendX + 50, legendY + 50);
  text(`${TURRET_TYPES.projectile.symbol} Distance : ${TURRET_TYPES.projectile.damage} dégâts, portée ${TURRET_TYPES.projectile.range}`, legendX + 50, legendY + 75);
  text(`${TURRET_TYPES.wall.symbol} Mur : Bloque les ennemis`, legendX + 50, legendY + 100);
}

function updateGame() {
  if (enemies.length === 0 && gameState === 'playing') {
    gameState = 'setup';
  }
  for (let enemy of enemies) {
    if (enemy.x > (GRID_WIDTH - 1) * CELL_SIZE - 5 && enemy.path.length === 0) {
      base.hp -= 10;
      enemy.hp = 0;
    }
  }
  enemies = enemies.filter(enemy => {
    if (enemy.hp <= 0) {
      xp += XP_PER_ENEMY; // Gain d'XP à chaque ennemi tué
      energy += 2; // Gain d'énergie
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
  let x = floor(mouseX / CELL_SIZE);
  let y = floor(mouseY / CELL_SIZE);
  let menuX = GRID_WIDTH * CELL_SIZE + 50;

  if (gameState === 'colorSelect') {
    if (mouseY > height / 2 && mouseY < height / 2 + 30) {
      if (mouseX > width / 2 - 60 && mouseX < width / 2 - 10) {
        playerColor = [255, 0, 0];
      } else if (mouseX > width / 2 && mouseX < width / 2 + 50) {
        playerColor = [0, 255, 0];
      } else if (mouseX > width / 2 + 60 && mouseX < width / 2 + 110) {
        playerColor = [0, 0, 255];
      }
      gameState = 'setup';
    }
    return;
  }

  if (mouseX > menuX && mouseX < menuX + 100) {
    if (mouseY > 100 && mouseY < 125) {
      selectedModule = 'melee';
    } else if (mouseY > 135 && mouseY < 160 && xp >= TURRET_TYPES.defense.xpRequired) {
      selectedModule = 'defense';
    } else if (mouseY > 170 && mouseY < 195 && xp >= TURRET_TYPES.projectile.xpRequired) {
      selectedModule = 'projectile';
    } else if (mouseY > 205 && mouseY < 230) {
      selectedModule = 'wall';
    } else if (mouseY > 250 && mouseY < 275 && gameState === 'setup') {
      gameState = 'playing';
      spawnWave();
    } else if (mouseY > 285 && mouseY < 310) {
      gameState = gameState === 'playing' ? 'paused' : 'playing';
    } else if (mouseY > 320 && mouseY < 345) {
      resetGame();
    }
  }

  if (x >= 0 && x < GRID_WIDTH - 1 && y >= 0 && y < GRID_HEIGHT && gameState === 'setup') {
    if (selectedModule && !grid[x][y] && energy >= MODULE_COST) {
      grid[x][y] = selectedModule;
      modules.push({ x, y, type: selectedModule });
      energy -= MODULE_COST;
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
  gameState = 'setup';
  initializeGrid();
  loop();
}