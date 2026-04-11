import { CONFIG } from '../config.js';
import { FACTIONS } from '../data/factions.js';
import { BUILDING_CONFIG } from '../data/buildings.js';
import { TERRAIN } from '../enums.js';

export class Tooltips {
    constructor(game) {
        this.game = game;
        this.tooltipEl = document.getElementById('tooltip');
        this.canvas = document.getElementById('gameCanvas');

        // Mouse tracking state
        this._mouseX = 0;
        this._mouseY = 0;
        this._isOverCanvas = false;
        this._showDelay = 200; // ms before tooltip appears
        this._hoverStart = 0;
        this._lastTileX = -1;
        this._lastTileY = -1;
        this._visible = false;
    }

    init() {
        if (!this.canvas) return;

        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            this._mouseX = e.clientX - rect.left;
            this._mouseY = e.clientY - rect.top;
            this._isOverCanvas = true;
        });

        this.canvas.addEventListener('mouseleave', () => {
            this._isOverCanvas = false;
            this._hide();
        });

        // Create tooltip element if not in HTML
        if (!this.tooltipEl) {
            this.tooltipEl = document.createElement('div');
            this.tooltipEl.id = 'tooltip';
            document.body.appendChild(this.tooltipEl);
        }

        this._applyStyles();
    }

    update() {
        if (!this._isOverCanvas || !this.canvas || !this.game.renderer) {
            this._hide();
            return;
        }

        const camera = this.game.renderer.camera;
        if (!camera) return;

        // Convert screen coords to world tile coords
        const world = camera.screenToWorld(this._mouseX, this._mouseY);
        const tileX = Math.floor(world.x / CONFIG.cellSize);
        const tileY = Math.floor(world.y / CONFIG.cellSize);

        // Check if tile changed
        if (tileX !== this._lastTileX || tileY !== this._lastTileY) {
            this._lastTileX = tileX;
            this._lastTileY = tileY;
            this._hoverStart = performance.now();
            this._hide();
            return;
        }

        // Wait for hover delay
        if (performance.now() - this._hoverStart < this._showDelay) return;

        // Gather info about what is at this tile
        const content = this._buildTooltipContent(tileX, tileY, world.x, world.y);
        if (!content) {
            this._hide();
            return;
        }

        this._show(content);
    }

    // -------------------------------------------------------------------------
    // Content building
    // -------------------------------------------------------------------------

    _buildTooltipContent(tileX, tileY, worldX, worldY) {
        const map = this.game.map;
        if (!map) return null;
        if (tileX < 0 || tileX >= map.width || tileY < 0 || tileY >= map.height) return null;

        // Priority 1: Villager
        const villager = this._findVillagerAt(worldX, worldY);
        if (villager) return this._villagerTooltip(villager);

        // Priority 2: Building
        const building = this._findBuildingAt(tileX, tileY);
        if (building) return this._buildingTooltip(building);

        // Priority 3: Terrain resource
        const terrain = map.terrain[tileY][tileX];
        const resource = map.resources ? map.resources[tileY][tileX] : null;
        if (resource && resource.amount > 0) {
            return this._resourceTooltip(terrain, resource);
        }

        return null;
    }

    _findVillagerAt(worldX, worldY) {
        if (!this.game.factions) return null;
        const threshold = CONFIG.cellSize * 0.8; // detection radius in world units

        let closest = null;
        let closestDist = Infinity;

        for (const faction of this.game.factions) {
            if (!faction.villagers) continue;
            for (const v of faction.villagers) {
                if (!v.isAlive) continue;
                const vx = v.x * CONFIG.cellSize;
                const vy = v.y * CONFIG.cellSize;
                const dx = vx - worldX;
                const dy = vy - worldY;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < threshold && dist < closestDist) {
                    closestDist = dist;
                    closest = v;
                }
            }
        }
        return closest;
    }

    _findBuildingAt(tileX, tileY) {
        if (!this.game.factions) return null;
        for (const faction of this.game.factions) {
            if (!faction.buildings) continue;
            for (const b of faction.buildings) {
                if (b.x === tileX && b.y === tileY) return b;
            }
        }
        return null;
    }

    _villagerTooltip(v) {
        const f = FACTIONS[v.factionId] || FACTIONS[0];
        const hpPct = v.combatStats.maxHealth > 0
            ? Math.round((v.combatStats.health / v.combatStats.maxHealth) * 100)
            : 0;
        const hpColor = hpPct > 60 ? '#22c55e' : hpPct > 30 ? '#f59e0b' : '#ef4444';

        return `
            <div class="tt-header" style="color:${f.color};">${f.emoji} ${v.fullName}</div>
            <div class="tt-row">${v.getJobName()} &mdash; ${v.currentAge} ans</div>
            <div class="tt-bar-label">Sante ${hpPct}%</div>
            <div class="tt-bar"><div class="tt-bar-fill" style="width:${hpPct}%;background:${hpColor};"></div></div>
            <div class="tt-row tt-faction" style="color:${f.color};">${f.name}</div>
        `;
    }

    _buildingTooltip(b) {
        const cfg = BUILDING_CONFIG[b.type] || {};
        const f = FACTIONS[b.factionId] || FACTIONS[0];
        const maxHp = cfg.health || 100;
        const hp = b.health !== undefined ? b.health : maxHp;
        const hpPct = Math.round((hp / maxHp) * 100);
        const hpColor = hpPct > 60 ? '#22c55e' : hpPct > 30 ? '#f59e0b' : '#ef4444';
        const workers = this._countWorkersNear(b, 3);

        return `
            <div class="tt-header" style="color:${f.color};">${cfg.icon || '?'} ${cfg.name || 'Batiment'}</div>
            <div class="tt-row" style="color:${f.color};">${f.name}</div>
            <div class="tt-bar-label">Sante ${hpPct}%</div>
            <div class="tt-bar"><div class="tt-bar-fill" style="width:${hpPct}%;background:${hpColor};"></div></div>
            <div class="tt-row">Travailleurs: ${workers}</div>
        `;
    }

    _resourceTooltip(terrain, resource) {
        const terrainNames = {
            [TERRAIN.FOREST]: { name: 'Foret', icon: '\uD83C\uDF32' },
            [TERRAIN.STONE]: { name: 'Pierre', icon: '\uD83E\uDEA8' },
            [TERRAIN.IRON]: { name: 'Fer', icon: '\u2699\uFE0F' },
            [TERRAIN.GOLD]: { name: 'Or', icon: '\uD83E\uDE99' },
            [TERRAIN.BERRIES]: { name: 'Baies', icon: '\uD83C\uDF53' }
        };

        const info = terrainNames[terrain];
        if (!info) return null;

        const amount = Math.floor(resource.amount);
        return `
            <div class="tt-header">${info.icon} ${info.name}</div>
            <div class="tt-row">Restant: ${amount}</div>
        `;
    }

    _countWorkersNear(building, radius) {
        let count = 0;
        if (!this.game.factions) return 0;
        for (const faction of this.game.factions) {
            if (!faction.villagers) continue;
            for (const v of faction.villagers) {
                if (!v.isAlive) continue;
                const dx = v.x - building.x;
                const dy = v.y - building.y;
                if (Math.sqrt(dx * dx + dy * dy) <= radius) count++;
            }
        }
        return count;
    }

    // -------------------------------------------------------------------------
    // Show / Hide / Position
    // -------------------------------------------------------------------------

    _show(htmlContent) {
        if (!this.tooltipEl) return;
        this.tooltipEl.innerHTML = htmlContent;
        this.tooltipEl.style.display = 'block';
        this._visible = true;
        this._position();
    }

    _hide() {
        if (!this.tooltipEl || !this._visible) return;
        this.tooltipEl.style.display = 'none';
        this._visible = false;
    }

    _position() {
        if (!this.tooltipEl || !this.canvas) return;

        const canvasRect = this.canvas.getBoundingClientRect();
        const ttRect = this.tooltipEl.getBoundingClientRect();
        const offset = 14;

        let left = canvasRect.left + this._mouseX + offset;
        let top = canvasRect.top + this._mouseY + offset;

        // Keep within viewport
        const vw = window.innerWidth;
        const vh = window.innerHeight;

        if (left + ttRect.width > vw - 8) {
            left = canvasRect.left + this._mouseX - ttRect.width - offset;
        }
        if (top + ttRect.height > vh - 8) {
            top = canvasRect.top + this._mouseY - ttRect.height - offset;
        }

        left = Math.max(4, left);
        top = Math.max(4, top);

        this.tooltipEl.style.left = `${left}px`;
        this.tooltipEl.style.top = `${top}px`;
    }

    // -------------------------------------------------------------------------
    // Styles
    // -------------------------------------------------------------------------

    _applyStyles() {
        if (document.getElementById('tooltipStyles')) return;

        const style = document.createElement('style');
        style.id = 'tooltipStyles';
        style.textContent = `
            #tooltip {
                position: fixed;
                display: none;
                pointer-events: none;
                z-index: 1000;
                min-width: 140px;
                max-width: 260px;
                padding: 8px 12px;
                background: rgba(15, 23, 42, 0.92);
                backdrop-filter: blur(14px);
                border: 1px solid rgba(148, 163, 184, 0.2);
                border-radius: 8px;
                font-family: 'Segoe UI', system-ui, sans-serif;
                font-size: 12px;
                color: #e2e8f0;
                box-shadow: 0 4px 16px rgba(0,0,0,0.35);
            }
            .tt-header {
                font-weight: 600;
                font-size: 13px;
                margin-bottom: 4px;
            }
            .tt-row {
                color: #94a3b8;
                margin: 2px 0;
            }
            .tt-faction {
                font-size: 11px;
                margin-top: 4px;
            }
            .tt-bar-label {
                color: #64748b;
                font-size: 10px;
                margin-top: 3px;
            }
            .tt-bar {
                width: 100%;
                height: 4px;
                background: rgba(148, 163, 184, 0.15);
                border-radius: 2px;
                overflow: hidden;
                margin: 2px 0;
            }
            .tt-bar-fill {
                height: 100%;
                border-radius: 2px;
                transition: width 0.2s;
            }
        `;
        document.head.appendChild(style);
    }
}
