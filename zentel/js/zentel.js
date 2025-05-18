// Constantes
const GRID_WIDTH = 17;
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
  wall: { name: "Barrière Énergétique", symbol: "█", color: '#808080', cost: 5, hp: 50 }
};

const ENEMY_TYPES = [
  { hp: 10, speed: 0.5 * 1.5, xp: 3, energy: 0 },
  { hp: 20, speed: 0.7 * 1.5, xp: 5, energy: 0 },
  { hp: 30, speed: 0.3 * 1.5, xp: 8, energy: 0 },
];

const BOSS_TYPE = { hp: 60, speed: 0.3 * 1.5, xp: 15, energy: 0 };
const SUPER_BOSS_TYPE = { hp: 150, speed: 0.4 * 1.5, xp: 25, energy: 0 };
const TRIANGLE_TYPE = { hp: 100, speed: 0.2 * 1.5, xp: 20, energy: 0, attackRate: 120 };
const MEGA_BOSS_TYPE = { hp: 500, speed: 0.1 * 1.5, xp: 100, energy: 0, size: 2 }; // Prend 2x2 cases

let grid = [];
let modules = [];
let enemies = [];
let energy = 40;
let xp = 0;
let wave = 0;
let gameState = 'playing';
let selectedModule = null;
let base = { x: GRID_WIDTH - 1, hp: BASE_HP };
let projectiles = [];
let enemyProjectiles = [];
let isDeleteModeActive = false;
let isEvolveModeActive = false;
let waveCompleted = false;
let showTip = false;
let tipOpacity = 1;
let speedMultiplier = 1;
let tipModalShown = false;

// Variables pour le canvas
let canvasWidth, canvasHeight;

function setup() {
  canvasWidth = GRID_WIDTH * CELL_SIZE;
  canvasHeight = GRID_HEIGHT * CELL_SIZE;

  let canvas = createCanvas(canvasWidth, canvasHeight);
  canvas.parent('game-area');
  canvas.style('display', 'block');
  canvas.style('margin', 'auto');

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
  waveCompleted = false;
  let enemyCount = wave * 5;

  let enemyTypesToSpawn = [];
  if (wave < 5) {
    let enemyTypeIndex = min(wave - 1, ENEMY_TYPES.length - 1);
    enemyTypesToSpawn.push({ type: ENEMY_TYPES[enemyTypeIndex], isBoss: false, isTriangle: false });
  } else if (wave < 10) {
    let normalEnemyIndex = min(wave - 1, ENEMY_TYPES.length - 1);
    enemyTypesToSpawn.push({ type: ENEMY_TYPES[normalEnemyIndex], isBoss: false, isTriangle: false });
    enemyTypesToSpawn.push({ type: BOSS_TYPE, isBoss: true, isTriangle: false });
  } else if (wave < 12) {
    let normalEnemyIndex = min(wave - 1, ENEMY_TYPES.length - 1);
    enemyTypesToSpawn.push({ type: ENEMY_TYPES[normalEnemyIndex], isBoss: false, isTriangle: false });
    enemyTypesToSpawn.push({ type: BOSS_TYPE, isBoss: true, isTriangle: false });
    enemyTypesToSpawn.push({ type: SUPER_BOSS_TYPE, isBoss: true, isTriangle: false });
  } else if (wave < 15) {
    let normalEnemyIndex = min(wave - 1, ENEMY_TYPES.length - 1);
    enemyTypesToSpawn.push({ type: ENEMY_TYPES[normalEnemyIndex], isBoss: false, isTriangle: false });
    enemyTypesToSpawn.push({ type: BOSS_TYPE, isBoss: true, isTriangle: false });
    enemyTypesToSpawn.push({ type: SUPER_BOSS_TYPE, isBoss: true, isTriangle: false });
    enemyTypesToSpawn.push({ type: TRIANGLE_TYPE, isBoss: false, isTriangle: true });
  } else {
    let normalEnemyIndex = min(wave - 1, ENEMY_TYPES.length - 1);
    enemyTypesToSpawn.push({ type: ENEMY_TYPES[normalEnemyIndex], isBoss: false, isTriangle: false });
    enemyTypesToSpawn.push({ type: BOSS_TYPE, isBoss: true, isTriangle: false });
    enemyTypesToSpawn.push({ type: SUPER_BOSS_TYPE, isBoss: true, isTriangle: false });
    enemyTypesToSpawn.push({ type: TRIANGLE_TYPE, isBoss: false, isTriangle: true });
    enemyTypesToSpawn.push({ type: MEGA_BOSS_TYPE, isBoss: true, isTriangle: false });
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
      let path = isBoss ? findPathAerial(0, startY, GRID_WIDTH - 1, startY) : findPath(0, startY, GRID_WIDTH - 1, startY, false);
      if (path.length === 0) {
        let foundPath = false;
        for (let y = 0; y < GRID_HEIGHT; y++) {
          path = isBoss ? findPathAerial(0, y, GRID_WIDTH - 1, y) : findPath(0, y, GRID_WIDTH - 1, y, false);
          if (path.length > 0) {
            startY = y;
            foundPath = true;
            break;
          }
        }
        if (!foundPath) {
          for (let y = 0; y < GRID_HEIGHT; y++) {
            path = findPath(0, y, GRID_WIDTH - 1, y, true);
            if (path.length > 0) {
              startY = y;
              foundPath = true;
              break;
            }
          }
        }
        if (!foundPath) continue;
      }
      let adjustedSpeed = enemyType.speed * speedMultiplier;
      if (!isBoss && !isTriangle) { // Appliquer le facteur de vitesse uniquement aux ennemis normaux
        adjustedSpeed *= (1 + wave * 0.02); // Augmente la vitesse de 2% par vague
      }
      enemies.push({
        x: 0,
        y: startY * CELL_SIZE + CELL_SIZE / 2,
        hp: baseHp * (1 + wave * 0.1),
        maxHp: baseHp * (1 + wave * 0.1),
        speed: adjustedSpeed,
        path: path,
        pathIndex: 0,
        xp: enemyType.xp,
        energy: enemyType.energy,
        isBoss: isBoss,
        isTriangle: isTriangle,
        attackRate: attackRate,
        type: enemyType // Ajouter une référence au type pour identifier les méga boss
      });
    }
  }
  updateStats();
}

