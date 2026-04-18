import { CONFIG } from '../config.js';
import { eventBus } from '../event-bus.js';
import { TREATIES } from '../data/events.js';

/**
 * Treaty types.
 */
const TREATY_TYPE = Object.freeze({
    TRADE: 'trade',
    NON_AGGRESSION: 'non_aggression',
    ALLIANCE: 'alliance'
});

/**
 * Diplomacy system managing inter-faction relations, treaties, and war.
 */
export class DiplomacySystem {
    constructor() {
        /** @type {Map<string, Object>} Relations keyed by "factionA-factionB" (A < B) */
        this.relations = new Map();
    }

    /**
     * Get the normalized key for two factions (ensures consistent ordering).
     */
    _getKey(factionA, factionB) {
        const idA = typeof factionA === 'object' ? factionA.id : factionA;
        const idB = typeof factionB === 'object' ? factionB.id : factionB;
        return idA < idB ? `${idA}-${idB}` : `${idB}-${idA}`;
    }

    /**
     * Get or create a relation between two factions.
     */
    getRelation(factionA, factionB) {
        const key = this._getKey(factionA, factionB);
        if (!this.relations.has(key)) {
            this.relations.set(key, {
                score: 0,       // -100 (hostile) to +100 (allied)
                treaties: [],
                warActive: false,
                warStartTick: 0,
                lastInteraction: 0
            });
        }
        return this.relations.get(key);
    }

    /**
     * Update all diplomatic relations each tick.
     * @param {Array} factions - Array of faction objects.
     * @param {number} tick - Current game tick.
     */
    updateRelations(factions, tick) {
        if (!CONFIG.diplomacyEnabled) return;

        for (let i = 0; i < factions.length; i++) {
            for (let j = i + 1; j < factions.length; j++) {
                const relation = this.getRelation(factions[i], factions[j]);

                // Border tension: reduce score per shared border tile
                const borderTiles = this._countSharedBorders(factions[i], factions[j]);
                if (borderTiles > 0) {
                    relation.score -= 0.01 * borderTiles * CONFIG.gameSpeed;
                }

                // Trade bonus: active trade treaties improve relations
                const activeTrades = relation.treaties.filter(
                    t => t.type === TREATY_TYPE.TRADE && (tick - t.startTick) < (TREATIES.TRADE.duration || 3000)
                );
                if (activeTrades.length > 0) {
                    relation.score += 0.05 * activeTrades.length * CONFIG.gameSpeed;
                }

                // War fatigue: after 2000 ticks of war, both sides suffer morale loss
                if (relation.warActive && (tick - relation.warStartTick) > 2000) {
                    const fatigueFactor = (tick - relation.warStartTick - 2000) * 0.0001;
                    // War fatigue doesn't improve relations, but affects factions
                    if (factions[i].morale !== undefined) {
                        factions[i].morale = Math.max(0, (factions[i].morale || 100) - fatigueFactor * CONFIG.gameSpeed);
                    }
                    if (factions[j].morale !== undefined) {
                        factions[j].morale = Math.max(0, (factions[j].morale || 100) - fatigueFactor * CONFIG.gameSpeed);
                    }
                }

                // Expire old treaties
                relation.treaties = relation.treaties.filter(treaty => {
                    const treatyData = TREATIES[treaty.type.toUpperCase()] || { duration: 5000 };
                    const expired = (tick - treaty.startTick) >= treatyData.duration;
                    if (expired) {
                        eventBus.emit('treaty-expired', {
                            factionA: factions[i].id,
                            factionB: factions[j].id,
                            type: treaty.type,
                            name: treatyData.name
                        });
                    }
                    return !expired;
                });

                // Clamp score
                relation.score = Math.max(-100, Math.min(100, relation.score));
            }
        }
    }

    /**
     * Count shared border tiles between two factions (approximate).
     */
    _countSharedBorders(factionA, factionB) {
        // This is a simplified count; the full implementation would use the territory system
        // For now, estimate based on territory proximity
        if (!factionA.territory || !factionB.territory) return 0;

        let count = 0;
        const terrA = factionA.territory;
        const terrB = factionB.territory;

        // Simple estimation: count how many tiles are adjacent between factions
        // This will be properly connected to the territory system
        return count;
    }

