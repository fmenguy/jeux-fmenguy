import { CONFIG } from '../config.js';
import { eventBus } from '../event-bus.js';
import { BUILDING_CONFIG } from '../data/buildings.js';
import { FACTIONS } from '../data/factions.js';
import { TECH_TREE } from '../data/tech-tree.js';
import { JOB } from '../enums.js';

export class Modals {
    constructor(game) {
        this.game = game;
        this.detailModal = document.getElementById('detailModal');
        this.techModal = document.getElementById('techModal');
        this.statsModal = document.getElementById('statsModal');
        this.overlay = document.getElementById('modalOverlay');
        this._activeModal = null;
    }

    init() {
        // Close on overlay click
        if (this.overlay) {
            this.overlay.addEventListener('click', () => this.closeAll());
        }

        // Close buttons inside modals
        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', () => this.closeAll());
        });

        // Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.closeAll();
        });

        // Event bus hooks for convenience
        eventBus.on('show-villager', (v) => this.showVillagerDetail(v));
        eventBus.on('show-building', (b) => this.showBuildingDetail(b));
        eventBus.on('show-tech-tree', () => this.showTechTree(this.game.factions));
        eventBus.on('show-stats', () => this.showStats(this.game));
    }

    // -------------------------------------------------------------------------
    // Villager Detail
    // -------------------------------------------------------------------------
    showVillagerDetail(villager) {
        if (!this.detailModal) return;
        const f = FACTIONS[villager.factionId] || FACTIONS[0];
        const color = f.color;

        const skillNames = {
            farming: 'Agriculture',
            building: 'Construction',
            combat: 'Combat',
            crafting: 'Artisanat',
            gathering: 'Collecte',
            archery: 'Archerie',
            research: 'Recherche'
        };

        const skillsHtml = Object.entries(villager.skills).map(([key, val]) => {
            const pct = Math.min(100, val);
            const barColor = pct >= 70 ? '#22c55e' : pct >= 40 ? '#f59e0b' : '#ef4444';
            return `<div class="skill-row">
                <span class="skill-name">${skillNames[key] || key}</span>
                <span class="skill-value">${Math.floor(val)}</span>
                <div class="progress-bar small">
                    <div class="progress-fill" style="width:${pct}%;background:${barColor};"></div>
                </div>
            </div>`;
        }).join('');

        const hpPct = villager.combatStats.maxHealth > 0
            ? (villager.combatStats.health / villager.combatStats.maxHealth) * 100
            : 0;
        const hpColor = hpPct > 60 ? '#22c55e' : hpPct > 30 ? '#f59e0b' : '#ef4444';

        // Family
        const familyParts = [];
        if (villager.parent1) familyParts.push(`Parent: ${villager.parent1.fullName}`);
        if (villager.parent2) familyParts.push(`Parent: ${villager.parent2.fullName}`);
        if (villager.spouse) familyParts.push(`Conjoint(e): ${villager.spouse.fullName}`);
        if (villager.children && villager.children.length > 0) {
            familyParts.push(`Enfants: ${villager.children.map(c => c.firstName).join(', ')}`);
        }
        const familyHtml = familyParts.length > 0
            ? familyParts.map(p => `<div class="family-line">${p}</div>`).join('')
            : '<div class="panel-muted">Aucune famille connue</div>';

        // Task description
        const taskLabel = villager.currentTask || 'Repos';

        // Job reassignment dropdown
        const jobOptions = Object.entries(JOB).map(([key, val]) => {
            const selected = villager.job === val ? 'selected' : '';
            return `<option value="${val}" ${selected}>${key.charAt(0) + key.slice(1).toLowerCase()}</option>`;
        }).join('');

        this.detailModal.innerHTML = `
            <div class="modal-header" style="border-color:${color};">
                <span class="modal-title">${f.emoji} ${villager.fullName}</span>
                <button class="modal-close">&times;</button>
            </div>
            <div class="modal-body">
                <div class="detail-grid">
                    <div class="detail-item"><span class="detail-label">Faction</span><span class="detail-value" style="color:${color};">${f.name}</span></div>
                    <div class="detail-item"><span class="detail-label">Age</span><span class="detail-value">${villager.currentAge} ans</span></div>
                    <div class="detail-item"><span class="detail-label">Genre</span><span class="detail-value">${villager.gender === 'male' ? 'Homme' : 'Femme'}</span></div>
                    <div class="detail-item"><span class="detail-label">Metier</span><span class="detail-value">${villager.getJobName()}</span></div>
                </div>

                <div class="detail-section">
                    <div class="detail-section-title">Competences</div>
                    ${skillsHtml}
                </div>

                <div class="detail-section">
                    <div class="detail-section-title">Sante</div>
                    <div class="panel-value">${Math.floor(villager.combatStats.health)} / ${villager.combatStats.maxHealth}</div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width:${hpPct}%;background:${hpColor};"></div>
                    </div>
                    <div class="detail-item" style="margin-top:6px;">
                        <span class="detail-label">Puissance</span>
                        <span class="detail-value">${Math.floor(villager.combatStats.attack + villager.combatStats.defense)}</span>
                    </div>
                </div>

                <div class="detail-section">
                    <div class="detail-section-title">Famille</div>
                    ${familyHtml}
                </div>

                <div class="detail-section">
                    <div class="detail-section-title">Tache actuelle</div>
                    <div class="panel-value">${taskLabel}</div>
                </div>

                <div class="detail-section">
                    <div class="detail-section-title">Reassigner le metier</div>
                    <select class="job-select" id="jobReassign">${jobOptions}</select>
                    <button class="btn-small" id="btnReassignJob">Appliquer</button>
                </div>
            </div>
        `;

        // Bind reassign button
        const reassignBtn = this.detailModal.querySelector('#btnReassignJob');
        const jobSelect = this.detailModal.querySelector('#jobReassign');
        if (reassignBtn && jobSelect) {
            reassignBtn.addEventListener('click', () => {
                villager.job = jobSelect.value;
                villager.currentTask = null;
                villager.taskTarget = null;
                this.showVillagerDetail(villager); // refresh
            });
        }

        // Bind close inside modal
        this.detailModal.querySelector('.modal-close')?.addEventListener('click', () => this.closeAll());

        this._openModal(this.detailModal);
    }

    // -------------------------------------------------------------------------
    // Building Detail
    // -------------------------------------------------------------------------
    showBuildingDetail(building) {
        if (!this.detailModal) return;
        const cfg = BUILDING_CONFIG[building.type] || {};
        const f = FACTIONS[building.factionId] || FACTIONS[0];
        const color = f.color;

        const hpPct = cfg.health > 0 ? Math.min(100, ((building.health || cfg.health) / cfg.health) * 100) : 100;
        const hpColor = hpPct > 60 ? '#22c55e' : hpPct > 30 ? '#f59e0b' : '#ef4444';

        // Workers assigned (count villagers near building)
        const workers = this._countWorkersNear(building, 3);

        // Production output
        const productions = [];
        if (cfg.foodProduction) productions.push(`Nourriture: +${cfg.foodProduction}/tick`);
        if (cfg.ironProduction) productions.push(`Fer: +${cfg.ironProduction}/tick`);
        if (cfg.woodBonus) productions.push(`Bois: x${cfg.woodBonus}`);
        if (cfg.miningBonus) productions.push(`Extraction: x${cfg.miningBonus}`);
        if (cfg.goldBonus) productions.push(`Or: x${cfg.goldBonus}`);
        if (cfg.popBonus) productions.push(`Population: +${cfg.popBonus}`);
        if (cfg.foodStorage) productions.push(`Stockage nourriture: +${cfg.foodStorage}`);
        const prodHtml = productions.length > 0
            ? productions.map(p => `<div class="prod-line">${p}</div>`).join('')
            : '<div class="panel-muted">Aucune production</div>';

        this.detailModal.innerHTML = `
            <div class="modal-header" style="border-color:${color};">
                <span class="modal-title">${cfg.icon || '?'} ${cfg.name || 'Batiment'}</span>
                <button class="modal-close">&times;</button>
            </div>
            <div class="modal-body">
                <div class="detail-grid">
                    <div class="detail-item"><span class="detail-label">Faction</span><span class="detail-value" style="color:${color};">${f.name}</span></div>
                    <div class="detail-item"><span class="detail-label">Position</span><span class="detail-value">(${building.x}, ${building.y})</span></div>
                </div>

                <div class="detail-section">
                    <div class="detail-section-title">Sante</div>
                    <div class="panel-value">${Math.floor(building.health || cfg.health)} / ${cfg.health}</div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width:${hpPct}%;background:${hpColor};"></div>
                    </div>
                </div>

                <div class="detail-section">
                    <div class="detail-section-title">Travailleurs a proximite</div>
                    <div class="panel-value">${workers}</div>
                </div>

                <div class="detail-section">
                    <div class="detail-section-title">Production</div>
                    ${prodHtml}
                </div>

                <div class="detail-section">
                    <div class="detail-section-title">Description</div>
                    <div class="panel-value">${cfg.description || ''}</div>
                </div>
            </div>
        `;

        this.detailModal.querySelector('.modal-close')?.addEventListener('click', () => this.closeAll());
        this._openModal(this.detailModal);
    }

    // -------------------------------------------------------------------------
    // Tech Tree
    // -------------------------------------------------------------------------
    showTechTree(factions) {
        if (!this.techModal) return;
        if (!factions || factions.length < 2) return;

        const columns = factions.map((faction, idx) => {
            const f = FACTIONS[idx] || FACTIONS[0];
            const color = f.color;

            let categoriesHtml = '';
            for (const [catKey, category] of Object.entries(TECH_TREE)) {
                const techRows = category.techs.map(tech => {
                    const status = this._getTechStatus(faction, tech);
                    const statusClass = `tech-${status.state}`;
                    const progressHtml = status.state === 'researching'
                        ? `<div class="progress-bar small">
                               <div class="progress-fill" style="width:${status.pct}%;background:${color};"></div>
                           </div>`
                        : '';

                    return `<div class="tech-card ${statusClass}">
                        <div class="tech-header">
                            <span class="tech-icon">${tech.icon}</span>
                            <span class="tech-name">${tech.name}</span>
                            <span class="tech-status-badge">${status.label}</span>
                        </div>
                        <div class="tech-desc">${tech.description}</div>
                        <div class="tech-cost">Cout: ${tech.cost} recherche</div>
                        ${progressHtml}
                    </div>`;
                }).join('');

                categoriesHtml += `
                    <div class="tech-category">
                        <div class="tech-category-title">${category.icon} ${category.name}</div>
                        ${techRows}
                    </div>`;
            }

            return `<div class="tech-column">
                <div class="tech-column-header" style="color:${color};border-color:${color};">${f.emoji} ${f.name}</div>
                ${categoriesHtml}
            </div>`;
        }).join('');

        this.techModal.innerHTML = `
            <div class="modal-header">
                <span class="modal-title">Arbre technologique</span>
                <button class="modal-close">&times;</button>
            </div>
            <div class="modal-body tech-tree-body">
                <div class="tech-columns">${columns}</div>
            </div>
        `;

        this.techModal.querySelector('.modal-close')?.addEventListener('click', () => this.closeAll());
        this._openModal(this.techModal);
    }

    // -------------------------------------------------------------------------
    // Stats
    // -------------------------------------------------------------------------
    showStats(game) {
        if (!this.statsModal) return;

        const factions = game.factions || [];
        const statCards = [];

        for (let i = 0; i < factions.length; i++) {
            const faction = factions[i];
            const f = FACTIONS[i] || FACTIONS[0];
            const alive = faction.villagers ? faction.villagers.filter(v => v.isAlive).length : 0;
            const soldiers = faction.villagers ? faction.villagers.filter(v => v.isAlive && v.job === 'warrior').length : 0;
            const buildings = faction.buildings ? faction.buildings.length : 0;
            const territory = this._countTerritory(game, faction.id);

            statCards.push(`
                <div class="stat-card" style="border-color:${f.color};">
                    <div class="stat-card-title" style="color:${f.color};">${f.emoji} ${f.name}</div>
                    <div class="stat-row"><span>Population</span><span>${alive}</span></div>
                    <div class="stat-row"><span>Soldats</span><span>${soldiers}</span></div>
                    <div class="stat-row"><span>Batiments</span><span>${buildings}</span></div>
                    <div class="stat-row"><span>Territoire</span><span>${territory} cases</span></div>
                    <div class="stat-row"><span>Nourriture</span><span>${Math.floor(faction.resources?.food || 0)}</span></div>
                    <div class="stat-row"><span>Bois</span><span>${Math.floor(faction.resources?.wood || 0)}</span></div>
                    <div class="stat-row"><span>Pierre</span><span>${Math.floor(faction.resources?.stone || 0)}</span></div>
                    <div class="stat-row"><span>Fer</span><span>${Math.floor(faction.resources?.iron || 0)}</span></div>
                    <div class="stat-row"><span>Or</span><span>${Math.floor(faction.resources?.gold || 0)}</span></div>
                </div>
            `);
        }

        // Canvas for graphs (rendered by StatsDashboard)
        this.statsModal.innerHTML = `
            <div class="modal-header">
                <span class="modal-title">Statistiques</span>
                <button class="modal-close">&times;</button>
            </div>
            <div class="modal-body">
                <div class="stats-grid">${statCards.join('')}</div>
                <div id="statsGraphContainer" class="stats-graphs"></div>
            </div>
        `;

        this.statsModal.querySelector('.modal-close')?.addEventListener('click', () => this.closeAll());
        this._openModal(this.statsModal);

        // Delegate graph rendering to StatsDashboard if available
        const graphContainer = document.getElementById('statsGraphContainer');
        if (graphContainer && game._uiManager && game._uiManager.stats) {
            game._uiManager.stats.renderStats(graphContainer);
        }
    }

    // -------------------------------------------------------------------------
    // Close All
    // -------------------------------------------------------------------------
    closeAll() {
        [this.detailModal, this.techModal, this.statsModal].forEach(m => {
            if (m) {
                m.classList.remove('modal-open');
                m.style.display = 'none';
            }
        });
        if (this.overlay) {
            this.overlay.classList.remove('visible');
            this.overlay.style.display = 'none';
        }
        this._activeModal = null;
    }

    // -------------------------------------------------------------------------
    // Internals
    // -------------------------------------------------------------------------

    _openModal(modal) {
        this.closeAll();
        if (this.overlay) {
            this.overlay.style.display = 'block';
            this.overlay.classList.add('visible');
        }
        modal.style.display = 'block';
        modal.classList.add('modal-open');
        this._activeModal = modal;
    }

    _getTechStatus(faction, tech) {
        // Check completed
        if (faction.completedTechs && faction.completedTechs.includes(tech.id)) {
            return { state: 'done', label: 'Termine', pct: 100 };
        }
        // Check currently researching
        if (faction.currentResearch && faction.currentResearch.id === tech.id) {
            const pct = faction.currentResearch.duration > 0
                ? Math.min(100, ((faction.currentResearch.progress || 0) / faction.currentResearch.duration) * 100)
                : 0;
            return { state: 'researching', label: 'En cours', pct };
        }
        // Check prerequisites
        if (tech.prerequisites && tech.prerequisites.length > 0) {
            const allMet = tech.prerequisites.every(
                prereq => faction.completedTechs && faction.completedTechs.includes(prereq)
            );
            if (!allMet) return { state: 'locked', label: 'Verrouille', pct: 0 };
        }
        return { state: 'available', label: 'Disponible', pct: 0 };
    }

    _countWorkersNear(building, radius) {
        if (!this.game.factions) return 0;
        let count = 0;
        this.game.factions.forEach(faction => {
            if (!faction.villagers) return;
            faction.villagers.forEach(v => {
                if (!v.isAlive) return;
                const dx = v.x - building.x;
                const dy = v.y - building.y;
                if (Math.sqrt(dx * dx + dy * dy) <= radius) count++;
            });
        });
        return count;
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
}
