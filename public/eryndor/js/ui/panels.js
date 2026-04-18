import { CONFIG } from '../config.js';
import { BUILDING } from '../enums.js';
import { BUILDING_CONFIG } from '../data/buildings.js';
import { FACTIONS } from '../data/factions.js';

export class Panels {
    constructor(game) {
        this.game = game;
        this.leftPanel = document.getElementById('humanInfo');
        this.rightPanel = document.getElementById('elfInfo');
        this._lastUpdate = 0;
        this._updateInterval = 250; // ms between DOM refreshes
    }

    update() {
        const now = performance.now();
        if (now - this._lastUpdate < this._updateInterval) return;
        this._lastUpdate = now;

        const factions = this.game.factions;
        if (!factions || factions.length < 2) return;

        if (this.leftPanel) {
            this.leftPanel.innerHTML = this._renderFactionPanel(factions[0], FACTIONS[0]);
        }
        if (this.rightPanel) {
            this.rightPanel.innerHTML = this._renderFactionPanel(factions[1], FACTIONS[1]);
        }
    }

    _renderFactionPanel(faction, factionConfig) {
        const alive = faction.villagers ? faction.villagers.filter(v => v.isAlive) : [];
        const pop = alive.length;
        const housingCap = this._getHousingCap(faction);
        const popPct = housingCap > 0 ? Math.min(100, (pop / housingCap) * 100) : 0;
        const soldiers = alive.filter(v => v.job === 'warrior');
        const militaryStrength = this._getMilitaryStrength(alive);
        const currentActivity = this._getCurrentActivity(faction);
        const techInfo = this._getTechInfo(faction);
        const diplomacy = this._getDiplomacyInfo(faction);
        const color = factionConfig.color;
        const darkColor = factionConfig.darkColor;

        return `
            <div class="panel-header" style="border-bottom: 1px solid ${color}40;">
                <span class="panel-title">${factionConfig.emoji} ${factionConfig.name}</span>
            </div>

            <div class="panel-section">
                <div class="panel-label">Population</div>
                <div class="panel-value">${this._fmt(pop)} / ${this._fmt(housingCap)}</div>
                ${this._progressBar(popPct, color)}
            </div>

            <div class="panel-section">
                <div class="panel-label">Ressources</div>
                ${this._resourceRow('🍖', 'Nourriture', faction.resources.food, 500, faction)}
                ${this._resourceRow('🪵', 'Bois', faction.resources.wood, 300, faction)}
                ${this._resourceRow('🪨', 'Pierre', faction.resources.stone, 200, faction)}
                ${this._resourceRow('⚙️', 'Fer', faction.resources.iron, 150, faction)}
                ${this._resourceRow('🪙', 'Or', faction.resources.gold, 100, faction)}
            </div>

            <div class="panel-section">
                <div class="panel-label">Batiments</div>
                <div class="building-list">${this._buildingList(faction)}</div>
            </div>

            <div class="panel-section">
                <div class="panel-label">Militaire</div>
                <div class="panel-value">${soldiers.length} / ${pop} soldats &mdash; Force: ${this._fmt(Math.round(militaryStrength))}</div>
            </div>

            <div class="panel-section">
                <div class="panel-label">Activite</div>
                <div class="panel-value activity">${currentActivity}</div>
            </div>

            <div class="panel-section">
                <div class="panel-label">Recherche</div>
                ${techInfo.html}
            </div>

            <div class="panel-section">
                <div class="panel-label">Diplomatie</div>
                <div class="panel-value">${diplomacy.status}</div>
                ${this._progressBar(diplomacy.relationPct, diplomacy.color)}
            </div>
        `;
    }

    // --- Helpers ---

    _fmt(n) {
        if (n === undefined || n === null) return '0';
        if (typeof n === 'number' && !Number.isInteger(n)) n = Math.floor(n);
        return n.toLocaleString('fr-FR');
    }

    _progressBar(pct, color) {
        const clamped = Math.max(0, Math.min(100, pct));
        return `<div class="progress-bar">
            <div class="progress-fill" style="width:${clamped}%;background:${color};"></div>
        </div>`;
    }

