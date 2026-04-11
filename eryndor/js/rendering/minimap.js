import { TERRAIN } from '../enums.js';

export class Minimap {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
    }

    draw(gameMap, factions, camera, mainCanvas) {
        const w = this.canvas.width;
        const h = this.canvas.height;
        const mw = gameMap.width;
        const mh = gameMap.height;
        const sx = w / mw;
        const sy = h / mh;

        // Clear
        this.ctx.fillStyle = 'rgba(0,0,0,0.8)';
        this.ctx.fillRect(0, 0, w, h);

        // Draw terrain (1 pixel per tile)
        for (let y = 0; y < mh; y++) {
            for (let x = 0; x < mw; x++) {
                const territory = gameMap.territory[y][x];
                const terrain = gameMap.terrain[y][x];

                if (territory >= 0 && factions[territory]) {
                    this.ctx.fillStyle = factions[territory].color;
                } else {
                    this.ctx.fillStyle = this.getMinimapColor(terrain);
                }
                this.ctx.fillRect(x * sx, y * sy, Math.ceil(sx), Math.ceil(sy));
            }
        }

        // Draw viewport rectangle
        const cellSize = gameMap.cellSize || 16;
        const tl = camera.screenToWorld(0, 0);
        const br = camera.screenToWorld(mainCanvas.width, mainCanvas.height);

        const vx = (tl.x / cellSize) * sx;
        const vy = (tl.y / cellSize) * sy;
        const vw = ((br.x - tl.x) / cellSize) * sx;
        const vh = ((br.y - tl.y) / cellSize) * sy;

        this.ctx.strokeStyle = 'rgba(255,255,255,0.8)';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(vx, vy, vw, vh);
    }

    getMinimapColor(terrain) {
        switch (terrain) {
            case TERRAIN.GRASS: return '#2a4a2a';
            case TERRAIN.FOREST: return '#1a3a1a';
            case TERRAIN.WATER: return '#2a6a98';
            case TERRAIN.STONE: return '#5a5a5a';
            case TERRAIN.IRON: return '#6b4a14';
            case TERRAIN.GOLD: return '#9a7010';
            case TERRAIN.BERRIES: return '#3a5a2a';
            case TERRAIN.MOUNTAIN: return '#4a4a4a';
            default: return '#2a4a2a';
        }
    }

    // Handle click on minimap to navigate
    handleClick(event, gameMap, camera) {
        const rect = this.canvas.getBoundingClientRect();
        const mx = event.clientX - rect.left;
        const my = event.clientY - rect.top;
        const cellSize = gameMap.cellSize || 16;

        const worldX = (mx / this.canvas.width) * gameMap.width * cellSize;
        const worldY = (my / this.canvas.height) * gameMap.height * cellSize;

        camera.centerOn(worldX, worldY);
    }
}
