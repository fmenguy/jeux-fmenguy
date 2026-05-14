/* ============================================
   AELINDRA · js/combat.js
   Moteur de combat au tour par tour
   ============================================ */

const GRID_COLS = 7;
const GRID_ROWS = 7;

// ============================================
// INITIALISATION DU COMBAT
// ============================================

function initCombat(floorConfig) {
  const units = [];
  const spawnPositions = [{x:1,y:6},{x:3,y:6},{x:4,y:6},{x:5,y:6}];

  G.team.forEach((hero, i) => {
    const stats = calcStats(hero).total;
    units.push({
      ...hero,
      instanceId: 'elf_' + hero.id,
      heroId: hero.id,
      team: 'elf',
      isPlayer: true,
      pos: spawnPositions[i] || {x: i * 2, y: 6},
      hp: stats.hp,
      maxHp: stats.hp,
      mp: stats.mp,
      maxMp: stats.mp,
      ap: hero.baseStats.maxAp || 3,
      maxAp: hero.baseStats.maxAp || 3,
      hasIntercepted: false,
      statusEffects: [],
    });
  });

  floorConfig.enemies.forEach((cfg, i) => {
    const type = ENEMY_TYPES[cfg.type];
    if (!type) return;
    units.push({
      ...type,
      instanceId: 'enemy_' + cfg.type + '_' + i,
      id: cfg.type + '_' + i,
      team: 'enemy',
      isPlayer: false,
      pos: cfg.pos,
      maxHp: type.hp,
      maxAp: type.ap || 2,
      hasIntercepted: false,
      statusEffects: [],
    });
  });

  G.combat = {
    floorConfig,
    grid: buildGrid(units),
    units,
    turn: 1,
    phase: 'elf',
    selected: null,
    action: null,
    log: [],
    isOver: false,
    winner: null,
  };

  elfUnits().forEach(u => { u.ap = u.maxAp; });
  combatLog(`--- Tour 1 : Phase Elfes ---`, 'system');
}

// ============================================
// UTILITAIRES GRILLE
// ============================================

function buildGrid(units) {
  const grid = Array(GRID_ROWS).fill(null).map(() => Array(GRID_COLS).fill(null));
  units.forEach(u => {
    if (u.pos) grid[u.pos.y][u.pos.x] = u.instanceId;
  });
  return grid;
}

function getUnitAt(x, y) {
  if (!G.combat) return null;
  const id = G.combat.grid[y]?.[x];
  return id ? G.combat.units.find(u => u.instanceId === id && u.hp > 0) : null;
}

function moveUnit(unit, newX, newY) {
  const {grid} = G.combat;
  if (unit.pos) grid[unit.pos.y][unit.pos.x] = null;
  unit.pos = {x: newX, y: newY};
  grid[newY][newX] = unit.instanceId;
}

function dist(a, b) {
  return Math.abs(a.pos.x - b.pos.x) + Math.abs(a.pos.y - b.pos.y);
}

function elfUnits()   { return G.combat.units.filter(u => u.team === 'elf'   && u.hp > 0); }
function enemyUnits() { return G.combat.units.filter(u => u.team === 'enemy' && u.hp > 0); }

function getReachableTiles(unit, extraRange) {
  const moveRange = 2 + (extraRange || 0);
  const tiles = [];
  for (let y = 0; y < GRID_ROWS; y++) {
    for (let x = 0; x < GRID_COLS; x++) {
      if (!getUnitAt(x, y) && Math.abs(unit.pos.x - x) + Math.abs(unit.pos.y - y) <= moveRange) {
        tiles.push({x, y});
      }
    }
  }
  return tiles;
}

function getAttackableTargets(unit) {
  const enemies = unit.team === 'elf' ? enemyUnits() : elfUnits();
  const range = unit.baseStats?.range || unit.range || 1;
  return enemies.filter(e => dist(unit, e) <= range);
}

