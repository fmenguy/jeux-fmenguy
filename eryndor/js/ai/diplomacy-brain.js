import { DIPLOMACY_STATUS, UNIT_TYPE, JOB } from '../enums.js';
import { CONFIG } from '../config.js';
import { TREATIES } from '../data/events.js';
import { eventBus } from '../event-bus.js';

/**
 * DiplomacyBrain - Manages inter-faction relations: war declarations,
 * peace negotiations, and treaty proposals.
 *
 * War declaration conditions:
 *   - Our military is significantly stronger
 *   - Food is secure
 *   - Relations are poor (< -30)
 *   - Never if food crisis or population < 10
 *
 * Peace seeking conditions:
 *   - War has lasted > 3000 ticks
 *   - We are losing badly (military ratio < 0.6)
 *
 * Treaty logic:
 *   - Propose trade if both factions have complementary surpluses
 *   - Accept non-aggression if we are weaker
 *   - Propose alliance if relations are very good
 */
export class DiplomacyBrain {

    constructor() {
        this._lastDiplomacyCheck = -999;
        this._diplomacyInterval = 120; // ticks between checks
        this._warStartTick = {};       // factionId -> tick when war started
        this._relations = {};          // factionId -> numeric score (-100 to 100)
    }

    // ------------------------------------------------------------------ //
    //  Public API
    // ------------------------------------------------------------------ //

    update(faction, game, priorities, threats) {
        if (!CONFIG.diplomacyEnabled) return;

        const tick = CONFIG.currentTick || 0;
        if (tick - this._lastDiplomacyCheck < this._diplomacyInterval) return;
        this._lastDiplomacyCheck = tick;

        const enemies = (game.factions || []).filter(f => f.id !== faction.id);
        if (enemies.length === 0) return;

        for (const other of enemies) {
            this._updateRelations(faction, other, game, threats);

            const status = this._getStatus(faction.id, other.id, game);
            const relation = this._getRelation(other.id);

            if (status === DIPLOMACY_STATUS.WAR) {
                this._evaluatePeace(faction, other, game, threats);
            } else {
                this._evaluateWar(faction, other, game, threats, relation);
                this._evaluateTreaties(faction, other, game, priorities, relation);
            }
        }
    }

    // ------------------------------------------------------------------ //
    //  Relation tracking
    // ------------------------------------------------------------------ //

    _updateRelations(faction, other, game, threats) {
        const otherId = other.id;
        if (this._relations[otherId] === undefined) {
            this._relations[otherId] = 0; // start neutral
        }

        let delta = 0;

        // Border pressure decreases relations
        const threat = (threats && threats.threats)
            ? threats.threats.find(t => t.factionId === otherId)
            : null;
        if (threat) {
            delta -= threat.borderPressure * 0.05;
            delta -= threat.intruders * 1.0;
        }

        // Trade treaty improves relations
        if (this._hasTreaty(faction, other, game, 'TRADE')) {
            delta += 0.5;
        }

        // Non-aggression pact improves relations
        if (this._hasTreaty(faction, other, game, 'NON_AGGRESSION')) {
            delta += 0.3;
        }

        // War is very bad for relations
        const status = this._getStatus(faction.id, otherId, game);
        if (status === DIPLOMACY_STATUS.WAR) {
            delta -= 2.0;
        }

        // Natural decay toward neutral
        if (this._relations[otherId] > 0) {
            delta -= 0.1;
        } else if (this._relations[otherId] < 0) {
            delta += 0.1;
        }

        this._relations[otherId] = Math.max(-100, Math.min(100,
            this._relations[otherId] + delta
        ));
    }

    _getRelation(otherId) {
        return this._relations[otherId] || 0;
    }

    // ------------------------------------------------------------------ //
    //  War evaluation
    // ------------------------------------------------------------------ //

    _evaluateWar(faction, other, game, threats, relation) {
        // NEVER declare war if:
        const pop = faction.villagers.filter(v => v.isAlive).length;
        const foodPerTick = pop * CONFIG.foodPerVillagerPerTick;
        const foodSecurity = foodPerTick > 0
            ? faction.resources.food / (foodPerTick * 300)
            : 999;

        if (pop < 10) return;          // too small
        if (foodSecurity < 0.8) return; // food crisis
        if (relation > -30) return;     // relations aren't bad enough

        // Non-aggression pact prevents war
        if (this._hasTreaty(faction, other, game, 'NON_AGGRESSION')) return;

        // Compare military strength
        const ourPower = this._militaryPower(faction);
        const theirPower = this._militaryPower(other);

        if (ourPower < theirPower * 1.3) return; // need significant advantage

        // Consider war
        const warProbability = Math.min(0.3,
            (ourPower / Math.max(theirPower, 1) - 1) * 0.1 +
            Math.abs(relation) * 0.002
        );

        if (Math.random() < warProbability) {
            this._declareWar(faction, other, game);
        }
    }

