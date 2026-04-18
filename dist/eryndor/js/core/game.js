import { CONFIG } from '../config.js';
import { TERRAIN, BUILDING } from '../enums.js';
import { eventBus } from '../event-bus.js';
import { GameMap } from './game-map.js';
import { Faction } from './faction.js';
import { FACTIONS } from '../data/factions.js';

export class Game {
    constructor() {
        this.map = null;
        this.factions = [];
        this.canvas = null;
        this.ctx = null;

        // Systems (injected after construction)
        this.renderer = null;
        this.uiManager = null;
        this.aiDirectors = [];
        this.seasonSystem = null;
        this.combatSystem = null;
        this.diplomacySystem = null;
        this.economySystem = null;
        this.eventSystem = null;
        this.territorySystem = null;
        this.saveLoadSystem = null;

        // Game state
        this.running = false;
        this.lastFrameTime = 0;
        this.animationId = null;

        // Selection state
        this.selectedEntity = null;
        this.selectedTool = null;
        this.selectMode = 'villager'; // 'villager' or 'building'
        this.brushSize = 1;
        this.godAction = null;
    }

    init() {
        // Create canvas
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');

        // Generate map
        this.map = new GameMap(CONFIG.mapWidth, CONFIG.mapHeight);

        // Create factions
        FACTIONS.forEach((factionConfig) => {
            const faction = new Faction(factionConfig, 0, 0);

            // Calculate start position based on bias
            if (factionConfig.startBias === 'west') {
                faction.startX = Math.floor(CONFIG.mapWidth * 0.2);
            } else {
                faction.startX = Math.floor(CONFIG.mapWidth * 0.8);
            }
            faction.startY = Math.floor(CONFIG.mapHeight / 2);

            // Find walkable position near start
            const startPos = this._findWalkableNear(faction.startX, faction.startY);
            faction.startX = startPos.x;
            faction.startY = startPos.y;

            // Clear starting area
            this._clearStartArea(faction.startX, faction.startY);

            // Initialize territory and buildings
            faction.initializeTerritory(this.map);

            this.factions.push(faction);
        });

        // Resize canvas
        this._resizeCanvas();
        window.addEventListener('resize', () => this._resizeCanvas());

        eventBus.emit('game-initialized', { map: this.map, factions: this.factions });
    }

    _findWalkableNear(x, y) {
        if (this.map.isWalkable(x, y) && this.map.terrain[y][x] === TERRAIN.GRASS) {
            return { x, y };
        }
        for (let r = 1; r < 15; r++) {
            for (let dy = -r; dy <= r; dy++) {
                for (let dx = -r; dx <= r; dx++) {
                    const nx = x + dx;
                    const ny = y + dy;
                    if (nx >= 0 && nx < this.map.width && ny >= 0 && ny < this.map.height) {
                        if (this.map.isWalkable(nx, ny) && this.map.terrain[ny][nx] === TERRAIN.GRASS) {
                            return { x: nx, y: ny };
                        }
                    }
                }
            }
        }
        return { x, y };
    }

