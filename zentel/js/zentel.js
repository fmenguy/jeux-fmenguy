const GRID_WIDTH = 9;
const GRID_HEIGHT = 5;
const CELL_SIZE = 60;
const ENEMY_SPEED = 1;
const MODULE_COST = 10;
const ATTACK_RANGE = 100;
const ATTACK_DAMAGE = 5;
const XP_PER_ENEMY = 5;

let grid = [];
let modules = [];
let enemies = [];
let energy = 20;
let xp = 0;
let wave = 0;
let gameState = 'setup'; // 'setup', 'playing', 'gameover'
let selectedModule = null;

function setup() {
  createCanvas(GRID_WIDTH * CELL_SIZE + 200, GRID_HEIGHT * CELL_SIZE + 100);
  textAlign(CENTER, CENTER);
  textSize(16);
  initializeGrid();
}

function initializeGrid() {
  for (let x = 0; x < GRID_WIDTH; x++) {
    grid[x] = [];
    for (let y = 0; y < GRID_HEIGHT; y++) {
      grid[x][y] = null;
    }
  }
}

function spawnWave() {
  wave++;
  for (let i = 0; i < wave * 2; i++) {
    enemies.push({
      x: GRID_WIDTH * CELL_SIZE,
      y: floor(random(GRID_HEIGHT)) * CELL_SIZE + CELL_SIZE / 2,
      hp: 10 + wave * 5,
      speed: ENEMY_SPEED
    });
  }
}

function draw() {
  background('#0a0a1e');
  drawGrid();
  drawModules();
  drawEnemies();
  drawUI();
  updateGame();
}

function drawGrid() {
  stroke('#00f0ff');
  strokeWeight(1);
  for (let x = 0; x < GRID_WIDTH; x++) {
    for (let y = 0; y < GRID_HEIGHT; y++) {
      fill(grid[x][y] ? '#1a1a3a' : '#0a0a2a');
      rect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
    }
  }
}

function drawModules() {
  for (let module of modules) {
    fill('#00f0ff');
    noStroke();
    ellipse(module.x * CELL_SIZE + CELL_SIZE / 2, module.y * CELL_SIZE + CELL_SIZE / 2, 30);
    fill(255);
    text('L', module.x * CELL_SIZE + CELL_SIZE / 2, module.y * CELL_SIZE + CELL_SIZE / 2);

    // Attaque à distance
    if (frameCount % 60 === 0) {
      for (let enemy of enemies) {
        let d = dist(module.x * CELL_SIZE + CELL_SIZE / 2, module.y * CELL_SIZE + CELL_SIZE / 2, enemy.x, enemy.y);
        if (d < ATTACK_RANGE) {
          enemy.hp -= ATTACK_DAMAGE;
          if (enemy.hp <= 0) {
            xp += XP_PER_ENEMY;
            energy += 2; // Gain d'énergie par ennemi tué
          }
        }
      }
    }
  }
}

function drawEnemies() {
  for (let enemy of enemies) {
    fill('#ff00ff');
    noStroke();
    ellipse(enemy.x, enemy.y, 20);
    if (gameState === 'playing') {
      enemy.x -= enemy.speed;
    }
  }
  enemies = enemies.filter(enemy => enemy.hp > 0 && enemy.x > -20);
}

function drawUI() {
  fill('#00f0ff');
  noStroke();
  text(`ZENTEL  Niveau ${wave}`, width / 2, 20);
  text(`Énergie: ${energy}`, width - 100, 50);
  text(`XP: ${xp}`, width - 100, 70);
  text('Placer Tourelle (L)', width - 100, 100);
  text('Lancer Vague', width - 100, 130);

  fill(selectedModule === 'laser' ? '#ff00ff' : '#00f0ff');
  rect(width - 150, 90, 100, 20);
  fill(gameState === 'setup' ? '#ff00ff' : '#00f0ff');
  rect(width - 150, 120, 100, 20);
}

function updateGame() {
  if (enemies.length === 0 && gameState === 'playing') {
    gameState = 'setup';
  }
  for (let enemy of enemies) {
    if (enemy.x < 0) {
      gameState = 'gameover';
    }
  }
  if (gameState === 'gameover') {
    fill('#ff00ff');
    text('Game Over', width / 2, height / 2);
    noLoop();
  }
}

function mousePressed() {
  let x = floor(mouseX / CELL_SIZE);
  let y = floor(mouseY / CELL_SIZE);

  if (mouseX > width - 150 && mouseX < width - 50) {
    if (mouseY > 90 && mouseY < 110) {
      selectedModule = 'laser';
    } else if (mouseY > 120 && mouseY < 140 && gameState === 'setup') {
      gameState = 'playing';
      spawnWave();
    }
  }

  if (x >= 0 && x < GRID_WIDTH && y >= 0 && y < GRID_HEIGHT && gameState === 'setup') {
    if (selectedModule === 'laser' && !grid[x][y] && energy >= MODULE_COST) {
      grid[x][y] = 'laser';
      modules.push({ x, y, type: 'laser', level: 1 });
      energy -= MODULE_COST;
    }
  }
}