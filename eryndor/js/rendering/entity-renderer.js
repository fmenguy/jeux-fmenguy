import { UNIT_TYPE, JOB } from '../enums.js';

export class EntityRenderer {
    drawVillager(ctx, villager, faction, cellSize, isSelected) {
        const r = cellSize * 0.35;
        const px = villager.x * cellSize;
        const py = villager.y * cellSize;

        // Selection glow
        if (isSelected) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
            ctx.beginPath();
            ctx.arc(px, py, r * 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
            ctx.lineWidth = 1;
            ctx.stroke();
        }

        // Color based on state
        let color = faction.lightColor;
        if (villager.currentTask === 'combat') color = '#ef4444';
        else if (villager.hunger > 50) color = '#f59e0b';
        else if (villager.unitType !== UNIT_TYPE.VILLAGER) color = '#3b82f6';

        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        ctx.ellipse(px, py + r * 0.6, r * 0.7, r * 0.25, 0, 0, Math.PI * 2);
        ctx.fill();

        // Body circle
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(px, py, r, 0, Math.PI * 2);
        ctx.fill();

        // Border
        ctx.strokeStyle = faction.darkColor;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Direction indicator (small wedge showing movement direction)
        const dx = villager.targetX - villager.x;
        const dy = villager.targetY - villager.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist > 0.1) {
            const angle = Math.atan2(dy, dx);
            ctx.fillStyle = 'rgba(255,255,255,0.5)';
            ctx.beginPath();
            ctx.moveTo(px + Math.cos(angle) * r, py + Math.sin(angle) * r);
            ctx.lineTo(px + Math.cos(angle - 0.5) * r * 0.6, py + Math.sin(angle - 0.5) * r * 0.6);
            ctx.lineTo(px + Math.cos(angle + 0.5) * r * 0.6, py + Math.sin(angle + 0.5) * r * 0.6);
            ctx.fill();
        }

        // Health bar if not full
        const healthPct = villager.combatStats.health / villager.combatStats.maxHealth;
        if (healthPct < 1) {
            const bw = cellSize * 0.8;
            const bh = 2;
            const bx = px - bw / 2;
            const by = py - r - 4;
            ctx.fillStyle = 'rgba(0,0,0,0.6)';
            ctx.fillRect(bx - 0.5, by - 0.5, bw + 1, bh + 1);
            const hc = healthPct > 0.5 ? '#22c55e' : healthPct > 0.25 ? '#eab308' : '#ef4444';
            ctx.fillStyle = hc;
            ctx.fillRect(bx, by, bw * healthPct, bh);
        }
    }

    drawAnimal(ctx, animal, cellSize) {
        if (!animal.isAlive) return;
        const px = animal.x * cellSize;
        const py = animal.y * cellSize;
        const r = cellSize * 0.25;

        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.beginPath();
        ctx.ellipse(px, py + r * 0.5, r * 0.8, r * 0.3, 0, 0, Math.PI * 2);
        ctx.fill();

        // Animal body - small colored dot instead of emoji for performance
        const animalColors = {
            SHEEP: '#e8e8e8', COW: '#8b6914', CHICKEN: '#d4a017',
            PIG: '#d4a0a0', DEER: '#a06030', FISH: '#4a9ab8'
        };
        ctx.fillStyle = animalColors[animal.type] || '#aaa';
        ctx.beginPath();
        ctx.arc(px, py, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.3)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Health if damaged
        if (animal.health < 100) {
            const hp = animal.health / 100;
            const bw = cellSize * 0.5;
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(px - bw/2, py - r - 3, bw, 2);
            ctx.fillStyle = hp > 0.5 ? '#22c55e' : '#ef4444';
            ctx.fillRect(px - bw/2, py - r - 3, bw * hp, 2);
        }
    }

    drawBoat(ctx, boat, faction, cellSize) {
        const px = boat.x * cellSize;
        const py = boat.y * cellSize;
        const s = cellSize;

        // Hull
        ctx.fillStyle = '#5c3317';
        ctx.beginPath();
        ctx.moveTo(px - s*0.3, py);
        ctx.lineTo(px - s*0.35, py + s*0.2);
        ctx.lineTo(px + s*0.35, py + s*0.2);
        ctx.lineTo(px + s*0.3, py);
        ctx.closePath();
        ctx.fill();

        // Sail
        ctx.fillStyle = faction.lightColor;
        ctx.beginPath();
        ctx.moveTo(px, py + s*0.1);
        ctx.lineTo(px, py - s*0.35);
        ctx.lineTo(px + s*0.2, py);
        ctx.closePath();
        ctx.fill();

        // Mast
        ctx.strokeStyle = '#3d2010';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(px, py + s*0.15);
        ctx.lineTo(px, py - s*0.35);
        ctx.stroke();

        // Fish indicator
        if (boat.fishCollected > 0) {
            const ratio = boat.fishCollected / boat.capacity;
            ctx.fillStyle = 'rgba(60, 160, 255, 0.6)';
            ctx.fillRect(px - s*0.15, py + s*0.22, s*0.3 * ratio, s*0.06);
        }
    }
}
