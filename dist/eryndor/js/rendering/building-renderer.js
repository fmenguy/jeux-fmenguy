import { BUILDING } from '../enums.js';

export class BuildingRenderer {
    draw(ctx, building, px, py, cs, faction, factions) {
        if (building.type === BUILDING.NONE) return;
        if (building.type === BUILDING.ROAD) {
            this.drawRoad(ctx, px, py, cs, faction);
            return;
        }

        const f = faction >= 0 ? factions[faction] : null;

        // Background
        if (f) {
            ctx.fillStyle = 'rgba(0,0,0,0.3)';
            this.roundRect(ctx, px + 1, py + 1, cs - 2, cs - 2, 3);
            ctx.fill();
            ctx.strokeStyle = f.color + '80';
            ctx.lineWidth = 1;
            this.roundRect(ctx, px + 1, py + 1, cs - 2, cs - 2, 3);
            ctx.stroke();
        }

        // Draw shape based on type
        const cx = px + cs/2, cy = py + cs/2;
        const r = cs * 0.3;

        switch (building.type) {
            case BUILDING.CASTLE: this.drawCastle(ctx, cx, cy, r, f); break;
            case BUILDING.HOUSE: this.drawHouse(ctx, cx, cy, r, f); break;
            case BUILDING.FARM: this.drawFarm(ctx, cx, cy, r); break;
            case BUILDING.BARRACKS: this.drawBarracks(ctx, cx, cy, r, f); break;
            case BUILDING.FORGE: this.drawForge(ctx, cx, cy, r); break;
            case BUILDING.WALL: this.drawWall(ctx, cx, cy, r, f); break;
            case BUILDING.TOWER: this.drawTower(ctx, cx, cy, r, f); break;
            case BUILDING.WATCHTOWER: this.drawTower(ctx, cx, cy, r, f); break;
            case BUILDING.PORT: this.drawPort(ctx, cx, cy, r); break;
            case BUILDING.MARKET: this.drawMarket(ctx, cx, cy, r); break;
            case BUILDING.GRANARY: this.drawGranary(ctx, cx, cy, r); break;
            case BUILDING.COLONY: this.drawColony(ctx, cx, cy, r, f); break;
            default: this.drawGeneric(ctx, cx, cy, r, f); break;
        }

        // Health bar if damaged
        const maxHealth = building.maxHealth || 100;
        const health = building.health !== undefined ? building.health : maxHealth;
        if (health < maxHealth) {
            const hp = health / maxHealth;
            const bw = cs - 4;
            ctx.fillStyle = 'rgba(0,0,0,0.6)';
            ctx.fillRect(px + 2, py + cs - 4, bw, 2);
            ctx.fillStyle = hp > 0.5 ? '#22c55e' : hp > 0.25 ? '#eab308' : '#ef4444';
            ctx.fillRect(px + 2, py + cs - 4, bw * hp, 2);
        }
    }

    drawCastle(ctx, cx, cy, r, f) {
        // Tower shape with crenellations
        const c = f ? f.color : '#888';
        ctx.fillStyle = c;
        // Main body
        ctx.fillRect(cx - r*0.6, cy - r*0.3, r*1.2, r*0.9);
        // Towers
        ctx.fillRect(cx - r*0.8, cy - r*0.7, r*0.35, r*1.3);
        ctx.fillRect(cx + r*0.45, cy - r*0.7, r*0.35, r*1.3);
        // Crenellations
        ctx.fillRect(cx - r*0.9, cy - r*0.85, r*0.15, r*0.15);
        ctx.fillRect(cx - r*0.6, cy - r*0.85, r*0.15, r*0.15);
        ctx.fillRect(cx + r*0.45, cy - r*0.85, r*0.15, r*0.15);
        ctx.fillRect(cx + r*0.75, cy - r*0.85, r*0.15, r*0.15);
        // Door
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.fillRect(cx - r*0.15, cy + r*0.1, r*0.3, r*0.5);
    }

    drawHouse(ctx, cx, cy, r, f) {
        ctx.fillStyle = f ? f.color + 'cc' : '#8b7355';
        ctx.fillRect(cx - r*0.6, cy - r*0.1, r*1.2, r*0.7);
        // Roof
        ctx.fillStyle = '#6b3020';
        ctx.beginPath();
        ctx.moveTo(cx - r*0.8, cy - r*0.1);
        ctx.lineTo(cx, cy - r*0.7);
        ctx.lineTo(cx + r*0.8, cy - r*0.1);
        ctx.fill();
    }

    drawFarm(ctx, cx, cy, r) {
        // Wheat field
        ctx.fillStyle = '#8b7a30';
        ctx.fillRect(cx - r*0.7, cy - r*0.5, r*1.4, r*1.0);
        // Wheat lines
        ctx.strokeStyle = '#c8a820';
        ctx.lineWidth = 1;
        for (let i = -2; i <= 2; i++) {
            ctx.beginPath();
            ctx.moveTo(cx + i * r*0.25, cy - r*0.4);
            ctx.lineTo(cx + i * r*0.25, cy + r*0.4);
            ctx.stroke();
        }
    }

