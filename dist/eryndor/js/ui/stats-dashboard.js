import { CONFIG } from '../config.js';
import { FACTIONS } from '../data/factions.js';

export class StatsDashboard {
    constructor(game) {
        this.game = game;
        this.history = [];
        this.maxHistory = 500;
        this._lastSnapshotTick = 0;
        this._snapshotInterval = 60; // ticks between snapshots
    }

    /**
     * Record a data snapshot. Should be called every tick; internally
     * throttled to one snapshot per _snapshotInterval ticks.
     */
    recordSnapshot(game) {
        const tick = CONFIG.currentTick;
        if (tick - this._lastSnapshotTick < this._snapshotInterval) return;
        this._lastSnapshotTick = tick;

        const factions = game.factions || [];
        const snapshot = {
            tick,
            factions: factions.map((faction, idx) => {
                const alive = faction.villagers ? faction.villagers.filter(v => v.isAlive) : [];
                return {
                    pop: alive.length,
                    food: Math.floor(faction.resources?.food || 0),
                    wood: Math.floor(faction.resources?.wood || 0),
                    stone: Math.floor(faction.resources?.stone || 0),
                    iron: Math.floor(faction.resources?.iron || 0),
                    gold: Math.floor(faction.resources?.gold || 0),
                    military: this._militaryPower(alive),
                    territory: this._countTerritory(game, faction.id)
                };
            })
        };

        this.history.push(snapshot);
        if (this.history.length > this.maxHistory) {
            this.history.shift();
        }
    }

    /**
     * Render all stat graphs into the given container element.
     */
    renderStats(container) {
        if (!container) return;
        container.innerHTML = '';

        if (this.history.length < 2) {
            container.innerHTML = '<div style="color:#64748b;padding:16px;">Pas assez de donnees. Attendez quelques instants...</div>';
            return;
        }

        // Population line chart
        this._renderLineChart(container, 'Population', (snap, fi) => snap.factions[fi]?.pop || 0);

        // Resources bar comparison (latest snapshot)
        this._renderBarComparison(container, 'Ressources', ['food', 'wood', 'stone', 'iron', 'gold'],
            ['Nourriture', 'Bois', 'Pierre', 'Fer', 'Or']);

        // Military power bar comparison
        this._renderBarComparison(container, 'Puissance militaire', ['military'], ['Force']);

        // Territory bar comparison
        this._renderBarComparison(container, 'Territoire', ['territory'], ['Cases']);
    }

    // -------------------------------------------------------------------------
    // Line chart: one line per faction over time
    // -------------------------------------------------------------------------
    _renderLineChart(container, title, valueFn) {
        const wrapper = document.createElement('div');
        wrapper.className = 'stats-chart-wrapper';

        const label = document.createElement('div');
        label.className = 'stats-chart-title';
        label.textContent = title;
        wrapper.appendChild(label);

        const canvas = document.createElement('canvas');
        canvas.width = 540;
        canvas.height = 160;
        canvas.style.width = '100%';
        canvas.style.maxWidth = '540px';
        canvas.style.height = 'auto';
        canvas.style.borderRadius = '8px';
        canvas.style.background = 'rgba(15, 23, 42, 0.5)';
        wrapper.appendChild(canvas);
        container.appendChild(wrapper);

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const w = canvas.width;
        const h = canvas.height;
        const pad = { top: 10, right: 10, bottom: 20, left: 45 };
        const plotW = w - pad.left - pad.right;
        const plotH = h - pad.top - pad.bottom;

        const numFactions = FACTIONS.length;
        const dataLen = this.history.length;

        // Find max value across all factions for scaling
        let maxVal = 1;
        for (const snap of this.history) {
            for (let fi = 0; fi < numFactions; fi++) {
                const val = valueFn(snap, fi);
                if (val > maxVal) maxVal = val;
            }
        }
        maxVal = Math.ceil(maxVal * 1.1); // 10% headroom

        // Grid lines
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.1)';
        ctx.lineWidth = 1;
        const gridLines = 4;
        for (let i = 0; i <= gridLines; i++) {
            const y = pad.top + (plotH / gridLines) * i;
            ctx.beginPath();
            ctx.moveTo(pad.left, y);
            ctx.lineTo(w - pad.right, y);
            ctx.stroke();

            // Y-axis labels
            const val = Math.round(maxVal * (1 - i / gridLines));
            ctx.fillStyle = '#64748b';
            ctx.font = '10px sans-serif';
            ctx.textAlign = 'right';
            ctx.fillText(val.toString(), pad.left - 5, y + 3);
        }