function findPath(startX, startY, goalX, goalY, allowThroughTurrets = false) {
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
        !visited.has(key)
      ) {
        let isValid = false;
        if (grid[newX][newY] === null || grid[newX][newY] === 'base') {
          isValid = true;
        } else if (allowThroughTurrets && (grid[newX][newY] === 'melee' || grid[newX][newY] === 'projectile')) {
          isValid = true;
        }

        if (isValid) {
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
        !visited.has(key)
      ) {
        let isValid = false;
        if (grid[newX][newY] === null || grid[newX][newY] === 'base') {
          isValid = true;
        } else if (allowThroughTurrets && (grid[newX][newY] === 'melee' || grid[newX][newY] === 'projectile')) {
          isValid = true;
        }

        if (isValid) {
          visited.add(key);
          queue.push({
            x: newX,
            y: newY,
            path: [...path, { x: newX, y: newY }]
          });
        }
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
  if (startY !== goalY) {
    path.push({ x: goalX, y: goalY });
  }
  return path;
}

function hasPathToBase() {
  for (let startY = 0; startY < GRID_HEIGHT; startY++) {
    let path = findPath(0, startY, GRID_WIDTH - 1, startY, false);
    if (path.length === 0) {
      path = findPath(0, startY, GRID_WIDTH - 1, startY, true);
      if (path.length === 0) {
        return false;
      }
    }
  }
  return true;
}

function isMapFull() {
  for (let x = 2; x < GRID_WIDTH - 1; x++) {
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
      if (x >= GRID_WIDTH - 1 || y >= GRID_HEIGHT || x < 2 || grid[x][y] !== null) {
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
  if (gameState === 'paused') return;

  background('#0a0a1e');

  if (showTip) {
    fill(255, 255, 255, 255 * tipOpacity);
    rect(0, 0, canvasWidth, 30);
    fill(0, 0, 0, 255 * tipOpacity);
    textSize(14);
    textAlign(CENTER, CENTER);
    text("Pense à échanger ton XP en énergie pour poser un nouveau Sabreur Quantique", canvasWidth / 2, 15);
  }

  drawGrid();
  drawModules();
  drawProjectiles();
  drawEnemyProjectiles();
  drawEnemies();
  updateGame();
}

function drawGrid() {
  stroke('#2a2a4a');
  strokeWeight(1);
  for (let x = 0; x < GRID_WIDTH; x++) {
    for (let y = 0; y < GRID_HEIGHT; y++) {
      if (x < 2) {
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
      fill('#ffffff');
      textSize(10);
      text(module.hp, module.x * CELL_SIZE + CELL_SIZE / 2, module.y * CELL_SIZE + CELL_SIZE / 2 + 15);
      textSize(14);
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

      if (frameCount % (TURRET_TYPES[module.type].attackRate) === 0) {
        for (let i = 0; i < enemies.length; i++) {
          let enemy = enemies[i];
          if (enemy.isBoss && module.type !== 'projectile') continue;

          let d = dist(module.x * CELL_SIZE + CELL_SIZE / 2, module.y * CELL_SIZE + CELL_SIZE / 2, enemy.x, enemy.y);
          let effectiveDamage = TURRET_TYPES[module.type].damage * (1 + wave * 0.05);
          let effectiveRange = TURRET_TYPES[module.type].range * (1 + wave * 0.02);
          if (module.level > 1) {
            effectiveDamage *= (1 + module.level * 0.3);
            effectiveRange *= (1 + module.level * 0.1);
          }
          if (wave >= 5) {
            effectiveDamage *= 1.5;
          }
          if (module.type === 'melee' && d < effectiveRange) {
            enemy.hp -= effectiveDamage;
            if (enemy.hp <= 0) {
              xp += enemy.xp;
              updateStats();
            }
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
    } else if (enemy.type === MEGA_BOSS_TYPE) {
      fill(BOSS_COLOR); // Noir
      noStroke();
      rect(enemy.x - CELL_SIZE, enemy.y - CELL_SIZE, CELL_SIZE * 2, CELL_SIZE * 2); // 2x2 cases
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
    if (enemy.type === MEGA_BOSS_TYPE) {
      // Dessiner une barre de vie plus grande pour les méga boss
      let barWidth = CELL_SIZE * 2; // Largeur de 2 cases
      let barHeight = 8;
      let filledWidth = barWidth * hpRatio;
      rect(enemy.x - CELL_SIZE, enemy.y - CELL_SIZE - 10, filledWidth, barHeight);
    } else {
      let angle = map(hpRatio, 0, 1, 0, TWO_PI);
      arc(enemy.x, enemy.y, 16, 16, -PI/2, angle - PI/2);
    }

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

      let nextGridX = floor(targetX / CELL_SIZE);
      let nextGridY = floor(targetY / CELL_SIZE);
      let canMove = true;
      if (!enemy.isBoss && grid[nextGridX][nextGridY] === 'wall') {
        canMove = false;
      }

      if (distToTarget < 5) {
        enemy.pathIndex++;
        if (enemy.pathIndex >= enemy.path.length) {
          enemy.path = [];
        } else if (!canMove) {
          let startX = floor(enemy.x / CELL_SIZE);
          let startY = floor(enemy.y / CELL_SIZE);
          let path = findPath(startX, startY, GRID_WIDTH - 1, startY, false);
          if (path.length === 0) {
            path = findPath(startX, startY, GRID_WIDTH - 1, startY, true);
          }
          if (path.length > 0) {
            enemy.path = path;
            enemy.pathIndex = 0;
          } else {
            enemy.path = [];
          }
        }
      } else if (canMove) {
        enemy.x += (dx / distToTarget) * enemy.speed;
        enemy.y += (dy / distToTarget) * enemy.speed;
      } else {
        if (!enemy.isBoss) {
          let moduleIndex = modules.findIndex(m => m.x === nextGridX && m.y === nextGridY && m.type === 'wall');
          if (moduleIndex !== -1) {
            let wall = modules[moduleIndex];
            wall.hp -= 5;
            if (wall.hp <= 0) {
              modules.splice(moduleIndex, 1);
              grid[nextGridX][nextGridY] = null;
              enemies.forEach(e => {
                if (e.path.length > 0) {
                  let startX = floor(e.x / CELL_SIZE);
                  let startY = floor(e.y / CELL_SIZE);
                  let path = e.isBoss ? findPathAerial(startX, startY, GRID_WIDTH - 1, startY) : findPath(startX, startY, GRID_WIDTH - 1, startY, false);
                  if (path.length === 0 && !e.isBoss) {
                    path = findPath(startX, startY, GRID_WIDTH - 1, startY, true);
                  }
                  e.path = path;
                  e.pathIndex = 0;
                }
              });
            }
          }
        }
        let startX = floor(enemy.x / CELL_SIZE);
        let startY = floor(enemy.y / CELL_SIZE);
        let path = findPath(startX, startY, GRID_WIDTH - 1, startY, false);
        if (path.length === 0) {
          path = findPath(startX, startY, GRID_WIDTH - 1, startY, true);
        }
        if (path.length > 0) {
          enemy.path = path;
          enemy.pathIndex = 0;
        } else {
          enemy.path = [];
        }
      }
    } else {
      let startX = floor(enemy.x / CELL_SIZE);
      let startY = floor(enemy.y / CELL_SIZE);
      let path = enemy.isBoss ? findPathAerial(startX, startY, GRID_WIDTH - 1, startY) : findPath(startX, startY, GRID_WIDTH - 1, startY, false);

      if (path.length === 0 && !enemy.isBoss) {
        let foundPath = false;
        let shortestDist = Infinity;
        let targetY = startY;

        for (let y = 0; y < GRID_HEIGHT; y++) {
          if (grid[2][y] !== 'wall') {
            let distToOpening = Math.abs(startY - y);
            if (distToOpening < shortestDist) {
              shortestDist = distToOpening;
              targetY = y;
              foundPath = true;
            }
          }
        }

        if (foundPath) {
          let targetYPos = targetY * CELL_SIZE + CELL_SIZE / 2;
          let dy = targetYPos - enemy.y;
          let distToTargetY = Math.abs(dy);

          if (distToTargetY > 5) {
            let speedY = (dy / distToTargetY) * enemy.speed;
            enemy.y += speedY;
          } else {
            enemy.y = targetYPos;
            path = findPath(2, targetY, GRID_WIDTH - 1, targetY, false);
            if (path.length === 0) {
              path = findPath(2, targetY, GRID_WIDTH - 1, targetY, true);
            }
            if (path.length > 0) {
              enemy.path = path;
              enemy.pathIndex = 0;
              enemy.x = 2 * CELL_SIZE + CELL_SIZE / 2;
            }
          }
        } else {
          path = findPath(startX, startY, GRID_WIDTH - 1, startY, true);
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
                (grid[newGridX][newGridY] === null || grid[newGridX][newGridY] === 'base' || grid[newGridX][newGridY] === 'melee' || grid[newGridX][newGridY] === 'projectile')
              ) {
                enemy.x = newGridX * CELL_SIZE + CELL_SIZE / 2;
                enemy.y = newGridY * CELL_SIZE + CELL_SIZE / 2;
                path = findPath(newGridX, newGridY, GRID_WIDTH - 1, newGridY, false);
                if (path.length === 0) {
                  path = findPath(newGridX, newGridY, GRID_WIDTH - 1, newGridY, true);
                }
                if (path.length > 0) {
                  enemy.path = path;
                  enemy.pathIndex = 0;
                  moved = true;
                  break;
                }
              } else if (
                newGridX >= 0 && newGridX < GRID_WIDTH - 1 &&
                newGridY >= 0 && newGridY < GRID_HEIGHT &&
                grid[newGridX][newGridY] === 'wall'
              ) {
                let moduleIndex = modules.findIndex(m => m.x === newGridX && m.y === newGridY && m.type === 'wall');
                if (moduleIndex !== -1) {
                  let wall = modules[moduleIndex];
                  wall.hp -= 5;
                  if (wall.hp <= 0) {
                    modules.splice(moduleIndex, 1);
                    grid[newGridX][newGridY] = null;
                    enemies.forEach(e => {
                      if (e.path.length > 0) {
                        let startX = floor(e.x / CELL_SIZE);
                        let startY = floor(e.y / CELL_SIZE);
                        let path = e.isBoss ? findPathAerial(startX, startY, GRID_WIDTH - 1, startY) : findPath(startX, startY, GRID_WIDTH - 1, startY, false);
                        if (path.length === 0 && !e.isBoss) {
                          path = findPath(startX, startY, GRID_WIDTH - 1, startY, true);
                        }
                        e.path = path;
                        e.pathIndex = 0;
                      }
                    });
                    path = findPath(startX, startY, GRID_WIDTH - 1, startY, false);
                    if (path.length > 0) {
                      enemy.path = path;
                      enemy.pathIndex = 0;
                      moved = true;
                      break;
                    }
                  }
                }
              }
            }
            if (!moved) {
              enemy.x += enemy.speed;
              if (enemy.x > (GRID_WIDTH - 1) * CELL_SIZE) {
                enemy.x = (GRID_WIDTH - 1) * CELL_SIZE;
              }
              startX = floor(enemy.x / CELL_SIZE);
              startY = floor(enemy.y / CELL_SIZE);
              path = findPath(startX, startY, GRID_WIDTH - 1, startY, true);
              enemy.path = path;
              enemy.pathIndex = 0;
            }
          }
        }
      } else {
        enemy.path = path;
        enemy.pathIndex = 0;
      }
    }
  }
  enemies = enemies.filter(enemy => enemy.hp > 0 && enemy.x < canvasWidth);
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
      if (p.target.hp <= 0) {
        xp += p.target.xp;
        updateStats();
      }
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
            let path = enemy.isBoss ? findPathAerial(startX, startY, GRID_WIDTH - 1, startY) : findPath(startX, startY, GRID_WIDTH - 1, startY, false);
            if (path.length === 0 && !enemy.isBoss) {
              path = findPath(startX, startY, GRID_WIDTH - 1, startY, true);
            }
            enemy.path = path;
            enemy.pathIndex = 0;
          }
        });
      }
      enemyProjectiles.splice(i, 1);
    }
  }
}

