/* ============================================
   AELINDRA · logic/combat.ts
   Moteur de combat pur — zéro DOM, zéro global.
   Toutes les fonctions prennent l'état en argument
   et retournent un nouvel état ou un résultat.
   ============================================ */

import type { Hero, Enemy, Floor, Ability, Stats } from '../data/types';

// ============================================
// TYPES PUBLICS
// ============================================

export interface StatusEffect {
  type: 'buff_def' | 'poison' | 'freeze' | string;
  value: number;
  remaining: number;
}

export interface Unit {
  instanceId: string;
  heroId?: string;
  enemyTypeId?: string;
  name: string;
  emoji: string;
  imagePath?: string;
  team: 'elf' | 'enemy';
  spec?: string;
  pos: { x: number; y: number };
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  ap: number;
  maxAp: number;
  atk: number;
  def: number;
  mag: number;
  res: number;
  vit: number;
  crit: number;
  range: number;
  abilities?: string[];
  statusEffects: StatusEffect[];
  hasIntercepted: boolean;
}

export interface LogEntry {
  msg: string;
  type: 'elf' | 'enemy' | 'system';
  ts: number;
}

export type PendingAction =
  | { type: 'move' }
  | { type: 'attack' }
  | { type: 'spell' }
  | { type: 'ability'; abilityId: string };

export interface CombatState {
  floorConfig: Floor;
  gridCols: number;
  gridRows: number;
  units: Unit[];
  turn: number;
  phase: 'elf' | 'enemy';
  selectedId: string | null;
  pendingAction: PendingAction | null;
  log: LogEntry[];
  isOver: boolean;
  winner: 'elf' | 'enemy' | null;
}

export type CombatEvent =
  | { type: 'damage'; unitId: string; amount: number; isCrit: boolean }
  | { type: 'heal'; unitId: string; amount: number }
  | { type: 'death'; unitId: string }
  | { type: 'move'; unitId: string; from: { x: number; y: number }; to: { x: number; y: number } }
  | { type: 'ability'; casterId: string; abilityId: string; targets: string[] }
  | { type: 'log'; entry: LogEntry };

// ============================================
// CONSTANTES INTERNES
// ============================================

const DEFAULT_GRID_COLS = 3;
const DEFAULT_GRID_ROWS = 8;
const LOG_MAX = 50;

// ============================================
// UTILITAIRES INTERNES
// ============================================

function manhattan(a: { pos: { x: number; y: number } }, b: { pos: { x: number; y: number } }): number {
  return Math.abs(a.pos.x - b.pos.x) + Math.abs(a.pos.y - b.pos.y);
}

function aliveElves(units: Unit[]): Unit[] {
  return units.filter(u => u.team === 'elf' && u.hp > 0);
}

function aliveEnemies(units: Unit[]): Unit[] {
  return units.filter(u => u.team === 'enemy' && u.hp > 0);
}

function getUnitAt(units: Unit[], x: number, y: number): Unit | null {
  return units.find(u => u.hp > 0 && u.pos.x === x && u.pos.y === y) ?? null;
}

function makeLogEntry(msg: string, type: 'elf' | 'enemy' | 'system'): LogEntry {
  return { msg, type, ts: Date.now() };
}

function appendLog(log: LogEntry[], msg: string, type: 'elf' | 'enemy' | 'system'): LogEntry[] {
  const entry: LogEntry = makeLogEntry(msg, type);
  const next = [...log, entry];
  return next.length > LOG_MAX ? next.slice(next.length - LOG_MAX) : next;
}

function appendLogEvent(
  log: LogEntry[],
  events: CombatEvent[],
  msg: string,
  type: 'elf' | 'enemy' | 'system',
): { log: LogEntry[]; events: CombatEvent[] } {
  const entry = makeLogEntry(msg, type);
  const nextLog = [...log, entry].slice(-LOG_MAX);
  return { log: nextLog, events: [...events, { type: 'log', entry }] };
}

function updateUnit(units: Unit[], updated: Unit): Unit[] {
  return units.map(u => (u.instanceId === updated.instanceId ? updated : u));
}

