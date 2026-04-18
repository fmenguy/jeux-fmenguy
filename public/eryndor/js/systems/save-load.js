import { CONFIG } from '../config.js';
import { eventBus } from '../event-bus.js';
import { Villager } from '../core/villager.js';

const SAVE_KEY = 'eryndor_v2_save';
const SAVE_VERSION = 1;

/**
 * Save/Load system using localStorage.
 * Serializes and deserializes the entire game state.
 */
export class SaveLoadSystem {
    constructor() {
        this.lastSaveTime = null;
    }

    /**
     * Serialize the entire game state to JSON and store in localStorage.
     * @param {Object} game - The game state object.
     * @returns {boolean} True if save succeeded.
     */
    saveGame(game) {
        if (!game) return false;

        try {
            const saveData = {
                version: SAVE_VERSION,
                timestamp: Date.now(),
                tick: CONFIG.currentTick,
                gameSpeed: CONFIG.gameSpeed,

                // Map data
                map: this._serializeMap(game.map),

                // Factions
                factions: this._serializeFactions(game.factions),

                // Animals
                animals: this._serializeAnimals(game.map ? game.map.animals : []),

                // Boats
                boats: this._serializeBoats(game.boats || []),

                // Season system state
                seasons: game.seasonSystem ? game.seasonSystem.serialize() : null,

                // Diplomacy state
                diplomacy: game.diplomacySystem ? game.diplomacySystem.serialize() : null,

                // Events state
                events: game.eventSystem ? game.eventSystem.serialize() : null,

                // Territory (compact)
                territory: game.territorySystem ? game.territorySystem.serialize() : null,

                // Config snapshot (non-default values)
                config: {
                    currentTick: CONFIG.currentTick,
                    currentMonth: CONFIG.currentMonth,
                    gameSpeed: CONFIG.gameSpeed,
                    isPaused: CONFIG.isPaused
                }
            };

            const json = JSON.stringify(saveData);
            localStorage.setItem(SAVE_KEY, json);
            this.lastSaveTime = Date.now();

            eventBus.emit('game-saved', {
                timestamp: this.lastSaveTime,
                size: json.length
            });

            return true;
        } catch (error) {
            console.error('Failed to save game:', error);
            eventBus.emit('save-error', { error: error.message });
            return false;
        }
    }

    /**
     * Deserialize game state from localStorage and reconstruct the game.
     * @param {Object} game - The game object to populate.
     * @returns {boolean} True if load succeeded.
     */
    loadGame(game) {
        if (!game) return false;

        try {
            const json = localStorage.getItem(SAVE_KEY);
            if (!json) return false;

            const saveData = JSON.parse(json);

            // Version check
            if (saveData.version !== SAVE_VERSION) {
                console.warn(`Save version mismatch: expected ${SAVE_VERSION}, got ${saveData.version}`);
            }

            // Restore CONFIG values
            if (saveData.config) {
                CONFIG.currentTick = saveData.config.currentTick || 0;
                CONFIG.currentMonth = saveData.config.currentMonth || 0;
                CONFIG.gameSpeed = saveData.config.gameSpeed || 1;
                CONFIG.isPaused = saveData.config.isPaused || false;
            }

            // Restore map
            if (saveData.map && game.map) {
                this._deserializeMap(game.map, saveData.map);
            }

            // Restore factions
            if (saveData.factions && game.factions) {
                this._deserializeFactions(game.factions, saveData.factions);
            }

            // Restore animals
            if (saveData.animals && game.map) {
                game.map.animals = this._deserializeAnimals(saveData.animals);
            }

            // Restore boats
            if (saveData.boats) {
                game.boats = this._deserializeBoats(saveData.boats);
            }

            // Restore subsystems
            if (saveData.seasons && game.seasonSystem) {
                game.seasonSystem.deserialize(saveData.seasons);
            }
            if (saveData.diplomacy && game.diplomacySystem) {
                game.diplomacySystem.deserialize(saveData.diplomacy);
            }
            if (saveData.events && game.eventSystem) {
                game.eventSystem.deserialize(saveData.events);
            }
            if (saveData.territory && game.territorySystem) {
                game.territorySystem.deserialize(saveData.territory);
            }

            eventBus.emit('game-loaded', {
                timestamp: saveData.timestamp,
                tick: saveData.tick
            });

            return true;
        } catch (error) {
            console.error('Failed to load game:', error);
            eventBus.emit('load-error', { error: error.message });
            return false;
        }
    }