    _declareWar(faction, other, game) {
        this._setStatus(faction.id, other.id, game, DIPLOMACY_STATUS.WAR);
        this._warStartTick[other.id] = CONFIG.currentTick || 0;
        this._relations[other.id] = -80;

        eventBus.emit('war-declared', {
            aggressor: faction.id,
            target: other.id
        });
    }

    // ------------------------------------------------------------------ //
    //  Peace evaluation
    // ------------------------------------------------------------------ //

    _evaluatePeace(faction, other, game, threats) {
        const tick = CONFIG.currentTick || 0;
        const warStart = this._warStartTick[other.id] || 0;
        const warDuration = tick - warStart;

        const ourPower = this._militaryPower(faction);
        const theirPower = this._militaryPower(other);
        const ratio = theirPower > 0 ? ourPower / theirPower : 2;

        let seekPeace = false;

        // War has gone on too long
        if (warDuration > 3000) {
            seekPeace = true;
        }

        // We are losing badly
        if (ratio < 0.6) {
            seekPeace = true;
        }

        // Population too low
        const pop = faction.villagers.filter(v => v.isAlive).length;
        if (pop < 5) {
            seekPeace = true;
        }

        // Food crisis during war
        const foodPerTick = pop * CONFIG.foodPerVillagerPerTick;
        const foodSecurity = foodPerTick > 0
            ? faction.resources.food / (foodPerTick * 300)
            : 999;
        if (foodSecurity < 0.4) {
            seekPeace = true;
        }

        if (seekPeace) {
            // Peace probability increases with desperation
            const desperation = Math.min(1,
                (warDuration / 5000) +
                (ratio < 1 ? (1 - ratio) : 0) +
                (foodSecurity < 0.5 ? 0.3 : 0)
            );

            if (Math.random() < desperation * 0.2) {
                this._proposePeace(faction, other, game);
            }
        }
    }

    _proposePeace(faction, other, game) {
        // The AI "other" will accept peace based on their own situation
        const theirPower = this._militaryPower(other);
        const ourPower = this._militaryPower(faction);

        // If they are also weak or war-weary, accept
        const theirPop = other.villagers.filter(v => v.isAlive).length;
        const warDuration = (CONFIG.currentTick || 0) - (this._warStartTick[other.id] || 0);

        const acceptChance =
            (ourPower > theirPower ? 0.4 : 0.2) +
            (warDuration > 2000 ? 0.2 : 0) +
            (theirPop < 8 ? 0.3 : 0);

        if (Math.random() < acceptChance) {
            this._setStatus(faction.id, other.id, game, DIPLOMACY_STATUS.NEUTRAL);
            this._relations[other.id] = -20; // still wary
            delete this._warStartTick[other.id];

            eventBus.emit('peace-established', {
                faction1: faction.id,
                faction2: other.id
            });
        }
    }

    // ------------------------------------------------------------------ //
    //  Treaty evaluation
    // ------------------------------------------------------------------ //

    _evaluateTreaties(faction, other, game, priorities, relation) {
        // Trade treaty
        if (relation > -10 && !this._hasTreaty(faction, other, game, 'TRADE')) {
            if (this._hasComplementarySurpluses(faction, other)) {
                const acceptChance = 0.1 + (relation > 0 ? relation * 0.003 : 0);
                if (Math.random() < acceptChance) {
                    this._proposeTreaty(faction, other, game, 'TRADE');
                }
            }
        }

        // Non-aggression pact
        if (relation > -20 && !this._hasTreaty(faction, other, game, 'NON_AGGRESSION')) {
            const ourPower = this._militaryPower(faction);
            const theirPower = this._militaryPower(other);

            // Propose if we are weaker
            if (ourPower < theirPower * 0.8) {
                const acceptChance = 0.08 + (relation > 0 ? relation * 0.002 : 0);
                if (Math.random() < acceptChance) {
                    this._proposeTreaty(faction, other, game, 'NON_AGGRESSION');
                }
            }
        }

        // Alliance
        if (relation > 40 && !this._hasTreaty(faction, other, game, 'ALLIANCE')) {
            const acceptChance = 0.05 + (relation - 40) * 0.002;
            if (Math.random() < acceptChance) {
                this._proposeTreaty(faction, other, game, 'ALLIANCE');
            }
        }
    }