    /**
     * Declare war between two factions.
     */
    declareWar(factionA, factionB) {
        const relation = this.getRelation(factionA, factionB);
        const idA = typeof factionA === 'object' ? factionA.id : factionA;
        const idB = typeof factionB === 'object' ? factionB.id : factionB;

        // Check for non-aggression pact
        const hasNonAggression = relation.treaties.some(t => t.type === TREATY_TYPE.NON_AGGRESSION);
        if (hasNonAggression) {
            // Breaking a pact severely damages relations
            relation.score -= 50;
            relation.treaties = relation.treaties.filter(t => t.type !== TREATY_TYPE.NON_AGGRESSION);

            eventBus.emit('treaty-broken', {
                factionA: idA,
                factionB: idB,
                type: TREATY_TYPE.NON_AGGRESSION
            });
        }

        relation.warActive = true;
        relation.warStartTick = CONFIG.currentTick;
        relation.score = Math.max(-100, relation.score - 30);

        // Remove all treaties
        relation.treaties = [];

        eventBus.emit('war-declared', {
            factionA: idA,
            factionB: idB,
            tick: CONFIG.currentTick
        });
    }

    /**
     * Declare peace between two factions. Ends war and creates a non-aggression pact.
     */
    declarePeace(factionA, factionB) {
        const relation = this.getRelation(factionA, factionB);
        const idA = typeof factionA === 'object' ? factionA.id : factionA;
        const idB = typeof factionB === 'object' ? factionB.id : factionB;

        relation.warActive = false;
        relation.score += 10; // Small improvement from peace
        relation.score = Math.max(-100, Math.min(100, relation.score));

        // Automatically create non-aggression pact
        this.createTreaty(factionA, factionB, TREATY_TYPE.NON_AGGRESSION);

        eventBus.emit('peace-declared', {
            factionA: idA,
            factionB: idB,
            tick: CONFIG.currentTick
        });
    }

    /**
     * Create a treaty between two factions.
     * @param {Object|number} factionA
     * @param {Object|number} factionB
     * @param {string} type - TREATY_TYPE value: 'trade', 'non_aggression', 'alliance'
     */
    createTreaty(factionA, factionB, type) {
        const relation = this.getRelation(factionA, factionB);
        const idA = typeof factionA === 'object' ? factionA.id : factionA;
        const idB = typeof factionB === 'object' ? factionB.id : factionB;

        // Don't duplicate treaties of the same type
        if (relation.treaties.some(t => t.type === type)) return;

        // Can't make treaties during war (except peace)
        if (relation.warActive) return;

        const treaty = {
            type,
            startTick: CONFIG.currentTick,
            factionA: idA,
            factionB: idB
        };

        relation.treaties.push(treaty);

        // Treaty score bonuses
        switch (type) {
            case TREATY_TYPE.TRADE:
                relation.score += 10;
                break;
            case TREATY_TYPE.NON_AGGRESSION:
                relation.score += 15;
                break;
            case TREATY_TYPE.ALLIANCE:
                relation.score += 25;
                break;
        }
        relation.score = Math.min(100, relation.score);

        eventBus.emit('treaty-created', {
            factionA: idA,
            factionB: idB,
            type,
            tick: CONFIG.currentTick
        });
    }

    /**
     * Check if two factions are at war.
     */
    isAtWar(factionA, factionB) {
        const relation = this.getRelation(factionA, factionB);
        return relation.warActive;
    }

    /**
     * Check if two factions have a specific treaty.
     */
    hasTreaty(factionA, factionB, type) {
        const relation = this.getRelation(factionA, factionB);
        return relation.treaties.some(t => t.type === type);
    }

    /**
     * Get the diplomatic status label for display.
     */
    getStatusLabel(factionA, factionB) {
        const relation = this.getRelation(factionA, factionB);
        if (relation.warActive) return 'Guerre';
        if (relation.treaties.some(t => t.type === TREATY_TYPE.ALLIANCE)) return 'Alliance';
        if (relation.score > 50) return 'Amical';
        if (relation.score > 0) return 'Neutre';
        if (relation.score > -50) return 'Tendu';
        return 'Hostile';
    }

    /**
     * Modify the relation score directly (for events, etc.).
     */
    modifyRelation(factionA, factionB, amount) {
        const relation = this.getRelation(factionA, factionB);
        relation.score = Math.max(-100, Math.min(100, relation.score + amount));
    }

    /**
     * Serialize diplomacy state for saving.
     */
    serialize() {
        const data = {};
        for (const [key, relation] of this.relations) {
            data[key] = {
                score: relation.score,
                treaties: relation.treaties,
                warActive: relation.warActive,
                warStartTick: relation.warStartTick
            };
        }
        return data;
    }

    /**
     * Restore diplomacy state from saved data.
     */
    deserialize(data) {
        this.relations.clear();
        if (!data) return;
        for (const [key, relation] of Object.entries(data)) {
            this.relations.set(key, {
                score: relation.score || 0,
                treaties: relation.treaties || [],
                warActive: relation.warActive || false,
                warStartTick: relation.warStartTick || 0,
                lastInteraction: 0
            });
        }
    }
}

export const diplomacySystem = new DiplomacySystem();
export default diplomacySystem;
