import { TERRAIN, BUILDING } from '../enums.js';
import { CONFIG } from '../config.js';

/**
 * Priority Queue (binary min-heap) for A* pathfinding.
 */
class PriorityQueue {
    constructor() {
        this.heap = [];
    }

    get size() {
        return this.heap.length;
    }

    push(node) {
        this.heap.push(node);
        this._bubbleUp(this.heap.length - 1);
    }

    pop() {
        if (this.heap.length === 0) return null;
        const top = this.heap[0];
        const last = this.heap.pop();
        if (this.heap.length > 0) {
            this.heap[0] = last;
            this._sinkDown(0);
        }
        return top;
    }

    _bubbleUp(i) {
        while (i > 0) {
            const parent = (i - 1) >> 1;
            if (this.heap[i].f < this.heap[parent].f) {
                [this.heap[i], this.heap[parent]] = [this.heap[parent], this.heap[i]];
                i = parent;
            } else {
                break;
            }
        }
    }

    _sinkDown(i) {
        const length = this.heap.length;
        while (true) {
            let smallest = i;
            const left = 2 * i + 1;
            const right = 2 * i + 2;

            if (left < length && this.heap[left].f < this.heap[smallest].f) {
                smallest = left;
            }
            if (right < length && this.heap[right].f < this.heap[smallest].f) {
                smallest = right;
            }
            if (smallest !== i) {
                [this.heap[i], this.heap[smallest]] = [this.heap[smallest], this.heap[i]];
                i = smallest;
            } else {
                break;
            }
        }
    }
}

/**
 * Terrain movement costs for pathfinding.
 */
const TERRAIN_COSTS = {
    [TERRAIN.GRASS]: 1,
    [TERRAIN.FOREST]: 2,
    [TERRAIN.STONE]: 3,
    [TERRAIN.IRON]: 3,
    [TERRAIN.WATER]: Infinity,
    [TERRAIN.MOUNTAIN]: Infinity,
    [TERRAIN.GOLD]: 3,
    [TERRAIN.BERRIES]: 1
};

const SQRT2 = Math.SQRT2;

// 8-directional movement offsets
const DIRECTIONS = [
    { dx: 0, dy: -1, cost: 1 },   // N
    { dx: 1, dy: -1, cost: SQRT2 }, // NE
    { dx: 1, dy: 0, cost: 1 },     // E
    { dx: 1, dy: 1, cost: SQRT2 },  // SE
    { dx: 0, dy: 1, cost: 1 },     // S
    { dx: -1, dy: 1, cost: SQRT2 }, // SW
    { dx: -1, dy: 0, cost: 1 },    // W
    { dx: -1, dy: -1, cost: SQRT2 } // NW
];

const MAX_CACHE_SIZE = 200;

/**
 * A* pathfinding with LRU cache.
 */
export class Pathfinding {
    constructor() {
        this.cache = new Map();
        this.cacheOrder = []; // LRU tracking: oldest first
    }

    /**
     * Get the terrain cost for a given tile, considering buildings (roads).
     */
    _getTerrainCost(map, x, y) {
        if (x < 0 || x >= map.width || y < 0 || y >= map.height) {
            return Infinity;
        }

        const terrain = map.terrain[y][x];
        const building = map.buildings[y][x];

        // Roads override terrain cost
        if (building && building.type === BUILDING.ROAD) {
            return 0.5;
        }

        // Walls block unless owned
        if (building && building.type === BUILDING.WALL) {
            return Infinity;
        }

        return TERRAIN_COSTS[terrain] !== undefined ? TERRAIN_COSTS[terrain] : 1;
    }

    /**
     * Heuristic: octile distance (admissible for 8-directional movement).
     */
    _heuristic(x1, y1, x2, y2) {
        const dx = Math.abs(x2 - x1);
        const dy = Math.abs(y2 - y1);
        return Math.max(dx, dy) + (SQRT2 - 1) * Math.min(dx, dy);
    }