// ============================================
// POSITIONS DE SPAWN ADAPTÉES À LA GRILLE
// ============================================

function heroSpawnPositions(cols: number, rows: number): { x: number; y: number }[] {
  // Logique identique à makeCombatGrid dans screens.jsx
  if (cols >= 5) {
    return [
      { x: 1,         y: rows - 1 },
      { x: 0,         y: rows - 2 },
      { x: cols - 2,  y: rows - 1 },
      { x: cols - 1,  y: rows - 2 },
    ];
  }
  if (cols === 4) {
    return [
      { x: 0, y: rows - 1 },
      { x: 1, y: rows - 2 },
      { x: 3, y: rows - 1 },
      { x: 2, y: rows - 2 },
    ];
  }
  // 3 colonnes (défaut)
  return [
    { x: 0, y: rows - 1 },
    { x: 1, y: rows - 1 },
    { x: 2, y: rows - 1 },
    { x: 1, y: rows - 2 },
  ];
}

// ============================================
// CALCUL DES STATS
// ============================================

export interface StatBreakdown {
  base: Partial<Stats>;
  bonus: Partial<Stats>;
  total: Stats;
}

export function calcStats(hero: Hero): StatBreakdown {
  if (!hero.baseStats) {
    const fallback = hero as unknown as Stats;
    return { base: fallback, bonus: {}, total: fallback };
  }

  const lv = (hero.level ?? 1) - 1;
  const base: Record<string, number> = {};

  for (const k of Object.keys(hero.baseStats) as Array<keyof Stats>) {
    const bv = hero.baseStats[k] ?? 0;
    const gv = (hero.growth as unknown as Record<string, number>)?.[k as string] ?? 0;
    base[k as string] = Math.round((bv as number) + gv * lv);
  }

  const bonus: Record<string, number> = {
    hp: 0, mp: 0, atk: 0, mag: 0, def: 0, res: 0, vit: 0, crit: 0,
  };

  const equip = hero.equipped ?? {};

  if (equip.weapon && hero.weapon) {
    const w = hero.weapon;
    if (w.atk)      bonus.atk += w.atk;
    if (w.mag)      bonus.mag += w.mag;
    if (w.defBonus) bonus.def += w.defBonus;
  }

  if (equip.body) {
    // Note: item lookup requires external registry — caller must pre-resolve bonuses
    // Here we apply what the hero object already carries (future: pass items map)
  }

  applySpecBonus(hero.spec, hero.level ?? 1, bonus);

  const total: Record<string, number> = {};
  for (const k of Object.keys(base)) {
    total[k] = base[k] + (bonus[k] ?? 0);
  }

  return {
    base: base as Partial<Stats>,
    bonus: bonus as Partial<Stats>,
    total: total as unknown as Stats,
  };
}

function applySpecBonus(spec: string | undefined, level: number, bonus: Record<string, number>): void {
  const lv = level - 1;
  if (spec === 'guardian')  { bonus.hp  += Math.round(lv * 8); bonus.def += Math.round(lv * 3); }
  if (spec === 'offensive') { bonus.mag += Math.round(lv * 4); }
  if (spec === 'healer')    { bonus.res += Math.round(lv * 3); bonus.mp  += Math.round(lv * 5); }
  if (spec === 'explorer')  { bonus.vit += Math.round(lv * 2); bonus.crit += Math.round(lv * 0.5); }
  if (spec === 'spy')       { bonus.crit += Math.round(lv * 1.5); bonus.atk += Math.round(lv * 2); }
}

// ============================================
// CALCUL DES DÉGÂTS
// ============================================