    _clearStartArea(cx, cy) {
        const radius = 6;
        for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
                const nx = cx + dx;
                const ny = cy + dy;
                if (nx >= 0 && nx < this.map.width && ny >= 0 && ny < this.map.height) {
                    if (Math.sqrt(dx * dx + dy * dy) <= radius) {
                        this.map.terrain[ny][nx] = TERRAIN.GRASS;
                        this.map.elevation[ny][nx] = 0;
                        this.map.resources[ny][nx] = { amount: 0, type: null };
                    }
                }
            }
        }
    }

    _resizeCanvas() {
        const container = document.getElementById('canvasContainer');
        if (container) {
            this.canvas.width = container.clientWidth;
            this.canvas.height = container.clientHeight;
        }
    }

    // Start game loop
    start() {
        this.running = true;
        this.lastFrameTime = performance.now();
        this._gameLoop(this.lastFrameTime);
    }

    stop() {
        this.running = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    }

    _gameLoop(timestamp) {
        if (!this.running) return;

        const deltaTime = timestamp - this.lastFrameTime;
        this.lastFrameTime = timestamp;

        // Update game logic (multiple ticks per frame if speed > 1)
        if (!CONFIG.isPaused) {
            const ticksThisFrame = Math.min(CONFIG.gameSpeed, 10); // cap at 10 ticks per frame
            for (let i = 0; i < ticksThisFrame; i++) {
                this._tick();
            }
        }

        // Render
        if (this.renderer) {
            this.renderer.render(this);
        }

        // Update UI
        if (this.uiManager) {
            this.uiManager.update();
        }

        this.animationId = requestAnimationFrame((t) => this._gameLoop(t));
    }

    _tick() {
        CONFIG.currentTick++;

        // Update month/season
        this._updateDate();

        // Update each faction
        this.factions.forEach(faction => {
            faction.update(this.map, this.factions);
        });

        // Update AI directors
        this.aiDirectors.forEach(director => {
            director.update(CONFIG.currentTick);
        });

        // Update systems
        if (this.eventSystem) {
            this.eventSystem.update(this, CONFIG.currentTick);
        }

        // Record stats periodically
        if (this.uiManager && this.uiManager.stats && CONFIG.currentTick % 60 === 0) {
            this.uiManager.stats.recordSnapshot(this);
        }
    }

    _updateDate() {
        const monthLength = CONFIG.ticksPerMonth;
        const newMonth = Math.floor(CONFIG.currentTick / monthLength) % 12;

        if (newMonth !== CONFIG.currentMonth) {
            const oldMonth = CONFIG.currentMonth;
            CONFIG.currentMonth = newMonth;

            eventBus.emit('month-changed', {
                month: newMonth,
                monthName: CONFIG.monthNames[newMonth],
                year: this.getCurrentYear()
            });

            // Season change check
            const oldSeason = this._getSeason(oldMonth);
            const newSeason = this._getSeason(newMonth);
            if (oldSeason !== newSeason) {
                eventBus.emit('season-changed', {
                    season: newSeason,
                    year: this.getCurrentYear()
                });
            }
        }

        // Update date display
        const dateEl = document.getElementById('dateDisplay');
        if (dateEl) {
            dateEl.textContent = `${CONFIG.monthNames[CONFIG.currentMonth]}, An ${this.getCurrentYear()}`;
        }
    }

    _getSeason(month) {
        if (month >= 2 && month <= 4) return 'spring';
        if (month >= 5 && month <= 7) return 'summer';
        if (month >= 8 && month <= 10) return 'autumn';
        return 'winter';
    }

    getCurrentYear() {
        return Math.floor(CONFIG.currentTick / CONFIG.ticksPerYear) + 1;
    }

    // God actions
    applyGodAction(worldX, worldY) {
        if (!this.godAction) return;

        const x = Math.floor(worldX);
        const y = Math.floor(worldY);

        switch (this.godAction) {
            case 'disaster':
                this._applyDisaster(x, y);
                break;
            case 'blessing':
                this._applyBlessing(x, y);
                break;
            case 'plague':
                this._applyPlague(x, y);
                break;
            case 'fertility':
                this._applyFertility(x, y);
                break;
        }

        this.godAction = null;
    }

    _applyDisaster(cx, cy) {
        const radius = 3;
        for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
                const nx = cx + dx;
                const ny = cy + dy;
                if (nx < 0 || nx >= this.map.width || ny < 0 || ny >= this.map.height) continue;
                if (Math.sqrt(dx * dx + dy * dy) > radius) continue;

                // Destroy buildings
                if (this.map.buildings[ny][nx].type !== BUILDING.NONE) {
                    const factionId = this.map.buildings[ny][nx].faction;
                    const faction = this.factions.find(f => f.id === factionId);
                    if (faction) {
                        faction.buildings = faction.buildings.filter(b => !(b.x === nx && b.y === ny));
                    }
                    this.map.buildings[ny][nx] = { type: BUILDING.NONE, faction: -1 };
                }

                // Damage terrain
                if (Math.random() < 0.3) {
                    this.map.terrain[ny][nx] = TERRAIN.STONE;
                    this.map.resources[ny][nx] = { amount: 20, type: TERRAIN.STONE };
                }
            }
        }

        // Damage nearby villagers
        this.factions.forEach(f => {
            f.villagers.forEach(v => {
                if (!v.isAlive) return;
                const dist = Math.sqrt(Math.pow(v.x - cx, 2) + Math.pow(v.y - cy, 2));
                if (dist < radius + 1) {
                    v.takeDamage(40 + Math.random() * 30, 'disaster');
                }
            });
        });

        eventBus.emit('event-triggered', {
            type: 'disaster',
            message: 'Catastrophe naturelle !',
            x: cx, y: cy
        });
    }

    _applyBlessing(cx, cy) {
        const radius = 5;
        this.factions.forEach(f => {
            f.villagers.forEach(v => {
                if (!v.isAlive) return;
                const dist = Math.sqrt(Math.pow(v.x - cx, 2) + Math.pow(v.y - cy, 2));
                if (dist < radius) {
                    v.combatStats.health = v.combatStats.maxHealth;
                    v.hunger = 0;
                    Object.keys(v.skills).forEach(skill => {
                        v.skills[skill] = Math.min(100, v.skills[skill] + 5);
                    });
                }
            });

            // Boost resources in territory
            const factionTerritory = this.map.territory[cy] && this.map.territory[cy][cx] === f.id;
            if (factionTerritory) {
                f.resources.food += 100;
                f.resources.wood += 50;
                f.resources.stone += 30;
            }
        });

        eventBus.emit('event-triggered', {
            type: 'blessing',
            message: 'Benediction divine !',
            x: cx, y: cy
        });
    }

    _applyPlague(cx, cy) {
        const radius = 4;
        this.factions.forEach(f => {
            f.villagers.forEach(v => {
                if (!v.isAlive) return;
                const dist = Math.sqrt(Math.pow(v.x - cx, 2) + Math.pow(v.y - cy, 2));
                if (dist < radius) {
                    v.takeDamage(20 + Math.random() * 40, 'plague');
                    v.hunger += 30;
                }
            });
        });

        eventBus.emit('event-triggered', {
            type: 'plague',
            message: 'Peste repandue !',
            x: cx, y: cy
        });
    }

    _applyFertility(cx, cy) {
        const radius = 4;
        for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
                const nx = cx + dx;
                const ny = cy + dy;
                if (nx < 0 || nx >= this.map.width || ny < 0 || ny >= this.map.height) continue;
                if (Math.sqrt(dx * dx + dy * dy) > radius) continue;

                if (this.map.terrain[ny][nx] === TERRAIN.GRASS) {
                    if (Math.random() < 0.4) {
                        this.map.terrain[ny][nx] = TERRAIN.FOREST;
                        this.map.resources[ny][nx] = { amount: 80, type: TERRAIN.FOREST };
                    } else if (Math.random() < 0.3) {
                        this.map.terrain[ny][nx] = TERRAIN.BERRIES;
                        this.map.resources[ny][nx] = { amount: 120, type: TERRAIN.BERRIES };
                    }
                }

                // Replenish existing resources
                if (this.map.resources[ny][nx].type) {
                    this.map.resources[ny][nx].amount = Math.min(200, this.map.resources[ny][nx].amount + 50);
                }
            }
        }

        eventBus.emit('event-triggered', {
            type: 'fertility',
            message: 'Vague de fertilite !',
            x: cx, y: cy
        });
    }

    // Terrain editing (terraforming tool)
    applyTerrain(worldX, worldY, terrainType) {
        const x = Math.floor(worldX);
        const y = Math.floor(worldY);
        this.map.setTerrain(x, y, terrainType, this.brushSize);
    }

    // Entity selection
    getEntityAt(worldX, worldY) {
        const x = worldX;
        const y = worldY;

        if (this.selectMode === 'villager') {
            // Find nearest villager
            let nearest = null;
            let nearestDist = 1.5; // click radius

            this.factions.forEach(f => {
                f.villagers.forEach(v => {
                    if (!v.isAlive) return;
                    const dist = Math.sqrt(Math.pow(v.x - x, 2) + Math.pow(v.y - y, 2));
                    if (dist < nearestDist) {
                        nearestDist = dist;
                        nearest = { type: 'villager', entity: v, faction: f };
                    }
                });
            });

            // Also check animals
            if (!nearest) {
                this.map.animals.forEach(a => {
                    if (!a.isAlive) return;
                    const dist = Math.sqrt(Math.pow(a.x - x, 2) + Math.pow(a.y - y, 2));
                    if (dist < nearestDist) {
                        nearestDist = dist;
                        nearest = { type: 'animal', entity: a };
                    }
                });
            }

            return nearest;
        } else {
            // Building/terrain selection
            const tileX = Math.floor(x);
            const tileY = Math.floor(y);
            if (tileX >= 0 && tileX < this.map.width && tileY >= 0 && tileY < this.map.height) {
                const building = this.map.buildings[tileY][tileX];
                if (building.type !== BUILDING.NONE) {
                    const faction = this.factions.find(f => f.id === building.faction);
                    const buildingData = faction ? faction.buildings.find(b => b.x === tileX && b.y === tileY) : null;
                    return { type: 'building', entity: building, faction, buildingData, x: tileX, y: tileY };
                }
                return {
                    type: 'terrain',
                    terrain: this.map.terrain[tileY][tileX],
                    elevation: this.map.elevation[tileY][tileX],
                    resource: this.map.resources[tileY][tileX],
                    x: tileX, y: tileY
                };
            }
            return null;
        }
    }
}
