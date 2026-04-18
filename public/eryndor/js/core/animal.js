import { TERRAIN } from '../enums.js';
import { CONFIG } from '../config.js';
import { ANIMAL_TYPE } from '../data/events.js';

export class Animal {
    constructor(type, x, y) {
        this.id = Math.random().toString(36).substr(2, 9);
        this.type = type;
        this.typeData = ANIMAL_TYPE[type];
        this.x = x;
        this.y = y;
        this.targetX = x;
        this.targetY = y;
        this.isAlive = true;
        this.health = 100;
        this.moveTimer = 0;
        this.fleeingFrom = null;
        this.productionTimer = 0;
    }

    update(gameMap, allFactions) {
        if (!this.isAlive) return;

        this.moveTimer += CONFIG.gameSpeed;
        this.productionTimer += CONFIG.gameSpeed;

        // Check if a hunter is nearby (to flee)
        if (this.typeData.flees || this.typeData.passive) {
            let nearestHunter = null;
            let nearestDist = 8;

            allFactions.forEach(faction => {
                faction.villagers.forEach(v => {
                    if (!v.isAlive) return;
                    if (v.job === 'hunter' || v.currentTask === 'hunt') {
                        const dx = v.x - this.x;
                        const dy = v.y - this.y;
                        const dist = Math.sqrt(dx * dx + dy * dy);
                        if (dist < nearestDist) {
                            nearestDist = dist;
                            nearestHunter = v;
                        }
                    }
                });
            });

            if (nearestHunter && nearestDist < 5) {
                const dx = this.x - nearestHunter.x;
                const dy = this.y - nearestHunter.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist > 0) {
                    const fleeX = this.x + (dx / dist) * 3;
                    const fleeY = this.y + (dy / dist) * 3;
                    if (this.canMoveTo(gameMap, fleeX, fleeY)) {
                        this.targetX = fleeX;
                        this.targetY = fleeY;
                    }
                }
            }
        }

        // Random movement
        if (this.moveTimer > 100 + Math.random() * 100) {
            this.moveTimer = 0;
            if (Math.random() < 0.3) {
                const angle = Math.random() * Math.PI * 2;
                const dist = 1 + Math.random() * 2;
                const newX = this.x + Math.cos(angle) * dist;
                const newY = this.y + Math.sin(angle) * dist;
                if (this.canMoveTo(gameMap, newX, newY)) {
                    this.targetX = newX;
                    this.targetY = newY;
                }
            }
        }

        // Smooth movement
        const speed = this.typeData.speed * 0.02 * CONFIG.gameSpeed;
        this.x += (this.targetX - this.x) * speed;
        this.y += (this.targetY - this.y) * speed;
    }

    canMoveTo(gameMap, x, y) {
        const ix = Math.floor(x);
        const iy = Math.floor(y);
        if (ix < 0 || ix >= gameMap.width || iy < 0 || iy >= gameMap.height) return false;

        // Aquatic animals stay in water
        if (this.typeData.aquatic) {
            return gameMap.terrain[iy][ix] === TERRAIN.WATER;
        }
        // Others avoid water and high mountains
        const terrain = gameMap.terrain[iy][ix];
        if (terrain === TERRAIN.WATER) return false;
        if (terrain === TERRAIN.MOUNTAIN && gameMap.elevation[iy][ix] > 1) return false;
        return true;
    }

    kill() {
        this.isAlive = false;
        return {
            food: this.typeData.food,
            wool: this.typeData.wool || 0
        };
    }

    harvest() {
        if (this.productionTimer < 500) return null;
        this.productionTimer = 0;
        return {
            milk: this.typeData.milk || 0,
            eggs: this.typeData.eggs || 0,
            wool: this.typeData.wool ? Math.floor(this.typeData.wool / 2) : 0
        };
    }
}