function updateGame() {
  if (modules.length > 10) {
    speedMultiplier = 1.5;
  } else {
    speedMultiplier = 1;
  }

  enemies.forEach(enemy => {
    let baseSpeed;
    if (enemy.isBoss) {
      if (enemy.isTriangle) {
        baseSpeed = TRIANGLE_TYPE.speed;
      } else if (enemy.type === MEGA_BOSS_TYPE) {
        baseSpeed = MEGA_BOSS_TYPE.speed;
      } else {
        baseSpeed = BOSS_TYPE.speed;
      }
    } else if (enemy.isTriangle) {
      baseSpeed = TRIANGLE_TYPE.speed;
    } else {
      let enemyTypeIndex = min(wave - 1, ENEMY_TYPES.length - 1);
      baseSpeed = ENEMY_TYPES[enemyTypeIndex].speed;
      baseSpeed *= (1 + wave * 0.02); // Appliquer le facteur de vitesse basé sur la vague
    }
    enemy.speed = baseSpeed * speedMultiplier;
  });

  for (let enemy of enemies) {
    if (enemy.x > (GRID_WIDTH - 1) * CELL_SIZE - 5 && enemy.path.length === 0) {
      base.hp -= 10;
      enemy.hp = 0;
    }
  }

  enemies = enemies.filter(enemy => enemy.hp > 0);

  if (enemies.length === 0 && gameState === 'playing' && wave > 0 && !waveCompleted) {
    waveCompleted = true;
    xp += wave * 5 + 5;
    if (wave === 1 && !tipModalShown) {
      const tipModal = document.getElementById('tip-modal');
      if (tipModal) {
        tipModal.style.display = 'flex';
        gameState = 'paused';
        tipModalShown = true;
      } else {
        console.error("L'élément avec l'ID 'tip-modal' n'existe pas dans le DOM. L'astuce ne peut pas être affichée.");
        showTip = true;
        tipOpacity = 1;
        tipModalShown = true;
      }
    } else if (wave >= 2 && tipModalShown) {
      showTip = true;
      tipOpacity = 0.3;
    }
    updateStats();
  }

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

  const evolveBtn = document.getElementById('evolve-turret-btn');
  if (wave < 7) {
    evolveBtn.classList.add('locked');
    evolveBtn.textContent = `Évoluer (vague 7+)`;
  } else {
    evolveBtn.classList.remove('locked');
    evolveBtn.textContent = `Évoluer`;
  }
  if (isEvolveModeActive) {
    evolveBtn.classList.add('active');
    console.log("Bouton Évoluer actif");
  } else {
    evolveBtn.classList.remove('active');
    console.log("Bouton Évoluer inactif");
  }
}

