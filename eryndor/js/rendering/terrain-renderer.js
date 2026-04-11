import { TERRAIN, ELEVATION, BUILDING } from '../enums.js';
import { CONFIG } from '../config.js';

export class TerrainRenderer {
    constructor() {
        this.cellSize = CONFIG.cellSize;
        // Pre-computed colors
        this.terrainColors = {
            [TERRAIN.GRASS]: { base: '#2d4a2d', dark: '#1f3a1f', light: '#3d5c3a' },
            [TERRAIN.FOREST]: { base: '#1a3a1a', dark: '#0f2a0f', light: '#2a4a2a' },
            [TERRAIN.STONE]: { base: '#5a5a5a', dark: '#4a4a4a', light: '#6b6b6b' },
            [TERRAIN.IRON]: { base: '#6b5014', dark: '#5a4010', light: '#8b6914' },
            [TERRAIN.GOLD]: { base: '#9a7010', dark: '#7a5a0b', light: '#b8860b' },
            [TERRAIN.BERRIES]: { base: '#2a5a2a', dark: '#1a4a1a', light: '#3a6b3a' },
            [TERRAIN.WATER]: {
                [ELEVATION.SHALLOW]: '#4a8ab8',
                [ELEVATION.MEDIUM]: '#2a6a98',
                [ELEVATION.DEEP]: '#1a4a78'
            },
            [TERRAIN.MOUNTAIN]: {
                1: '#6a6a6a',
                2: '#4a4a4a',
                3: '#3a3a3a'
            }
        };
    }

    drawTile(ctx, x, y, px, py, cs, gameMap, factions, tick) {
        const terrain = gameMap.terrain[y][x];
        const elev = gameMap.elevation[y][x];
        const territory = gameMap.territory[y][x];
        const building = gameMap.buildings[y][x];

        // Base color
        let baseColor = this.getBaseColor(terrain, elev);

        // Blend with territory color
        if (territory >= 0 && factions[territory]) {
            const faction = factions[territory];
            ctx.fillStyle = this.blendColors(baseColor, faction.darkColor, 0.3);
        } else {
            ctx.fillStyle = baseColor;
        }

        ctx.fillRect(px, py, cs + 0.5, cs + 0.5);

        // Draw terrain features
        if (building.type === BUILDING.NONE) {
            switch (terrain) {
                case TERRAIN.FOREST: this.drawForest(ctx, px, py, cs); break;
                case TERRAIN.STONE: this.drawStone(ctx, px, py, cs); break;
                case TERRAIN.IRON: this.drawIron(ctx, px, py, cs); break;
                case TERRAIN.GOLD: this.drawGold(ctx, px, py, cs); break;
                case TERRAIN.BERRIES: this.drawBerries(ctx, px, py, cs); break;
            }
        }
        if (terrain === TERRAIN.WATER) this.drawWater(ctx, px, py, cs, elev, tick);
        if (terrain === TERRAIN.MOUNTAIN) this.drawMountain(ctx, px, py, cs, elev);
    }

    getBaseColor(terrain, elev) {
        if (terrain === TERRAIN.WATER) {
            return this.terrainColors[TERRAIN.WATER][elev] || '#4a8ab8';
        }
        if (terrain === TERRAIN.MOUNTAIN) {
            return this.terrainColors[TERRAIN.MOUNTAIN][elev] || '#6a6a6a';
        }
        const colors = this.terrainColors[terrain];
        return colors ? colors.base : '#2d4a2d';
    }

    blendColors(color1, color2, ratio) {
        const parse = (c) => {
            if (c.startsWith('rgb')) {
                const m = c.match(/(\d+)/g);
                return m ? [+m[0], +m[1], +m[2]] : [0,0,0];
            }
            const hex = parseInt(c.slice(1), 16);
            return [(hex >> 16) & 255, (hex >> 8) & 255, hex & 255];
        };
        const [r1,g1,b1] = parse(color1);
        const [r2,g2,b2] = parse(color2);
        const r = Math.round(r1 * (1-ratio) + r2 * ratio);
        const g = Math.round(g1 * (1-ratio) + g2 * ratio);
        const b = Math.round(b1 * (1-ratio) + b2 * ratio);
        return `rgb(${r},${g},${b})`;
    }