export function calcDamage(
  attacker: Unit,
  defender: Unit,
  kind: 'attack' | 'spell',
): { damage: number; isCrit: boolean } {
  let raw = 0;

  if (kind === 'attack') {
    raw = (attacker.atk ?? 0) + Math.floor(Math.random() * 3) - 1;
    const reduction = (defender.def ?? 0) / ((defender.def ?? 0) + 100);
    raw = Math.round(raw * (1 - reduction));
  } else {
    raw = (attacker.mag ?? 0) + Math.floor(Math.random() * 4);
    const reduction = (defender.res ?? 0) / ((defender.res ?? 0) + 100);
    raw = Math.round(raw * (1 - reduction));
    // Pénalité corps-à-corps pour les lanceurs avec portée minimale
    // (la distance 1 est pénalisée quand le héros a une arme à portée minimale)
    if (manhattan(attacker, defender) === 1 && attacker.range > 1) {
      raw = Math.round(raw * 0.5);
    }
  }

  const critChance = attacker.crit ?? 0;
  const isCrit = Math.random() * 100 < critChance;
  if (isCrit) raw = Math.round(raw * 1.75);

  return { damage: Math.max(1, raw), isCrit };
}

// ============================================
// INITIALISATION
// ============================================

export function initCombat(
  floorConfig: Floor,
  team: Hero[],
  enemyTypes: Record<string, Enemy>,
): CombatState {
  const gridCols = floorConfig.gridSize?.cols ?? DEFAULT_GRID_COLS;
  const gridRows = floorConfig.gridSize?.rows ?? DEFAULT_GRID_ROWS;
  const spawns = heroSpawnPositions(gridCols, gridRows);

  const units: Unit[] = [];

  team.forEach((hero, i) => {
    const stats = calcStats(hero).total;
    const pos = spawns[i] ?? { x: (i % gridCols), y: gridRows - 1 };
    units.push({
      instanceId: `elf_${hero.id}`,
      heroId: hero.id,
      name: hero.name,
      emoji: hero.emoji,
      imagePath: hero.imagePath,
      team: 'elf',
      spec: hero.spec,
      pos,
      hp: stats.hp,
      maxHp: stats.hp,
      mp: stats.mp ?? 0,
      maxMp: stats.mp ?? 0,
      ap: (hero.baseStats as unknown as Record<string, number>)?.maxAp ?? 3,
      maxAp: (hero.baseStats as unknown as Record<string, number>)?.maxAp ?? 3,
      atk: stats.atk ?? 0,
      def: stats.def ?? 0,
      mag: stats.mag ?? 0,
      res: stats.res ?? 0,
      vit: stats.vit ?? 0,
      crit: stats.crit ?? 0,
      range: stats.range ?? 1,
      abilities: hero.abilities ?? [],
      statusEffects: [],
      hasIntercepted: false,
    });
  });

  const enemyPlacements = Array.isArray(floorConfig.enemies) ? floorConfig.enemies : [];
  enemyPlacements.forEach((cfg, i) => {
    const type = enemyTypes[cfg.type];
    if (!type) return;
    units.push({
      instanceId: `enemy_${cfg.type}_${i}`,
      enemyTypeId: cfg.type,
      name: type.name,
      emoji: type.emoji,
      team: 'enemy',
      pos: cfg.pos,
      hp: type.hp,
      maxHp: type.hp,
      mp: 0,
      maxMp: 0,
      ap: type.ap ?? 2,
      maxAp: type.ap ?? 2,
      atk: type.atk ?? 0,
      def: type.def ?? 0,
      mag: type.mag ?? 0,
      res: type.res ?? 0,
      vit: 0,
      crit: 0,
      range: type.range ?? 1,
      statusEffects: [],
      hasIntercepted: false,
    });
  });

  const initialLog = appendLog([], '--- Tour 1 : Phase Elfes ---', 'system');

  return {
    floorConfig,
    gridCols,
    gridRows,
    units,
    turn: 1,
    phase: 'elf',
    selectedId: null,
    pendingAction: null,
    log: initialLog,
    isOver: false,
    winner: null,
  };
}

// ============================================
// SÉLECTION / ACTION EN ATTENTE
// ============================================

export function selectUnit(state: CombatState, unitId: string): CombatState {
  return { ...state, selectedId: unitId, pendingAction: null };
}

export function setPendingAction(state: CombatState, action: PendingAction | null): CombatState {
  return { ...state, pendingAction: action };
}

// ============================================
// TILES ACCESSIBLES
// ============================================