function mousePressed() {
  if (gameState === 'paused') return;

  let gridX = floor(mouseX / CELL_SIZE);
  let gridY = floor(mouseY / CELL_SIZE);

  if (gridX >= 0 && gridX < GRID_WIDTH - 1 && gridY >= 0 && gridY < GRID_HEIGHT) {
    if (gridX < 2) {
      return;
    }

if (isEvolveModeActive && grid[gridX][gridY] && grid[gridX][gridY] !== 'wall' && grid[gridX][gridY] !== 'base') {
  console.log(`Tentative d'évolution à la vague ${wave}, position (${gridX}, ${gridY})`);
  // Chercher un module qui pourrait inclure cette case (en tenant compte des tourelles évoluées)
  let moduleIndex = -1;
  let foundModule = null;
  for (let m of modules) {
    if (m.type === 'wall') continue; // Les murs ne peuvent pas évoluer
    let width = m.level >= 3 ? 2 : m.level === 2 ? 2 : 1;
    let height = m.level >= 3 ? 2 : m.level === 2 ? 1 : 1;
    if (gridX >= m.x && gridX < m.x + width && gridY >= m.y && gridY < m.y + height) {
      moduleIndex = modules.indexOf(m);
      foundModule = m;
      break;
    }
  }
  if (moduleIndex !== -1) {
    let module = modules[moduleIndex];
    console.log(`Module trouvé : type=${module.type}, niveau=${module.level}, XP disponible=${xp}`);
    if (wave >= 7 && module.level === 1 && xp >= 2000) {
      console.log("Évolution au niveau 2");
      xp -= 2000;
      module.level = 2;
      if (gridX + 1 < GRID_WIDTH - 1 && grid[gridX + 1][gridY] === null) {
        console.log("Espace libre à droite, évolution en 2x1");
        occupyArea(module.x, module.y, 2, 1, module.type);
      } else if (gridY + 1 < GRID_HEIGHT && grid[module.x][gridY + 1] === null) {
        console.log("Espace libre en bas, évolution en 1x2");
        occupyArea(module.x, module.y, 1, 2, module.type);
      } else {
        console.log("Pas assez d'espace pour évoluer au niveau 2");
        module.level = 1;
        xp += 2000;
        gameState = 'paused';
        document.getElementById('space-warning-modal').style.display = 'flex';
      }
      updateStats();
      return;
    } else if (wave >= 17 && module.level === 2 && xp >= 10000) {
      console.log("Évolution au niveau 3");
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
        console.log("Espace libre, évolution en 2x2");
        occupyArea(module.x, module.y, 2, 2, module.type);
      } else {
        console.log("Pas assez d'espace pour évoluer au niveau 3");
        module.level = 2;
        xp += 10000;
        gameState = 'paused';
        document.getElementById('space-warning-modal').style.display = 'flex';
        occupyArea(module.x, module.y, 2, 1, module.type);
      }
      updateStats();
      return;
    } else {
      console.log("Conditions d'évolution non remplies :");
      if (wave < 7) {
        console.log(` - Vague insuffisante : ${wave} (nécessite 7)`);
        errorMessage = `Vague insuffisante : ${wave} (nécessite 7)`;
      }
      if (module.level !== 1 && module.level !== 2) {
        console.log(` - Niveau invalide : ${module.level} (doit être 1 ou 2)`);
        errorMessage = `Niveau invalide : ${module.level} (doit être 1 ou 2)`;
      }
      if (xp < 2000 && module.level === 1) {
        console.log(` - XP insuffisant pour niveau 2 : ${xp} (nécessite 2000)`);
        errorMessage = `XP insuffisant : ${xp}/2000`;
      }
      if (xp < 10000 && module.level === 2) {
        console.log(` - XP insuffisant pour niveau 3 : ${xp} (nécessite 10000)`);
        errorMessage = `XP insuffisant : ${xp}/10000`;
      }
      if (wave < 17 && module.level === 2) {
        console.log(` - Vague insuffisante pour niveau 3 : ${wave} (nécessite 17)`);
        errorMessage = `Vague insuffisante : ${wave} (nécessite 17)`;
      }
      errorMessageTimer = 120; // Afficher le message pendant 2 secondes (à 60 FPS)
    }
  } else {
    console.log("Aucune tourelle trouvée à cette position pour évoluer");
    errorMessage = "Aucune tourelle à cette position";
    errorMessageTimer = 120;
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
            let path = enemy.isBoss ? findPathAerial(startX, startY, GRID_WIDTH - 1, startY) : findPath(startX, startY, GRID_WIDTH - 1, startY, false);
            if (path.length === 0 && !enemy.isBoss) {
              path = findPath(startX, startY, GRID_WIDTH - 1, startY, true);
            }
            enemy.path = path;
            enemy.pathIndex = 0;
          }
        });
        updateStats();
        return;
      }
    }

    if (selectedModule && !isDeleteModeActive && !isEvolveModeActive && !grid[gridX][gridY] && energy >= TURRET_TYPES[selectedModule].cost) {
      if (selectedModule === 'projectile' && wave < 5) {
        return;
      }

      if (selectedModule === 'wall') {
        grid[gridX][gridY] = selectedModule;
        if (!hasPathToBase()) {
          // Les ennemis pourront attaquer les murs si le chemin est bloqué
        }
        modules.push({ x: gridX, y: gridY, type: selectedModule, hp: TURRET_TYPES.wall.hp });
        energy -= TURRET_TYPES[selectedModule].cost;
        enemies.forEach(enemy => {
          if (enemy.path.length > 0) {
            let startX = floor(enemy.x / CELL_SIZE);
            let startY = floor(enemy.y / CELL_SIZE);
            let path = enemy.isBoss ? findPathAerial(startX, startY, GRID_WIDTH - 1, startY) : findPath(startX, startY, GRID_WIDTH - 1, startY, false);
            if (path.length === 0 && !enemy.isBoss) {
              path = findPath(startX, startY, GRID_WIDTH - 1, startY, true);
            }
            enemy.path = path;
            enemy.pathIndex = 0;
          }
        });
        updateStats();
        return;
      }
      if (grid[gridX][gridY] === 'wall' && selectedModule !== 'wall') {
        return;
      }
      let enemyOnCellIndex = enemies.findIndex(enemy => {
        let enemyGridX = floor(enemy.x / CELL_SIZE);
        let enemyGridY = floor(enemy.y / CELL_SIZE);
        return enemyGridX === gridX && enemyGridY === gridY;
      });
      if (enemyOnCellIndex !== -1) {
        let enemyOnCell = enemies[enemyOnCellIndex];
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
            let path = enemyOnCell.isBoss ? findPathAerial(newGridX, newGridY, GRID_WIDTH - 1, newGridY) : findPath(newGridX, newGridY, GRID_WIDTH - 1, newGridY, false);
            if (path.length === 0 && !enemyOnCell.isBoss) {
              path = findPath(newGridX, newGridY, GRID_WIDTH - 1, newGridY, true);
            }
            enemyOnCell.path = path;
            enemyOnCell.pathIndex = 0;
            moved = true;
            break;
          }
        }
        if (!moved) {
          enemies.splice(enemyOnCellIndex, 1);
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
            let path = enemy.isBoss ? findPathAerial(startX, startY, GRID_WIDTH - 1, startY) : findPath(startX, startY, GRID_WIDTH - 1, startY, false);
            if (path.length === 0 && !enemy.isBoss) {
              path = findPath(startX, startY, GRID_WIDTH - 1, startY, true);
            }
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
  isEvolveModeActive = false;
  updateStats();
});
document.getElementById('projectile-btn').addEventListener('click', () => {
  if (wave < 5) return;
  selectedModule = selectedModule === 'projectile' ? null : 'projectile';
  isDeleteModeActive = false;
  isEvolveModeActive = false;
  updateStats();
});
document.getElementById('wall-btn').addEventListener('click', () => {
  selectedModule = selectedModule === 'wall' ? null : 'wall';
  isDeleteModeActive = false;
  isEvolveModeActive = false;
  updateStats();
});

