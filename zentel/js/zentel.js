const GRID_WIDTH = 15;
const GRID_HEIGHT = 10;
const CELL_SIZE = 40;
const ENEMY_SPEED = 1;
const MODULE_COST = 10;
const XP_PER_ENEMY = 5;
const BASE_HP = 100;

// Couleurs ajustées
const TEXT_COLOR = '#4682b4'; // Bleu acier
const BUTTON_COLOR = '#6a5acd'; // Violet ardoise
const ENEMY_COLOR = '#ff0000'; // Rouge pour les vaisseaux ennemis

// Types de tourelles avec symboles
const TURRET_TYPES = {
  melee: { name: "Corps à Corps", symbol: "⚔️", damage: 10, range: 50, color: null, attackRate: 60 },
  defense: { name: "Défense", symbol: "🛡️", damage: 0, range: 0, color: null, hpBoost: 20 },
  projectile: { name: "Distance", symbol: "🏹", damage: 5, range: 150, color: null, attackRate: 90 }
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
  createCanvas(GRID_WIDTH * CELL_SIZE + 300, GRID_HEIGHT * CELL_SIZE + 100);
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
    enemies.push({
      x: 0,
      y: floor(random(GRID_HEIGHT)) * CELL_SIZE + CELL_SIZE / 2,
      hp: 10 + wave * 5,
      speed: ENEMY_SPEED
    });
  }
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
    if (gameState === 'playing') {
      enemy.x += enemy.speed;
    }
  }
  enemies = enemies.filter(enemy => enemy.hp > 0 && enemy.x < width);
}

function drawBase() {
  fill(255);
  text(`Base HP: ${base.hp}`, (GRID_WIDTH - 1) * CELL_SIZE + CELL_SIZE / 2, GRID_HEIGHT * CELL_SIZE + 20);
}

function drawUI() {
  fill(TEXT_COLOR);
  noStroke();
  text(`ZENTEL  Niveau ${wave}`, width / 2, 20);
  text(`Énergie: ${energy}`, width - 100, 50);
  text(`XP: ${xp}`, width - 100, 70);

  let menuX = GRID_WIDTH * CELL_SIZE + 50;
  let menuY = 100;
  text('Placer Tourelle:', menuX + 50, menuY - 20);
  fill(selectedModule === 'melee' ? BUTTON_COLOR : TEXT_COLOR);
  rect(menuX, menuY, 100, 20);
  text('Corps à Corps', menuX + 50, menuY + 10);
  fill(selectedModule === 'defense' ? BUTTON_COLOR : TEXT_COLOR);
  rect(menuX, menuY + 30, 100, 20);
  text('Défense', menuX + 50, menuY + 40);
  fill(selectedModule === 'projectile' ? BUTTON_COLOR : TEXT_COLOR);
  rect(menuX, menuY + 60, 100, 20);
  text('Distance', menuX + 50, menuY + 70);

  fill(gameState === 'setup' ? BUTTON_COLOR : TEXT_COLOR);
  rect(menuX, menuY + 100, 100, 20);
  text('Lancer', menuX + 50, menuY + 110);
  fill(gameState === 'paused' ? BUTTON_COLOR : TEXT_COLOR);
  rect(menuX, menuY + 130, 100, 20);
  text('Pause', menuX + 50, menuY + 140);
  fill(BUTTON_COLOR);
  rect(menuX, menuY + 160, 100, 20);
  text('Relancer', menuX + 50, menuY + 170);
}

function drawLegend() {
  let legendX = GRID_WIDTH * CELL_SIZE + 50;
  let legendY = 300;
  fill(TEXT_COLOR);
  text('Légende des Tourelles', legendX + 50, legendY);
  text(`${TURRET_TYPES.melee.symbol} Corps à Corps : ${TURRET_TYPES.melee.damage} dégâts, portée ${TURRET_TYPES.melee.range}`, legendX + 50, legendY + 20);
  text(`${TURRET_TYPES.defense.symbol} Défense : +${TURRET_TYPES.defense.hpBoost} HP à la base`, legendX + 50, legendY + 40);
  text(`${TURRET_TYPES.projectile.symbol} Distance : ${TURRET_TYPES.projectile.damage} dégâts, portée ${TURRET_TYPES.projectile.range}`, legendX + 50, legendY + 60);
}

function updateGame() {
  if (enemies.length === 0 && gameState === 'playing') {
    gameState = 'setup';
  }
  for (let enemy of enemies) {
    if (enemy.x > (GRID_WIDTH - 1) * CELL_SIZE) {
      base.hp -= 10;
      enemy.hp = 0;
    }
  }
  enemies = enemies.filter(enemy => enemy.hp > 0);
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
    if (mouseY > 100 && mouseY < 120) {
      selectedModule = 'melee';
    } else if (mouseY > 130 && mouseY < 150) {
      selectedModule = 'defense';
    } else if (mouseY > 160 && mouseY < 180) {
      selectedModule = 'projectile';
    } else if (mouseY > 200 && mouseY < 220 && gameState === 'setup') {
      gameState = 'playing';
      spawnWave();
    } else if (mouseY > 230 && mouseY < 250) {
      gameState = gameState === 'playing' ? 'paused' : 'playing';
    } else if (mouseY > 260 && mouseY < 280) {
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