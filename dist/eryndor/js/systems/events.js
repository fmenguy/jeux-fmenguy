import { CONFIG } from '../config.js';
import { eventBus } from '../event-bus.js';
import { RANDOM_EVENTS } from '../data/events.js';
import { TERRAIN } from '../enums.js';

/**
 * Random events system.
 * Periodically triggers random events that affect factions,
 * resources, units, and buildings.
 */
export class EventSystem {
    constructor() {
        this.activeEvents = [];   // Currently active events with durations
        this.eventHistory = [];   // Log of triggered events
        this.lastEventTick = 0;
    }

    /**
     * Main update loop: check and trigger random events.
     * @param {Object} game - Game state with factions, map, tick, etc.
     * @param {number} tick - Current game tick.
     */
    update(game, tick) {
        if (!game || !game.factions) return;

        // Cooldown between events
        const cooldown = CONFIG.eventCooldown || 1000;
        if (tick - this.lastEventTick < cooldown) return;

        // Base event chance per tick
        const baseChance = CONFIG.eventChance || 0.0003;

        // Roll for each faction
        for (const faction of game.factions) {
            if (!faction.villagers || faction.villagers.filter(v => v.isAlive).length === 0) continue;

            // Temple bonus: increases chance of positive events
            const templeBonus = this._getTempleBonus(faction);

            if (Math.random() < baseChance * CONFIG.gameSpeed) {
                const event = this._selectRandomEvent(faction, game, templeBonus);
                if (event) {
                    this.triggerEvent(event.key, faction, game);
                    this.lastEventTick = tick;
                    return; // Only one event per update cycle
                }
            }
        }

        // Expire active events
        this.activeEvents = this.activeEvents.filter(e => {
            if (e.expiresAt && tick >= e.expiresAt) {
                eventBus.emit('event-expired', {
                    eventKey: e.key,
                    factionId: e.factionId,
                    name: e.name
                });
                return false;
            }
            return true;
        });
    }

    /**
     * Select a random event based on weighted chances and conditions.
     */
    _selectRandomEvent(faction, game, templeBonus) {
        const candidates = [];

        for (const [key, eventDef] of Object.entries(RANDOM_EVENTS)) {
            // Skip faction rebirth for existing factions
            if (key === 'FACTION_REBIRTH') continue;

            let chance = eventDef.chance || 0.1;

            // Temple bonus boosts positive events, reduces negative
            if (eventDef.type === 'success') {
                chance *= templeBonus;
            } else if (eventDef.type === 'danger' || eventDef.type === 'warning') {
                chance /= templeBonus;
            }

            // Condition checks
            if (!this._checkEventCondition(key, faction, game)) continue;

            candidates.push({ key, chance, def: eventDef });
        }

        if (candidates.length === 0) return null;

        // Weighted random selection
        const totalWeight = candidates.reduce((sum, c) => sum + c.chance, 0);
        let roll = Math.random() * totalWeight;

        for (const candidate of candidates) {
            roll -= candidate.chance;
            if (roll <= 0) {
                return candidate;
            }
        }

        return candidates[candidates.length - 1];
    }

    /**
     * Check if an event's conditions are met.
     */
    _checkEventCondition(eventKey, faction, game) {
        const aliveCount = faction.villagers ? faction.villagers.filter(v => v.isAlive).length : 0;

        switch (eventKey) {
            case 'GOOD_HARVEST':
                // Needs farms
                return faction.buildings && faction.buildings.some(b => b.type === 2); // FARM
            case 'GOLD_DISCOVERY':
                // Needs miners
                return aliveCount >= 5;
            case 'MIGRATION':
                // Needs population cap room
                return aliveCount >= 3;
            case 'TECH_BREAKTHROUGH':
                // Needs researchers (population > 10)
                return aliveCount >= 10;
            case 'DROUGHT':
                // More likely in summer
                return true;
            case 'EPIDEMIC':
                // More likely with large population
                return aliveCount >= 15;
            case 'EARTHQUAKE':
                return true;
            case 'BANDIT_RAID':
                // Needs resources to steal
                return faction.resources && faction.resources.food > 50;
            case 'FIRE':
                return faction.buildings && faction.buildings.length > 3;
            case 'VOLCANIC_ERUPTION':
                return aliveCount >= 10;
            default:
                return true;
        }
    }