    /**
     * Check if a save file exists.
     */
    hasSave() {
        return localStorage.getItem(SAVE_KEY) !== null;
    }

    /**
     * Delete the save file.
     */
    deleteSave() {
        localStorage.removeItem(SAVE_KEY);
        eventBus.emit('save-deleted', {});
    }

    /**
     * Export save data as a JSON string (for clipboard).
     * @returns {string|null} JSON string of the save, or null.
     */
    exportSave() {
        const json = localStorage.getItem(SAVE_KEY);
        return json || null;
    }

    /**
     * Import save data from a JSON string.
     * @param {string} json - JSON string to import.
     * @returns {boolean} True if import succeeded.
     */
    importSave(json) {
        try {
            // Validate JSON
            const data = JSON.parse(json);
            if (!data.version || !data.factions) {
                console.error('Invalid save data format');
                return false;
            }

            localStorage.setItem(SAVE_KEY, json);
            eventBus.emit('save-imported', { timestamp: data.timestamp });
            return true;
        } catch (error) {
            console.error('Failed to import save:', error);
            return false;
        }
    }

    /**
     * Get info about the current save without loading it.
     */
    getSaveInfo() {
        try {
            const json = localStorage.getItem(SAVE_KEY);
            if (!json) return null;

            const data = JSON.parse(json);
            return {
                timestamp: data.timestamp,
                tick: data.tick,
                version: data.version,
                size: json.length,
                factionCount: data.factions ? data.factions.length : 0,
                dateString: data.timestamp ? new Date(data.timestamp).toLocaleString('fr-FR') : 'Inconnu'
            };
        } catch {
            return null;
        }
    }

    // --- Serialization helpers ---

    _serializeMap(map) {
        if (!map) return null;
        return {
            width: map.width,
            height: map.height,
            terrain: map.terrain,
            elevation: map.elevation,
            buildings: map.buildings,
            resources: map.resources
            // territory is handled by territory system
            // animals are serialized separately
        };
    }

    _deserializeMap(map, data) {
        if (!data) return;
        map.terrain = data.terrain || map.terrain;
        map.elevation = data.elevation || map.elevation;
        map.buildings = data.buildings || map.buildings;
        map.resources = data.resources || map.resources;
    }

    _serializeFactions(factions) {
        if (!factions) return [];
        return factions.map(faction => ({
            id: faction.id,
            name: faction.name,
            type: faction.type,
            resources: { ...faction.resources },
            traits: { ...faction.traits },
            morale: faction.morale,
            techProgress: faction.techProgress ? { ...faction.techProgress } : null,
            techCompleted: faction.techCompleted ? [...faction.techCompleted] : [],
            buildings: faction.buildings ? faction.buildings.map(b => ({
                type: b.type,
                x: b.x,
                y: b.y,
                faction: b.faction,
                health: b.health,
                buildProgress: b.buildProgress
            })) : [],
            villagers: faction.villagers ? faction.villagers.map(v => this._serializeVillager(v)) : [],
            populationCap: faction.populationCap
        }));
    }

    _deserializeFactions(factions, data) {
        if (!data || !factions) return;

        for (let i = 0; i < Math.min(factions.length, data.length); i++) {
            const saved = data[i];
            const faction = factions[i];

            // Restore resources
            if (saved.resources) {
                faction.resources = { ...saved.resources };
            }

            // Restore traits
            if (saved.traits) {
                faction.traits = { ...faction.traits, ...saved.traits };
            }

            // Restore tech
            if (saved.techProgress) faction.techProgress = saved.techProgress;
            if (saved.techCompleted) faction.techCompleted = saved.techCompleted;

            // Restore morale
            if (saved.morale !== undefined) faction.morale = saved.morale;
            if (saved.populationCap !== undefined) faction.populationCap = saved.populationCap;

            // Restore buildings
            if (saved.buildings) {
                faction.buildings = saved.buildings.map(b => ({
                    type: b.type,
                    x: b.x,
                    y: b.y,
                    faction: b.faction !== undefined ? b.faction : faction.id,
                    health: b.health,
                    buildProgress: b.buildProgress
                }));
            }

            // Restore villagers by reconstructing Villager instances
            if (saved.villagers) {
                faction.villagers = saved.villagers.map(vData => {
                    const v = new Villager(
                        vData.factionId,
                        vData.factionType,
                        vData.x,
                        vData.y
                    );

                    // Restore all saved properties
                    v.id = vData.id;
                    v.gender = vData.gender;
                    v.firstName = vData.firstName;
                    v.lastName = vData.lastName;
                    v.age = vData.age;
                    v.birthTick = vData.birthTick;
                    v.isAlive = vData.isAlive;
                    v.hunger = vData.hunger || 0;
                    v.deathCause = vData.deathCause;
                    v.unitType = vData.unitType;
                    v.job = vData.job;

                    if (vData.skills) {
                        v.skills = { ...vData.skills };
                    }
                    if (vData.combatStats) {
                        v.combatStats = { ...vData.combatStats };
                    }

                    v.targetX = vData.targetX || vData.x;
                    v.targetY = vData.targetY || vData.y;

                    return v;
                });

                // Reconstruct spouse/parent references by ID after all villagers are created
                this._reconnectRelationships(faction.villagers, saved.villagers);
            }
        }
    }