    // Draw a stylized tree (procedural, not emoji)
    drawForest(ctx, x, y, s) {
        const cx = x + s/2, cy = y + s/2;
        const r = s * 0.35;
        // Trunk
        ctx.fillStyle = '#3d2b1a';
        ctx.fillRect(cx - r*0.12, cy + r*0.1, r*0.24, r*0.6);
        // Canopy - layered circles for depth
        ctx.fillStyle = '#1a5c1a';
        ctx.beginPath();
        ctx.arc(cx, cy - r*0.15, r*0.45, 0, Math.PI*2);
        ctx.fill();
        ctx.fillStyle = '#228b22';
        ctx.beginPath();
        ctx.arc(cx - r*0.1, cy - r*0.2, r*0.3, 0, Math.PI*2);
        ctx.fill();
        // Highlight
        ctx.fillStyle = 'rgba(100, 200, 100, 0.3)';
        ctx.beginPath();
        ctx.arc(cx - r*0.15, cy - r*0.3, r*0.15, 0, Math.PI*2);
        ctx.fill();
    }

    drawStone(ctx, x, y, s) {
        const cx = x + s/2, cy = y + s/2, r = s*0.3;
        ctx.fillStyle = '#787878';
        ctx.beginPath();
        ctx.ellipse(cx, cy + r*0.15, r, r*0.6, 0, 0, Math.PI*2);
        ctx.fill();
        // Highlight
        ctx.fillStyle = 'rgba(200,200,200,0.2)';
        ctx.beginPath();
        ctx.ellipse(cx - r*0.2, cy - r*0.1, r*0.3, r*0.2, -0.3, 0, Math.PI*2);
        ctx.fill();
    }

    drawIron(ctx, x, y, s) {
        const cx = x + s/2, cy = y + s/2, r = s*0.25;
        ctx.fillStyle = '#6b4513';
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI*2);
        ctx.fill();
        ctx.fillStyle = '#a0783c';
        ctx.beginPath();
        ctx.arc(cx - r*0.25, cy - r*0.25, r*0.35, 0, Math.PI*2);
        ctx.fill();
    }

    drawGold(ctx, x, y, s) {
        const cx = x + s/2, cy = y + s/2, r = s*0.25;
        ctx.fillStyle = '#c8a000';
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI*2);
        ctx.fill();
        // Sparkle
        ctx.fillStyle = '#ffe066';
        ctx.beginPath();
        ctx.arc(cx - r*0.2, cy - r*0.2, r*0.25, 0, Math.PI*2);
        ctx.fill();
    }

    drawBerries(ctx, x, y, s) {
        const cx = x + s/2, cy = y + s/2, r = s*0.3;
        // Bush
        ctx.fillStyle = '#1f7a1f';
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI*2);
        ctx.fill();
        // Berries
        ctx.fillStyle = '#cc1133';
        const bs = r * 0.22;
        [[-0.3,-0.2],[0.3,0],[0,0.3],[-0.1,0.1]].forEach(([dx,dy]) => {
            ctx.beginPath();
            ctx.arc(cx + r*dx, cy + r*dy, bs, 0, Math.PI*2);
            ctx.fill();
        });
    }

    drawWater(ctx, x, y, s, level, tick) {
        // Animated waves
        const wavePhase = (tick * 0.015 + x * 0.3 + y * 0.2) % (Math.PI * 2);
        const alpha = 0.12 + (level - 1) * 0.05;
        ctx.fillStyle = `rgba(180, 220, 255, ${alpha})`;
        for (let i = 0; i < 3; i++) {
            const wy = y + (Math.sin(wavePhase + i * 2) * 0.5 + 0.5) * s;
            ctx.fillRect(x + 1, wy, s - 2, 1);
        }
        // Depth darkening
        if (level >= 2) {
            ctx.fillStyle = `rgba(0, 10, 40, ${0.15 * (level - 1)})`;
            ctx.fillRect(x + 1, y + 1, s - 2, s - 2);
        }
    }

    drawMountain(ctx, x, y, s, level) {
        const cx = x + s/2;
        const h = 0.3 + (level - 1) * 0.15;
        // Mountain body
        ctx.fillStyle = level === 3 ? '#a0a0a0' : (level === 2 ? '#808080' : '#6a6a6a');
        ctx.beginPath();
        ctx.moveTo(x + s*0.1, y + s*0.9);
        ctx.lineTo(cx, y + s*(0.9 - h));
        ctx.lineTo(x + s*0.9, y + s*0.9);
        ctx.fill();
        // Snow cap
        if (level >= 2) {
            ctx.fillStyle = '#e8e8e8';
            ctx.beginPath();
            ctx.moveTo(cx - s*0.12, y + s*(0.9 - h + 0.08));
            ctx.lineTo(cx, y + s*(0.9 - h));
            ctx.lineTo(cx + s*0.12, y + s*(0.9 - h + 0.08));
            ctx.fill();
        }
    }
}
