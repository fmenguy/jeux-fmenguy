/* ============================================
   AELINDRA · js/utils.js
   Fonctions utilitaires et helpers UI
   ============================================ */

// ---- Sélecteur DOM rapide ----
function $(id) { return document.getElementById(id); }
function $$(sel) { return document.querySelectorAll(sel); }

// ---- Toast ----
function showToast(msg) {
  const t = $('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('on');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('on'), 2400);
}

// ---- Router d'écrans ----
function goScreen(id) {
  $$('.scr').forEach(s => s.classList.remove('on'));
  $('s-' + id)?.classList.add('on');

  const renderers = {
    splash:       renderSplash,
    dungeons:     renderDungeons,
    gouffre:      renderFloors,
    market:       () => renderMarket('armes'),
    guild:        renderGuild,
    heroes:       renderHeroes,
    missions:     renderMissions,
    combat:       renderCombat,
    'hero-detail':     () => { /* rendu déclenché par openHeroDetail */ },
    'dungeon-floors':  () => { if (_currentDungeonId) renderDungeonFloors(_currentDungeonId); },
  };
  renderers[id]?.();
}

// ---- Mise à jour des compteurs de monnaie ----
function updateCurrencies() {
  const goldIds = ['gs','gd','gm','gg'];
  const orbIds  = ['os','og'];
  goldIds.forEach(id => { const el = $(id); if(el) el.textContent = G.gold; });
  orbIds.forEach(id  => { const el = $(id); if(el) el.textContent = G.orbs; });
}

/* ============================================
   AELINDRA · js/guild.js
   Logique de la guilde (gacha)
   ============================================ */

function rollAdventurer(forceEpic = false) {
  if (forceEpic) {
    const epics = GUILD_POOL.filter(h => h.rarity === 'epic' || h.rarity === 'legendary');
    return { ...epics[Math.floor(Math.random() * epics.length)] };
  }
  const total = GUILD_POOL.reduce((sum, h) => sum + h.weight, 0);
  let r = Math.random() * total;
  for (const h of GUILD_POOL) {
    r -= h.weight;
    if (r <= 0) return { ...h };
  }
  return { ...GUILD_POOL[0] };
}

function doPull(n) {
  const cost = n === 1 ? 10 : 90;
  if (!spendOrbs(cost)) { showToast('Pas assez d\'orbes ! Complète des donjons.'); return; }

  const results = [];
  for (let i = 0; i < n; i++) {
    G.pity++;
    const forced = G.pity >= 50;
    if (forced) G.pity = 0;
    const hero = rollAdventurer(forced);
    const isNew = !isHeroOwned(hero.id);
    if (isNew) addToCollection(hero);
    results.push({ ...hero, isNew });
  }

  updateCurrencies();
  showPullResults(results, 'INVOCATION DE LA GUILDE');
  updateMission('m2', 1);
  updateMission('d2', 1);

  // Mettre à jour le pity bar si visible
  const pf = $('gpf'), pt = $('gpt');
  if (pf) pf.style.width = Math.round(G.pity / 50 * 100) + '%';
  if (pt) pt.textContent = G.pity + ' / 50';
  if ($('og')) $('og').textContent = G.orbs;
}

function showPullResults(results, title = 'INVOCATION') {
  $('res-modal-title').textContent = title;
  $('res-modal-cards').innerHTML = results.map((h, i) => {
    const c   = RARITY_COLORS[h.rarity] || RARITY_COLORS.common;
    const bg  = rarityBg(h.rarity);
    const delay = i * 0.06;
    return `<div class="result-card anim-pop" style="border-color:${c};animation-delay:${delay}s">
      <div class="result-card-img" style="background:${bg}">
        ${h.emoji}
        ${h.isNew ? '<span class="result-card-new">NEW</span>' : ''}
      </div>
      <div class="rarity-bar" style="background:${c}"></div>
      <div style="font-size:6px;letter-spacing:1px;padding:2px 0;text-align:center;font-weight:700;background:${bg};color:${c}">${h.rarity.toUpperCase()}</div>
      <div style="font-size:7px;padding:3px 4px;text-align:center;line-height:1.3;background:#080e18;color:${c}">${h.name}</div>
    </div>`;
  }).join('');
  $('res-modal')?.classList.add('on');
}

function rarityBg(rarity) {
  const map = {
    legendary: 'rgba(200,122,32,.15)',
    epic:      'rgba(122,58,170,.12)',
    rare:      'rgba(58,106,170,.10)',
    common:    'rgba(58,154,74,.08)',
  };
  return map[rarity] || map.common;
}

/* ============================================
   AELINDRA · js/market.js
   Logique du marché
   ============================================ */

let _currentMarketTab = 'armes';

function renderMarket(tab) {
  _currentMarketTab = tab || _currentMarketTab;
  if ($('gm')) $('gm').textContent = G.gold;

  const items = MARKET_ITEMS[_currentMarketTab] || [];
  const goldBanner = `
    <div class="gold-banner">
      ◈ Or disponible : <span style="color:var(--gold);font-weight:700"> ${G.gold}</span>
      · Tout s'achète en or
    </div>`;

  const grid = items.map((it, idx) => {
    const c      = RARITY_COLORS[it.rarity] || RARITY_COLORS.common;
    const canBuy = G.gold >= it.price;
    return `<div class="item-card">
      <div class="item-img">${it.emoji}</div>
      <div class="rarity-bar" style="background:${c}"></div>
      <div class="item-body">
        <div class="item-name">${it.name}</div>
        <div class="item-type">${it.type}</div>
        <div class="item-stat">${it.stat}</div>
        <div class="item-price">
          <span style="color:var(--gold)">◈</span>
          <span style="color:var(--gold);font-size:11px;font-weight:700">${it.price}</span>
        </div>
        ${canBuy
          ? `<button class="buy-btn" style="border-color:${c};color:${c}" onclick="buyItem('${_currentMarketTab}',${idx})">ACHETER</button>`
          : `<div class="buy-btn-disabled">Or insuffisant</div>`}
      </div>
    </div>`;
  }).join('');

  const body = $('mkt-body');
  if (body) body.innerHTML = goldBanner + `<div class="item-grid">${grid}</div>`;
}

function switchMarketTab(tab, btn) {
  $$('.mkt-tab').forEach(t => t.classList.remove('on'));
  btn?.classList.add('on');
  renderMarket(tab);
}

function buyItem(tab, idx) {
  const item = MARKET_ITEMS[tab]?.[idx];
  if (!item) return;
  if (!spendGold(item.price)) { showToast('Pas assez d\'or !'); return; }

  // Ajouter à l'inventaire
  const existing = G.inventory.find(i => i.itemId === item.id);
  if (existing) existing.quantity++;
  else G.inventory.push({ itemId: item.id, quantity: 1 });

  saveGame();
  updateMission('d3', 1);
  showToast(`${item.name} acheté !`);
  renderMarket(tab);
  updateCurrencies();
}

/* ============================================
   AELINDRA · js/dungeons.js
   Logique des donjons et paliers du Gouffre
   ============================================ */

function renderDungeons() {
  updateCurrencies();
  const tutoProgress = Math.round(G.tutoFloor / 5 * 100);

  const tutoCard = `
    <div class="dc dc-tut" onclick="goScreen('gouffre')">
      <div class="dc-ic">🕳️</div>
      <div class="dc-inf">
        <div class="dc-nm">Le Gouffre des Origines</div>
        <div class="dc-ds">5 paliers dans les profondeurs. Un héros offert à chaque descente.</div>
        <div class="tags">
          <span class="tag tag-tuto">TUTORIEL</span>
          <span class="tag tag-floor">5 PALIERS</span>
          <span class="tag tag-reward">+30 Orbes</span>
        </div>
        <div class="bar-wrap" style="margin-top:4px">
          <div class="bar-bg" style="flex:1">
            <div class="bar-fill" style="width:${tutoProgress}%;background:var(--gold)"></div>
          </div>
          <span style="font-size:8px;color:var(--dim);font-family:var(--font-body)">${G.tutoFloor}/5</span>
        </div>
      </div>
    </div>`;

  const otherCards = POST_TUTO_DUNGEONS.map(d => {
    const locked = G.tutoFloor < d.unlockAfterFloor;
    const meta   = DUNGEONS_META.find(m => m.id === d.id);
    const totalFloors = meta ? meta.levels : d.floors;
    const cleared = G.dungeonProgress[d.id] || 0;
    const pct = Math.round(cleared / totalFloors * 100);
    const clickHandler = locked ? '' : `onclick="openDungeon('${d.id}')"`;
    return `<div class="dc${locked ? ' dc-locked' : ''}" ${clickHandler} style="${!locked ? 'cursor:pointer' : ''}">
      <div class="dc-ic">${d.emoji}</div>
      <div class="dc-inf">
        <div class="dc-nm">${d.name}</div>
        <div class="dc-ds">${d.desc}</div>
        <div class="tags">
          <span class="tag tag-floor">${totalFloors} ÉTAGES</span>
          ${locked
            ? `<span class="tag tag-locked">🔒 Palier ${d.unlockAfterFloor} requis</span>`
            : `<span class="tag tag-reward">${d.reward}</span>`}
        </div>
        ${!locked ? `
        <div class="bar-wrap" style="margin-top:4px">
          <div class="bar-bg" style="flex:1">
            <div class="bar-fill" style="width:${pct}%;background:var(--gold)"></div>
          </div>
          <span style="font-size:8px;color:var(--dim);font-family:var(--font-body)">${cleared}/${totalFloors}</span>
        </div>` : ''}
      </div>
    </div>`;
  }).join('');

  const list = $('dlist');
  if (list) list.innerHTML = tutoCard + otherCards;
}

function openDungeon(dungeonId) {
  _currentDungeonId = dungeonId;
  renderDungeonFloors(dungeonId);
  goScreen('dungeon-floors');
}

let _currentDungeonId = null;

function renderDungeonFloors(dungeonId) {
  const meta   = DUNGEONS_META.find(m => m.id === dungeonId);
  const floors = POST_DUNGEON_FLOORS[dungeonId] || [];
  const cleared = G.dungeonProgress[dungeonId] || 0;

  const titleEl = $('dungeon-floors-title');
  const descEl  = $('dungeon-floors-desc');
  const wrapEl  = $('dungeon-floors-wrap');
  if (titleEl) titleEl.textContent = meta ? meta.name.toUpperCase() : dungeonId.toUpperCase();
  if (descEl)  descEl.textContent  = meta ? `${meta.depth} · ${meta.description}` : '';

  if (!wrapEl) return;
  wrapEl.innerHTML = floors.map((f, i) => {
    const done = i < cleared;
    const cur  = i === cleared;
    const lock = i > cleared;
    return `<div class="fc${done ? ' fc-dn' : cur ? ' fc-cu' : ' fc-lock'}">
      <div class="fc-depth">PROF. ${f.depth || '?'}</div>
      <div style="display:flex;align-items:center;gap:7px;margin-bottom:5px">
        <div class="fc-num">${done ? '✓' : cur ? '▶' : '🔒'} ÉTAGE ${i + 1}</div>
        <div style="font-size:10px;letter-spacing:.3px">· ${f.name}</div>
      </div>
      <div style="font-size:9px;color:var(--dim);font-family:var(--font-body);margin-bottom:5px">
        ${f.enemies.length} ennemis${f.isBoss ? ' · BOSS' : ''}
      </div>
      <div style="display:flex;gap:8px;margin-top:4px;font-size:8px">
        <span style="color:var(--gold)">◈ ${f.reward.gold}</span>
        <span style="color:var(--orb)">◆ ${f.reward.orbs}</span>
        <span style="color:var(--dim)">XP +${f.reward.xp}</span>
      </div>
      ${cur ? `<button class="fc-enter-btn" onclick="enterDungeonFloor('${dungeonId}', ${i})">▶ ENTRER</button>` : ''}
      ${done ? '<div style="text-align:center;font-size:8px;color:var(--green);margin-top:5px;letter-spacing:1px">COMPLÉTÉ ✓</div>' : ''}
    </div>`;
  }).join('');
}

function enterDungeonFloor(dungeonId, floorIdx) {
  if (!G.team.length) { showToast('Ton équipe est vide !'); return; }
  const floors = POST_DUNGEON_FLOORS[dungeonId];
  if (!floors || !floors[floorIdx]) { showToast('Étage introuvable.'); return; }
  const f = floors[floorIdx];
  const floorConfig = {
    id: f.id,
    name: f.name,
    enemies: f.enemies,
    reward: f.reward,
    isBoss: f.isBoss || false,
    dungeonId,
    floorIdx,
  };
  initCombat(floorConfig);
  goScreen('combat');
}

function renderFloors() {
  const wrap = $('fw');
  if (!wrap) return;

  wrap.innerHTML = TUTO_FLOORS.map((f, i) => {
    const done = i < G.tutoFloor;
    const cur  = i === G.tutoFloor;
    const lock = i > G.tutoFloor;

    const giftHero = f.heroGift ? STARTER_HEROES.find(h => h.id === f.heroGift) : null;

    return `<div class="fc${done ? ' fc-dn' : cur ? ' fc-cu' : lock ? ' fc-lock' : ''}">
      <div class="fc-depth">PROF. ${f.depth}</div>
      <div style="display:flex;align-items:center;gap:7px;margin-bottom:5px">
        <div class="fc-num">${done ? '✓' : cur ? '▶' : '🔒'} PALIER ${f.n}</div>
        <div style="font-size:10px;letter-spacing:.3px">· ${f.name}</div>
      </div>
      <div style="font-size:9px;color:var(--dim);font-family:var(--font-body);line-height:1.4;margin-bottom:5px">${f.desc}</div>

      ${giftHero ? `
        <div class="fc-gift">
          <span style="font-size:16px">${giftHero.emoji}</span>
          <div class="fc-gift-text">
            <strong style="color:var(--gold)">${giftHero.name}</strong> rejoint ton équipe !<br>
            <span style="font-size:8px;color:var(--dim)">${giftHero.class} · ${giftHero.race}</span>
          </div>
          ${cur ? '<span class="fc-new">NOUVEAU</span>' : done ? '<span style="font-size:8px;color:var(--green)">✓</span>' : ''}
        </div>` : ''}

      <div style="font-size:8px;color:var(--dim);font-family:var(--font-body)">⚔ ${f.enemies}</div>
      <div style="display:flex;gap:8px;margin-top:4px;font-size:8px">
        <span style="color:var(--gold)">◈ ${f.reward.gold}</span>
        <span style="color:var(--orb)">◆ ${f.reward.orbs}</span>
        ${f.reward.special ? `<span style="font-size:7px;color:var(--epic)">${f.reward.special}</span>` : ''}
      </div>

      ${cur ? `<button class="fc-enter-btn" onclick="enterFloor(${i + 1})">▶ ENTRER DANS CE PALIER</button>` : ''}
      ${done ? `<div style="text-align:center;font-size:8px;color:var(--green);margin-top:5px;letter-spacing:1px">PALIER COMPLÉTÉ ✓</div>` : ''}
    </div>`;
  }).join('');
}

function enterFloor(floorNum) {
  const tutoFloor = TUTO_FLOORS[floorNum - 1];
  // Si équipe vide, donner le héros du palier AVANT le combat (sinon impossible d'entrer)
  if (!G.team.length && tutoFloor?.heroGift) {
    const gift = STARTER_HEROES.find(h => h.id === tutoFloor.heroGift);
    if (gift) {
      addToTeam(gift);
      showToast(`${gift.name} rejoint ton équipe !`);
    }
  }
  if (!G.team.length) { showToast('Ton équipe est vide !'); return; }
  const enemyCfg  = FLOOR_ENEMY_CONFIGS[floorNum];
  if (!tutoFloor || !enemyCfg) { simulateFloorClear(floorNum); return; }

  const floorConfig = {
    n: tutoFloor.n,
    name: tutoFloor.name,
    enemies: enemyCfg,
    reward: { gold: tutoFloor.reward.gold, orbs: tutoFloor.reward.orbs, xp: 60 },
    heroGift: tutoFloor.heroGift || null,
    isBoss: false,
  };
  initCombat(floorConfig);
  goScreen('combat');
}

function simulateFloorClear(floorNum) {
  // MVP : victoire automatique (à remplacer par le vrai combat)
  const f = TUTO_FLOORS[floorNum - 1];
  if (!f) return;

  addGold(f.reward.gold);
  addOrbs(f.reward.orbs);

  if (f.heroGift) {
    const hero = STARTER_HEROES.find(h => h.id === f.heroGift);
    if (hero && !isHeroOwned(hero.id) && !G.team.find(t => t.id === hero.id)) {
      addToTeam(hero);
    }
  }

  if (floorNum > G.tutoFloor) G.tutoFloor = floorNum;
  if (G.tutoFloor >= 5) G.tutoComplete = true;

  updateMission('m1', 1);
  updateMission('m4', 1);
  updateMission('m5', 1);
  updateMission('d1', 1);

  saveGame();
  updateCurrencies();
  renderFloors();
  renderSplash();

  if (G.tutoComplete) showToast('Gouffre terminé ! Nouveaux donjons débloqués !');
  else showToast(`Palier ${floorNum} vaincu ! ◈+${f.reward.gold} ◆+${f.reward.orbs}`);
}

/* ============================================
   AELINDRA · js/ui.js
   Fonctions de rendu des écrans principaux
   ============================================ */

function renderSplash() {
  const pav = $('pav'), pnm = $('pnm');
  if (pav) pav.textContent = G.playerName[0].toUpperCase();
  if (pnm) pnm.textContent = G.playerName;
  updateCurrencies();

  const badge = $('tutbdg');
  if (badge) badge.style.display = G.tutoComplete ? 'none' : 'block';

  const teamRow = $('team-row');
  if (!teamRow) return;

  if (G.team.length) {
    teamRow.innerHTML = G.team.map(h => `
      <div class="hchip" onclick="goScreen('heroes')">
        <span style="font-size:15px;flex-shrink:0">${h.emoji}</span>
        <div>
          <div style="font-size:8px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;letter-spacing:.3px">${h.name}</div>
          <div style="font-size:7px;color:var(--dim);font-family:var(--font-body)">${h.class}</div>
        </div>
      </div>`).join('');
  } else {
    teamRow.innerHTML = `<div style="font-size:9px;color:var(--dim);font-family:var(--font-body);font-style:italic">Commence par le donjon tutoriel</div>`;
  }
}

function renderGuild() {
  updateCurrencies();
  const body = $('guild-body');
  if (!body) return;

  const roster = G.collection;
  body.innerHTML = `
    <div class="guild-info">
      La <strong style="color:var(--gold)">Guilde d'Aelindra</strong> accueille des aventuriers de tout le royaume.
      Invoque-les avec tes orbes runiques. <em>Pity : Épique garanti tous les 50 essais.</em>
    </div>
    <div class="guild-pull">
      <div class="guild-orb" id="gorb" onclick="doPull(1)">⚔️</div>
      <div class="pity-wrap">
        <div class="pity-lbl"><span>PITY</span><span id="gpt">${G.pity} / 50</span></div>
        <div class="pity-bg"><div class="pity-fill" id="gpf" style="width:${Math.round(G.pity/50*100)}%"></div></div>
        <div style="font-size:8px;color:var(--dim);margin-top:2px;font-family:var(--font-body)">Épique garanti à 50 invocations</div>
      </div>
      <div class="pull-btns">
        <button class="pb1" onclick="doPull(1)">
          <span>×1 INVOCATION</span>
          <span style="font-size:8px;color:var(--orb);font-family:var(--font-body)">◆ 10 orbes</span>
        </button>
        <button class="pb10" onclick="doPull(10)">
          <span>×10 INVOCATIONS</span>
          <span style="font-size:8px;color:var(--orb)">◆ 90 orbes</span>
        </button>
      </div>
      <div class="rate-pills">
        <span class="rp rp-c">Commun 28%</span>
        <span class="rp rp-r">Rare 54%</span>
        <span class="rp rp-e">Épique 16%</span>
        <span class="rp rp-l">Légendaire 2%</span>
      </div>
    </div>
    ${roster.length ? `
      <div class="guild-roster">
        <div style="font-size:8px;letter-spacing:2px;color:var(--dim2)">AVENTURIERS RECRUTÉS (${roster.length})</div>
        <div class="roster-grid">
          ${roster.map(h => `
            <div class="roster-hero">
              <div class="roster-port" style="border-color:${RARITY_COLORS[h.rarity]||RARITY_COLORS.common}">${h.emoji}</div>
              <div style="font-size:7px;color:var(--dim);text-align:center;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;width:100%;font-family:var(--font-body)">${h.name.split(' ')[0]}</div>
            </div>`).join('')}
        </div>
      </div>` : ''}
  `;
}

function renderHeroes() {
  const all = [...G.team, ...G.collection.filter(h => !G.team.find(t => t.id === h.id))];
  const list = $('heroes-list');
  if (!list) return;

  list.innerHTML = all.length
    ? all.map(h => {
        const c = RARITY_COLORS[h.rarity] || RARITY_COLORS.common;
        const stats = calcStats(h);
        const xpPct = Math.round((h.xp || 0) / getXpCap(h.level || 1) * 100);
        const equip = h.equipped || {};
        const allItems = Object.values(MARKET_ITEMS).flat();
        const wDef = equip.weapon ? allItems.find(it => it.id === equip.weapon) : null;
        const bDef = equip.body   ? allItems.find(it => it.id === equip.body)   : null;
        return `<div class="hero-row" onclick="openHeroDetail('${h.id}')">
          <div class="hero-portrait" style="width:48px;height:56px">
            ${h.imagePath ? `<img src="${h.imagePath}" alt="${h.name}">` : `<span style="font-size:24px">${h.emoji}</span>`}
            <div class="rarity-bar" style="background:${c};position:absolute;bottom:0;left:0;right:0;height:2px"></div>
          </div>
          <div style="flex:1;min-width:0">
            <div style="font-size:10px;color:${c};letter-spacing:.5px;margin-bottom:2px">${h.name}</div>
            <div style="font-size:8px;color:var(--dim);font-family:var(--font-body);margin-bottom:4px">${h.race} · ${h.class} · LV.${h.level||1}</div>
            <div style="display:flex;gap:8px;font-size:9px;font-family:var(--font-body);color:var(--text)">
              <span>❤️ ${stats.total.hp}</span>
              <span>⚔️ ${stats.total.atk}</span>
              <span>✨ ${stats.total.mag}</span>
              <span>🛡️ ${stats.total.def}</span>
            </div>
            <div class="bar-wrap" style="margin-top:5px">
              <span style="font-size:7px;color:var(--dim);letter-spacing:1px">XP</span>
              <div class="bar-bg"><div class="bar-fill" style="width:${xpPct}%;background:var(--orb)"></div></div>
              <span style="font-size:8px;color:var(--dim);font-family:var(--font-body)">${h.xp||0}/${getXpCap(h.level||1)}</span>
            </div>
            <div style="display:flex;gap:4px;flex-wrap:wrap;margin-top:4px">
              ${wDef ? `<div style="display:inline-flex;align-items:center;gap:3px;font-size:8px;color:var(--gold);background:rgba(200,168,75,.06);border:1px solid rgba(200,168,75,.12);padding:2px 6px;border-radius:2px">${wDef.emoji} ${wDef.name}</div>` : (h.weapon ? `<div style="display:inline-flex;align-items:center;gap:3px;font-size:8px;color:var(--gold);background:rgba(200,168,75,.06);border:1px solid rgba(200,168,75,.12);padding:2px 6px;border-radius:2px">${h.weapon.emoji} ${h.weapon.name}</div>` : '')}
              ${bDef ? `<div style="display:inline-flex;align-items:center;gap:3px;font-size:8px;color:var(--orb);background:rgba(58,138,238,.06);border:1px solid rgba(58,138,238,.12);padding:2px 6px;border-radius:2px">${bDef.emoji} ${bDef.name}</div>` : ''}
            </div>
          </div>
          <div style="font-size:8px;color:var(--dim2);padding-left:4px;flex-shrink:0">›</div>
        </div>`;
      }).join('')
    : `<div style="padding:20px;text-align:center;font-size:10px;color:var(--dim);font-family:var(--font-body)">
        Aucun héros encore.<br>Complète le tutoriel ou invoque à la guilde.
      </div>`;
}

/* ============================================
   AELINDRA · Détail héros et équipement
   ============================================ */

let _currentDetailHeroId = null;

function openHeroDetail(heroId) {
  _currentDetailHeroId = heroId;
  $$('.scr').forEach(s => s.classList.remove('on'));
  $('s-hero-detail')?.classList.add('on');
  renderHeroDetail(heroId);
}

function renderHeroDetail(heroId) {
  const hero = G.team.find(h => h.id === heroId) || G.collection.find(h => h.id === heroId);
  if (!hero) return;

  const nameEl = $('hero-detail-name');
  if (nameEl) nameEl.textContent = hero.name;

  // --- Stats ---
  const stats = calcStats(hero);
  const st = stats.total;
  const statsEl = $('hero-detail-stats');
  if (statsEl) {
    const rows = [
      ['❤️ PV',    st.hp],
      ['⚔️ ATK',   st.atk],
      ['✨ MAG',   st.mag],
      ['🛡️ DEF',   st.def],
      ['💫 RES',   st.res],
      ['🎯 Portée', st.range || hero.baseStats?.range || 1],
      ['⚡ VIT',   st.vit],
      ['🎲 CRIT',  (st.crit || 0) + '%'],
      ['⭐ Niveau', hero.level || 1],
      ['📈 XP',    (hero.xp || 0) + ' / ' + getXpCap(hero.level || 1)],
    ];
    statsEl.innerHTML = rows.map(([label, val]) =>
      `<div class="stat-row"><span>${label}</span><span>${val}</span></div>`
    ).join('');
  }

  // --- Slots d'équipement ---
  const equip = hero.equipped || {};
  const allItems = Object.values(MARKET_ITEMS).flat();

  const slotsEl = $('hero-equip-slots');
  if (slotsEl) {
    const slots = [
      { key: 'weapon', label: 'Arme' },
      { key: 'body',   label: 'Armure' },
    ];
    slotsEl.innerHTML = slots.map(({ key, label }) => {
      const itemId = equip[key];
      if (itemId) {
        const itemDef = allItems.find(it => it.id === itemId);
        const itemName = itemDef ? `${itemDef.emoji} ${itemDef.name}` : itemId;
        const itemStat = itemDef ? itemDef.stat : '';
        return `<div class="equip-slot">
          <span class="slot-label">${label}</span>
          <span class="slot-item">
            <strong>${itemName}</strong>
            ${itemStat ? `<br><span style="font-size:0.7rem;color:var(--green)">${itemStat}</span>` : ''}
          </span>
          <button onclick="doUnequip('${heroId}','${key}')">Retirer</button>
        </div>`;
      } else {
        return `<div class="equip-slot">
          <span class="slot-label">${label}</span>
          <span class="slot-item empty">Aucun équipement</span>
        </div>`;
      }
    }).join('');
  }

  // --- Inventaire filtré (armes et armures seulement, pas les potions) ---
  const equipableItems = G.inventory.filter(inv => {
    const def = allItems.find(it => it.id === inv.itemId);
    if (!def) return false;
    const t = (def.type || '').toLowerCase();
    return !t.startsWith('consommable');
  });

  const gridEl = $('hero-inventory-grid');
  if (gridEl) {
    if (equipableItems.length === 0) {
      gridEl.innerHTML = `<div style="grid-column:1/-1;font-size:0.78rem;color:var(--dim);font-family:var(--font-body);font-style:italic;padding:6px 0">Aucun équipement dans l'inventaire.</div>`;
    } else {
      gridEl.innerHTML = equipableItems.map(inv => {
        const def = allItems.find(it => it.id === inv.itemId);
        if (!def) return '';
        const qLabel = inv.quantity > 1 ? ` ×${inv.quantity}` : '';
        return `<div class="equip-item-card" onclick="doEquip('${heroId}','${inv.itemId}')">
          <div class="item-name">${def.emoji} ${def.name}${qLabel}</div>
          <div class="item-bonus">${def.stat}</div>
          <div style="font-size:0.68rem;color:var(--dim);margin-top:2px">${def.type}</div>
        </div>`;
      }).join('');
    }
  }
}

function renderCombat() {
  if (!G.combat) return;
  const grid = $('combat-grid');
  if (!grid) return;

  updateCombatHUD();

  grid.style.gridTemplateColumns = `repeat(${GRID_COLS}, 72px)`;
  grid.innerHTML = '';

  const sel = G.combat.selected ? G.combat.units.find(u => u.instanceId === G.combat.selected) : null;
  let reachable = [], attackable = [];

  const action = G.combat.action || '';
  const isAbility = action.startsWith('ability:');
  const abilityId = isAbility ? action.slice(8) : null;
  const ability = abilityId ? ABILITIES[abilityId] : null;

  if (sel && action === 'move') {
    reachable = getReachableTiles(sel).map(t => `${t.x},${t.y}`);
  }
  if (sel && (action === 'attack' || action === 'spell')) {
    attackable = getAttackableTargets(sel).map(u => `${u.pos.x},${u.pos.y}`);
  }
  if (sel && isAbility && ability) {
    const abTags = ability.tags || [];
    if (abTags.includes('heal')) {
      attackable = elfUnits().map(u => `${u.pos.x},${u.pos.y}`);
    } else if (abTags.includes('mobility')) {
      reachable = getReachableTiles(sel, 3).map(t => `${t.x},${t.y}`);
    } else if (abTags.includes('aoe')) {
      attackable = enemyUnits().map(u => `${u.pos.x},${u.pos.y}`);
    } else {
      attackable = getAttackableTargets(sel).map(u => `${u.pos.x},${u.pos.y}`);
    }
  }

  for (let y = 0; y < GRID_ROWS; y++) {
    for (let x = 0; x < GRID_COLS; x++) {
      const tile = document.createElement('div');
      tile.className = 'tile';
      tile.dataset.x = x;
      tile.dataset.y = y;
      const key = `${x},${y}`;

      if (reachable.includes(key))  tile.classList.add('reachable');
      if (attackable.includes(key)) tile.classList.add('attackable');

      const unit = getUnitAt(x, y);
      if (unit) {
        const heroData = unit.heroId ? (G.team.find(h => h.id === unit.heroId) || G.collection.find(h => h.id === unit.heroId)) : null;
        if (heroData?.imagePath) {
          tile.innerHTML = `<img class="unit-portrait" src="${heroData.imagePath}" alt="${unit.name}" onerror="this.replaceWith(Object.assign(document.createElement('span'),{textContent:'${unit.emoji}',style:'font-size:24px'}))">`;
        } else {
          tile.innerHTML = `<span style="font-size:24px">${unit.emoji}</span>`;
        }
        const hpPct = Math.round(unit.hp / unit.maxHp * 100);
        tile.innerHTML += `<div class="hp-bar"><div class="hp-fill" style="width:${hpPct}%"></div></div>`;

        // AP dots
        const dots = document.createElement('div');
        dots.className = 'ap-dots';
        for (let i = 0; i < unit.maxAp; i++) {
          const d = document.createElement('div');
          d.className = 'ap-dot' + (i >= unit.ap ? ' used' : '');
          dots.appendChild(d);
        }
        tile.appendChild(dots);

        if (sel && unit.instanceId === sel.instanceId) tile.classList.add('selected-unit');
      }

      tile.addEventListener('click', () => handleTileClick(x, y));
      grid.appendChild(tile);
    }
  }

  updateCombatLog();
}

function handleTileClick(x, y) {
  if (!G.combat || G.combat.phase !== 'elf') return;
  const { action, selected } = G.combat;
  const unitAtTile = getUnitAt(x, y);
  const selUnit = selected ? G.combat.units.find(u => u.instanceId === selected) : null;

  if (action === 'move' && selUnit) {
    if (playerMove(selUnit, x, y)) { G.combat.action = null; renderCombat(); }
    return;
  }
  if ((action === 'attack' || action === 'spell') && selUnit && unitAtTile) {
    const ok = action === 'attack'
      ? playerAttack(selUnit, unitAtTile.instanceId)
      : playerSpell(selUnit, unitAtTile.instanceId);
    if (ok) { G.combat.action = null; renderCombat(); }
    return;
  }
  if (action && action.startsWith('ability:') && selUnit) {
    const abilityId = action.slice(8);
    const ok = useAbility(selUnit, abilityId, x, y);
    if (ok) { G.combat.action = null; renderCombat(); }
    return;
  }
  // Sélectionner une unité elfe
  if (unitAtTile && unitAtTile.team === 'elf') {
    G.combat.selected = unitAtTile.instanceId;
    G.combat.action = null;
    renderCombat();
  } else {
    G.combat.selected = null;
    G.combat.action = null;
    renderCombat();
  }
}

function updateCombatLog() {
  const logEl = $('combat-log-entries');
  if (!logEl || !G.combat) return;
  logEl.innerHTML = G.combat.log.slice(-20).map(e =>
    `<div class="log-entry log-${e.type}">${e.msg}</div>`
  ).join('');
  logEl.scrollTop = logEl.scrollHeight;
}

/* ---- Overlay Nom du Joueur ---- */
function openNameEdit() {
  const inp = $('name-input');
  if (inp) inp.value = G.playerName;
  $('name-overlay')?.classList.add('on');
  setTimeout(() => inp?.focus(), 80);
}

function savePlayerName() {
  const v = $('name-input')?.value.trim();
  if (v) G.playerName = v;
  $('name-overlay')?.classList.remove('on');
  saveGame();
  renderSplash();
  showToast('Nom mis à jour !');
}

/* ============================================
   AELINDRA · js/missions.js
   Rendu de l'écran missions
   ============================================ */

function renderMissions() {
  resetDailyMissions();

  const renderList = (missions, containerId) => {
    const el = $(containerId);
    if (!el) return;
    el.innerHTML = missions.map(m => {
      const prog = G.missionProgress[m.id] || { done: false, progress: 0, claimed: false };
      const rewardParts = [];
      if (m.reward.gold) rewardParts.push(m.reward.gold + ' or');
      if (m.reward.orbs) rewardParts.push(m.reward.orbs + ' orbes');
      const rewardStr = rewardParts.join(' + ');
      const pct = Math.min(100, Math.round((prog.progress / m.total) * 100));
      return `
        <div class="mission-card ${prog.claimed ? 'claimed' : ''}">
          <div class="mission-header">
            <span class="mission-name">${m.name}</span>
            <span class="mission-reward">${rewardStr}</span>
          </div>
          <p class="mission-desc">${m.desc}</p>
          <div class="mission-progress-bar"><div style="width:${pct}%"></div></div>
          <div class="mission-footer">
            <span>${prog.progress}/${m.total}</span>
            ${prog.done && !prog.claimed ? `<button onclick="doClaimMission('${m.id}')">Réclamer</button>` : ''}
            ${prog.claimed ? '<span class="mission-done-tag">Terminée</span>' : ''}
          </div>
        </div>`;
    }).join('');
  };

  renderList(MAIN_MISSIONS,  'missions-main-list');
  renderList(DAILY_MISSIONS, 'missions-daily-list');

  const today = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  const infoEl = $('daily-reset-info');
  if (infoEl) infoEl.textContent = 'Réinitialisation à minuit · ' + today;

  updateCurrencies();
}
