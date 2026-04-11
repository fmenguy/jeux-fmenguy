import { UNIT_TYPE, JOB, DIPLOMACY_STATUS } from '../enums.js';
import { CONFIG } from '../config.js';

/**
 * ThreatAssessor - Scans the game state and produces a ranked list of threats
 * for the owning faction.  Each threat carries a composite score built from
 * relative military strength, proximity, and border pressure.
 */
export class ThreatAssessor {

    constructor() {
        // Cache expensive border calculations for a few ticks
        this._borderCache = null;
        this._borderCacheTick = -999;
        this._borderCacheInterval = 90; // recalculate every ~90 ticks
    }

    // ------------------------------------------------------------------ //
    //  Public API
    // ------------------------------------------------------------------ //

    /**
     * Returns { threats: [...], maxThreat, primaryThreat }
     *   threat = { factionId, score, direction, militaryRatio, distance, borderPressure }
     */
    scan(faction, game) {
        const map = game.map || game.gameMap;
        const enemies = (game.factions || []).filter(f => f.id !== faction.id);

        if (enemies.length === 0) {
            return { threats: [], maxThreat: 0, primaryThreat: null };
        }

        const ourPower = this._calcMilitaryPower(faction);
        const ourCenter = this._factionCenter(faction, map);

        const threats = [];

        for (const enemy of enemies) {
            const enemyPower = this._calcMilitaryPower(enemy);
            const enemyCenter = this._factionCenter(enemy, map);

            // Military ratio (higher = more dangerous)
            const militaryRatio = ourPower > 0 ? enemyPower / ourPower : (enemyPower > 0 ? 5 : 0);

            // Distance factor: closer enemies are more dangerous
            const dx = enemyCenter.x - ourCenter.x;
            const dy = enemyCenter.y - ourCenter.y;
            const distance = Math.sqrt(dx * dx + dy * dy) || 1;
            const proximityFactor = Math.max(0.1, 1 / (distance / 10));

            // Border pressure: how many tiles of shared border exist
            const borderPressure = this._calcBorderPressure(faction, enemy, map, game);
            const borderFactor = borderPressure / 10;

            // Diplomacy modifier
            let diplomacyMod = 1.0;
            if (game.diplomacy) {
                const status = this._getDiplomacyStatus(faction.id, enemy.id, game);
                if (status === DIPLOMACY_STATUS.WAR) diplomacyMod = 2.0;
                else if (status === DIPLOMACY_STATUS.HOSTILE) diplomacyMod = 1.5;
                else if (status === DIPLOMACY_STATUS.NEUTRAL) diplomacyMod = 1.0;
                else if (status === DIPLOMACY_STATUS.FRIENDLY) diplomacyMod = 0.4;
                else if (status === DIPLOMACY_STATUS.ALLIED) diplomacyMod = 0.1;
            }

            // Enemy units inside our territory add extra urgency
            const intrusionBonus = this._countIntruders(faction, enemy, map);

            // Composite score
            const score = (
                militaryRatio * 0.35 +
                proximityFactor * 0.20 +
                borderFactor * 0.15 +
                intrusionBonus * 0.30
            ) * diplomacyMod;

            // Direction (angle from our center to enemy center)
            const angle = Math.atan2(dy, dx);
            const direction = this._angleToCardinal(angle);

            threats.push({
                factionId: enemy.id,
                score,
                direction,
                militaryRatio,
                distance,
                borderPressure,
                intruders: intrusionBonus,
                enemyCenter
            });
        }

        // Sort by descending score
        threats.sort((a, b) => b.score - a.score);

        return {
            threats,
            maxThreat: threats.length > 0 ? threats[0].score : 0,
            primaryThreat: threats.length > 0 ? threats[0] : null
        };
    }

    // ------------------------------------------------------------------ //
    //  Internal helpers
    // ------------------------------------------------------------------ //

    _calcMilitaryPower(faction) {
        let power = 0;
        for (const v of faction.villagers) {
            if (!v.isAlive) continue;
            switch (v.unitType) {
                case UNIT_TYPE.SOLDIER:  power += 3;   break;
                case UNIT_TYPE.ARCHER:   power += 2.5; break;
                case UNIT_TYPE.CAVALRY:  power += 4;   break;
                case UNIT_TYPE.SCOUT:    power += 1.5; break;
                default:
                    if (v.job === JOB.WARRIOR) power += 1.5;
                    else if (v.job === JOB.HUNTER) power += 1;
                    break;
            }
        }
        return power;
    }

