import { BUILDING, UNIT_TYPE, JOB } from '../enums.js';
import { findPlacement } from './placement-helper.js';

/**
 * ActionExecutor - the only bridge between an agent's tool_use output
 * and the game state. Validates, invokes faction actions, returns a
 * JSON-serializable result for the tool_result block.
 *
 * Every unknown, invalid or under-resourced action returns
 * { error: "reason" } so the agent can read the error and correct course
 * on its next iteration.
 */

const BUILDING_ENUM = {
    HOUSE: BUILDING.HOUSE, FARM: BUILDING.FARM, CASTLE: BUILDING.CASTLE,
    BARRACKS: BUILDING.BARRACKS, FORGE: BUILDING.FORGE, SAWMILL: BUILDING.SAWMILL,
    MINE: BUILDING.MINE, PORT: BUILDING.PORT, WATCHTOWER: BUILDING.WATCHTOWER,
    ARCHERY_RANGE: BUILDING.ARCHERY_RANGE, ROAD: BUILDING.ROAD, WALL: BUILDING.WALL,
    TOWER: BUILDING.TOWER, COLONY: BUILDING.COLONY, MARKET: BUILDING.MARKET,
    TEMPLE: BUILDING.TEMPLE, GRANARY: BUILDING.GRANARY
};

const UNIT_ENUM = {
    SOLDIER: UNIT_TYPE.SOLDIER,
    ARCHER: UNIT_TYPE.ARCHER,
    CAVALRY: UNIT_TYPE.CAVALRY,
    SCOUT: UNIT_TYPE.SCOUT
};

export class ActionExecutor {
    constructor(faction, game) {
        this.faction = faction;
        this.game = game;
        this.turnEnded = false;
    }

    async execute(toolName, input) {
        if (this.turnEnded) {
            return { error: 'turn_already_ended' };
        }

        try {
            switch (toolName) {
                case 'build': return this._build(input);
                case 'train': return this._train(input);
                case 'research': return this._research(input);
                case 'set_jobs': return this._setJobs(input);
                case 'attack': return this._attack(input);
                case 'declare_war': return this._declareWar();
                case 'offer_peace': return this._offerPeace();
                case 'found_colony': return this._foundColony();
                case 'trade': return this._trade(input);
                case 'end_turn':
                    this.turnEnded = true;
                    return { ok: true, ended: true };
                default:
                    return { error: `unknown_tool:${toolName}` };
            }
        } catch (err) {
            return { error: String(err.message || err) };
        }
    }

    // ------------------------------------------------------------------ //

    _build({ type, hint }) {
        const enumType = BUILDING_ENUM[type];
        if (enumType === undefined) return { error: `unknown_building:${type}` };

        const pos = findPlacement(this.faction, enumType, this.game, hint || null);
        if (!pos) return { error: 'no_valid_location' };

        const res = this.faction.placeBuilding(this.game.map, enumType, pos);
        if (!res.ok) return { error: res.reason };
        return { ok: true, type, x: res.x, y: res.y };
    }

    _train({ unit_type, count = 1 }) {
        const enumType = UNIT_ENUM[unit_type];
        if (enumType === undefined) return { error: `unknown_unit:${unit_type}` };

        const queued = [];
        const failed = [];
        const n = Math.min(count, 10);

        for (let i = 0; i < n; i++) {
            if (!this.faction.canTrain(enumType)) {
                failed.push('cannot_train_anymore');
                break;
            }
            const candidates = this.faction.villagers.filter(v =>
                v.isAlive && v.unitType === UNIT_TYPE.VILLAGER &&
                v.currentAge >= 16 &&
                (this.faction.type === 'human' ? v.currentAge <= 50 : v.currentAge <= 700) &&
                v.currentTask !== 'training'
            ).sort((a, b) => (b.skills.combat || 0) - (a.skills.combat || 0));

            if (candidates.length === 0) {
                failed.push('no_candidate');
                break;
            }
            const ok = this.faction.startTraining(candidates[0], enumType);
            if (!ok) { failed.push('start_training_failed'); break; }
            queued.push(candidates[0].id);
        }

        if (queued.length === 0) {
            return { error: failed[0] || 'train_failed' };
        }
        return { ok: true, queued: queued.length, failures: failed };
    }

    _research({ tech_id }) {
        if (!tech_id) return { error: 'missing_tech_id' };
        const res = this.faction.startResearchById(tech_id);
        return res.ok ? res : { error: res.reason };
    }

    _setJobs({ job, count }) {
        if (!Object.values(JOB).includes(job)) {
            return { error: `unknown_job:${job}` };
        }
        if (typeof count !== 'number' || count < 1) {
            return { error: 'invalid_count' };
        }
        return this.faction.reassignJobs(job, Math.min(count, 30));
    }

    _attack({ target = 'nearest_enemy', unit_count = 5 }) {
        const res = this.faction.orderAttack(target, unit_count, this.game);
        return res.ok ? res : { error: res.reason };
    }

    _declareWar() {
        if (this.faction.warState && this.faction.warState.isAtWar) {
            return { error: 'already_at_war' };
        }
        const enemy = this.game.factions.find(f => f.id !== this.faction.id);
        if (!enemy) return { error: 'no_enemy' };
        this.faction.declareWar(enemy.id, this.game.factions);
        return { ok: true, enemy: enemy.type };
    }

    _offerPeace() {
        if (!this.faction.warState || !this.faction.warState.isAtWar) {
            return { error: 'not_at_war' };
        }
        const enemy = this.game.factions.find(f => f.id === this.faction.warState.enemyId);
        this.faction.endWar('peace');
        if (enemy) enemy.endWar('peace');
        return { ok: true };
    }

    _foundColony() {
        const res = this.faction.foundColonyAt(this.game.map);
        return res.ok ? res : { error: res.reason };
    }

    _trade({ resource, give_gold, get_amount }) {
        const res = this.faction.tradeGoldFor(resource, give_gold, get_amount);
        return res.ok ? res : { error: res.reason };
    }
}