    /**
     * Force trigger a specific event on a faction.
     * @param {string} eventKey - Key from RANDOM_EVENTS (e.g., 'GOOD_HARVEST').
     * @param {Object} faction - Target faction.
     * @param {Object} game - Game state.
     */
    triggerEvent(eventKey, faction, game) {
        const eventDef = RANDOM_EVENTS[eventKey];
        if (!eventDef) return;

        const effect = this._applyEventEffect(eventKey, faction, game);

        const eventRecord = {
            key: eventKey,
            name: eventDef.name,
            icon: eventDef.icon,
            type: eventDef.type,
            description: eventDef.description,
            factionId: faction.id,
            factionName: faction.name,
            tick: CONFIG.currentTick,
            effect
        };

        this.eventHistory.push(eventRecord);

        // Keep history manageable
        if (this.eventHistory.length > 100) {
            this.eventHistory = this.eventHistory.slice(-50);
        }

        // Emit for event log UI
        eventBus.emit('event-triggered', eventRecord);
    }

    /**
     * Apply the effect of an event and return a description of what happened.
     */
    _applyEventEffect(eventKey, faction, game) {
        const aliveVillagers = faction.villagers ? faction.villagers.filter(v => v.isAlive) : [];

        switch (eventKey) {
            case 'GOOD_HARVEST': {
                const bonus = 50 + Math.random() * 100;
                faction.resources.food += bonus;
                return `+${Math.round(bonus)} nourriture`;
            }

            case 'GOLD_DISCOVERY': {
                const gold = 20 + Math.random() * 50;
                faction.resources.gold = (faction.resources.gold || 0) + gold;
                return `+${Math.round(gold)} or`;
            }

            case 'MIGRATION': {
                // Add 1-3 new villagers (handled by game logic if available)
                const count = 1 + Math.floor(Math.random() * 3);
                eventBus.emit('spawn-villagers', {
                    factionId: faction.id,
                    count
                });
                return `+${count} villageois`;
            }

            case 'TECH_BREAKTHROUGH': {
                // Boost research progress
                if (faction.techProgress) {
                    for (const key of Object.keys(faction.techProgress)) {
                        if (faction.techProgress[key] < 100) {
                            faction.techProgress[key] += 20;
                            break;
                        }
                    }
                }
                return '+20% progression recherche';
            }

            case 'BLESSING': {
                // Heal all villagers and boost morale
                for (const v of aliveVillagers) {
                    if (v.combatStats) {
                        v.combatStats.health = Math.min(v.combatStats.maxHealth, v.combatStats.health + 30);
                    }
                    v.hunger = Math.max(0, v.hunger - 20);
                }
                return 'Tous les villageois soignés';
            }

            case 'DROUGHT': {
                const loss = 30 + Math.random() * 50;
                faction.resources.food = Math.max(0, faction.resources.food - loss);
                return `-${Math.round(loss)} nourriture`;
            }

            case 'EPIDEMIC': {
                // Damage random villagers
                const affected = Math.floor(aliveVillagers.length * (0.1 + Math.random() * 0.2));
                let deaths = 0;
                for (let i = 0; i < affected && i < aliveVillagers.length; i++) {
                    const idx = Math.floor(Math.random() * aliveVillagers.length);
                    const v = aliveVillagers[idx];
                    if (v && v.isAlive) {
                        v.takeDamage(20 + Math.random() * 30, 'epidemic');
                        if (!v.isAlive) deaths++;
                    }
                }
                return `${affected} malades, ${deaths} morts`;
            }

            case 'EARTHQUAKE': {
                // Damage buildings
                if (faction.buildings && faction.buildings.length > 0) {
                    const damaged = Math.min(3, Math.floor(Math.random() * faction.buildings.length));
                    for (let i = 0; i < damaged; i++) {
                        const idx = Math.floor(Math.random() * faction.buildings.length);
                        const b = faction.buildings[idx];
                        if (b && b.health !== undefined) {
                            b.health = Math.max(0, b.health - 30);
                        }
                    }
                    return `${damaged} bâtiments endommagés`;
                }
                return 'Aucun dégât';
            }

            case 'BANDIT_RAID': {
                const stolenFood = Math.min(faction.resources.food * 0.2, 50 + Math.random() * 50);
                const stolenGold = Math.min((faction.resources.gold || 0) * 0.15, 10 + Math.random() * 20);
                faction.resources.food = Math.max(0, faction.resources.food - stolenFood);
                faction.resources.gold = Math.max(0, (faction.resources.gold || 0) - stolenGold);
                return `-${Math.round(stolenFood)} nourriture, -${Math.round(stolenGold)} or`;
            }

            case 'FIRE': {
                // Destroy a random building
                if (faction.buildings && faction.buildings.length > 0) {
                    const idx = Math.floor(Math.random() * faction.buildings.length);
                    const b = faction.buildings[idx];
                    if (b && b.health !== undefined) {
                        b.health = 0;
                    }
                    return '1 bâtiment détruit';
                }
                return 'Aucun dégât';
            }

            case 'ANIMAL_MIGRATION': {
                // Spawn animals on the map
                eventBus.emit('spawn-animals', {
                    count: 3 + Math.floor(Math.random() * 5)
                });
                return 'Nouveaux animaux dans la région';
            }

            case 'RESOURCE_DISCOVERY': {
                // Add resources to random tiles near the faction
                const bonus = 30 + Math.random() * 40;
                faction.resources.stone += bonus * 0.5;
                faction.resources.iron = (faction.resources.iron || 0) + bonus * 0.3;
                return `+${Math.round(bonus * 0.5)} pierre, +${Math.round(bonus * 0.3)} fer`;
            }

            case 'SOLAR_ECLIPSE': {
                // Temporary morale effect (cosmetic/atmospheric)
                return 'Le ciel s\'assombrit momentanément';
            }

            case 'FOREIGN_TRADERS': {
                // Gain random resources
                const foodGain = 20 + Math.random() * 30;
                const goldGain = 10 + Math.random() * 20;
                const ironGain = 5 + Math.random() * 10;
                faction.resources.food += foodGain;
                faction.resources.gold = (faction.resources.gold || 0) + goldGain;
                faction.resources.iron = (faction.resources.iron || 0) + ironGain;
                return `+${Math.round(foodGain)} nourriture, +${Math.round(goldGain)} or, +${Math.round(ironGain)} fer`;
            }

            case 'HEROIC_BIRTH': {
                // Spawn an exceptional villager
                eventBus.emit('spawn-hero', {
                    factionId: faction.id
                });
                return 'Un héros est né!';
            }

            case 'VOLCANIC_ERUPTION': {
                // Heavy damage to faction
                const foodLoss = faction.resources.food * 0.3;
                const woodLoss = (faction.resources.wood || 0) * 0.2;
                faction.resources.food = Math.max(0, faction.resources.food - foodLoss);
                faction.resources.wood = Math.max(0, (faction.resources.wood || 0) - woodLoss);

                // Damage all villagers slightly
                for (const v of aliveVillagers) {
                    if (v.combatStats && Math.random() < 0.3) {
                        v.takeDamage(10 + Math.random() * 20, 'volcanic');
                    }
                }
                return `Dégâts massifs: -${Math.round(foodLoss)} nourriture, -${Math.round(woodLoss)} bois`;
            }

            default:
                return 'Effet inconnu';
        }
    }

    /**
     * Calculate temple bonus for positive event chance.
     */
    _getTempleBonus(faction) {
        if (!faction.buildings) return 1;
        const temples = faction.buildings.filter(b => b.type === 16); // TEMPLE
        if (temples.length === 0) return 1;
        return 1 + temples.length * 0.2; // +20% per temple
    }

    /**
     * Get recent events for display.
     */
    getRecentEvents(count = 10) {
        return this.eventHistory.slice(-count);
    }

    /**
     * Serialize state for saving.
     */
    serialize() {
        return {
            eventHistory: this.eventHistory.slice(-20),
            lastEventTick: this.lastEventTick
        };
    }

    /**
     * Restore state from saved data.
     */
    deserialize(data) {
        if (!data) return;
        this.eventHistory = data.eventHistory || [];
        this.lastEventTick = data.lastEventTick || 0;
    }
}

export const eventSystem = new EventSystem();
export default eventSystem;