export function getReachableTiles(
  state: CombatState,
  unit: Unit,
  maxDist?: number,
): { x: number; y: number }[] {
  const moveRange = maxDist ?? 2;
  const tiles: { x: number; y: number }[] = [];

  for (let y = 0; y < state.gridRows; y++) {
    for (let x = 0; x < state.gridCols; x++) {
      const occupied = getUnitAt(state.units, x, y);
      if (!occupied && Math.abs(unit.pos.x - x) + Math.abs(unit.pos.y - y) <= moveRange) {
        tiles.push({ x, y });
      }
    }
  }
  return tiles;
}

export function getAttackableTargets(state: CombatState, unit: Unit): Unit[] {
  const opponents = unit.team === 'elf' ? aliveEnemies(state.units) : aliveElves(state.units);
  return opponents.filter(e => manhattan(unit, e) <= unit.range);
}

// ============================================
// INTERCEPTION (GUARDIAN)
// ============================================

export function tryIntercept(state: CombatState, target: Unit, attacker: Unit): Unit | null {
  const protectors = state.units.filter(
    u =>
      u.spec === 'guardian' &&
      u.team === target.team &&
      u.hp > 0 &&
      !u.hasIntercepted &&
      manhattan(u, target) <= 1,
  );
  return protectors.length > 0 ? protectors[0] : null;
}

// ============================================
// DÉPLACEMENT
// ============================================

export function moveUnit(
  state: CombatState,
  unitId: string,
  x: number,
  y: number,
): { state: CombatState; events: CombatEvent[] } {
  const unit = state.units.find(u => u.instanceId === unitId);
  if (!unit || unit.ap < 1) return { state, events: [] };

  const reachable = getReachableTiles(state, unit, 2);
  if (!reachable.find(t => t.x === x && t.y === y)) return { state, events: [] };

  const events: CombatEvent[] = [
    { type: 'move', unitId, from: unit.pos, to: { x, y } },
  ];

  const moved: Unit = { ...unit, pos: { x, y }, ap: unit.ap - 1 };
  let { log, events: logEvents } = appendLogEvent(
    state.log,
    events,
    `${unit.name} se déplace en (${x},${y}).`,
    'elf',
  );

  return {
    state: { ...state, units: updateUnit(state.units, moved), log },
    events: logEvents,
  };
}

// ============================================
// ATTAQUE NORMALE
// ============================================

export function attackUnit(
  state: CombatState,
  attackerId: string,
  targetX: number,
  targetY: number,
  _abilities: Record<string, Ability>,
): { state: CombatState; events: CombatEvent[] } {
  const attacker = state.units.find(u => u.instanceId === attackerId);
  const rawTarget = getUnitAt(state.units, targetX, targetY);

  if (!attacker || attacker.ap < 2 || !rawTarget || rawTarget.team === attacker.team) {
    return { state, events: [] };
  }
  if (manhattan(attacker, rawTarget) > attacker.range) return { state, events: [] };

  let events: CombatEvent[] = [];
  let log = state.log;
  let units = state.units;

  const interceptor = tryIntercept(state, rawTarget, attacker);
  const realTarget = interceptor ?? rawTarget;

  const { damage, isCrit } = calcDamage(attacker, realTarget, 'attack');
  const newHp = Math.max(0, realTarget.hp - damage);
  const newAttacker: Unit = { ...attacker, ap: attacker.ap - 2 };
  const newTarget: Unit = { ...realTarget, hp: newHp };

  if (interceptor) {
    const marker: Unit = { ...interceptor, hasIntercepted: true };
    units = updateUnit(units, marker);
  }

  units = updateUnit(units, newAttacker);
  units = updateUnit(units, newTarget);

  events.push({ type: 'damage', unitId: realTarget.instanceId, amount: damage, isCrit });

  const critTxt = isCrit ? ' (CRITIQUE!)' : '';
  const intTxt = interceptor ? ` [intercepté par ${interceptor.name}]` : '';
  ({ log, events } = appendLogEvent(
    log, events,
    `${attacker.name} attaque ${realTarget.name} : ${damage} dégâts${critTxt}${intTxt}.`,
    'elf',
  ));

  if (newHp <= 0) {
    events.push({ type: 'death', unitId: realTarget.instanceId });
    ({ log, events } = appendLogEvent(log, events, `${realTarget.name} est éliminé !`, 'elf'));
  }

  const nextState = checkVictory({ ...state, units, log });
  return { state: nextState, events };
}

