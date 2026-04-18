import { CONFIG } from '../config.js';
import { BUILDING } from '../enums.js';
import { Camera } from './camera.js';
import { TerrainRenderer } from './terrain-renderer.js';
import { EntityRenderer } from './entity-renderer.js';
import { BuildingRenderer } from './building-renderer.js';
import { ParticleSystem } from './effects.js';
import { Minimap } from './minimap.js';

export class Renderer {
    constructor(canvas, minimapCanvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.camera = new Camera(canvas);
        this.terrainRenderer = new TerrainRenderer();
        this.entityRenderer = new EntityRenderer();
        this.buildingRenderer = new BuildingRenderer();
        this.particles = new ParticleSystem();
        this.minimap = minimapCanvas ? new Minimap(minimapCanvas) : null;

        this.cellSize = CONFIG.cellSize;
        this.selectedVillager = null;

        // Center camera on map center
        this.camera.centerOn(
            CONFIG.mapWidth * this.cellSize / 2,
            CONFIG.mapHeight * this.cellSize / 2
        );

        // Setup input
        this.setupInput();
    }

    setupInput() {
        // Mouse wheel zoom
        this.canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            const factor = e.deltaY > 0 ? 0.9 : 1.1;
            this.camera.zoomAt(factor, e.offsetX, e.offsetY);
        }, { passive: false });

        // Middle mouse drag
        this.canvas.addEventListener('mousedown', (e) => {
            if (e.button === 1) { // middle button
                e.preventDefault();
                this.camera.startDrag(e.clientX, e.clientY);
            }
        });

        this.canvas.addEventListener('mousemove', (e) => {
            this.camera.drag(e.clientX, e.clientY);
        });

        this.canvas.addEventListener('mouseup', (e) => {
            if (e.button === 1) this.camera.endDrag();
        });

        // Right click drag as alternative
        this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
        this.canvas.addEventListener('mousedown', (e) => {
            if (e.button === 2) {
                this.camera.startDrag(e.clientX, e.clientY);
            }
        });
        this.canvas.addEventListener('mouseup', (e) => {
            if (e.button === 2) this.camera.endDrag();
        });

        // Keyboard pan (WASD)
        this.keys = {};
        window.addEventListener('keydown', (e) => { this.keys[e.key.toLowerCase()] = true; });
        window.addEventListener('keyup', (e) => { this.keys[e.key.toLowerCase()] = false; });

        // Resize
        window.addEventListener('resize', () => this.resize());
        this.resize();

        // Minimap click
        if (this.minimap) {
            this.minimap.canvas.addEventListener('click', (e) => {
                // Will be set up when gameMap is available
                if (this._gameMap) {
                    this.minimap.handleClick(e, { ...this._gameMap, cellSize: this.cellSize }, this.camera);
                }
            });
        }
    }

    resize() {
        const container = this.canvas.parentElement;
        if (container) {
            this.canvas.width = container.clientWidth;
            this.canvas.height = container.clientHeight;
        }
    }

    // Process keyboard input for camera
    processInput() {
        const speed = 5;
        if (this.keys['w'] || this.keys['arrowup']) this.camera.pan(0, -speed);
        if (this.keys['s'] || this.keys['arrowdown']) this.camera.pan(0, speed);
        if (this.keys['a'] || this.keys['arrowleft']) this.camera.pan(-speed, 0);
        if (this.keys['d'] || this.keys['arrowright']) this.camera.pan(speed, 0);
    }

    // Convert screen coords to map cell
    screenToCell(screenX, screenY) {
        const world = this.camera.screenToWorld(screenX, screenY);
        return {
            x: Math.floor(world.x / this.cellSize),
            y: Math.floor(world.y / this.cellSize)
        };
    }

    draw(gameMap, factions) {
        this._gameMap = gameMap;
        this.processInput();
        this.camera.update();
        this.particles.update();

        const ctx = this.ctx;
        const cs = this.cellSize;

        // Clear with dark background
        ctx.fillStyle = '#0a0b0f';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Get visible bounds for culling
        const bounds = this.camera.getVisibleBounds(gameMap.width, gameMap.height, cs);

        // Save context and apply camera transform
        ctx.save();
        const cx = this.canvas.width / 2;
        const cy = this.canvas.height / 2;
        ctx.translate(cx, cy);
        ctx.scale(this.camera.zoom, this.camera.zoom);
        ctx.translate(-this.camera.x, -this.camera.y);

        // Draw terrain tiles (only visible ones)
        for (let y = bounds.minY; y <= bounds.maxY; y++) {
            for (let x = bounds.minX; x <= bounds.maxX; x++) {
                const px = x * cs;
                const py = y * cs;
                this.terrainRenderer.drawTile(ctx, x, y, px, py, cs, gameMap, factions, CONFIG.currentTick);
            }
        }

        // Draw buildings
        for (let y = bounds.minY; y <= bounds.maxY; y++) {
            for (let x = bounds.minX; x <= bounds.maxX; x++) {
                const building = gameMap.buildings[y][x];
                if (building.type !== BUILDING.NONE) {
                    this.buildingRenderer.draw(ctx, building, x * cs, y * cs, cs, building.faction, factions);
                }
            }
        }

        // Draw territory borders
        this.drawTerritoryBorders(ctx, gameMap, factions, bounds, cs);

        // Draw animals
        if (gameMap.animals) {
            for (const animal of gameMap.animals) {
                if (!animal.isAlive) continue;
                if (animal.x >= bounds.minX && animal.x <= bounds.maxX + 1 &&
                    animal.y >= bounds.minY && animal.y <= bounds.maxY + 1) {
                    this.entityRenderer.drawAnimal(ctx, animal, cs);
                }
            }
        }

        // Draw villagers
        factions.forEach(faction => {
            faction.villagers.forEach(v => {
                if (!v.isAlive) return;
                if (v.x >= bounds.minX - 1 && v.x <= bounds.maxX + 1 &&
                    v.y >= bounds.minY - 1 && v.y <= bounds.maxY + 1) {
                    this.entityRenderer.drawVillager(ctx, v, faction, cs, v === this.selectedVillager);
                }
            });
            // Draw boats
            faction.boats.forEach(boat => {
                if (boat.x >= bounds.minX - 1 && boat.x <= bounds.maxX + 1 &&
                    boat.y >= bounds.minY - 1 && boat.y <= bounds.maxY + 1) {
                    this.entityRenderer.drawBoat(ctx, boat, faction, cs);
                }
            });
        });

        ctx.restore();

        // Draw particles (screen space - uses camera internally)
        this.particles.draw(ctx, this.camera);

        // Draw minimap
        if (this.minimap) {
            this.minimap.draw(gameMap, factions, this.camera, this.canvas);
        }

        // Debug: villager count
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.font = '11px Inter, sans-serif';
        let total = 0;
        factions.forEach(f => total += f.villagers.filter(v => v.isAlive).length);
        ctx.fillText(`Pop: ${total}`, 10, this.canvas.height - 10);
    }

    drawTerritoryBorders(ctx, gameMap, factions, bounds, cs) {
        ctx.lineWidth = 1.5;
        for (let y = bounds.minY; y <= bounds.maxY; y++) {
            for (let x = bounds.minX; x <= bounds.maxX; x++) {
                const t = gameMap.territory[y][x];
                if (t < 0 || !factions[t]) continue;

                const faction = factions[t];
                const px = x * cs;
                const py = y * cs;

                ctx.strokeStyle = faction.lightColor + '88';

                // Check each neighbor
                if (y === 0 || gameMap.territory[y-1][x] !== t) {
                    ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + cs, py); ctx.stroke();
                }
                if (y === gameMap.height-1 || gameMap.territory[y+1][x] !== t) {
                    ctx.beginPath(); ctx.moveTo(px, py + cs); ctx.lineTo(px + cs, py + cs); ctx.stroke();
                }
                if (x === 0 || gameMap.territory[y][x-1] !== t) {
                    ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px, py + cs); ctx.stroke();
                }
                if (x === gameMap.width-1 || gameMap.territory[y][x+1] !== t) {
                    ctx.beginPath(); ctx.moveTo(px + cs, py); ctx.lineTo(px + cs, py + cs); ctx.stroke();
                }
            }
        }
    }
}