        // Draw lines for each faction
        for (let fi = 0; fi < numFactions; fi++) {
            ctx.beginPath();
            ctx.strokeStyle = FACTIONS[fi].color;
            ctx.lineWidth = 2;

            for (let i = 0; i < dataLen; i++) {
                const x = pad.left + (i / Math.max(1, dataLen - 1)) * plotW;
                const val = valueFn(this.history[i], fi);
                const y = pad.top + plotH - (val / maxVal) * plotH;

                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.stroke();
        }

        // X-axis: first and last tick labels
        ctx.fillStyle = '#64748b';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'left';
        const firstTick = this.history[0].tick;
        const lastTick = this.history[dataLen - 1].tick;
        ctx.fillText(this._tickToYear(firstTick), pad.left, h - 4);
        ctx.textAlign = 'right';
        ctx.fillText(this._tickToYear(lastTick), w - pad.right, h - 4);
    }

    // -------------------------------------------------------------------------
    // Bar comparison: latest snapshot side-by-side
    // -------------------------------------------------------------------------
    _renderBarComparison(container, title, keys, labels) {
        const wrapper = document.createElement('div');
        wrapper.className = 'stats-chart-wrapper';

        const titleEl = document.createElement('div');
        titleEl.className = 'stats-chart-title';
        titleEl.textContent = title;
        wrapper.appendChild(titleEl);

        const canvas = document.createElement('canvas');
        canvas.width = 540;
        canvas.height = 120;
        canvas.style.width = '100%';
        canvas.style.maxWidth = '540px';
        canvas.style.height = 'auto';
        canvas.style.borderRadius = '8px';
        canvas.style.background = 'rgba(15, 23, 42, 0.5)';
        wrapper.appendChild(canvas);
        container.appendChild(wrapper);

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const latest = this.history[this.history.length - 1];
        if (!latest) return;

        const w = canvas.width;
        const h = canvas.height;
        const pad = { top: 10, right: 10, bottom: 25, left: 10 };
        const plotW = w - pad.left - pad.right;
        const plotH = h - pad.top - pad.bottom;

        const numGroups = keys.length;
        const numFactions = FACTIONS.length;
        const groupWidth = plotW / numGroups;
        const barWidth = Math.min(30, (groupWidth / (numFactions + 1)) * 0.8);
        const barGap = barWidth * 0.3;

        // Find max for scaling
        let maxVal = 1;
        for (const key of keys) {
            for (let fi = 0; fi < numFactions; fi++) {
                const val = latest.factions[fi]?.[key] || 0;
                if (val > maxVal) maxVal = val;
            }
        }
        maxVal = Math.ceil(maxVal * 1.15);

        // Draw bars
        for (let gi = 0; gi < numGroups; gi++) {
            const key = keys[gi];
            const groupX = pad.left + gi * groupWidth + groupWidth / 2;

            for (let fi = 0; fi < numFactions; fi++) {
                const val = latest.factions[fi]?.[key] || 0;
                const barH = (val / maxVal) * plotH;
                const x = groupX + (fi - numFactions / 2) * (barWidth + barGap);
                const y = pad.top + plotH - barH;

                ctx.fillStyle = FACTIONS[fi].color;
                ctx.beginPath();
                // Rounded top corners
                const r = Math.min(3, barWidth / 2);
                ctx.moveTo(x, y + r);
                ctx.arcTo(x, y, x + barWidth, y, r);
                ctx.arcTo(x + barWidth, y, x + barWidth, y + barH, r);
                ctx.lineTo(x + barWidth, pad.top + plotH);
                ctx.lineTo(x, pad.top + plotH);
                ctx.closePath();
                ctx.fill();

                // Value on top of bar
                ctx.fillStyle = '#e2e8f0';
                ctx.font = '9px sans-serif';
                ctx.textAlign = 'center';
                if (barH > 15) {
                    ctx.fillText(Math.floor(val).toString(), x + barWidth / 2, y - 3);
                }
            }

            // Group label
            ctx.fillStyle = '#94a3b8';
            ctx.font = '10px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(labels[gi], groupX, h - 5);
        }
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    _militaryPower(aliveVillagers) {
        let power = 0;
        for (const v of aliveVillagers) {
            if (v.job === 'warrior' || v.unitType > 0) {
                power += v.combatStats.attack + v.combatStats.defense;
            }
        }
        return power;
    }

    _countTerritory(game, factionId) {
        if (!game.map || !game.map.territory) return 0;
        let count = 0;
        for (let y = 0; y < game.map.height; y++) {
            for (let x = 0; x < game.map.width; x++) {
                if (game.map.territory[y][x] === factionId) count++;
            }
        }
        return count;
    }

    _tickToYear(tick) {
        const year = Math.floor(tick / CONFIG.ticksPerYear) + 1;
        return `An ${year}`;
    }
}