// ============================================
// SORT SIMPLE (sans compétence)
// ============================================

function spellUnit(
  state: CombatState,
  casterId: string,
  targetX: number,
  targetY: number,
): { state: CombatState; events: CombatEvent[] } {
  const caster = state.units.find(u => u.instanceId === casterId);
  const target = getUnitAt(state.units, targetX, targetY);

  if (!caster || caster.ap < 2 || (caster.mp ?? 0) < 3 || !target || target.team === caster.team) {
    return { state, events: [] };
  }
  if (manhattan(caster, target) > caster.range) return { state, events: [] };

  let events: CombatEvent[] = [];
  let log = state.log;

  const { damage, isCrit } = calcDamage(caster, target, 'spell');
  const newHp = Math.max(0, target.hp - damage);

  const newCaster: Unit = { ...caster, ap: caster.ap - 2, mp: Math.max(0, (caster.mp ?? 0) - 3) };
  const newTarget: Unit = { ...target, hp: newHp };
  let units = updateUnit(updateUnit(state.units, newCaster), newTarget);

  events.push({ type: 'damage', unitId: target.instanceId, amount: damage, isCrit });

  const critTxt = isCrit ? ' (CRITIQUE!)' : '';
  ({ log, events } = appendLogEvent(
    log, events,
    `${caster.name} lance un sort sur ${target.name} : ${damage} dégâts magiques${critTxt}.`,
    'elf',
  ));

  if (newHp <= 0) {
    events.push({ type: 'death', unitId: target.instanceId });
    ({ log, events } = appendLogEvent(log, events, `${target.name} est anéanti !`, 'elf'));
  }

  const nextState = checkVictory({ ...state, units, log });
  return { state: nextState, events };
}

// ============================================
// COMPÉTENCES
// ============================================