// Bouton pour supprimer une tourelle
document.getElementById('delete-turret-btn').addEventListener('click', () => {
  isDeleteModeActive = !isDeleteModeActive;
  isEvolveModeActive = false;
  selectedModule = null;
  updateStats();
});

// Bouton pour évoluer une tourelle
document.getElementById('evolve-turret-btn').addEventListener('click', () => {
  console.log(`Bouton Évoluer cliqué à la vague ${wave}`);
  if (wave < 7) {
    console.log("Évolution bloquée : vague < 7");
    return;
  }
  isEvolveModeActive = !isEvolveModeActive;
  isDeleteModeActive = false;
  selectedModule = null;
  console.log(`Mode Évoluer : ${isEvolveModeActive}`);
  updateStats();
});

// Bouton pour reprendre le jeu après un avertissement d'espace
document.getElementById('resume-game').addEventListener('click', () => {
  document.getElementById('space-warning-modal').style.display = 'none';
  gameState = 'playing';
});

// Bouton pour fermer la modale d’astuce et reprendre le jeu
const closeTipButton = document.getElementById('close-tip');
if (closeTipButton) {
  closeTipButton.addEventListener('click', () => {
    document.getElementById('tip-modal').style.display = 'none';
    gameState = 'playing';
    showTip = true;
    tipOpacity = 1;
    updateStats();
  });
} else {
  console.warn("L'élément avec l'ID 'close-tip' n'existe pas dans le DOM. Assurez-vous que la modale d'astuce est correctement ajoutée dans le HTML.");
}

