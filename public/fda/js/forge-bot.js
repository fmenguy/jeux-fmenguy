// Bot de test FDA — suit la progression naturelle du jeu comme un vrai joueur.
// Console : forgeBot.start()  forgeBot.stop()  forgeBot.report()

(function () {
  const TICK_MS = 300;

  function log(msg) {
    const t = new Date().toLocaleTimeString();
    console.log(`%c[BOT ${t}]%c ${msg}`, 'color:#ffd986;font-weight:bold', 'color:inherit');
  }

  function btn(id) {
    const el = document.getElementById(id);
    if (!el || el.disabled || el.offsetParent === null) return false;
    el.click();
    return true;
  }

  function resBtn(res) {
    const el = document.querySelector(`.res[data-res="${res}"] .res-btn`);
    if (!el || el.disabled) return false;
    el.click();
    return true;
  }

  function n(id) {
    const el = document.getElementById(id);
    return el ? (parseInt(el.textContent, 10) || 0) : 0;
  }

  function visible(id) {
    const el = document.getElementById(id);
    return !!(el && el.offsetParent !== null);
  }

  const milestones = new Set();
  function mark(label) {
    if (milestones.has(label)) return;
    milestones.add(label);
    log('JALON : ' + label);
  }

  // Phase courante du bot
  let phase = 'early';

  function decide() {
    const berries = n('berries');
    const wood    = n('wood');
    const stone   = n('stone');
    const water   = n('water');
    const fibers  = n('fibers');
    const axes    = n('axes');
    const buckets = n('buckets');
    const coats   = n('coats');
    const villagers  = n('villagers');
    const pickers    = n('pickers');
    const hunters    = n('hunters');
    const tinkers    = n('tinkers');
    const chief      = n('chief');
    const villages   = n('villages');
    const sawmills   = n('sawmills');
    const quarries   = n('stoneQuarries');
    const wells      = n('wells');
    const explorers  = n('explorers');

    // Jalons
    if (villagers >= 10)  mark('10 villageois');
    if (villagers >= 25)  mark('25 villageois');
    if (axes >= 25)       mark('25 haches');
    if (chief >= 1)       mark('chef nomme');
    if (villages >= 1)    mark('village fonde');
    if (tinkers >= 1)     mark('bricoleur');
    if (sawmills >= 1)    mark('scierie');
    if (quarries >= 1)    mark('carriere');
    if (coats >= villagers && villagers > 0) mark('manteaux ok');

    // Detecter la phase courante
    if      (villages >= 1 && sawmills >= 1 && quarries >= 1) phase = 'mid';
    else if (chief >= 1)  phase = 'village';
    else if (villagers >= 25 && axes >= 10) phase = 'chef';
    else                  phase = 'early';

    // ── SURVIE : eviter les morts ──────────────────────────────────────
    if (berries < 3 && villagers > 0) { resBtn('baies'); return; }
    if (water < 3 && villagers > 0)   { resBtn('eau'); return; }

    // Hiver : fabriquer des manteaux en priorite
    if (visible('craftCoatBtn') && coats < villagers) {
      if (btn('craftCoatBtn')) return;
    }

    // ── PHASE EARLY : objectif "25 villageois + 25 haches" ──────────────
    if (phase === 'early') {
      // Recruter jusqu'a 25 (par paliers pour laisser les ressources)
      if (villagers < 25 && berries >= 5) {
        if (btn('recruitVillagerBtn')) return;
      }

      // Fabriquer des haches en parallele (objectif chef)
      if (axes < 25 && wood >= 5 && stone >= 2) {
        if (btn('craftAxeBtn')) return;
      }

      // Recruter cueilleur a 10 villageois
      if (villagers >= 10 && pickers === 0 && visible('pickerSection')) {
        if (btn('recruitPickerBtn')) return;
      }

      // Collecter : alterner baies/bois/pierre selon besoins
      if (berries < 30) { resBtn('baies'); return; }
      if (wood < 20)    { resBtn('bois');  return; }
      if (stone < 10)   { resBtn('pierre'); return; }
      resBtn('baies');
      return;
    }

    // ── PHASE CHEF : nommer chef puis fonder village ─────────────────────
    if (phase === 'chef') {
      if (axes < 25) { if (btn('craftAxeBtn')) return; }

      if (chief === 0 && villagers >= 25 && axes >= 25) {
        if (btn('appointChiefBtn')) return;
      }

      // Continuer a recruter jusqu'a 50 pour le village
      if (villagers < 50 && berries >= 5) {
        if (btn('recruitVillagerBtn')) return;
      }

      if (berries < 50) { resBtn('baies'); return; }
      if (wood < 50)    { resBtn('bois');  return; }
      if (stone < 20)   { resBtn('pierre'); return; }
      resBtn('baies');
      return;
    }

    // ── PHASE VILLAGE : fonder + bricoleur + infrastructures ────────────
    if (phase === 'village') {
      if (villages === 0 && chief >= 1 && villagers >= 50) {
        if (btn('foundVillageBtn')) return;
      }

      if (visible('tinkerSection') && tinkers === 0 && wood >= 100 && stone >= 100) {
        if (btn('recruitTinkerBtn')) return;
      }

      if (tinkers >= 1 && sawmills === 0) {
        if (btn('craftSawmillBtn')) return;
      }

      if (tinkers >= 1 && sawmills >= 1 && quarries === 0) {
        if (btn('craftStoneQuarryBtn')) return;
      }

      if (tinkers >= 1 && wells === 0) {
        if (btn('craftWellBtn')) return;
      }

      if (hunters === 0 && villagers >= 20 && visible('hunterSection')) {
        if (btn('recruitHunterBtn')) return;
      }

      // Accumuler ressources pour village
      if (berries < 80) { resBtn('baies'); return; }
      if (wood < 120)   { resBtn('bois');  return; }
      if (stone < 60)   { resBtn('pierre'); return; }
      resBtn('baies');
      return;
    }

    // ── PHASE MID : exploration + production ────────────────────────────
    if (phase === 'mid') {
      // Exploration si disponible
      if (visible('sendExplorersBtn') && !document.getElementById('sendExplorersBtn').disabled) {
        if (btn('sendExplorersBtn')) { log('Envoi explorateurs'); return; }
      }

      // Seau si pas encore
      if (buckets === 0) { if (btn('craftBucketBtn')) return; }

      // Pioche et arc si disponibles
      if (visible('pickaxeSection')) { btn('craftPickaxeBtn'); }
      if (visible('bowSection'))     { btn('craftBowBtn'); }

      // Manteaux si fibres disponibles
      if (visible('craftCoatBtn') && coats < villagers) {
        if (btn('craftCoatBtn')) return;
      }

      // Recruter plus de villageois
      if (villagers < 80 && berries >= 5) {
        if (btn('recruitVillagerBtn')) return;
      }

      if (berries < 100) { resBtn('baies'); return; }
      if (wood < 100)    { resBtn('bois');  return; }
      if (stone < 50)    { resBtn('pierre'); return; }
      resBtn('baies');
    }
  }

  function report() {
    console.group('%c[BOT] Rapport', 'color:#ffd986;font-weight:bold');
    console.log('Phase:', phase);
    console.log('Villageois:', n('villagers'), '| Haches:', n('axes'), '| Chef:', n('chief'), '| Villages:', n('villages'));
    console.log('Bricoleur:', n('tinkers'), '| Scierie:', n('sawmills'), '| Carriere:', n('stoneQuarries'));
    console.log('Manteaux:', n('coats'), '| Puits:', n('wells'), '| Cueilleur:', n('pickers'));
    console.log('Jalons:', [...milestones]);
    console.groupEnd();
  }

  window.forgeBot = {
    start() {
      if (this._i) { log('Bot deja actif.'); return; }
      phase = 'early';
      milestones.clear();
      log('Demarrage. Arret : forgeBot.stop()');
      this._i      = setInterval(decide, TICK_MS);
      this._report = setInterval(report, 30000);
    },
    stop() {
      clearInterval(this._i);
      clearInterval(this._report);
      this._i = null;
      log('Bot arrete.');
      report();
    },
    report,
  };

  console.log('%c[BOT FDA] Pret. forgeBot.start() pour lancer.', 'color:#ffd986;font-weight:bold');
})();