    _resourceColorForLevel(amount, threshold) {
        const ratio = amount / threshold;
        if (ratio < 0.15) return '#ef4444'; // red - critical
        if (ratio < 0.35) return '#f59e0b'; // yellow - low
        return '#22c55e'; // green - ok
    }

    _resourceRow(icon, label, amount, threshold) {
        const val = Math.floor(amount || 0);
        const pct = Math.min(100, (val / threshold) * 100);
        const barColor = this._resourceColorForLevel(val, threshold);
        return `<div class="resource-row">
            <span class="resource-icon">${icon}</span>
            <span class="resource-label">${label}</span>
            <span class="resource-value">${this._fmt(val)}</span>
            <div class="resource-bar">
                <div class="resource-bar-fill" style="width:${pct}%;background:${barColor};"></div>
            </div>
        </div>`;
    }

    _getHousingCap(faction) {
        let cap = 10; // base capacity
        if (faction.buildings) {
            faction.buildings.forEach(b => {
                const cfg = BUILDING_CONFIG[b.type];
                if (cfg && cfg.popBonus) cap += cfg.popBonus;
            });
        }
        return cap;
    }

    _buildingList(faction) {
        if (!faction.buildings || faction.buildings.length === 0) {
            return '<span class="panel-muted">Aucun</span>';
        }
        const counts = {};
        faction.buildings.forEach(b => {
            const cfg = BUILDING_CONFIG[b.type];
            const name = cfg ? cfg.name : 'Inconnu';
            const icon = cfg ? cfg.icon : '?';
            const key = `${icon} ${name}`;
            counts[key] = (counts[key] || 0) + 1;
        });
        return Object.entries(counts)
            .map(([name, count]) => `<span class="building-tag">${name} x${count}</span>`)
            .join(' ');
    }

    _getMilitaryStrength(aliveVillagers) {
        let strength = 0;
        aliveVillagers.forEach(v => {
            if (v.job === 'warrior' || v.unitType > 0) {
                strength += v.combatStats.attack + v.combatStats.defense;
            }
        });
        return strength;
    }

    _getCurrentActivity(faction) {
        if (!faction.priorities) return 'Automatique';
        const p = faction.priorities;
        // Pick the highest priority
        let best = 'Equilibre';
        let bestVal = 0;
        const labels = {
            food: 'Collecte nourriture',
            wood: 'Collecte bois',
            stone: 'Collecte pierre',
            military: 'Expansion militaire',
            building: 'Construction',
            research: 'Recherche',
            expansion: 'Expansion territoriale'
        };
        for (const [key, val] of Object.entries(p)) {
            if (val > bestVal && labels[key]) {
                bestVal = val;
                best = labels[key];
            }
        }
        return best;
    }

    _getTechInfo(faction) {
        if (faction.currentResearch) {
            const r = faction.currentResearch;
            const pct = r.duration > 0 ? Math.min(100, ((r.progress || 0) / r.duration) * 100) : 0;
            const color = FACTIONS[faction.id] ? FACTIONS[faction.id].color : '#888';
            return {
                html: `<div class="panel-value">${r.icon || '🔬'} ${r.name}</div>
                       ${this._progressBar(pct, color)}`
            };
        }
        return { html: '<div class="panel-value panel-muted">Inactif</div>' };
    }

    _getDiplomacyInfo(faction) {
        const otherFactionId = faction.id === 0 ? 1 : 0;
        let status = 'Paix';
        let relationScore = 50;
        let color = '#22c55e';

        if (faction.diplomacy) {
            const rel = faction.diplomacy[otherFactionId];
            if (rel) {
                relationScore = typeof rel.score === 'number' ? rel.score : 50;
                if (rel.status === 'war' || rel.status === 'hostile') {
                    status = 'Guerre';
                    color = '#ef4444';
                } else if (rel.status === 'friendly' || rel.status === 'allied') {
                    status = 'Paix';
                    color = '#22c55e';
                } else {
                    status = 'Neutre';
                    color = '#f59e0b';
                }
            }
        }

        return {
            status,
            relationPct: Math.max(0, Math.min(100, relationScore)),
            color
        };
    }
}