function getAbilityTargets(unit, ability) {
  const tags = ability.tags || [];
  if (tags.includes('heal')) {
    return elfUnits();
  }
  if (tags.includes('aoe')) {
    return enemyUnits();
  }
  return getAttackableTargets(unit);
}

// ============================================
// CALCUL DES STATS
// ============================================

function calcStats(hero) {
  if (!hero.baseStats) return { base: {}, bonus: {}, total: hero };

  const lv = (hero.level || 1) - 1;
  const base = {};

  Object.keys(hero.baseStats).forEach(k => {
    base[k] = Math.round(hero.baseStats[k] + (hero.growth?.[k] || 0) * lv);
  });

  const bonus = { hp:0, mp:0, atk:0, mag:0, def:0, res:0, vit:0, crit:0 };
  const equip = hero.equipped || {};

  if (equip.weapon) {
    const weaponItem = findItem(equip.weapon);
    if (weaponItem) {
      if (weaponItem.atk) bonus.atk += weaponItem.atk;
      if (weaponItem.mag) bonus.mag += weaponItem.mag;
      if (weaponItem.defBonus) bonus.def += weaponItem.defBonus;
    }
  }

  if (equip.body) {
    const bodyItem = findItem(equip.body);
    if (bodyItem) {
      if (bodyItem.def) bonus.def += bodyItem.def;
      if (bodyItem.res) bonus.res += bodyItem.res;
    }
  }

  applySpecBonus(hero.spec, hero.level || 1, bonus);

  const total = {};
  Object.keys(base).forEach(k => {
    total[k] = base[k] + (bonus[k] || 0);
  });

  return { base, bonus, total };
}

function findItem(id) {
  const allItems = Object.values(MARKET_ITEMS).flat();
  return allItems.find(it => it.id === id);
}

