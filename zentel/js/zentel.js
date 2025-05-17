// Constantes
const GRID_WIDTH = 15;
const GRID_HEIGHT = 10;
const CELL_SIZE = 40;
const BASE_HP = 100;

const TEXT_COLOR = '#e0e0ff';
const BUTTON_COLOR = '#6a5acd';
const ENEMY_COLOR = '#ff5555';
const BOSS_COLOR = '#000000';
const TRIANGLE_COLOR = '#00ff00';
const TURRET_COLOR = '#55ff55';
const ENEMY_ZONE_COLOR = '#ff0000';
const UPGRADE_COLOR_LVL2 = '#ffcc00';
const UPGRADE_COLOR_LVL3 = '#ff00ff';

const TURRET_TYPES = {
  melee: { name: "Sabreur Quantique", symbol: "⚔️", damage: 10, range: 60, attackRate: 60, cost: 10, level: 1 },
  projectile: { name: "Archer Plasma", symbol: "🏹", damage: 5, range: 150, attackRate: 90, cost: 20, level: 1 },
  wall: { name: "Barrière Énergétique", symbol: "█", color: '#808080', cost: 5 }
};

const ENEMY_TYPES = [
  { hp: 10, speed: 0.5 * 1.5, xp: 5, energy: 0 },
  { hp: 20, speed: 0.7 * 1.5, xp: 10, energy: 0 },
  { hp: 30, speed: 0.3 * 1.5, xp: 15, energy: 0 },
];

const BOSS_TYPE = { hp: 60, speed: 0.3 * 1.5, xp: 30, energy: 0 };
const SUPER_BOSS_TYPE = { hp: 150, speed: 0.4 * 1.5, xp: 50, energy: 0 };
const TRIANGLE_TYPE = { hp: 100, speed: 0.2 * 1.5, xp: 40, energy: 0, attackRate: 120 };

