/**
 * Eryndor v2 - L'Aube des Royaumes
 * Point d'entrée principal
 */

import { CONFIG } from './config.js';
import { eventBus } from './event-bus.js';
import { Game } from './core/game.js';
import { Renderer } from './rendering/renderer.js';

// Dynamic imports for systems that might not exist yet
let UIManager, AIDirector;

async function loadOptionalModules() {
    try {
        const uiMod = await import('./ui/ui-manager.js');
        UIManager = uiMod.UIManager;
    } catch (e) {
        console.warn('UI Manager not available:', e.message);
    }

    try {
        const aiMod = await import('./ai/ai-director.js');
        AIDirector = aiMod.AIDirector;
    } catch (e) {
        console.warn('AI Director not available:', e.message);
    }
}

async function init() {
    // Load optional modules
    await loadOptionalModules();

    // Create game instance
    const game = new Game();
    game.init();

    // Create renderer
    const canvas = document.getElementById('gameCanvas');
    const minimapCanvas = document.getElementById('minimap');
    const renderer = new Renderer(canvas, minimapCanvas);
    game.renderer = renderer;

    // Setup UI Manager
    if (UIManager) {
        const uiManager = new UIManager(game);
        uiManager.init();
        game.uiManager = uiManager;
    }

    // Setup AI Directors
    if (AIDirector) {
        game.factions.forEach(faction => {
            const director = new AIDirector(faction, game);
            game.aiDirectors.push(director);
        });
    }

    // Setup canvas click handler
    canvas.addEventListener('click', (e) => {
        const world = renderer.camera.screenToWorld(e.offsetX, e.offsetY);
        const worldX = world.x / CONFIG.cellSize;
        const worldY = world.y / CONFIG.cellSize;

        // God action
        if (game.godAction) {
            game.applyGodAction(worldX, worldY);
            return;
        }

        // Terrain tool
        if (game.selectedTool) {
            game.applyTerrain(worldX, worldY, game.selectedTool);
            return;
        }

        // Entity selection
        const entity = game.getEntityAt(worldX, worldY);
        if (entity) {
            game.selectedEntity = entity;
            renderer.selectedVillager = entity.type === 'villager' ? entity.entity : null;

            if (game.uiManager && game.uiManager.modals) {
                if (entity.type === 'villager') {
                    game.uiManager.modals.showVillagerDetail(entity.entity, entity.faction);
                } else if (entity.type === 'building' && entity.buildingData) {
                    game.uiManager.modals.showBuildingDetail(entity.buildingData, entity.faction);
                }
            }
        } else {
            game.selectedEntity = null;
            renderer.selectedVillager = null;
        }
    });

    // Terrain drag painting
    let isPainting = false;
    canvas.addEventListener('mousedown', (e) => {
        if (e.button === 0 && game.selectedTool && !game.godAction) {
            isPainting = true;
            const world = renderer.camera.screenToWorld(e.offsetX, e.offsetY);
            game.applyTerrain(world.x / CONFIG.cellSize, world.y / CONFIG.cellSize, game.selectedTool);
        }
    });
    canvas.addEventListener('mousemove', (e) => {
        if (isPainting && game.selectedTool) {
            const world = renderer.camera.screenToWorld(e.offsetX, e.offsetY);
            game.applyTerrain(world.x / CONFIG.cellSize, world.y / CONFIG.cellSize, game.selectedTool);
        }
    });
    canvas.addEventListener('mouseup', () => { isPainting = false; });
    canvas.addEventListener('mouseleave', () => { isPainting = false; });

    // Keyboard shortcuts
    window.addEventListener('keydown', (e) => {
        // Prevent shortcuts when typing in inputs
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

        switch (e.key) {
            case ' ':
                e.preventDefault();
                CONFIG.isPaused = !CONFIG.isPaused;
                updatePauseButton();
                break;
            case '1': CONFIG.gameSpeed = 1; updateSpeedDisplay(); break;
            case '2': CONFIG.gameSpeed = 2; updateSpeedDisplay(); break;
            case '3': CONFIG.gameSpeed = 5; updateSpeedDisplay(); break;
            case '4': CONFIG.gameSpeed = 10; updateSpeedDisplay(); break;
            case '5': CONFIG.gameSpeed = 20; updateSpeedDisplay(); break;
        }

        // Ctrl+S save, Ctrl+L load
        if (e.ctrlKey && e.key === 's') {
            e.preventDefault();
            saveGame(game);
        }
        if (e.ctrlKey && e.key === 'l') {
            e.preventDefault();
            loadGame(game);
        }
    });

    // Toolbar setup (if UI not available, do it manually)
    setupToolbar(game, renderer);

    // Speed control
    setupSpeedControl();

    // Start the render loop
    function renderLoop() {
        if (!CONFIG.isPaused) {
            const ticksThisFrame = Math.min(CONFIG.gameSpeed, 10);
            for (let i = 0; i < ticksThisFrame; i++) {
                CONFIG.currentTick++;
                updateDate();
                game.factions.forEach(f => f.update(game.map, game.factions));
                game.aiDirectors.forEach(d => d.update(CONFIG.currentTick));

                // Stats recording
                if (game.uiManager && game.uiManager.stats && CONFIG.currentTick % 60 === 0) {
                    game.uiManager.stats.recordSnapshot(game);
                }
            }
        }

        // Render
        renderer.draw(game.map, game.factions);

        // Update UI
        if (game.uiManager) {
            game.uiManager.update();
        }

        requestAnimationFrame(renderLoop);
    }

    requestAnimationFrame(renderLoop);

    // Expose game globally for debugging
    window.game = game;
    window.renderer = renderer;

    console.log('Eryndor v2 initialized');
}