    drawBarracks(ctx, cx, cy, r, f) {
        ctx.fillStyle = f ? f.color : '#666';
        ctx.fillRect(cx - r*0.7, cy - r*0.4, r*1.4, r*0.9);
        // Crossed swords symbol
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(cx - r*0.3, cy - r*0.3); ctx.lineTo(cx + r*0.3, cy + r*0.2);
        ctx.moveTo(cx + r*0.3, cy - r*0.3); ctx.lineTo(cx - r*0.3, cy + r*0.2);
        ctx.stroke();
    }

    drawForge(ctx, cx, cy, r) {
        ctx.fillStyle = '#5a3a1a';
        ctx.fillRect(cx - r*0.6, cy - r*0.4, r*1.2, r*0.9);
        // Fire
        ctx.fillStyle = '#ff6600';
        ctx.beginPath();
        ctx.arc(cx, cy, r*0.25, 0, Math.PI*2);
        ctx.fill();
        ctx.fillStyle = '#ffaa00';
        ctx.beginPath();
        ctx.arc(cx, cy - r*0.1, r*0.15, 0, Math.PI*2);
        ctx.fill();
    }

    drawWall(ctx, cx, cy, r, f) {
        ctx.fillStyle = f && f.traits && f.traits.masonryUnlocked ? '#808080' : '#6b4a2a';
        ctx.fillRect(cx - r*0.8, cy - r*0.35, r*1.6, r*0.7);
    }

    drawTower(ctx, cx, cy, r, f) {
        ctx.fillStyle = f ? f.color : '#666';
        // Tall narrow tower
        ctx.fillRect(cx - r*0.3, cy - r*0.8, r*0.6, r*1.4);
        // Top
        ctx.fillRect(cx - r*0.45, cy - r*0.9, r*0.9, r*0.2);
        // Arrow slit
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(cx - r*0.05, cy - r*0.3, r*0.1, r*0.3);
    }

    drawPort(ctx, cx, cy, r) {
        ctx.fillStyle = '#5c3317';
        ctx.fillRect(cx - r*0.7, cy - r*0.1, r*1.4, r*0.5);
        // Dock
        ctx.strokeStyle = '#8b6540';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cx - r*0.7, cy + r*0.4);
        ctx.lineTo(cx + r*0.7, cy + r*0.4);
        ctx.stroke();
    }

    drawMarket(ctx, cx, cy, r) {
        // Tent shape
        ctx.fillStyle = '#c8a020';
        ctx.beginPath();
        ctx.moveTo(cx - r*0.7, cy + r*0.3);
        ctx.lineTo(cx, cy - r*0.6);
        ctx.lineTo(cx + r*0.7, cy + r*0.3);
        ctx.fill();
        // Pole
        ctx.strokeStyle = '#5a3a1a';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(cx, cy - r*0.6); ctx.lineTo(cx, cy + r*0.3);
        ctx.stroke();
    }

    drawGranary(ctx, cx, cy, r) {
        ctx.fillStyle = '#8b6b40';
        ctx.fillRect(cx - r*0.6, cy - r*0.3, r*1.2, r*0.8);
        // Roof
        ctx.fillStyle = '#5a4020';
        ctx.fillRect(cx - r*0.7, cy - r*0.45, r*1.4, r*0.2);
    }

    drawColony(ctx, cx, cy, r, f) {
        // Flag
        ctx.strokeStyle = '#5a3a1a';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(cx, cy + r*0.5); ctx.lineTo(cx, cy - r*0.6);
        ctx.stroke();
        // Banner
        ctx.fillStyle = f ? f.color : '#888';
        ctx.fillRect(cx, cy - r*0.6, r*0.5, r*0.35);
        // Tent
        ctx.fillStyle = '#8b7355';
        ctx.beginPath();
        ctx.moveTo(cx - r*0.5, cy + r*0.5);
        ctx.lineTo(cx, cy - r*0.1);
        ctx.lineTo(cx + r*0.5, cy + r*0.5);
        ctx.fill();
    }

    drawGeneric(ctx, cx, cy, r, f) {
        ctx.fillStyle = f ? f.color + 'aa' : '#888';
        ctx.fillRect(cx - r*0.5, cy - r*0.5, r, r);
    }

    drawRoad(ctx, px, py, cs) {
        ctx.fillStyle = 'rgba(120, 100, 70, 0.6)';
        ctx.fillRect(px + cs*0.15, py + cs*0.15, cs*0.7, cs*0.7);
    }

    roundRect(ctx, x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
    }
}