export function useAbility(
  state: CombatState,
  casterId: string,
  abilityId: string,
  x: number,
  y: number,
  abilities: Record<string, Ability>,
): { state: CombatState; events: CombatEvent[] } {
  const ability = abilities[abilityId];
  if (!ability) return { state, events: [] };

  const caster = state.units.find(u => u.instanceId === casterId);
  if (!caster) return { state, events: [] };

  const apCost = ability.apCost ?? 2;
  const mpCost = ability.mpCost ?? 0;
  const tags = ability.tags ?? [];

  if (tags.includes('passive')) return { state, events: [] };
  if (caster.ap < apCost) return { state, events: [] };
  if (mpCost > 0 && (caster.mp ?? 0) < mpCost) return { state, events: [] };

  let events: CombatEvent[] = [{ type: 'ability', casterId, abilityId, targets: [] }];
  let log = state.log;
  let units = state.units;

  const spendCaster = (u: Unit): Unit => ({
    ...u,
    ap: u.ap - apCost,
    mp: mpCost > 0 ? Math.max(0, u.mp - mpCost) : u.mp,
  });

  // --- HEAL ---
  if (tags.includes('heal')) {
    const ally = getUnitAt(units, x, y);
    if (!ally || ally.team !== caster.team) return { state, events: [] };

    const healAmt = (caster.mag || 5) * 2;
    const healed: Unit = { ...ally, hp: Math.min(ally.maxHp, ally.hp + healAmt) };
    const spent = spendCaster(caster);

    units = updateUnit(updateUnit(units, spent), healed);
    events.push({ type: 'heal', unitId: ally.instanceId, amount: healAmt });
    ({ log, events } = appendLogEvent(
      log, events,
      `${caster.name} utilise ${ability.name} : soigne ${ally.name} de ${healAmt} PV.`,
      'elf',
    ));

    const nextState = checkVictory({ ...state, units, log });
    return { state: nextState, events };
  }

  // --- MOBILITY ---
  if (tags.includes('mobility')) {
    const reachable = getReachableTiles(state, caster, 5);
    const tile = reachable.find(t => t.x === x && t.y === y);
    if (!tile) return { state, events: [] };

    const moved: Unit = spendCaster({ ...caster, pos: { x, y } });
    events.push({ type: 'move', unitId: casterId, from: caster.pos, to: { x, y } });
    units = updateUnit(units, moved);
    ({ log, events } = appendLogEvent(
      log, events,
      `${caster.name} utilise ${ability.name} et bondit en (${x},${y}).`,
      'elf',
    ));
    return { state: { ...state, units, log }, events };
  }

  // --- BUFF DEF ---
  if (tags.includes('buff_def')) {
    const buffed: Unit = {
      ...caster,
      ap: caster.ap - apCost,
      mp: mpCost > 0 ? Math.max(0, caster.mp - mpCost) : caster.mp,
      statusEffects: [
        ...caster.statusEffects,
        { type: 'buff_def', value: 30, remaining: 2 },
      ],
    };
    units = updateUnit(units, buffed);
    ({ log, events } = appendLogEvent(
      log, events,
      `${caster.name} utilise ${ability.name} : DEF +30 pendant 2 tours.`,
      'elf',
    ));
    return { state: { ...state, units, log }, events };
  }

  // --- AOE ---
  if (tags.includes('aoe')) {
    const aoeTargets = aliveEnemies(units).filter(
      e => Math.abs(e.pos.x - x) + Math.abs(e.pos.y - y) <= 2,
    );
    if (aoeTargets.length === 0) return { state, events: [] };

    const spent = spendCaster(caster);
    units = updateUnit(units, spent);

    const abilityEvents: CombatEvent[] = [
      { type: 'ability', casterId, abilityId, targets: aoeTargets.map(t => t.instanceId) },
    ];

    for (const t of aoeTargets) {
      const actionType = tags.includes('damage_mag') ? 'spell' : 'attack';
      const { damage, isCrit } = calcDamage(spent, t, actionType);
      const finalDmg = Math.round(damage * 1.5);
      const newHp = Math.max(0, t.hp - finalDmg);
      const newT: Unit = { ...t, hp: newHp };
      units = updateUnit(units, newT);

      abilityEvents.push({ type: 'damage', unitId: t.instanceId, amount: finalDmg, isCrit });
      const critTxt = isCrit ? ' (CRITIQUE!)' : '';
      ({ log, events } = appendLogEvent(
        log, [...events, ...abilityEvents.slice(1)],
        `${ability.name} frappe ${t.name} : ${finalDmg} dégâts${critTxt}.`,
        'elf',
      ));
      abilityEvents.splice(1);

      if (newHp <= 0) {
        events.push({ type: 'death', unitId: t.instanceId });
        ({ log, events } = appendLogEvent(log, events, `${t.name} est éliminé !`, 'elf'));
      }
    }

    const nextState = checkVictory({ ...state, units, log });
    return { state: nextState, events };
  }

  // --- DAMAGE PHYS / MAG ciblé ---
  const target = getUnitAt(units, x, y);
  if (!target || target.team === caster.team || target.hp <= 0) return { state, events: [] };
  if (manhattan(caster, target) > caster.range) return { state, events: [] };

  let multiplier = 1.2;
  let actionType: 'attack' | 'spell' = 'attack';
  if (tags.includes('damage_phys')) { multiplier = 1.5; actionType = 'attack'; }
  else if (tags.includes('damage_mag')) { multiplier = 1.5; actionType = 'spell'; }

  const { damage, isCrit } = calcDamage(caster, target, actionType);
  const finalDmg = Math.round(damage * multiplier);
  const newHp = Math.max(0, target.hp - finalDmg);

  const spent = spendCaster(caster);
  const newTarget: Unit = { ...target, hp: newHp };
  units = updateUnit(updateUnit(units, spent), newTarget);

  events.push({ type: 'damage', unitId: target.instanceId, amount: finalDmg, isCrit });
  const critTxt = isCrit ? ' (CRITIQUE!)' : '';
  ({ log, events } = appendLogEvent(
    log, events,
    `${caster.name} utilise ${ability.name} sur ${target.name} : ${finalDmg} dégâts${critTxt}.`,
    'elf',
  ));

  if (newHp <= 0) {
    events.push({ type: 'death', unitId: target.instanceId });
    ({ log, events } = appendLogEvent(log, events, `${target.name} est éliminé !`, 'elf'));
  }

  const nextState = checkVictory({ ...state, units, log });
  return { state: nextState, events };
}

