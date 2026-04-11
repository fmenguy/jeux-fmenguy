import { TERRAIN, ELEVATION, BUILDING } from '../enums.js';
import { CONFIG } from '../config.js';

export class GameMap {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.terrain = [];
        this.elevation = [];
        this.buildings = [];
        this.territory = [];
        this.resources = [];
        this.animals = [];
        this.generate();
    }

    generate() {
        for (let y = 0; y < this.height; y++) {
            this.terrain[y] = [];
            this.elevation[y] = [];
            this.buildings[y] = [];
            this.territory[y] = [];
            this.resources[y] = [];

            for (let x = 0; x < this.width; x++) {
                this.terrain[y][x] = TERRAIN.GRASS;
                this.elevation[y][x] = 0;
                this.buildings[y][x] = { type: BUILDING.NONE, faction: -1 };
                this.territory[y][x] = -1;
                this.resources[y][x] = { amount: 0, type: null };
            }
        }

        this.generateClusters(TERRAIN.FOREST, 15, 8, 12);
        this.generateClusters(TERRAIN.STONE, 8, 4, 6);
        this.generateClusters(TERRAIN.IRON, 6, 3, 5);
        this.generateClusters(TERRAIN.BERRIES, 20, 4, 8);
        this.generateWaterBodies(4, 5, 8);
        this.generateMountainRanges();

        // Generate animals as plain objects
        this.animals = [];
        this.generateAnimals();
    }

    generateAnimals() {
        const ANIMAL_TYPES = {
            SHEEP: { name: 'Mouton', icon: '\uD83D\uDC11', food: 15, wool: 5, speed: 0.3, passive: true },
            COW: { name: 'Vache', icon: '\uD83D\uDC04', food: 25, milk: 3, speed: 0.2, passive: true },
            CHICKEN: { name: 'Poule', icon: '\uD83D\uDC14', food: 5, eggs: 2, speed: 0.4, passive: true },
            PIG: { name: 'Cochon', icon: '\uD83D\uDC37', food: 20, speed: 0.25, passive: true },
            DEER: { name: 'Cerf', icon: '\uD83E\uDD8C', food: 18, speed: 0.5, passive: true, flees: true },
            FISH: { name: 'Poisson', icon: '\uD83D\uDC1F', food: 8, speed: 0.3, passive: true, aquatic: true }
        };

        // Sheep and cows on grass
        for (let i = 0; i < 25; i++) {
            const pos = this.findRandomGrassPosition();
            if (pos) {
                const type = Math.random() < 0.5 ? 'SHEEP' : 'COW';
                this.animals.push({
                    type,
                    x: pos.x,
                    y: pos.y,
                    health: 100,
                    isAlive: true,
                    typeData: ANIMAL_TYPES[type]
                });
            }
        }
        // Chickens
        for (let i = 0; i < 20; i++) {
            const pos = this.findRandomGrassPosition();
            if (pos) {
                this.animals.push({
                    type: 'CHICKEN',
                    x: pos.x,
                    y: pos.y,
                    health: 100,
                    isAlive: true,
                    typeData: ANIMAL_TYPES.CHICKEN
                });
            }
        }
        // Pigs near forests
        for (let i = 0; i < 15; i++) {
            const pos = this.findPositionNear(TERRAIN.FOREST);
            if (pos) {
                this.animals.push({
                    type: 'PIG',
                    x: pos.x,
                    y: pos.y,
                    health: 100,
                    isAlive: true,
                    typeData: ANIMAL_TYPES.PIG
                });
            }
        }
        // Deer near forests
        for (let i = 0; i < 12; i++) {
            const pos = this.findPositionNear(TERRAIN.FOREST);
            if (pos) {
                this.animals.push({
                    type: 'DEER',
                    x: pos.x,
                    y: pos.y,
                    health: 100,
                    isAlive: true,
                    typeData: ANIMAL_TYPES.DEER
                });
            }
        }
    }

    spawnNewAnimals() {
        const ANIMAL_TYPES = {
            SHEEP: { name: 'Mouton', food: 15, wool: 5, speed: 0.3, passive: true },
            COW: { name: 'Vache', food: 25, milk: 3, speed: 0.2, passive: true },
            CHICKEN: { name: 'Poule', food: 5, eggs: 2, speed: 0.4, passive: true },
            PIG: { name: 'Cochon', food: 20, speed: 0.25, passive: true },
            DEER: { name: 'Cerf', food: 18, speed: 0.5, passive: true, flees: true }
        };

        const maxAnimals = 100;
        if (this.animals.filter(a => a.isAlive).length >= maxAnimals) return;

        if (Math.random() > 0.02) return;

        const types = ['SHEEP', 'COW', 'CHICKEN', 'PIG', 'DEER'];
        const type = types[Math.floor(Math.random() * types.length)];

        const pos = type === 'DEER' || type === 'PIG'
            ? this.findPositionNear(TERRAIN.FOREST)
            : this.findRandomGrassPosition();

        if (pos) {
            this.animals.push({
                type,
                x: pos.x,
                y: pos.y,
                health: 100,
                isAlive: true,
                typeData: ANIMAL_TYPES[type]
            });
        }
    }

    findRandomGrassPosition() {
        for (let attempt = 0; attempt < 50; attempt++) {
            const x = Math.floor(Math.random() * this.width);
            const y = Math.floor(Math.random() * this.height);
            if (this.terrain[y][x] === TERRAIN.GRASS) {
                return { x: x + 0.5, y: y + 0.5 };
            }
        }
        return null;
    }

    findPositionNear(terrainType) {
        for (let attempt = 0; attempt < 50; attempt++) {
            const x = Math.floor(Math.random() * this.width);
            const y = Math.floor(Math.random() * this.height);
            if (this.terrain[y][x] === TERRAIN.GRASS) {
                const neighbors = [{ x: x - 1, y }, { x: x + 1, y }, { x, y: y - 1 }, { x, y: y + 1 }];
                const nearTarget = neighbors.some(n => {
                    if (n.x < 0 || n.x >= this.width || n.y < 0 || n.y >= this.height) return false;
                    return this.terrain[n.y][n.x] === terrainType;
                });
                if (nearTarget) {
                    return { x: x + 0.5, y: y + 0.5 };
                }
            }
        }
        return this.findRandomGrassPosition();
    }

    generateClusters(type, count, minSize, maxSize) {
        for (let i = 0; i < count; i++) {
            const cx = Math.floor(Math.random() * (this.width - 10)) + 5;
            const cy = Math.floor(Math.random() * (this.height - 10)) + 5;
            const size = minSize + Math.floor(Math.random() * (maxSize - minSize));

            for (let j = 0; j < size; j++) {
                const angle = Math.random() * Math.PI * 2;
                const dist = Math.random() * (size / 2);
                const x = Math.floor(cx + Math.cos(angle) * dist);
                const y = Math.floor(cy + Math.sin(angle) * dist);

                if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
                    if (this.terrain[y][x] === TERRAIN.GRASS) {
                        this.terrain[y][x] = type;
                        const amount = type === TERRAIN.BERRIES
                            ? 100 + Math.floor(Math.random() * 100)
                            : 50 + Math.floor(Math.random() * 50);
                        this.resources[y][x] = { amount: amount, type: type };
                    }
                }
            }
        }
    }

    generateWaterBodies(count, minSize, maxSize) {
        for (let i = 0; i < count; i++) {
            const cx = Math.floor(Math.random() * (this.width - 10)) + 5;
            const cy = Math.floor(Math.random() * (this.height - 10)) + 5;
            const size = minSize + Math.floor(Math.random() * (maxSize - minSize));

            for (let j = 0; j < size * 2; j++) {
                const angle = Math.random() * Math.PI * 2;
                const dist = Math.random() * (size / 2);
                const x = Math.floor(cx + Math.cos(angle) * dist);
                const y = Math.floor(cy + Math.sin(angle) * dist);

                if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
                    this.terrain[y][x] = TERRAIN.WATER;
                    const distFromCenter = Math.sqrt(Math.pow(x - cx, 2) + Math.pow(y - cy, 2));
                    if (distFromCenter < size / 4) {
                        this.elevation[y][x] = ELEVATION.DEEP;
                    } else if (distFromCenter < size / 2.5) {
                        this.elevation[y][x] = ELEVATION.MEDIUM;
                    } else {
                        this.elevation[y][x] = ELEVATION.SHALLOW;
                    }
                }
            }
        }
    }

    generateMountainRanges() {
        for (let x = 0; x < this.width; x++) {
            if (Math.random() < 0.5) {
                this.terrain[0][x] = TERRAIN.MOUNTAIN;
                this.elevation[0][x] = 1 + Math.floor(Math.random() * 3);
            }
            if (Math.random() < 0.5) {
                this.terrain[this.height - 1][x] = TERRAIN.MOUNTAIN;
                this.elevation[this.height - 1][x] = 1 + Math.floor(Math.random() * 3);
            }
        }
        for (let y = 0; y < this.height; y++) {
            if (Math.random() < 0.5) {
                this.terrain[y][0] = TERRAIN.MOUNTAIN;
                this.elevation[y][0] = 1 + Math.floor(Math.random() * 3);
            }
            if (Math.random() < 0.5) {
                this.terrain[y][this.width - 1] = TERRAIN.MOUNTAIN;
                this.elevation[y][this.width - 1] = 1 + Math.floor(Math.random() * 3);
            }
        }
    }

    isWalkable(x, y, factionId = -1) {
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) return false;
        const terrain = this.terrain[y][x];
        const elev = this.elevation[y][x];
        const building = this.buildings[y][x];

        // Wall: blocks passage except for owning faction
        if (building.type === BUILDING.WALL && building.faction !== factionId) {
            return false;
        }

        // Water: only shallow is walkable
        if (terrain === TERRAIN.WATER) {
            return elev === ELEVATION.SHALLOW;
        }
        // Mountain: only low elevation is walkable
        if (terrain === TERRAIN.MOUNTAIN) {
            return elev === ELEVATION.SHALLOW || elev === 1;
        }
        return true;
    }

    getSpeedMultiplier(x, y) {
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) return 1;
        const building = this.buildings[y][x];
        const terrain = this.terrain[y][x];
        const elev = this.elevation[y][x];

        // Road: speed x1.8
        if (building.type === BUILDING.ROAD) {
            return 1.8;
        }

        // Low mountain: speed x0.5
        if (terrain === TERRAIN.MOUNTAIN && elev === 1) {
            return 0.5;
        }

        // Forest: speed x0.8
        if (terrain === TERRAIN.FOREST) {
            return 0.8;
        }

        return 1;
    }

    getTowerAt(x, y) {
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) return null;
        const building = this.buildings[y][x];
        if (building.type === BUILDING.TOWER || building.type === BUILDING.WATCHTOWER) {
            return building;
        }
        return null;
    }

    isValidBuildLocation(x, y) {
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) return false;
        const terrain = this.terrain[y][x];
        return terrain === TERRAIN.GRASS && this.buildings[y][x].type === BUILDING.NONE;
    }

    isNavigable(x, y) {
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) return false;
        const terrain = this.terrain[y][x];
        const elev = this.elevation[y][x];

        if (terrain === TERRAIN.WATER) {
            return elev >= ELEVATION.MEDIUM;
        }
        return false;
    }

    canBuildPort(x, y, factionId) {
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) return false;

        const terrain = this.terrain[y][x];
        if (terrain !== TERRAIN.GRASS) return false;
        if (this.buildings[y][x].type !== BUILDING.NONE) return false;
        if (this.territory[y][x] !== factionId) return false;

        let deepWaterCount = 0;
        let mediumWaterCount = 0;

        const checkRadius = 5;
        for (let dy = -checkRadius; dy <= checkRadius; dy++) {
            for (let dx = -checkRadius; dx <= checkRadius; dx++) {
                const nx = x + dx;
                const ny = y + dy;
                if (nx < 0 || nx >= this.width || ny < 0 || ny >= this.height) continue;

                if (this.terrain[ny][nx] === TERRAIN.WATER) {
                    const depth = this.elevation[ny][nx];
                    if (depth === ELEVATION.DEEP) deepWaterCount++;
                    else if (depth === ELEVATION.MEDIUM) mediumWaterCount++;
                }
            }
        }

        return deepWaterCount >= 1 && mediumWaterCount >= 4;
    }

    findNearbyNavigableWater(x, y) {
        const searchRadius = 3;
        for (let dy = -searchRadius; dy <= searchRadius; dy++) {
            for (let dx = -searchRadius; dx <= searchRadius; dx++) {
                const nx = x + dx;
                const ny = y + dy;
                if (this.isNavigable(nx, ny)) {
                    return { x: nx, y: ny };
                }
            }
        }
        return null;
    }

    setTerrain(x, y, terrainType, brushSize = 1) {
        for (let dy = -brushSize + 1; dy < brushSize; dy++) {
            for (let dx = -brushSize + 1; dx < brushSize; dx++) {
                const nx = x + dx;
                const ny = y + dy;
                if (nx >= 0 && nx < this.width && ny >= 0 && ny < this.height) {
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < brushSize) {
                        const oldTerrain = this.terrain[ny][nx];
                        const oldElev = this.elevation[ny][nx];

                        if ((terrainType === TERRAIN.WATER || terrainType === TERRAIN.MOUNTAIN) &&
                            oldTerrain === terrainType) {
                            // Cycle elevation: 1 -> 2 -> 3 -> 1
                            this.elevation[ny][nx] = (oldElev % 3) + 1;
                        } else {
                            this.terrain[ny][nx] = terrainType;
                            if (terrainType === TERRAIN.WATER || terrainType === TERRAIN.MOUNTAIN) {
                                this.elevation[ny][nx] = 1;
                            } else {
                                this.elevation[ny][nx] = 0;
                            }
                            if (terrainType === TERRAIN.FOREST || terrainType === TERRAIN.STONE ||
                                terrainType === TERRAIN.IRON || terrainType === TERRAIN.GOLD ||
                                terrainType === TERRAIN.BERRIES) {
                                this.resources[ny][nx] = { amount: 50 + Math.floor(Math.random() * 50), type: terrainType };
                            } else {
                                this.resources[ny][nx] = { amount: 0, type: null };
                            }
                            this.buildings[ny][nx] = { type: BUILDING.NONE, faction: -1 };
                        }
                    }
                }
            }
        }
    }
}