    _factionCenter(faction, map) {
        const alive = faction.villagers.filter(v => v.isAlive);
        if (alive.length === 0) {
            // Fallback: center of territory
            return this._territoryCentroid(faction, map);
        }
        let sx = 0, sy = 0;
        for (const v of alive) { sx += v.x; sy += v.y; }
        return { x: sx / alive.length, y: sy / alive.length };
    }

    _territoryCentroid(faction, map) {
        if (!map || !map.territory) return { x: CONFIG.mapWidth / 2, y: CONFIG.mapHeight / 2 };
        let sx = 0, sy = 0, count = 0;
        for (let y = 0; y < map.height; y++) {
            for (let x = 0; x < map.width; x++) {
                if (map.territory[y][x] === faction.id) {
                    sx += x; sy += y; count++;
                }
            }
        }
        return count > 0
            ? { x: sx / count, y: sy / count }
            : { x: CONFIG.mapWidth / 2, y: CONFIG.mapHeight / 2 };
    }

    /**
     * Count tiles that belong to `faction` and are adjacent to tiles belonging to `enemy`.
     * Uses a cache to avoid scanning every tick.
     */
    _calcBorderPressure(faction, enemy, map, game) {
        if (!map || !map.territory) return 0;

        const tick = CONFIG.currentTick || 0;
        if (this._borderCache && tick - this._borderCacheTick < this._borderCacheInterval) {
            const key = `${faction.id}-${enemy.id}`;
            if (this._borderCache[key] !== undefined) return this._borderCache[key];
        }

        // Recalculate
        if (!this._borderCache || tick - this._borderCacheTick >= this._borderCacheInterval) {
            this._borderCache = {};
            this._borderCacheTick = tick;
        }

        let pressure = 0;
        const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];

        // Sample every other tile for performance on 80x45 map
        for (let y = 0; y < map.height; y += 2) {
            for (let x = 0; x < map.width; x += 2) {
                if (map.territory[y][x] !== faction.id) continue;
                for (const [dx, dy] of dirs) {
                    const nx = x + dx;
                    const ny = y + dy;
                    if (nx < 0 || nx >= map.width || ny < 0 || ny >= map.height) continue;
                    if (map.territory[ny][nx] === enemy.id) {
                        pressure++;
                        break; // count this tile only once
                    }
                }
            }
        }

        const key = `${faction.id}-${enemy.id}`;
        this._borderCache[key] = pressure;
        return pressure;
    }

    /**
     * Count enemy military units that are standing inside our territory.
     * Returns a 0-based score where each intruder adds weight.
     */
    _countIntruders(faction, enemy, map) {
        if (!map || !map.territory) return 0;
        let count = 0;
        for (const v of enemy.villagers) {
            if (!v.isAlive) continue;
            const tx = Math.floor(v.x);
            const ty = Math.floor(v.y);
            if (tx < 0 || tx >= map.width || ty < 0 || ty >= map.height) continue;
            if (map.territory[ty][tx] === faction.id) {
                // Military units count more
                if (v.unitType !== UNIT_TYPE.VILLAGER) count += 2;
                else if (v.job === JOB.WARRIOR || v.job === JOB.HUNTER) count += 1;
                else count += 0.3;
            }
        }
        return Math.min(count, 10); // cap at 10 for scoring
    }

    _getDiplomacyStatus(factionIdA, factionIdB, game) {
        if (!game.diplomacy) return DIPLOMACY_STATUS.NEUTRAL;
        // Support both Map-like and plain object diplomacy stores
        if (typeof game.diplomacy.getStatus === 'function') {
            return game.diplomacy.getStatus(factionIdA, factionIdB);
        }
        const key = `${Math.min(factionIdA, factionIdB)}-${Math.max(factionIdA, factionIdB)}`;
        if (game.diplomacy[key]) return game.diplomacy[key];
        return DIPLOMACY_STATUS.NEUTRAL;
    }

    _angleToCardinal(radians) {
        const deg = ((radians * 180 / Math.PI) + 360) % 360;
        if (deg < 22.5  || deg >= 337.5) return 'east';
        if (deg < 67.5)  return 'southeast';
        if (deg < 112.5) return 'south';
        if (deg < 157.5) return 'southwest';
        if (deg < 202.5) return 'west';
        if (deg < 247.5) return 'northwest';
        if (deg < 292.5) return 'north';
        return 'northeast';
    }
}
