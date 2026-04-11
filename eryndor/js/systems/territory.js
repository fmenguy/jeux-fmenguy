import { TERRAIN, BUILDING } from '../enums.js';
import { CONFIG } from '../config.js';
import { eventBus } from '../event-bus.js';
import { BUILDING_CONFIG } from '../data/buildings.js';

/**
 * Territory management system.
 * Tracks which tiles belong to which faction based on buildings and units.
 */
export class TerritorySystem {
    constructor() {
        /** @type {Array<Array<number|null>>} 2D array: factionId or null */
        this.territoryMap = [];
        this.initialized = false;
    }

    /**
     * Initialize the territory map to match the game map dimensions.
     */
    initialize(width, height) {
        this.territoryMap = [];
        for (let y = 0; y < height; y++) {
            this.territoryMap[y] = [];
            for (let x = 0; x < width; x++) {
                this.territoryMap[y][x] = null;
            }
        }
        this.initialized = true;
    }

    /**
     * Recalculate territory for all factions based on buildings and units.
     * Buildings claim territory in a radius (town center/castle: 8, other buildings: 3).
     * Territory cannot cover water or mountain tiles.
     * @param {Array} factions - Array of faction objects with buildings, villagers.
     * @param {Object} map - GameMap instance with terrain, width, height.
     */
    updateTerritory(factions, map) {
        if (!map) return;

        const width = map.width;
        const height = map.height;

        // Ensure initialized
        if (!this.initialized || this.territoryMap.length !== height) {
            this.initialize(width, height);
        }

        // Clear territory map
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                this.territoryMap[y][x] = null;
            }
        }

        // Influence map: track strongest claim per tile
        // Each entry: { factionId, strength }
        const influence = [];
        for (let y = 0; y < height; y++) {
            influence[y] = [];
            for (let x = 0; x < width; x++) {
                influence[y][x] = { factionId: null, strength: 0 };
            }
        }

        // Process each faction's buildings
        for (const faction of factions) {
            if (!faction.buildings) continue;
            const factionId = faction.id;

            for (const building of faction.buildings) {
                const bx = building.x;
                const by = building.y;
                if (bx === undefined || by === undefined) continue;

                // Determine claim radius based on building type
                let radius = 3; // Default radius for most buildings
                if (building.type === BUILDING.CASTLE) {
                    const config = BUILDING_CONFIG[BUILDING.CASTLE];
                    radius = config ? (config.territoryRadius || 8) : 8;
                } else if (building.type === BUILDING.COLONY) {
                    const config = BUILDING_CONFIG[BUILDING.COLONY];
                    radius = config ? (config.territoryRadius || 5) : 5;
                }

                // Claim tiles within radius
                this._claimRadius(influence, map, factionId, bx, by, radius);
            }
        }

        // Resolve influence to territory ownership
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const cell = influence[y][x];
                if (cell.factionId !== null && cell.strength > 0) {
                    this.territoryMap[y][x] = cell.factionId;
                }
            }
        }

        // Sync with game map territory array
        if (map.territory) {
            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    map.territory[y][x] = this.territoryMap[y][x] !== null ? this.territoryMap[y][x] : -1;
                }
            }
        }
    }

    /**
     * Claim tiles within a radius for a faction, applying influence strength.
     */
    _claimRadius(influence, map, factionId, cx, cy, radius) {
        const width = map.width;
        const height = map.height;

        for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
                const x = cx + dx;
                const y = cy + dy;

                if (x < 0 || x >= width || y < 0 || y >= height) continue;

                // Skip water and mountain tiles
                const terrain = map.terrain[y][x];
                if (terrain === TERRAIN.WATER || terrain === TERRAIN.MOUNTAIN) continue;

                // Calculate influence strength (stronger closer to center)
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist > radius) continue;

                const strength = (radius - dist) / radius * 10;

                // Update if this faction has stronger claim
                const cell = influence[y][x];
                if (strength > cell.strength) {
                    cell.factionId = factionId;
                    cell.strength = strength;
                }
            }
        }
    }

    /**
     * Get tiles where two factions' territories are adjacent.
     * @returns {Array<{x, y}>} Array of border tile positions.
     */
    getBorderTiles(factionA, factionB) {
        const idA = typeof factionA === 'object' ? factionA.id : factionA;
        const idB = typeof factionB === 'object' ? factionB.id : factionB;
        const borders = [];

        if (!this.initialized || this.territoryMap.length === 0) return borders;

        const height = this.territoryMap.length;
        const width = this.territoryMap[0].length;

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const owner = this.territoryMap[y][x];
                if (owner !== idA && owner !== idB) continue;

                // Check 4-directional neighbors for the other faction
                const neighbors = [
                    [x - 1, y], [x + 1, y],
                    [x, y - 1], [x, y + 1]
                ];

                const targetId = owner === idA ? idB : idA;
                const isBorder = neighbors.some(([nx, ny]) => {
                    if (nx < 0 || nx >= width || ny < 0 || ny >= height) return false;
                    return this.territoryMap[ny][nx] === targetId;
                });

                if (isBorder) {
                    borders.push({ x, y, owner });
                }
            }
        }

        return borders;
    }

    /**
     * Get the number of tiles owned by a faction.
     */
    getTerritorySize(factionId) {
        if (!this.initialized || this.territoryMap.length === 0) return 0;

        let count = 0;
        const height = this.territoryMap.length;
        const width = this.territoryMap[0].length;

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                if (this.territoryMap[y][x] === factionId) {
                    count++;
                }
            }
        }
        return count;
    }

    /**
     * Check if a tile belongs to a specific faction.
     */
    isInTerritory(x, y, factionId) {
        if (!this.initialized) return false;
        if (y < 0 || y >= this.territoryMap.length) return false;
        if (x < 0 || x >= this.territoryMap[0].length) return false;
        return this.territoryMap[y][x] === factionId;
    }

    /**
     * Get the faction that owns a tile (or null).
     */
    getOwner(x, y) {
        if (!this.initialized) return null;
        if (y < 0 || y >= this.territoryMap.length) return null;
        if (x < 0 || x >= this.territoryMap[0].length) return null;
        return this.territoryMap[y][x];
    }

    /**
     * Get territory percentage for a faction (out of total walkable tiles).
     */
    getTerritoryPercent(factionId, map) {
        if (!this.initialized || !map) return 0;

        let owned = 0;
        let walkable = 0;

        for (let y = 0; y < map.height; y++) {
            for (let x = 0; x < map.width; x++) {
                const terrain = map.terrain[y][x];
                if (terrain !== TERRAIN.WATER && terrain !== TERRAIN.MOUNTAIN) {
                    walkable++;
                    if (this.territoryMap[y][x] === factionId) {
                        owned++;
                    }
                }
            }
        }

        return walkable > 0 ? (owned / walkable) * 100 : 0;
    }

    /**
     * Serialize territory state for saving.
     */
    serialize() {
        return {
            territoryMap: this.territoryMap,
            initialized: this.initialized
        };
    }

    /**
     * Restore territory state from saved data.
     */
    deserialize(data) {
        if (!data) return;
        this.territoryMap = data.territoryMap || [];
        this.initialized = data.initialized || false;
    }
}

export const territorySystem = new TerritorySystem();
export default territorySystem;