    _hasComplementarySurpluses(faction, other) {
        const fRes = faction.resources;
        const oRes = other.resources;

        // Check if one has excess of what the other lacks
        const fSurplus = {
            food:  (fRes.food || 0) > 200,
            wood:  (fRes.wood || 0) > 150,
            stone: (fRes.stone || 0) > 100,
            iron:  (fRes.iron || 0) > 60,
            gold:  (fRes.gold || 0) > 50
        };
        const oSurplus = {
            food:  (oRes.food || 0) > 200,
            wood:  (oRes.wood || 0) > 150,
            stone: (oRes.stone || 0) > 100,
            iron:  (oRes.iron || 0) > 60,
            gold:  (oRes.gold || 0) > 50
        };

        // Complementary: one has surplus where the other does not
        for (const res of ['food', 'wood', 'stone', 'iron', 'gold']) {
            if ((fSurplus[res] && !oSurplus[res]) || (!fSurplus[res] && oSurplus[res])) {
                return true;
            }
        }

        return false;
    }

    _proposeTreaty(faction, other, game, treatyType) {
        const treatyConfig = TREATIES[treatyType];
        if (!treatyConfig) return;

        // Store treaty
        if (!game.treaties) game.treaties = [];

        game.treaties.push({
            type: treatyType,
            factions: [faction.id, other.id],
            startTick: CONFIG.currentTick || 0,
            duration: treatyConfig.duration,
            name: treatyConfig.name
        });

        // Improve relations
        this._relations[other.id] = Math.min(100,
            (this._relations[other.id] || 0) + 15
        );

        // Update diplomacy status if beneficial
        const currentStatus = this._getStatus(faction.id, other.id, game);
        if (treatyType === 'ALLIANCE' && currentStatus !== DIPLOMACY_STATUS.ALLIED) {
            this._setStatus(faction.id, other.id, game, DIPLOMACY_STATUS.ALLIED);
        } else if (treatyType === 'TRADE' && currentStatus === DIPLOMACY_STATUS.NEUTRAL) {
            this._setStatus(faction.id, other.id, game, DIPLOMACY_STATUS.FRIENDLY);
        }

        eventBus.emit('treaty-signed', {
            type: treatyType,
            faction1: faction.id,
            faction2: other.id,
            name: treatyConfig.name
        });
    }

    // ------------------------------------------------------------------ //
    //  Helpers
    // ------------------------------------------------------------------ //

    _militaryPower(faction) {
        let power = 0;
        for (const v of faction.villagers) {
            if (!v.isAlive) continue;
            switch (v.unitType) {
                case UNIT_TYPE.SOLDIER:  power += 3;   break;
                case UNIT_TYPE.ARCHER:   power += 2.5; break;
                case UNIT_TYPE.CAVALRY:  power += 4;   break;
                case UNIT_TYPE.SCOUT:    power += 1.5; break;
                default:
                    if (v.job === JOB.WARRIOR) power += 1.5;
                    break;
            }
        }
        return power;
    }

    _getStatus(factionIdA, factionIdB, game) {
        if (!game.diplomacy) return DIPLOMACY_STATUS.NEUTRAL;
        if (typeof game.diplomacy.getStatus === 'function') {
            return game.diplomacy.getStatus(factionIdA, factionIdB);
        }
        const key = `${Math.min(factionIdA, factionIdB)}-${Math.max(factionIdA, factionIdB)}`;
        return game.diplomacy[key] || DIPLOMACY_STATUS.NEUTRAL;
    }

    _setStatus(factionIdA, factionIdB, game, status) {
        if (!game.diplomacy) game.diplomacy = {};
        if (typeof game.diplomacy.setStatus === 'function') {
            game.diplomacy.setStatus(factionIdA, factionIdB, status);
            return;
        }
        const key = `${Math.min(factionIdA, factionIdB)}-${Math.max(factionIdA, factionIdB)}`;
        game.diplomacy[key] = status;
    }

    _hasTreaty(faction, other, game, treatyType) {
        if (!game.treaties) return false;
        const tick = CONFIG.currentTick || 0;
        return game.treaties.some(t =>
            t.type === treatyType &&
            t.factions.includes(faction.id) &&
            t.factions.includes(other.id) &&
            (tick - t.startTick) < t.duration
        );
    }
}