function updateDate() {
    const monthLength = CONFIG.ticksPerMonth;
    const newMonth = Math.floor(CONFIG.currentTick / monthLength) % 12;

    if (newMonth !== CONFIG.currentMonth) {
        CONFIG.currentMonth = newMonth;
    }

    const year = Math.floor(CONFIG.currentTick / CONFIG.ticksPerYear) + 1;
    const dateEl = document.getElementById('dateDisplay');
    if (dateEl) {
        dateEl.textContent = `${CONFIG.monthNames[CONFIG.currentMonth]}, An ${year}`;
    }
}

function setupToolbar(game, renderer) {
    // Selection mode buttons
    document.querySelectorAll('[data-select]').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('[data-select]').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            game.selectMode = btn.dataset.select;
            game.selectedTool = null;
            document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
        });
    });

    // Terrain tool buttons
    document.querySelectorAll('.tool-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const terrainMap = {
                'grass': 0, 'forest': 1, 'stone': 2, 'iron': 3,
                'water': 4, 'mountain': 5, 'gold': 6, 'berries': 7
            };
            const tool = btn.dataset.tool;

            if (game.selectedTool === terrainMap[tool]) {
                // Deselect
                game.selectedTool = null;
                btn.classList.remove('active');
            } else {
                document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                game.selectedTool = terrainMap[tool];
            }
        });
    });

    // Brush size
    const brushInput = document.getElementById('brushSize');
    if (brushInput) {
        brushInput.addEventListener('input', (e) => {
            game.brushSize = parseInt(e.target.value);
        });
    }

    // God actions
    const godActions = {
        'actionDisaster': 'disaster',
        'actionBlessing': 'blessing',
        'actionPlague': 'plague',
        'actionFertility': 'fertility'
    };

    Object.entries(godActions).forEach(([id, action]) => {
        const btn = document.getElementById(id);
        if (btn) {
            btn.addEventListener('click', () => {
                if (game.godAction === action) {
                    game.godAction = null;
                    btn.classList.remove('active');
                } else {
                    document.querySelectorAll('.god-btn').forEach(b => b.classList.remove('active'));
                    game.godAction = action;
                    btn.classList.add('active');
                    game.selectedTool = null;
                    document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
                }
            });
        }
    });

    // Save/Load buttons
    const saveBtn = document.getElementById('saveBtn');
    const loadBtn = document.getElementById('loadBtn');
    if (saveBtn) saveBtn.addEventListener('click', () => saveGame(game));
    if (loadBtn) loadBtn.addEventListener('click', () => loadGame(game));

    // Tech button
    const techBtn = document.getElementById('techBtn');
    if (techBtn) {
        techBtn.addEventListener('click', () => {
            if (game.uiManager && game.uiManager.modals) {
                game.uiManager.modals.showTechTree(game.factions);
            }
        });
    }

    // Stats button
    const statsBtn = document.getElementById('statsBtn');
    if (statsBtn) {
        statsBtn.addEventListener('click', () => {
            if (game.uiManager && game.uiManager.modals) {
                game.uiManager.modals.showStats(game);
            }
        });
    }
}

function setupSpeedControl() {
    const slider = document.getElementById('speedSlider');
    const speedValue = document.getElementById('speedValue');
    const pauseBtn = document.getElementById('pauseBtn');

    if (slider) {
        slider.addEventListener('input', (e) => {
            CONFIG.gameSpeed = parseInt(e.target.value);
            if (speedValue) speedValue.textContent = `x${CONFIG.gameSpeed}`;
        });
    }

    if (pauseBtn) {
        pauseBtn.addEventListener('click', () => {
            CONFIG.isPaused = !CONFIG.isPaused;
            updatePauseButton();
        });
    }
}

function updatePauseButton() {
    const pauseBtn = document.getElementById('pauseBtn');
    if (pauseBtn) {
        pauseBtn.textContent = CONFIG.isPaused ? '▶' : '⏸';
        pauseBtn.classList.toggle('active', CONFIG.isPaused);
    }
}

function updateSpeedDisplay() {
    const slider = document.getElementById('speedSlider');
    const speedValue = document.getElementById('speedValue');
    if (slider) slider.value = CONFIG.gameSpeed;
    if (speedValue) speedValue.textContent = `x${CONFIG.gameSpeed}`;
}