// ============================================
// FIN DE TOUR ELFE
// ============================================

export function endElfTurn(
  state: CombatState,
  abilities: Record<string, Ability>,
): { state: CombatState; events: CombatEvent[] } {
  if (state.phase !== 'elf' || state.isOver) return { state, events: [] };

  let log = appendLog(state.log, `--- Fin du tour ${state.turn} ---`, 'system');
  let events: CombatEvent[] = [{ type: 'log', entry: makeLogEntry(`--- Fin du tour ${state.turn} ---`, 'system') }];

  // Phase ennemie
  let midState: CombatState = { ...state, phase: 'enemy', selectedId: null, pendingAction: null, log };
  const { state: afterEnemy, events: enemyEvents } = runEnemyTurn(midState);
  events = [...events, ...enemyEvents];

  if (afterEnemy.isOver) return { state: afterEnemy, events };

  // Nouveau tour elfe
  const nextTurn = afterEnemy.turn + 1;
  const refreshedUnits = afterEnemy.units.map(u =>
    u.team === 'elf' ? { ...u, ap: u.maxAp, hasIntercepted: false } : u,
  );

  const tickedUnits = tickStatusEffects(refreshedUnits);

  let nextLog = appendLog(afterEnemy.log, `--- Tour ${nextTurn} : Phase Elfes ---`, 'system');
  events.push({ type: 'log', entry: makeLogEntry(`--- Tour ${nextTurn} : Phase Elfes ---`, 'system') });

  return {
    state: {
      ...afterEnemy,
      units: tickedUnits,
      turn: nextTurn,
      phase: 'elf',
      log: nextLog,
    },
    events,
  };
}

// ============================================
// PHASE ENNEMIE (IA)
// ============================================