    _serializeVillager(v) {
        if (!v) return null;
        return {
            id: v.id,
            factionId: v.factionId,
            factionType: v.factionType,
            x: v.x,
            y: v.y,
            targetX: v.targetX,
            targetY: v.targetY,
            gender: v.gender,
            firstName: v.firstName,
            lastName: v.lastName,
            age: v.age,
            birthTick: v.birthTick,
            isAlive: v.isAlive,
            hunger: v.hunger,
            deathCause: v.deathCause,
            unitType: v.unitType,
            job: v.job,
            skills: v.skills ? { ...v.skills } : null,
            combatStats: v.combatStats ? { ...v.combatStats } : null,
            spouseId: v.spouse ? v.spouse.id : null,
            childrenIds: v.children ? v.children.map(c => c.id) : []
        };
    }

    _reconnectRelationships(villagers, savedData) {
        if (!villagers || !savedData) return;

        const villagerMap = new Map();
        for (const v of villagers) {
            villagerMap.set(v.id, v);
        }

        for (let i = 0; i < savedData.length; i++) {
            const vData = savedData[i];
            const v = villagers[i];
            if (!v || !vData) continue;

            // Reconnect spouse
            if (vData.spouseId) {
                v.spouse = villagerMap.get(vData.spouseId) || null;
            }

            // Reconnect children
            if (vData.childrenIds && vData.childrenIds.length > 0) {
                v.children = vData.childrenIds
                    .map(id => villagerMap.get(id))
                    .filter(c => c !== undefined);
            }
        }
    }

    _serializeAnimals(animals) {
        if (!animals) return [];
        return animals.filter(a => a.isAlive).map(a => ({
            type: a.type,
            x: a.x,
            y: a.y,
            health: a.health,
            isAlive: a.isAlive
        }));
    }

    _deserializeAnimals(data) {
        if (!data) return [];

        // We need the ANIMAL_TYPE data to reconstruct typeData
        // Import it inline to avoid circular dependency concerns
        const ANIMAL_TYPES = {
            SHEEP: { name: 'Mouton', food: 15, wool: 5, speed: 0.3, passive: true },
            COW: { name: 'Vache', food: 25, milk: 3, speed: 0.2, passive: true },
            CHICKEN: { name: 'Poule', food: 5, eggs: 2, speed: 0.4, passive: true },
            PIG: { name: 'Cochon', food: 20, speed: 0.25, passive: true },
            DEER: { name: 'Cerf', food: 18, speed: 0.5, passive: true, flees: true },
            FISH: { name: 'Poisson', food: 8, speed: 0.3, passive: true, aquatic: true }
        };

        return data.map(a => ({
            type: a.type,
            x: a.x,
            y: a.y,
            health: a.health || 100,
            isAlive: a.isAlive !== false,
            typeData: ANIMAL_TYPES[a.type] || ANIMAL_TYPES.SHEEP
        }));
    }

    _serializeBoats(boats) {
        if (!boats) return [];
        return boats.map(b => ({
            id: b.id,
            factionId: b.factionId,
            x: b.x,
            y: b.y,
            targetX: b.targetX,
            targetY: b.targetY,
            health: b.health,
            cargo: b.cargo,
            state: b.state
        }));
    }

    _deserializeBoats(data) {
        if (!data) return [];
        return data.map(b => ({
            id: b.id,
            factionId: b.factionId,
            x: b.x,
            y: b.y,
            targetX: b.targetX || b.x,
            targetY: b.targetY || b.y,
            health: b.health || 100,
            cargo: b.cargo || {},
            state: b.state || 'idle'
        }));
    }
}

export const saveLoadSystem = new SaveLoadSystem();
export default saveLoadSystem;