function saveGame(game) {
    try {
        const saveData = {
            version: 2,
            tick: CONFIG.currentTick,
            month: CONFIG.currentMonth,
            speed: CONFIG.gameSpeed,
            terrain: [],
            elevation: [],
            buildings: [],
            territory: [],
            resources: [],
            factions: [],
            animals: game.map.animals.filter(a => a.isAlive).map(a => ({
                type: a.type, x: a.x, y: a.y, health: a.health
            }))
        };

        // Save map data
        for (let y = 0; y < game.map.height; y++) {
            saveData.terrain[y] = [...game.map.terrain[y]];
            saveData.elevation[y] = [...game.map.elevation[y]];
            saveData.buildings[y] = game.map.buildings[y].map(b => ({ type: b.type, faction: b.faction }));
            saveData.territory[y] = [...game.map.territory[y]];
            saveData.resources[y] = game.map.resources[y].map(r => ({ amount: r.amount, type: r.type }));
        }

        // Save factions
        game.factions.forEach(f => {
            saveData.factions.push({
                id: f.id,
                resources: { ...f.resources },
                maxPopulation: f.maxPopulation,
                completedTechs: [...f.completedTechs],
                currentResearch: f.currentResearch ? f.currentResearch.id : null,
                researchProgress: f.researchProgress,
                warState: { ...f.warState },
                stats: { ...f.stats },
                militaryUnits: f.militaryUnits,
                colonies: f.colonies.map(c => ({ ...c })),
                buildings: f.buildings.map(b => ({ type: b.type, x: b.x, y: b.y })),
                villagers: f.villagers.map(v => ({
                    id: v.id, x: v.x, y: v.y,
                    targetX: v.targetX, targetY: v.targetY,
                    gender: v.gender, firstName: v.firstName, lastName: v.lastName,
                    age: v.age, birthTick: v.birthTick,
                    unitType: v.unitType,
                    combatStats: { ...v.combatStats },
                    isAlive: v.isAlive, hunger: v.hunger,
                    skills: { ...v.skills }, job: v.job
                })),
                boats: f.boats.map(b => ({
                    x: b.x, y: b.y, targetX: b.targetX, targetY: b.targetY,
                    portX: b.portX, portY: b.portY
                }))
            });
        });

        localStorage.setItem('eryndor_v2_save', JSON.stringify(saveData));
        console.log('Game saved successfully');

        eventBus.emit('event-triggered', {
            type: 'system',
            message: 'Partie sauvegardee'
        });
    } catch (e) {
        console.error('Save failed:', e);
    }
}

function loadGame(game) {
    try {
        const json = localStorage.getItem('eryndor_v2_save');
        if (!json) {
            console.warn('No save found');
            return;
        }
        const saveData = JSON.parse(json);

        CONFIG.currentTick = saveData.tick;
        CONFIG.currentMonth = saveData.month;
        CONFIG.gameSpeed = saveData.speed || 1;
        updateSpeedDisplay();

        // Restore map
        for (let y = 0; y < game.map.height; y++) {
            game.map.terrain[y] = saveData.terrain[y];
            game.map.elevation[y] = saveData.elevation[y];
            game.map.buildings[y] = saveData.buildings[y];
            game.map.territory[y] = saveData.territory[y];
            game.map.resources[y] = saveData.resources[y];
        }

        // Restore animals
        game.map.animals = (saveData.animals || []).map(a => ({
            ...a,
            isAlive: true,
            typeData: { food: 15, speed: 0.3, passive: true }
        }));

        // Restore factions (simplified - keeps class instances)
        saveData.factions.forEach((savedF, idx) => {
            if (idx >= game.factions.length) return;
            const f = game.factions[idx];
            f.resources = savedF.resources;
            f.maxPopulation = savedF.maxPopulation;
            f.completedTechs = savedF.completedTechs;
            f.researchProgress = savedF.researchProgress;
            f.warState = savedF.warState;
            f.stats = savedF.stats;
            f.militaryUnits = savedF.militaryUnits;
            f.colonies = savedF.colonies;
            f.buildings = savedF.buildings;

            // Restore villagers with basic properties
            const { Villager } = game.factions[idx].villagers[0]
                ? { Villager: game.factions[idx].villagers[0].constructor }
                : { Villager: null };

            f.villagers = savedF.villagers.map(sv => {
                const v = Object.create(Villager ? Villager.prototype : Object.prototype);
                Object.assign(v, sv);
                v.factionId = f.id;
                v.factionType = f.type;
                v.moveTimer = 0;
                v.moveInterval = 50 + Math.random() * 100;
                v.gatherTimer = 0;
                v.currentTask = null;
                v.taskTarget = null;
                v.huntTarget = null;
                v.jobChangeTimer = 0;
                v.parent1 = null;
                v.parent2 = null;
                v.spouse = null;
                v.children = [];
                return v;
            });
        });

        console.log('Game loaded successfully');
        eventBus.emit('event-triggered', {
            type: 'system',
            message: 'Partie chargee'
        });
    } catch (e) {
        console.error('Load failed:', e);
    }
}

// Start when DOM is ready
document.addEventListener('DOMContentLoaded', init);
