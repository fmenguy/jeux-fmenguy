import { CONFIG } from '../config.js';
import { eventBus } from '../event-bus.js';

/**
 * Season enum constants.
 */
export const SEASON = Object.freeze({
    SPRING: 'spring',
    SUMMER: 'summer',
    AUTUMN: 'autumn',
    WINTER: 'winter'
});

/**
 * Season modifiers for gameplay systems.
 */
const SEASON_MODIFIERS = {
    [SEASON.SPRING]: { foodGrowth: 1.3, movementSpeed: 1.0, birthRate: 1.2, combatModifier: 1.0 },
    [SEASON.SUMMER]: { foodGrowth: 1.5, movementSpeed: 1.1, birthRate: 1.0, combatModifier: 1.1 },
    [SEASON.AUTUMN]: { foodGrowth: 0.8, movementSpeed: 0.9, birthRate: 0.8, combatModifier: 1.0 },
    [SEASON.WINTER]: { foodGrowth: 0.2, movementSpeed: 0.7, birthRate: 0.5, combatModifier: 0.8 }
};

/**
 * French month names.
 */
const MONTH_NAMES = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

/**
 * Calendar and season management system.
 * Tracks in-game time, months, years, and provides season-based gameplay modifiers.
 */
export class SeasonSystem {
    constructor() {
        this.currentMonth = 1;   // 1-12
        this.currentYear = 1;
        this.tickAccumulator = 0;
        this.previousSeason = null;
        this.previousMonth = 1;
    }

    /**
     * Advance the calendar based on game ticks.
     * Approximately 60 ticks per month at speed 1 (scaled by CONFIG.ticksPerMonth if available).
     */
    update(tickCount) {
        const ticksPerMonth = CONFIG.ticksPerMonth || 100;
        this.tickAccumulator += CONFIG.gameSpeed;

        if (this.tickAccumulator >= ticksPerMonth) {
            this.tickAccumulator -= ticksPerMonth;
            this.previousMonth = this.currentMonth;
            const previousSeason = this.getCurrentSeason();

            this.currentMonth++;
            if (this.currentMonth > 12) {
                this.currentMonth = 1;
                this.currentYear++;
            }

            // Sync with CONFIG
            CONFIG.currentMonth = this.currentMonth - 1; // CONFIG uses 0-indexed

            // Emit month change event
            eventBus.emit('month-changed', {
                month: this.currentMonth,
                monthName: this.getMonthName(this.currentMonth),
                year: this.currentYear,
                dateString: this.getDateString()
            });

            // Check if season changed
            const newSeason = this.getCurrentSeason();
            if (newSeason !== previousSeason) {
                this.previousSeason = previousSeason;
                eventBus.emit('season-changed', {
                    season: newSeason,
                    previousSeason: previousSeason,
                    modifiers: this.getSeasonModifiers(),
                    dateString: this.getDateString()
                });
            }
        }
    }

    /**
     * Get the current season based on the current month.
     * Spring: March-May (3-5), Summer: June-August (6-8),
     * Autumn: September-November (9-11), Winter: December-February (12, 1, 2).
     */
    getCurrentSeason() {
        const m = this.currentMonth;
        if (m >= 3 && m <= 5) return SEASON.SPRING;
        if (m >= 6 && m <= 8) return SEASON.SUMMER;
        if (m >= 9 && m <= 11) return SEASON.AUTUMN;
        return SEASON.WINTER; // 12, 1, 2
    }

    /**
     * Get the gameplay modifiers for the current season.
     */
    getSeasonModifiers() {
        return SEASON_MODIFIERS[this.getCurrentSeason()];
    }

    /**
     * Get the French name of a month (1-indexed).
     */
    getMonthName(month) {
        if (month < 1 || month > 12) return 'Inconnu';
        return MONTH_NAMES[month - 1];
    }

    /**
     * Get a formatted date string: "MonthName, An X".
     */
    getDateString() {
        return `${this.getMonthName(this.currentMonth)}, An ${this.currentYear}`;
    }

    /**
     * Get the season display name in French.
     */
    getSeasonName(season) {
        const names = {
            [SEASON.SPRING]: 'Printemps',
            [SEASON.SUMMER]: 'Été',
            [SEASON.AUTUMN]: 'Automne',
            [SEASON.WINTER]: 'Hiver'
        };
        return names[season] || 'Inconnu';
    }

    /**
     * Serialize state for saving.
     */
    serialize() {
        return {
            currentMonth: this.currentMonth,
            currentYear: this.currentYear,
            tickAccumulator: this.tickAccumulator
        };
    }

    /**
     * Restore state from saved data.
     */
    deserialize(data) {
        if (!data) return;
        this.currentMonth = data.currentMonth || 1;
        this.currentYear = data.currentYear || 1;
        this.tickAccumulator = data.tickAccumulator || 0;
    }
}

export const seasonSystem = new SeasonSystem();
export default seasonSystem;
