import { TERRAIN, ELEVATION } from '../enums.js';
import { CONFIG } from '../config.js';

export class Boat {
    constructor(factionId, x, y) {
        this.id = Math.random().toString(36).substr(2, 9);
        this.factionId = factionId;
        this.x = x;
        this.y = y;
        this.targetX = x;
        this.targetY = y;
        this.fishingTimer = 0;
        this.fishCollected = 0;
        this.capacity = 20;
        this.returning = false;
        this.portX = x;
        this.portY = y;
    }

    update(gameMap, faction) {
        // Check if full, return to port
        if (this.fishCollected >= this.capacity) {
            this.returning = true;
        }

        if (this.returning) {
            // Return to port
            const dx = this.portX - this.x;
            const dy = this.portY - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < 1.5) {
                // Unload fish
                faction.resources.food += this.fishCollected;
                this.fishCollected = 0;
                this.returning = false;
            } else {
                this.targetX = this.portX;
                this.targetY = this.portY;
            }
        } else {
            // Fish or find a good spot
            this.fishingTimer += CONFIG.gameSpeed;

            if (this.fishingTimer > 100) {
                this.fishingTimer = 0;
                const terrain = gameMap.terrain[Math.floor(this.y)];
                const elev = gameMap.elevation[Math.floor(this.y)];

                if (terrain && terrain[Math.floor(this.x)] === TERRAIN.WATER) {
                    const depth = elev ? elev[Math.floor(this.x)] : 1;
                    if (depth >= ELEVATION.MEDIUM) {
                        // Fish! More fish in deep water
                        this.fishCollected += depth;
                    }
                }

                // Move randomly on navigable water
                if (Math.random() < 0.3) {
                    const angle = Math.random() * Math.PI * 2;
                    const newX = this.x + Math.cos(angle) * 2;
                    const newY = this.y + Math.sin(angle) * 2;

                    if (gameMap.isNavigable(Math.floor(newX), Math.floor(newY))) {
                        this.targetX = newX;
                        this.targetY = newY;
                    }
                }
            }
        }

        // Smooth movement
        const speed = 0.03 * CONFIG.gameSpeed;
        this.x += (this.targetX - this.x) * speed;
        this.y += (this.targetY - this.y) * speed;
    }
}