export function runEnemyTurn(state: CombatState): { state: CombatState; events: CombatEvent[] } {
  let units = state.units.map(u =>
    u.team === 'enemy' ? { ...u, ap: u.maxAp } : u,
  );
  let log = appendLog(state.log, '--- Phase ennemie ---', 'system');
  let events: CombatEvent[] = [
    { type: 'log', entry: makeLogEntry('--- Phase ennemie ---', 'system') },
  ];
  let currentState: CombatState = { ...state, units, log };

  const enemyIds = aliveEnemies(units).map(u => u.instanceId);

  for (const enemyId of enemyIds) {
    const enemy = currentState.units.find(u => u.instanceId === enemyId);
    if (!enemy || enemy.hp <= 0) continue;

    const elves = aliveElves(currentState.units);
    if (elves.length === 0) break;

    const useSpell = (enemy.mag ?? 0) > (enemy.atk ?? 0);
    const actionType: 'attack' | 'spell' = useSpell ? 'spell' : 'attack';
    const attackAp = 2;

    const target = chooseEnemyTarget(currentState, enemy, actionType);
    if (!target) continue;

    // Déplacement si hors portée
    if (enemy.ap >= 1 && manhattan(enemy, target) > enemy.range) {
      const dx = Math.sign(target.pos.x - enemy.pos.x);
      const dy = Math.sign(target.pos.y - enemy.pos.y);
      const candidates = [
        { x: enemy.pos.x + dx, y: enemy.pos.y },
        { x: enemy.pos.x, y: enemy.pos.y + dy },
        { x: enemy.pos.x + dx, y: enemy.pos.y + dy },
      ];
      for (const m of candidates) {
        if (
          m.x >= 0 && m.x < currentState.gridCols &&
          m.y >= 0 && m.y < currentState.gridRows &&
          !getUnitAt(currentState.units, m.x, m.y)
        ) {
          const moved: Unit = { ...enemy, pos: { x: m.x, y: m.y }, ap: enemy.ap - 1 };
          events.push({ type: 'move', unitId: enemy.instanceId, from: enemy.pos, to: moved.pos });
          ({ log, events } = appendLogEvent(log, events, `${enemy.name} avance.`, 'enemy'));
          currentState = { ...currentState, units: updateUnit(currentState.units, moved), log };
          break;
        }
      }
    }

    const freshEnemy = currentState.units.find(u => u.instanceId === enemyId)!;
    const freshTarget = currentState.units.find(u => u.instanceId === target.instanceId);
    if (!freshTarget || freshTarget.hp <= 0) continue;

    if (freshEnemy.ap >= attackAp && manhattan(freshEnemy, freshTarget) <= freshEnemy.range) {
      const interceptor = tryIntercept(currentState, freshTarget, freshEnemy);
      const realTarget = interceptor ?? freshTarget;

      const { damage, isCrit } = calcDamage(freshEnemy, realTarget, actionType);
      const newHp = Math.max(0, realTarget.hp - damage);

      const newEnemy: Unit = { ...freshEnemy, ap: freshEnemy.ap - attackAp };
      const newRealTarget: Unit = { ...realTarget, hp: newHp };

      let newUnits = updateUnit(currentState.units, newEnemy);
      if (interceptor) {
        const marked: Unit = { ...interceptor, hasIntercepted: true };
        newUnits = updateUnit(newUnits, marked);
      }
      newUnits = updateUnit(newUnits, newRealTarget);

      events.push({ type: 'damage', unitId: realTarget.instanceId, amount: damage, isCrit });
      const critTxt = isCrit ? ' (CRITIQUE!)' : '';
      const typeLabel = useSpell ? 'lance un sort sur' : 'attaque';
      ({ log, events } = appendLogEvent(
        log, events,
        `${freshEnemy.name} ${typeLabel} ${realTarget.name} : ${damage} dégâts${critTxt}.`,
        'enemy',
      ));

      if (newHp <= 0) {
        events.push({ type: 'death', unitId: realTarget.instanceId });
        ({ log, events } = appendLogEvent(log, events, `${realTarget.name} est tombé !`, 'enemy'));
      }

      currentState = { ...currentState, units: newUnits, log };
      currentState = checkVictory(currentState);
      if (currentState.isOver) return { state: currentState, events };
    }
  }

  // Réinitialise les interceptions et applique les effets de statut
  const resetUnits = currentState.units.map(u => ({ ...u, hasIntercepted: false }));
  const tickedUnits = tickStatusEffects(resetUnits);

  return { state: { ...currentState, units: tickedUnits }, events };
}

function chooseEnemyTarget(
  state: CombatState,
  enemy: Unit,
  actionType: 'attack' | 'spell',
): Unit | null {
  const elves = aliveElves(state.units);
  if (elves.length === 0) return null;

  // Priorité : tuer ce tour
  for (const elf of elves) {
    const { damage } = calcDamage(enemy, elf, actionType);
    if (damage >= elf.hp) return elf;
  }

  // Sinon le plus proche
  return elves.reduce((a, b) => (manhattan(enemy, a) <= manhattan(enemy, b) ? a : b));
}

// ============================================
// EFFETS DE STATUT
// ============================================

function tickStatusEffects(units: Unit[]): Unit[] {
  return units.map(u => ({
    ...u,
    statusEffects: u.statusEffects
      .map(fx => ({ ...fx, remaining: fx.remaining - 1 }))
      .filter(fx => fx.remaining > 0),
  }));
}

// ============================================
// VÉRIFICATION VICTOIRE
// ============================================

export function checkVictory(state: CombatState): CombatState {
  if (state.isOver) return state;

  if (aliveEnemies(state.units).length === 0) {
    const log = appendLog(state.log, 'VICTOIRE ! Les ténèbres sont repoussées.', 'system');
    return { ...state, log, isOver: true, winner: 'elf' };
  }

  if (aliveElves(state.units).length === 0) {
    const log = appendLog(state.log, 'DÉFAITE... Les profondeurs vous engloutissent.', 'system');
    return { ...state, log, isOver: true, winner: 'enemy' };
  }

  return state;
}