function applySpecBonus(spec, level, bonus) {
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

function calcDamage(attacker, defender, actionType = 'attack') {
  const atkStats = attacker.baseStats ? calcStats(attacker).total : attacker;
  const defStats = defender.baseStats ? calcStats(defender).total : defender;

  let raw = 0;

  if (actionType === 'attack') {
    raw = (atkStats.atk || 0) + Math.floor(Math.random() * 3) - 1;
    const reduction = (defStats.def || 0) / ((defStats.def || 0) + 100);
    raw = Math.round(raw * (1 - reduction));
  }

  if (actionType === 'spell') {
    raw = (atkStats.mag || 0) + Math.floor(Math.random() * 4);
    const reduction = (defStats.res || 0) / ((defStats.res || 0) + 100);
    raw = Math.round(raw * (1 - reduction));
    if (attacker.weapon?.minRange && dist(attacker, defender) === 1) {
      raw = Math.round(raw * 0.5);
    }
  }

  const critChance = atkStats.crit || 0;
  const isCrit = Math.random() * 100 < critChance;
  if (isCrit) raw = Math.round(raw * 1.75);

  return { damage: Math.max(1, raw), isCrit };
}

// ============================================
// ACTIONS DU JOUEUR
// ============================================

function playerMove(unit, targetX, targetY) {
  if (unit.ap < 1) return false;
  const reachable = getReachableTiles(unit);
  if (!reachable.find(t => t.x === targetX && t.y === targetY)) return false;

  moveUnit(unit, targetX, targetY);
  unit.ap -= 1;
  combatLog(`${unit.name} se déplace en (${targetX},${targetY}).`, 'elf');
  return true;
}

function playerAttack(attacker, targetInstanceId) {
  if (attacker.ap < 2) return false;
  const target = G.combat.units.find(u => u.instanceId === targetInstanceId && u.hp > 0);
  if (!target || target.team === attacker.team) return false;

  const range = attacker.baseStats?.range || attacker.range || 1;
  if (dist(attacker, target) > range) return false;

  const interceptor = tryIntercept(target, attacker);
  const realTarget = interceptor || target;

  const { damage, isCrit } = calcDamage(attacker, realTarget, 'attack');
  realTarget.hp = Math.max(0, realTarget.hp - damage);
  attacker.ap -= 2;

  const critTxt = isCrit ? ' (CRITIQUE!)' : '';
  const intTxt  = interceptor ? ` [intercepté par ${interceptor.name}]` : '';
  combatLog(`${attacker.name} attaque ${realTarget.name} : ${damage} dégâts${critTxt}${intTxt}.`, 'elf');

  if (realTarget.hp <= 0) combatLog(`${realTarget.name} est éliminé !`, 'elf');

  checkVictory();
  return true;
}

function playerSpell(caster, targetInstanceId) {
  if (caster.ap < 2 || (caster.mp || 0) < 3) return false;
  const target = G.combat.units.find(u => u.instanceId === targetInstanceId && u.hp > 0);
  if (!target || target.team === caster.team) return false;

  const range = caster.baseStats?.range || caster.range || 1;
  if (dist(caster, target) > range) return false;

  const { damage, isCrit } = calcDamage(caster, target, 'spell');
  target.hp = Math.max(0, target.hp - damage);
  caster.ap -= 2;
  caster.mp = Math.max(0, (caster.mp || 0) - 3);

  const critTxt = isCrit ? ' (CRITIQUE!)' : '';
  combatLog(`${caster.name} lance un sort sur ${target.name} : ${damage} dégâts magiques${critTxt}.`, 'elf');

  if (target.hp <= 0) combatLog(`${target.name} est anéanti !`, 'elf');

  checkVictory();
  return true;
}

// ============================================
// SYSTÈME DE COMPÉTENCES
// ============================================

function getUnlockedAbilities(hero) {
  if (!hero.abilities || !hero.level) return [];
  return (hero.abilities || [])
    .map(id => ({ id, ...ABILITIES[id] }))
    .filter(ab => ab.name && ab.lvlReq <= (hero.level || 1));
}

function useAbility(caster, abilityId, targetX, targetY) {
  const ability = ABILITIES[abilityId];
  if (!ability) return false;

  const apCost = ability.apCost || 2;
  const mpCost = ability.mpCost || 0;

  if (caster.ap < apCost) return false;
  if (mpCost > 0 && (caster.mp || 0) < mpCost) return false;

  const atkStats = calcStats(caster).total;
  const tags = ability.tags || [];

  if (tags.includes('passive')) return false;

  if (tags.includes('heal')) {
    const ally = getUnitAt(targetX, targetY);
    if (!ally || ally.team !== caster.team) return false;
    const healAmt = (atkStats.mag || 5) * 2;
    ally.hp = Math.min(ally.maxHp, ally.hp + healAmt);
    caster.ap -= apCost;
    if (mpCost > 0) caster.mp = Math.max(0, caster.mp - mpCost);
    combatLog(`${caster.name} utilise ${ability.name} : soigne ${ally.name} de ${healAmt} PV.`, 'elf');
    checkVictory();
    return true;
  }

  if (tags.includes('mobility')) {
    const reachable = getReachableTiles(caster, 3);
    const tile = reachable.find(t => t.x === targetX && t.y === targetY);
    if (!tile) return false;
    moveUnit(caster, targetX, targetY);
    caster.ap -= apCost;
    if (mpCost > 0) caster.mp = Math.max(0, caster.mp - mpCost);
    combatLog(`${caster.name} utilise ${ability.name} et bondit en (${targetX},${targetY}).`, 'elf');
    return true;
  }

  if (tags.includes('buff_def')) {
    caster.statusEffects = caster.statusEffects || [];
    caster.statusEffects.push({ type: 'buff_def', value: 30, turnsLeft: 2 });
    caster.ap -= apCost;
    if (mpCost > 0) caster.mp = Math.max(0, caster.mp - mpCost);
    combatLog(`${caster.name} utilise ${ability.name} : DEF +30 pendant 2 tours.`, 'elf');
    return true;
  }

  if (tags.includes('aoe')) {
    const cx = targetX;
    const cy = targetY;
    const targets = enemyUnits().filter(e =>
      Math.abs(e.pos.x - cx) + Math.abs(e.pos.y - cy) <= 2
    );
    if (targets.length === 0) return false;
    caster.ap -= apCost;
    if (mpCost > 0) caster.mp = Math.max(0, caster.mp - mpCost);
    targets.forEach(t => {
      const actionType = tags.includes('damage_mag') ? 'spell' : 'attack';
      const { damage, isCrit } = calcDamage(caster, t, actionType);
      const finalDmg = Math.round(damage * 1.5);
      t.hp = Math.max(0, t.hp - finalDmg);
      const critTxt = isCrit ? ' (CRITIQUE!)' : '';
      combatLog(`${ability.name} frappe ${t.name} : ${finalDmg} dégâts${critTxt}.`, 'elf');
      if (t.hp <= 0) combatLog(`${t.name} est éliminé !`, 'elf');
    });
    checkVictory();
    return true;
  }

  const target = getUnitAt(targetX, targetY);
  if (!target || target.team === caster.team || target.hp <= 0) return false;

  const range = caster.baseStats?.range || caster.range || 1;
  if (dist(caster, target) > range) return false;

  let multiplier = 1.2;
  let actionType = 'attack';

  if (tags.includes('damage_phys')) {
    multiplier = 1.5;
    actionType = 'attack';
  } else if (tags.includes('damage_mag')) {
    multiplier = 1.5;
    actionType = 'spell';
  }

  const { damage, isCrit } = calcDamage(caster, target, actionType);
  const finalDmg = Math.round(damage * multiplier);
  target.hp = Math.max(0, target.hp - finalDmg);
  caster.ap -= apCost;
  if (mpCost > 0) caster.mp = Math.max(0, caster.mp - mpCost);

  const critTxt = isCrit ? ' (CRITIQUE!)' : '';
  combatLog(`${caster.name} utilise ${ability.name} sur ${target.name} : ${finalDmg} dégâts${critTxt}.`, 'elf');

  if (target.hp <= 0) combatLog(`${target.name} est éliminé !`, 'elf');

  checkVictory();
  return true;
}

// ============================================
// ABSORPTION DU PROTECTEUR
// ============================================

function tryIntercept(target, attacker) {
  const protectors = G.combat.units.filter(u =>
    u.spec === 'guardian' &&
    u.team === target.team &&
    u.hp > 0 &&
    !u.hasIntercepted &&
    dist(u, target) <= 1
  );
  if (protectors.length > 0) {
    protectors[0].hasIntercepted = true;
    return protectors[0];
  }
  return null;
}

// ============================================
// PHASE ENNEMIE (IA locale améliorée)
// ============================================

function runEnemyTurn() {
  enemyUnits().forEach(u => { u.ap = u.maxAp; });
  combatLog('--- Phase ennemie ---', 'system');

  enemyUnits().forEach(enemy => {
    if (!elfUnits().length) return;

    const useSpell = (enemy.mag || 0) > (enemy.atk || 0);
    const attackAp = 2;

    // Prioriser la cible : tuer si possible, sinon le plus proche
    let target = chooseEnemyTarget(enemy, useSpell);

    const range = enemy.range || 1;

    // Déplacement si hors portée
    if (enemy.ap >= 1 && dist(enemy, target) > range) {
      const dx = Math.sign(target.pos.x - enemy.pos.x);
      const dy = Math.sign(target.pos.y - enemy.pos.y);
      const moves = [
        {x: enemy.pos.x + dx, y: enemy.pos.y},
        {x: enemy.pos.x, y: enemy.pos.y + dy},
        {x: enemy.pos.x + dx, y: enemy.pos.y + dy},
      ];
      for (const m of moves) {
        if (m.x >= 0 && m.x < GRID_COLS && m.y >= 0 && m.y < GRID_ROWS && !getUnitAt(m.x, m.y)) {
          moveUnit(enemy, m.x, m.y);
          enemy.ap--;
          combatLog(`${enemy.name} avance.`, 'enemy');
          break;
        }
      }
    }

    // Attaque si à portée et assez de PA
    if (enemy.ap >= attackAp && dist(enemy, target) <= range) {
      const interceptor = tryIntercept(target, enemy);
      const realTarget = interceptor || target;
      const actionType = useSpell ? 'spell' : 'attack';
      const { damage, isCrit } = calcDamage(enemy, realTarget, actionType);
      realTarget.hp = Math.max(0, realTarget.hp - damage);
      enemy.ap -= attackAp;

      const critTxt = isCrit ? ' (CRITIQUE!)' : '';
      const typeLabel = useSpell ? 'lance un sort sur' : 'attaque';
      combatLog(`${enemy.name} ${typeLabel} ${realTarget.name} : ${damage} dégâts${critTxt}.`, 'enemy');
      if (realTarget.hp <= 0) combatLog(`${realTarget.name} est tombé !`, 'enemy');

      checkVictory();
    }
  });

  G.combat.units.forEach(u => { u.hasIntercepted = false; });
  tickStatusEffects('enemy');
}

function chooseEnemyTarget(enemy, useSpell) {
  const elves = elfUnits();
  const actionType = useSpell ? 'spell' : 'attack';

  // Chercher une cible qu'on peut tuer ce tour
  for (const elf of elves) {
    const { damage } = calcDamage(enemy, elf, actionType);
    if (damage >= elf.hp) return elf;
  }

  // Sinon le plus proche
  return elves.reduce((a, b) => dist(enemy, a) <= dist(enemy, b) ? a : b);
}

function tickStatusEffects(phase) {
  G.combat.units.forEach(u => {
    u.statusEffects = (u.statusEffects || []).filter(fx => {
      fx.turnsLeft--;
      return fx.turnsLeft > 0;
    });
  });
}

// ============================================
// FIN DE TOUR
// ============================================

function endElfTurn() {
  if (!G.combat || G.combat.phase !== 'elf' || G.combat.isOver) return;
  combatLog(`--- Fin du tour ${G.combat.turn} ---`, 'system');
  G.combat.phase = 'enemy';
  G.combat.selected = null;
  G.combat.action = null;

  const btnEnd = document.getElementById('end-turn-btn');
  if (btnEnd) btnEnd.disabled = true;

  setTimeout(() => {
    runEnemyTurn();
    if (!G.combat.isOver) {
      G.combat.turn++;
      G.combat.phase = 'elf';
      elfUnits().forEach(u => {
        u.ap = u.maxAp;
        u.hasIntercepted = false;
      });
      tickStatusEffects('elf');
      combatLog(`--- Tour ${G.combat.turn} : Phase Elfes ---`, 'system');
      if (btnEnd) btnEnd.disabled = false;
      renderCombat();
      updateCombatHUD();
    }
  }, 600);
}

// ============================================
// VÉRIFICATION VICTOIRE
// ============================================

function checkVictory() {
  if (!G.combat || G.combat.isOver) return;

  if (enemyUnits().length === 0) {
    G.combat.isOver = true;
    G.combat.winner = 'elf';
    combatLog('VICTOIRE ! Les ténèbres sont repoussées.', 'system');
    grantCombatRewards(G.combat.floorConfig);
    setTimeout(() => showCombatOverlay('victory'), 400);
    return;
  }
  if (elfUnits().length === 0) {
    G.combat.isOver = true;
    G.combat.winner = 'enemy';
    combatLog('DÉFAITE... Les profondeurs vous engloutissent.', 'system');
    addGold(10);
    saveGame();
    setTimeout(() => showCombatOverlay('defeat'), 400);
  }
}

// ============================================
// RÉCOMPENSES
// ============================================

function grantCombatRewards(floorConfig) {
  const reward = floorConfig.reward || {};
  G.gold += reward.gold || 0;
  G.orbs += reward.orbs || 0;

  G.combat.units
    .filter(u => u.isPlayer && u.hp > 0)
    .forEach(u => {
      const hero = G.team.find(h => h.id === u.heroId);
      if (hero) addXP(hero, reward.xp || 0);
    });

  // Avancement tuto si c'est un étage numéroté
  if (typeof floorConfig.n === 'number') {
    if (floorConfig.n > G.tutoFloor) {
      G.tutoFloor = floorConfig.n;
      if (G.tutoFloor >= 5) G.tutoComplete = true;
    }
    if (floorConfig.heroGift) {
      const hero = STARTER_HEROES.find(h => h.id === floorConfig.heroGift);
      if (hero && !G.team.find(t => t.id === hero.id)) addToTeam(hero);
    }
    updateMission('m4', 1);
  }

  // Avancement donjon post-tuto
  if (floorConfig.dungeonId && typeof floorConfig.floorIdx === 'number') {
    if (!G.dungeonProgress) G.dungeonProgress = { foret: 0, mines: 0, tour: 0 };
    const id = floorConfig.dungeonId;
    if (floorConfig.floorIdx >= (G.dungeonProgress[id] || 0)) {
      G.dungeonProgress[id] = floorConfig.floorIdx + 1;
    }
    const meta = DUNGEONS_META.find(m => m.id === id);
    const totalFloors = meta ? meta.levels : 999;
    if (G.dungeonProgress[id] >= totalFloors) {
      const completedDungeons = Object.keys(G.dungeonProgress).filter(k => {
        const m = DUNGEONS_META.find(x => x.id === k);
        return m && G.dungeonProgress[k] >= m.levels;
      }).length;
      updateMission('m5', completedDungeons - (G.missionProgress.m5?.progress || 0));
    }
  }

  updateMission('m1', 1);
  updateMission('d1', 1);
  saveGame();
}

// ============================================
// OVERLAY FIN DE COMBAT
// ============================================

function showCombatOverlay(result) {
  const existing = document.getElementById('combat-overlay');
  if (existing) existing.remove();

  const reward = G.combat.floorConfig?.reward || {};
  const overlay = document.createElement('div');
  overlay.id = 'combat-overlay';
  overlay.style.cssText = [
    'position:absolute', 'top:0', 'left:0', 'right:0', 'bottom:0',
    'background:rgba(0,0,0,.82)', 'display:flex', 'flex-direction:column',
    'align-items:center', 'justify-content:center', 'gap:14px',
    'z-index:100', 'font-family:var(--font-main)',
  ].join(';');

  if (result === 'victory') {
    const rewardLines = [];
    if (reward.gold) rewardLines.push(`<span style="color:var(--gold)">◈ +${reward.gold} or</span>`);
    if (reward.orbs) rewardLines.push(`<span style="color:var(--orb)">◆ +${reward.orbs} orbes</span>`);
    if (reward.xp)   rewardLines.push(`<span style="color:#7af">+${reward.xp} XP</span>`);

    overlay.innerHTML = `
      <div style="font-size:22px;color:var(--gold);letter-spacing:3px">VICTOIRE !</div>
      <div style="display:flex;flex-direction:column;align-items:center;gap:6px;font-size:11px">
        ${rewardLines.join('')}
      </div>
      <button class="btn-gold" style="margin-top:6px;padding:9px 24px;letter-spacing:2px;font-size:10px"
        onclick="document.getElementById('combat-overlay').remove();window.goScreen('dungeons')">
        CONTINUER
      </button>`;
  } else {
    overlay.innerHTML = `
      <div style="font-size:20px;color:#c44;letter-spacing:3px">DÉFAITE...</div>
      <div style="font-size:9px;color:var(--dim);font-family:var(--font-body)">Tes héros se retirent dans l'obscurité.</div>
      <button class="btn-outline" style="margin-top:6px;padding:9px 24px;letter-spacing:2px;font-size:10px"
        onclick="document.getElementById('combat-overlay').remove();window.goScreen('dungeons')">
        RETOUR AU HUB
      </button>`;
  }

  const screen = document.getElementById('s-combat');
  if (screen) {
    screen.style.position = 'relative';
    screen.appendChild(overlay);
  }
  renderCombat();
}

// ============================================
// HUD DE COMBAT
// ============================================

function updateCombatHUD() {
  if (!G.combat) return;
  const turnInfo = document.getElementById('combat-turn-info');
  const aliveInfo = document.getElementById('combat-alive');
  if (turnInfo) turnInfo.textContent = `TOUR ${G.combat.turn} · PHASE ${G.combat.phase === 'elf' ? 'ELFES' : 'ENNEMIS'}`;
  if (aliveInfo) aliveInfo.textContent = `Elfes: ${elfUnits().length} · Ennemis: ${enemyUnits().length}`;
  updatePanelLeft();
}

function updatePanelLeft() {
  if (!G.combat) return;
  const sel = G.combat.selected ? G.combat.units.find(u => u.instanceId === G.combat.selected) : null;

  const portrait = document.getElementById('sel-portrait');
  const nameEl   = document.getElementById('sel-name');
  const statsEl  = document.getElementById('sel-stats');

  if (!sel) {
    if (portrait) portrait.textContent = '🧝';
    if (nameEl)   nameEl.textContent = 'Aucun';
    if (statsEl)  statsEl.textContent = '';
    renderAbilityButtons([]);
    return;
  }

  if (portrait) portrait.textContent = sel.emoji || '🧝';
  if (nameEl)   nameEl.textContent = sel.name;
  if (statsEl)  statsEl.textContent = `PV ${sel.hp}/${sel.maxHp}  PA ${sel.ap}/${sel.maxAp}  PM ${sel.mp || 0}/${sel.maxMp || 0}`;

  const hero = G.team.find(h => h.id === sel.heroId);
  const abilities = hero ? getUnlockedAbilities(hero) : [];
  renderAbilityButtons(abilities);
}

function renderAbilityButtons(abilities) {
  const container = document.getElementById('ability-btns');
  if (!container) return;
  container.innerHTML = abilities
    .filter(ab => !ab.tags?.includes('passive'))
    .map(ab => {
      const mpTxt = ab.mpCost ? ` · ${ab.mpCost}PM` : '';
      return `<button class="btn-outline" style="font-size:8px;text-align:left;padding:4px 7px;opacity:.9"
        onclick="window.setCombatAction('ability:${ab.id}')" title="${ab.desc}">
        ${ab.icon} ${ab.name} (${ab.apCost}PA${mpTxt})
      </button>`;
    })
    .join('');
}

// ============================================
// XP ET LEVEL UP
// ============================================

function addXP(hero, amount) {
  hero.xp = (hero.xp || 0) + amount;
  let leveled = false;
  while (hero.xp >= getXpCap(hero.level || 1)) {
    hero.xp -= getXpCap(hero.level || 1);
    hero.level = (hero.level || 1) + 1;
    leveled = true;
  }
  return leveled;
}

function getXpCap(level) {
  return Math.round(1000 * Math.pow(1.28, level - 1));
}

// ============================================
// LOG DE COMBAT
// ============================================

function combatLog(msg, type = 'system') {
  if (!G.combat) return;
  G.combat.log.push({ msg, type, ts: Date.now() });
  if (G.combat.log.length > 50) G.combat.log.shift();
}