// Boutons de contrôle
document.getElementById('start-wave').addEventListener('click', () => {
  if (enemies.length === 0 && gameState === 'playing') {
    spawnWave();
  }
});

document.getElementById('restart-game').addEventListener('click', () => {
  resetGame();
  document.getElementById('game-over-modal').style.display = 'none';
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
  isEvolveModeActive = false;
  waveCompleted = false;
  showTip = false;
  tipOpacity = 1;
  speedMultiplier = 1;
  tipModalShown = false;
  initializeGrid();
  updateStats();
  loop();
}

function windowResized() {
  let scaleFactor = min(windowWidth / canvasWidth, windowHeight / canvasHeight);
  resizeCanvas(canvasWidth * scaleFactor, canvasHeight * scaleFactor);
}

function calculateCellCost(x, y) {
  let cost = 1;
  for (let module of modules) {
    if (module.type === 'wall') continue;
    let turretRange = TURRET_TYPES[module.type].range;
    let distance = dist(x * CELL_SIZE + CELL_SIZE / 2, y * CELL_SIZE + CELL_SIZE / 2, module.x * CELL_SIZE + CELL_SIZE / 2, module.y * CELL_SIZE + CELL_SIZE / 2);
    if (distance <= turretRange) {
      let proximityFactor = 1 - (distance / turretRange);
      cost += 5 * proximityFactor;
    }
  }
  return cost;
}