    /**
     * Find a path from (startX, startY) to (endX, endY) on the given map.
     * Returns an array of {x, y} nodes from start to end, or null if no path.
     */
    findPath(map, startX, startY, endX, endY) {
        // Clamp to integer coordinates
        startX = Math.floor(startX);
        startY = Math.floor(startY);
        endX = Math.floor(endX);
        endY = Math.floor(endY);

        // Quick boundary checks
        if (startX < 0 || startX >= map.width || startY < 0 || startY >= map.height) return null;
        if (endX < 0 || endX >= map.width || endY < 0 || endY >= map.height) return null;

        // Trivial case
        if (startX === endX && startY === endY) return [{ x: startX, y: startY }];

        // Check destination is walkable
        if (this._getTerrainCost(map, endX, endY) === Infinity) return null;

        // Check cache
        const cacheKey = `${startX},${startY}-${endX},${endY}`;
        if (this.cache.has(cacheKey)) {
            // Move to end of LRU order
            const idx = this.cacheOrder.indexOf(cacheKey);
            if (idx !== -1) {
                this.cacheOrder.splice(idx, 1);
                this.cacheOrder.push(cacheKey);
            }
            return this.cache.get(cacheKey);
        }

        // A* search
        const openSet = new PriorityQueue();
        const gScore = new Map();
        const cameFrom = new Map();
        const closedSet = new Set();

        const startKey = `${startX},${startY}`;
        gScore.set(startKey, 0);
        openSet.push({
            x: startX,
            y: startY,
            f: this._heuristic(startX, startY, endX, endY),
            g: 0
        });

        const maxIterations = map.width * map.height * 2;
        let iterations = 0;

        while (openSet.size > 0 && iterations < maxIterations) {
            iterations++;
            const current = openSet.pop();
            const cx = current.x;
            const cy = current.y;

            // Reached goal
            if (cx === endX && cy === endY) {
                const path = this._reconstructPath(cameFrom, cx, cy, startX, startY);
                this._cacheResult(cacheKey, path);
                return path;
            }

            const currentKey = `${cx},${cy}`;
            if (closedSet.has(currentKey)) continue;
            closedSet.add(currentKey);

            // Explore neighbors
            for (const dir of DIRECTIONS) {
                const nx = cx + dir.dx;
                const ny = cy + dir.dy;

                if (nx < 0 || nx >= map.width || ny < 0 || ny >= map.height) continue;

                const neighborKey = `${nx},${ny}`;
                if (closedSet.has(neighborKey)) continue;

                const terrainCost = this._getTerrainCost(map, nx, ny);
                if (terrainCost === Infinity) continue;

                // For diagonal movement, check that both adjacent cardinal tiles are passable
                if (dir.dx !== 0 && dir.dy !== 0) {
                    const cost1 = this._getTerrainCost(map, cx + dir.dx, cy);
                    const cost2 = this._getTerrainCost(map, cx, cy + dir.dy);
                    if (cost1 === Infinity || cost2 === Infinity) continue;
                }

                const moveCost = dir.cost * terrainCost;
                const tentativeG = current.g + moveCost;

                const existingG = gScore.get(neighborKey);
                if (existingG !== undefined && tentativeG >= existingG) continue;

                gScore.set(neighborKey, tentativeG);
                cameFrom.set(neighborKey, currentKey);

                openSet.push({
                    x: nx,
                    y: ny,
                    f: tentativeG + this._heuristic(nx, ny, endX, endY),
                    g: tentativeG
                });
            }
        }

        // No path found
        this._cacheResult(cacheKey, null);
        return null;
    }

    /**
     * Reconstruct path from cameFrom map.
     */
    _reconstructPath(cameFrom, endX, endY, startX, startY) {
        const path = [];
        let currentKey = `${endX},${endY}`;
        const startKey = `${startX},${startY}`;

        while (currentKey) {
            const [x, y] = currentKey.split(',').map(Number);
            path.unshift({ x, y });
            if (currentKey === startKey) break;
            currentKey = cameFrom.get(currentKey) || null;
        }

        return path;
    }

    /**
     * Store a result in the cache with LRU eviction.
     */
    _cacheResult(key, path) {
        if (this.cache.has(key)) {
            // Update existing entry, move to end of LRU
            const idx = this.cacheOrder.indexOf(key);
            if (idx !== -1) {
                this.cacheOrder.splice(idx, 1);
            }
        }

        this.cache.set(key, path);
        this.cacheOrder.push(key);

        // Evict oldest entries if over limit
        while (this.cacheOrder.length > MAX_CACHE_SIZE) {
            const evictKey = this.cacheOrder.shift();
            this.cache.delete(evictKey);
        }
    }

    /**
     * Clear the entire path cache. Call when the map changes.
     */
    clearCache() {
        this.cache.clear();
        this.cacheOrder = [];
    }
}

export const pathfinding = new Pathfinding();
export default pathfinding;