let grid = [];
let modules = [];
let enemies = [];
let energy = 20; // Confirmé : 20 d'énergie au départ
let xp = 0;
let wave = 0;
let gameState = 'playing';
let selectedModule = null;
let base = { x: GRID_WIDTH - 1, hp: BASE_HP };
let projectiles = [];
let enemyProjectiles = [];
let upgrades = { range: 1, attackSpeed: 1, damage: 1 };
let isDeleteModeActive = false;

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
  let enemyCount = wave * 5;

  let enemyTypesToSpawn = [];
  if (wave < 5) {
    let enemyTypeIndex = min(wave - 1, ENEMY_TYPES.length - 1);
    enemyTypesToSpawn.push({ type: ENEMY_TYPES[enemyTypeIndex], isBoss: false, isTriangle: false });
  } else if (wave < 10) {
    let normalEnemyIndex = min(wave - 1, ENEMY_TYPES.length - 1);
    enemyTypesToSpawn.push({ type: ENEMY_TYPES[normalEnemyIndex], isBoss: false, isTriangle: false });
    enemyTypesToSpawn.push({ type: BOSS_TYPE, isBoss: true, isTriangle: false });
  } else if (wave < 20) {
    let normalEnemyIndex = min(wave - 1, ENEMY_TYPES.length - 1);
    enemyTypesToSpawn.push({ type: ENEMY_TYPES[normalEnemyIndex], isBoss: false, isTriangle: false });
    enemyTypesToSpawn.push({ type: BOSS_TYPE, isBoss: true, isTriangle: false });
    enemyTypesToSpawn.push({ type: SUPER_BOSS_TYPE, isBoss: true, isTriangle: false });
  } else {
    let normalEnemyIndex = min(wave - 1, ENEMY_TYPES.length - 1);
    enemyTypesToSpawn.push({ type: ENEMY_TYPES[normalEnemyIndex], isBoss: false, isTriangle: false });
    enemyTypesToSpawn.push({ type: BOSS_TYPE, isBoss: true, isTriangle: false });
    enemyTypesToSpawn.push({ type: SUPER_BOSS_TYPE, isBoss: true, isTriangle: false });
    enemyTypesToSpawn.push({ type: TRIANGLE_TYPE, isBoss: false, isTriangle: true });
  }

  let enemiesPerType = Math.floor(enemyCount / enemyTypesToSpawn.length);
  for (let enemyTypeData of enemyTypesToSpawn) {
    let enemyType = enemyTypeData.type;
    let isBoss = enemyTypeData.isBoss;
    let isTriangle = enemyTypeData.isTriangle;
    let baseHp = enemyType.hp + wave * 5;
    let attackRate = enemyType.attackRate || 0;

    for (let i = 0; i < enemiesPerType; i++) {
      let startY = floor(random(GRID_HEIGHT));
      let path = isBoss ? findPathAerial(0, startY, GRID_WIDTH - 1, startY) : findPath(0, startY, GRID_WIDTH - 1, startY);
      if (path.length === 0) {
        let foundPath = false;
        for (let y = 0; y < GRID_HEIGHT; y++) {
          path = isBoss ? findPathAerial(0, y, GRID_WIDTH - 1, y) : findPath(0, y, GRID_WIDTH - 1, y);
          if (path.length > 0) {
            startY = y;
            foundPath = true;
            break;
          }
        }
        if (!foundPath) continue;
      }
      enemies.push({
        x: 0,
        y: startY * CELL_SIZE + CELL_SIZE / 2,
        hp: baseHp * (1 + wave * 0.1),
        maxHp: baseHp * (1 + wave * 0.1),
        speed: enemyType.speed,
        path: path,
        pathIndex: 0,
        xp: enemyType.xp,
        energy: enemyType.energy,
        isBoss: isBoss,
        isTriangle: isTriangle,
        attackRate: attackRate
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
  let path = [];
  let x = startX;
  while (x < goalX) {
    x++;
    path.push({ x: x, y: startY });
  }
  return path;
}

function findPathAerial(startX, startY, goalX, goalY) {
  let path = [];
  let x = startX;
  while (x <= goalX) {
    path.push({ x: x, y: startY });
    x++;
  }
  return path;
}

function hasPathToBase() {
  for (let startY = 0; startY < GRID_HEIGHT; startY++) {
    let path = findPath(0, startY, GRID_WIDTH - 1, startY);
    if (path.length === 0) {
      return false;
    }
  }
  return true;
}

function isMapFull() {
  for (let x = 1; x < GRID_WIDTH - 1; x++) {
    for (let y = 0; y < GRID_HEIGHT; y++) {
      if (grid[x][y] === null) {
        return false;
      }
    }
  }
  return true;
}

function isAreaFree(startX, startY, width, height) {
  for (let x = startX; x < startX + width; x++) {
    for (let y = startY; y < startY + height; y++) {
      if (x >= GRID_WIDTH - 1 || y >= GRID_HEIGHT || x < 1 || grid[x][y] !== null) {
        return false;
      }
    }
  }
  return true;
}

function occupyArea(startX, startY, width, height, moduleType) {
  for (let x = startX; x < startX + width; x++) {
    for (let y = startY; y < startY + height; y++) {
      grid[x][y] = moduleType;
    }
  }
}

function draw() {
  background('#0a0a1e');
  drawGrid();
  drawModules();
  drawEnemies();
  drawProjectiles();
  drawEnemyProjectiles();
  drawBase();
  updateGame();
}

function drawGrid() {
  stroke('#2a2a4a');
  strokeWeight(1);
  for (let x = 0; x < GRID_WIDTH; x++) {
    for (let y = 0; y < GRID_HEIGHT; y++) {
      if (x === 0) {
        fill(ENEMY_ZONE_COLOR);
        stroke(ENEMY_ZONE_COLOR);
      } else {
        fill(grid[x][y] === 'base' ? '#4682b4' : '#1a1a2e');
        stroke('#2a2a4a');
      }
      rect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
    }
  }
}

function drawModules() {
  for (let module of modules) {
    let symbol = TURRET_TYPES[module.type].symbol;
    let color = TURRET_COLOR;
    let width = CELL_SIZE;
    let height = CELL_SIZE;

    if (module.level >= 2) {
      color = UPGRADE_COLOR_LVL2;
      width = CELL_SIZE * 2;
      height = CELL_SIZE;
    }
    if (module.level >= 3) {
      color = UPGRADE_COLOR_LVL3;
      width = CELL_SIZE * 2;
      height = CELL_SIZE * 2;
    }

    if (module.type === 'wall') {
      fill(TURRET_TYPES.wall.color);
      noStroke();
      rect(module.x * CELL_SIZE, module.y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
      fill(255);
      text(symbol, module.x * CELL_SIZE + CELL_SIZE / 2, module.y * CELL_SIZE + CELL_SIZE / 2);
    } else {
      fill(color);
      noStroke();
      rect(module.x * CELL_SIZE, module.y * CELL_SIZE, width, height);
      fill(255);
      text(symbol, module.x * CELL_SIZE + width / 2, module.y * CELL_SIZE + height / 2);

      if (module.level > 1) {
        fill('#ffffff');
        textSize(10);
        text(module.level, module.x * CELL_SIZE + width / 2, module.y * CELL_SIZE + height / 2 + 15);
        textSize(14);
      }

      if (frameCount % (TURRET_TYPES[module.type].attackRate / upgrades.attackSpeed) === 0) {
        for (let enemy of enemies) {
          if (enemy.isBoss && module.type !== 'projectile') continue;

          let d = dist(module.x * CELL_SIZE + CELL_SIZE / 2, module.y * CELL_SIZE + CELL_SIZE / 2, enemy.x, enemy.y);
          let effectiveDamage = TURRET_TYPES[module.type].damage * upgrades.damage * (1 + wave * 0.05);
          let effectiveRange = TURRET_TYPES[module.type].range * upgrades.range * (1 + wave * 0.02);
          if (module.level > 1) {
            effectiveDamage *= (1 + module.level * 0.3);
            effectiveRange *= (1 + module.level * 0.1);
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
    if (enemy.isTriangle) {
      fill(TRIANGLE_COLOR);
      noStroke();
      push();
      translate(enemy.x, enemy.y);
      triangle(-10, 10, 0, -10, 10, 10);
      pop();
    } else {
      fill(enemy.isBoss ? BOSS_COLOR : ENEMY_COLOR);
      noStroke();
      ellipse(enemy.x, enemy.y, 20);
    }

    let hpRatio = enemy.hp / enemy.maxHp;
    let healthColor = hpRatio > 0.6 ? '#55ff55' : hpRatio > 0.3 ? '#ffff55' : '#ff5555';
    stroke(healthColor);
    strokeWeight(2);
    noFill();
    let angle = map(hpRatio, 0, 1, 0, TWO_PI);
    arc(enemy.x, enemy.y, 16, 16, -PI/2, angle - PI/2);

    if (enemy.isTriangle && frameCount % enemy.attackRate === 0) {
      let closestModule = null;
      let closestDist = Infinity;
      for (let module of modules) {
        let d = dist(enemy.x, enemy.y, module.x * CELL_SIZE + CELL_SIZE / 2, module.y * CELL_SIZE + CELL_SIZE / 2);
        if (d < closestDist) {
          closestDist = d;
          closestModule = module;
        }
      }
      if (closestModule) {
        enemyProjectiles.push({
          x: enemy.x,
          y: enemy.y,
          targetX: closestModule.x * CELL_SIZE + CELL_SIZE / 2,
          targetY: closestModule.y * CELL_SIZE + CELL_SIZE / 2,
          speed: 2,
          damage: 10
        });
      }
    }

    if (enemy.path.length > 0) {
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
        } else {
          let nextGridX = floor(targetX / CELL_SIZE);
          let nextGridY = floor(targetY / CELL_SIZE);
          if (!enemy.isBoss && grid[nextGridX][nextGridY] && grid[nextGridX][nextGridY] !== 'base') {
            let startX = floor(enemy.x / CELL_SIZE);
            let startY = floor(enemy.y / CELL_SIZE);
            let path = findPath(startX, startY, GRID_WIDTH - 1, startY);
            enemy.path = path;
            enemy.pathIndex = 0;
          }
        }
      } else {
        enemy.x += (dx / distToTarget) * enemy.speed;
        enemy.y += (dy / distToTarget) * enemy.speed;
      }
    } else {
      let startX = floor(enemy.x / CELL_SIZE);
      let startY = floor(enemy.y / CELL_SIZE);
      let path = enemy.isBoss ? findPathAerial(startX, startY, GRID_WIDTH - 1, startY) : findPath(startX, startY, GRID_WIDTH - 1, startY);
      if (path.length > 0) {
        enemy.path = path;
        enemy.pathIndex = 0;
      } else {
        let directions = [
          { dx: 1, dy: 0 },
          { dx: -1, dy: 0 },
          { dx: 0, dy: 1 },
          { dx: 0, dy: -1 }
        ];
        let moved = false;
        for (let dir of directions) {
          let newGridX = startX + dir.dx;
          let newGridY = startY + dir.dy;
          if (
            newGridX >= 0 && newGridX < GRID_WIDTH - 1 &&
            newGridY >= 0 && newGridY < GRID_HEIGHT &&
            (grid[newGridX][newGridY] === null || grid[newGridX][newGridY] === 'base')
          ) {
            enemy.x = newGridX * CELL_SIZE + CELL_SIZE / 2;
            enemy.y = newGridY * CELL_SIZE + CELL_SIZE / 2;
            path = enemy.isBoss ? findPathAerial(newGridX, newGridY, GRID_WIDTH - 1, newGridY) : findPath(newGridX, newGridY, GRID_WIDTH - 1, newGridY);
            if (path.length > 0) {
              enemy.path = path;
              enemy.pathIndex = 0;
              moved = true;
              break;
            }
          }
        }
        if (!moved) {
          enemy.x += enemy.speed;
          let startX = floor(enemy.x / CELL_SIZE);
          let startY = floor(enemy.y / CELL_SIZE);
          path = enemy.isBoss ? findPathAerial(startX, startY, GRID_WIDTH - 1, startY) : findPath(startX, startY, GRID_WIDTH - 1, startY);
          enemy.path = path;
          enemy.pathIndex = 0;
        }
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

function drawEnemyProjectiles() {
  for (let i = enemyProjectiles.length - 1; i >= 0; i--) {
    let p = enemyProjectiles[i];
    fill(TRIANGLE_COLOR);
    ellipse(p.x, p.y, 8);
    let angle = atan2(p.targetY - p.y, p.targetX - p.x);
    p.x += p.speed * cos(angle);
    p.y += p.speed * sin(angle);
    let d = dist(p.x, p.y, p.targetX, p.targetY);
    if (d < 5) {
      let targetGridX = floor(p.targetX / CELL_SIZE);
      let targetGridY = floor(p.targetY / CELL_SIZE);
      let moduleIndex = modules.findIndex(m => m.x === targetGridX && m.y === targetGridY);
      if (moduleIndex !== -1) {
        let module = modules[moduleIndex];
        if (module.type === 'wall') {
          modules.splice(moduleIndex, 1);
          grid[targetGridX][targetGridY] = null;
        } else {
          module.hp = (module.hp || TURRET_TYPES[module.type].damage * 5);
          module.hp -= p.damage;
          if (module.hp <= 0) {
            if (module.level >= 2) {
              let width = module.level >= 3 ? 2 : 2;
              let height = module.level >= 3 ? 2 : 1;
              for (let x = module.x; x < module.x + width; x++) {
                for (let y = module.y; y < module.y + height; y++) {
                  if (x < GRID_WIDTH && y < GRID_HEIGHT) {
                    grid[x][y] = null;
                  }
                }
              }
            }
            modules.splice(moduleIndex, 1);
            grid[targetGridX][targetGridY] = null;
          }
        }
        enemies.forEach(enemy => {
          if (enemy.path.length > 0) {
            let startX = floor(enemy.x / CELL_SIZE);
            let startY = floor(enemy.y / CELL_SIZE);
            let path = enemy.isBoss ? findPathAerial(startX, startY, GRID_WIDTH - 1, startY) : findPath(startX, startY, GRID_WIDTH - 1, startY);
            enemy.path = path;
            enemy.pathIndex = 0;
          }
        });
      }
      enemyProjectiles.splice(i, 1);
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
    if (type === 'projectile' && wave < 5) {
      btn.classList.add('locked');
      btn.querySelector('.turret-cost').textContent = `Vague 5+`;
    } else if (energy < cost) {
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

  const deleteBtn = document.getElementById('delete-turret-btn');
  if (isDeleteModeActive) {
    deleteBtn.classList.add('active');
  } else {
    deleteBtn.classList.remove('active');
  }
}

function mousePressed() {
  let gridX = floor(mouseX / CELL_SIZE);
  let gridY = floor(mouseY / CELL_SIZE);

  if (gridX >= 0 && gridX < GRID_WIDTH - 1 && gridY >= 0 && gridY < GRID_HEIGHT) {
    if (gridX === 0) {
      return;
    }

    if (isMapFull() && grid[gridX][gridY] && grid[gridX][gridY] !== 'wall' && grid[gridX][gridY] !== 'base') {
      let module = modules.find(m => m.x === gridX && m.y === gridY);
      if (module) {
        if (wave >= 7 && module.level === 1 && xp >= 2000) {
          xp -= 2000;
          module.level = 2;
          if (gridX + 1 < GRID_WIDTH - 1 && grid[gridX + 1][gridY] === null) {
            occupyArea(gridX, gridY, 2, 1, module.type);
          } else if (gridY + 1 < GRID_HEIGHT && grid[gridX][gridY + 1] === null) {
            occupyArea(gridX, gridY, 1, 2, module.type);
          } else {
            module.level = 1;
            xp += 2000;
          }
          updateStats();
          return;
        }
        if (wave >= 17 && module.level === 2 && xp >= 10000) {
          xp -= 10000;
          module.level = 3;
          let width = module.level >= 3 ? 2 : 2;
          let height = module.level >= 3 ? 2 : 1;
          for (let x = module.x; x < module.x + width; x++) {
            for (let y = module.y; y < module.y + height; y++) {
              if (x < GRID_WIDTH && y < GRID_HEIGHT) {
                grid[x][y] = null;
              }
            }
          }
          if (isAreaFree(module.x, module.y, 2, 2)) {
            occupyArea(module.x, module.y, 2, 2, module.type);
          } else {
            module.level = 2;
            xp += 10000;
            occupyArea(module.x, module.y, 2, 1, module.type);
          }
          updateStats();
          return;
        }
      }
    }

    if (isDeleteModeActive && grid[gridX][gridY] && grid[gridX][gridY] !== 'base') {
      let moduleIndex = modules.findIndex(m => m.x === gridX && m.y === gridY);
      if (moduleIndex !== -1) {
        let module = modules[moduleIndex];
        let moduleType = grid[gridX][gridY];
        let refundEnergy = Math.floor(TURRET_TYPES[moduleType].cost / 2);
        energy += refundEnergy;
        let width = module.level >= 3 ? 2 : module.level === 2 ? 2 : 1;
        let height = module.level >= 3 ? 2 : module.level === 2 ? 1 : 1;
        for (let x = module.x; x < module.x + width; x++) {
          for (let y = module.y; y < module.y + height; y++) {
            if (x < GRID_WIDTH && y < GRID_HEIGHT) {
              grid[x][y] = null;
            }
          }
        }
        modules.splice(moduleIndex, 1);
        enemies.forEach(enemy => {
          if (enemy.path.length > 0) {
            let startX = floor(enemy.x / CELL_SIZE);
            let startY = floor(enemy.y / CELL_SIZE);
            let path = enemy.isBoss ? findPathAerial(startX, startY, GRID_WIDTH - 1, startY) : findPath(startX, startY, GRID_WIDTH - 1, startY);
            enemy.path = path;
            enemy.pathIndex = 0;
          }
        });
        updateStats();
        return;
      }
    }

    if (selectedModule && !isDeleteModeActive && !grid[gridX][gridY] && energy >= TURRET_TYPES[selectedModule].cost) {
      // Empêcher le placement des archers avant la vague 5
      if (selectedModule === 'projectile' && wave < 5) {
        return;
      }

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
      let enemyOnCell = enemies.find(enemy => {
        let enemyGridX = floor(enemy.x / CELL_SIZE);
        let enemyGridY = floor(enemy.y / CELL_SIZE);
        return enemyGridX === gridX && enemyGridY === gridY;
      });
      if (enemyOnCell) {
        let directions = [
          { dx: 1, dy: 0 },
          { dx: -1, dy: 0 },
          { dx: 0, dy: 1 },
          { dx: 0, dy: -1 }
        ];
        let moved = false;
        for (let dir of directions) {
          let newGridX = gridX + dir.dx;
          let newGridY = gridY + dir.dy;
          if (
            newGridX >= 0 && newGridX < GRID_WIDTH - 1 &&
            newGridY >= 0 && newGridY < GRID_HEIGHT &&
            (grid[newGridX][newGridY] === null || grid[newGridX][newGridY] === 'base')
          ) {
            enemyOnCell.x = newGridX * CELL_SIZE + CELL_SIZE / 2;
            enemyOnCell.y = newGridY * CELL_SIZE + CELL_SIZE / 2;
            let path = enemyOnCell.isBoss ? findPathAerial(newGridX, newGridY, GRID_WIDTH - 1, newGridY) : findPath(newGridX, newGridY, GRID_WIDTH - 1, newGridY);
            enemyOnCell.path = path;
            enemyOnCell.pathIndex = 0;
            moved = true;
            break;
          }
        }
        if (!moved) {
          return;
        }
      }
      grid[gridX][gridY] = selectedModule;
      modules.push({ x: gridX, y: gridY, type: selectedModule, level: 1 });
      energy -= TURRET_TYPES[selectedModule].cost;
      if (selectedModule === 'wall' || selectedModule === 'melee' || selectedModule === 'projectile') {
        enemies.forEach(enemy => {
          if (enemy.path.length > 0) {
            let startX = floor(enemy.x / CELL_SIZE);
            let startY = floor(enemy.y / CELL_SIZE);
            let path = enemy.isBoss ? findPathAerial(startX, startY, GRID_WIDTH - 1, startY) : findPath(startX, startY, GRID_WIDTH - 1, startY);
            enemy.path = path;
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
  isDeleteModeActive = false;
  updateStats();
});
document.getElementById('projectile-btn').addEventListener('click', () => {
  if (wave < 5) return; // Empêche l'activation des archers avant la vague 5
  selectedModule = selectedModule === 'projectile' ? null : 'projectile';
  isDeleteModeActive = false;
  updateStats();
});
document.getElementById('wall-btn').addEventListener('click', () => {
  selectedModule = selectedModule === 'wall' ? null : 'wall';
  isDeleteModeActive = false;
  updateStats();
});

// Bouton pour supprimer une tourelle
document.getElementById('delete-turret-btn').addEventListener('click', () => {
  isDeleteModeActive = !isDeleteModeActive;
  selectedModule = null;
  updateStats();
});

// Boutons de contrôle
document.getElementById('start-wave').addEventListener('click', () => {
  if (enemies.length === 0 && gameState === 'playing') {
    spawnWave();
  }
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
        let path = enemy.isBoss ? findPathAerial(startX, startY, GRID_WIDTH - 1, startY) : findPath(startX, startY, GRID_WIDTH - 1, startY);
        enemy.path = path;
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
  enemyProjectiles = [];
  energy = 40;
  xp = 0;
  wave = 0;
  base.hp = BASE_HP;
  gameState = 'playing';
  selectedModule = null;
  isDeleteModeActive = false;
  upgrades = { range: 1, attackSpeed: 1, damage: 1 };
  initializeGrid();
  updateStats();
  loop();
}