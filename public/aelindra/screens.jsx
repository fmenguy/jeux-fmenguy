/* ============================================
   AELINDRA · screens.jsx
   Composants React pour chaque écran (rendu démo)
   Tous les écrans utilisent les mêmes classes CSS
   que dans le projet réel — drop-in compatible.
   ============================================ */

const I = window.Ico;

/* ============ Données mock ============ */
const MOCK_HEROES = [
  { id: "dain",   name: "Daïn Piedlor",      class: "Guerrier",   race: "Nain",   icon: "warrior",  rarity: "rare",   lv: 4, hp: { c: 158, m: 158 }, mp: { c: 32, m: 32 } },
  { id: "aeris",  name: "Aeris Ventpâle",    class: "Archère",    race: "Elfe",   icon: "archer",   rarity: "common", lv: 3, hp: { c: 101, m: 101 }, mp: { c: 75, m: 75 } },
  { id: "sylva",  name: "Sylvara Brasier",   class: "Mage",       race: "Elfe",   icon: "mage",     rarity: "epic",   lv: 5, hp: { c: 85,  m: 85  }, mp: { c: 148, m: 148 } },
  { id: "borin",  name: "Borin Rempart",     class: "Protecteur", race: "Humain", icon: "guardian", rarity: "rare",   lv: 4, hp: { c: 294, m: 294 }, mp: { c: 24, m: 24 } },
];

const DUNGEONS = [
  { name: "Le Gouffre des Origines",  desc: "Cinq paliers dans les profondeurs. Un héros offert à chaque descente.", tag: "tag-tuto", tagText: "TUTORIEL", new: true,  icon: "dungeon", floor: "Palier IV", state: "tut" },
  { name: "Forêt Maudite",            desc: "8 étages · Ennemis sylvestres. Requiert Palier I du Gouffre.",           tag: "tag-floor", tagText: "8 ÉTAGES", icon: "rune",    floor: "0 / 8", state: "open" },
  { name: "Mines de Fer Noir",        desc: "10 étages · Golems et créatures de pierre. Palier II requis.",          tag: "tag-floor", tagText: "10 ÉTAGES", icon: "rune",    floor: "—", state: "open" },
  { name: "Tour des Ombres",          desc: "12 étages · Nécromanciens. Palier III requis.",                          tag: "tag-locked", tagText: "VERROUILLÉ", icon: "lock", floor: "—", state: "locked" },
];

const FLOORS = [
  { num: "I",   depth: "0 m",     name: "Entrée",          desc: "Premiers pas dans le gouffre. Apprends les déplacements et le corps-à-corps.", gift: "Daïn Piedlor · Guerrier Nain", state: "done" },
  { num: "II",  depth: "−50 m",   name: "Galerie",         desc: "Une coursive étroite. La portée et le positionnement prennent leur sens.",     gift: "Aeris Ventpâle · Archère Elfe", state: "done" },
  { num: "III", depth: "−120 m",  name: "Caverne",         desc: "Cristaux runiques. Découvre la magie offensive et les résistances.",            gift: "Sylvara Brasier · Mage Offensif", state: "done" },
  { num: "IV",  depth: "−200 m",  name: "Salle du Titan",  desc: "Une chambre voûtée. Apprends à tenir une ligne, à protéger.",                   gift: "Borin Rempart · Protecteur", state: "current" },
  { num: "V",   depth: "−300 m",  name: "Cœur",            desc: "Le palier final. Les quatre classes en synergie.",                              gift: null, state: "locked" },
];

/* ============ HEADERS partagés ============ */
function TopBar({ name = "Aldwyn", initial = "A", gold = 320, orb = 64 }) {
  return (
    <div className="topbar">
      <div className="pname-wrap">
        <div className="pav">{initial}</div>
        <span className="pnm">{name}</span>
        <I id="edit" className="ico edit-ico" />
      </div>
      <div className="currs">
        <div className="curr curr--gold"><I id="coin" className="ico sym sym--gold" /><span className="val">{gold}</span></div>
        <div className="curr curr--orb"><I id="orb" className="ico sym sym--orb" /><span className="val">{orb}</span></div>
      </div>
    </div>
  );
}

function ScrHeader({ title, gold, orb, onBack }) {
  return (
    <div className="sh">
      <button className="bk" onClick={onBack}><I id="back" className="ico" /> RETOUR</button>
      <div className="st">{title}</div>
      {gold != null && <div className="scurr curr--gold"><I id="coin" className="ico sym sym--gold" /><span className="val">{gold}</span></div>}
      {orb != null && <div className="scurr curr--orb"><I id="orb" className="ico sym sym--orb" /><span className="val">{orb}</span></div>}
      {gold == null && orb == null && <div style={{ width: 24 }} />}
    </div>
  );
}

/* ============ 01 · SPLASH / HUB ============ */
function ScrSplash() {
  return (
    <div className="scr on" id="s-splash">
      <TopBar />

      <div className="logo-zone">
        <div className="logo-sigil"><I id="sigil" /></div>
        <div className="logo-ornament">
          <span className="line"></span>
          <span className="star">✦</span>
          <span className="line"></span>
        </div>
        <div className="logo-title">AELINDRA</div>
        <div className="logo-sub">CHRONIQUES DES PROFONDEURS</div>
      </div>

      <div className="team-strip">
        <div className="strip-lbl">ÉQUIPE ACTIVE</div>
        <div className="team-row">
          {MOCK_HEROES.map(h => (
            <div key={h.id} className={`hchip rarity--${h.rarity}`}>
              <div className={`hero-portrait hero-portrait--framed rarity--${h.rarity} hp`}>
                <div style={{ color: "var(--gold-hi)" }}><I id={h.icon} className="ico" style={{ width: 18, height: 18 }} /></div>
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div className="nm">{h.name.split(" ")[0]}</div>
                <div className="lv">LV.{h.lv}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="hub-grid">
        <div className="hb hb-acc">
          <div className="hb-icon"><I id="dungeon" /></div>
          <div className="hb-name">DONJONS</div>
          <div className="hb-desc">Missions et exploration<br />des profondeurs</div>
          <span className="hb-bdg badge-new">TUTO</span>
        </div>
        <div className="hb">
          <div className="hb-icon"><I id="guild" /></div>
          <div className="hb-name">GUILDE</div>
          <div className="hb-desc">Invoquer de nouveaux<br />aventuriers</div>
        </div>
        <div className="hb">
          <div className="hb-icon"><I id="market" /></div>
          <div className="hb-name">MARCHÉ</div>
          <div className="hb-desc">Armes et armures<br />Or uniquement</div>
        </div>
        <div className="hb">
          <div className="hb-icon"><I id="team" /></div>
          <div className="hb-name">ÉQUIPE</div>
          <div className="hb-desc">Gérer et équiper<br />tes héros</div>
        </div>
        <div className="hb">
          <div className="hb-icon"><I id="missions" /></div>
          <div className="hb-name">MISSIONS</div>
          <div className="hb-desc">Quêtes principales et défis quotidiens</div>
        </div>
      </div>
    </div>
  );
}

/* ============ 02 · DONJONS ============ */
function ScrDungeons() {
  return (
    <div className="scr on" id="s-dungeons">
      <ScrHeader title="DONJONS" gold={320} />
      <div className="dlist">
        {DUNGEONS.map((d, i) => (
          <div key={i} className={`dc ${d.state === "tut" ? "dc-tut" : ""} ${d.state === "locked" ? "dc-locked" : ""}`}>
            <div className="dc-ic"><I id={d.icon} /></div>
            <div className="dc-inf">
              <div className="dc-nm">{d.name}</div>
              <div className="dc-ds">{d.desc}</div>
              <div className="tags">
                <span className={`tag ${d.tag}`}>{d.tagText}</span>
                <span className="tag tag-floor">{d.floor}</span>
                {d.state === "tut" && <span className="tag tag-reward">+30 ◆ par palier</span>}
              </div>
            </div>
            {d.new && <span className="badge-new" style={{ position: "absolute", top: 8, right: 8 }}>NOUVEAU</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============ 03 · GOUFFRE (paliers) ============ */
function ScrGouffre() {
  return (
    <div className="scr on" id="s-gouffre">
      <ScrHeader title="LE GOUFFRE DES ORIGINES" />
      <div style={{ padding: "9px 14px 10px", borderBottom: "1px solid var(--b)", flexShrink: 0, fontFamily: "var(--font-body)", fontSize: 10, color: "var(--dim)", lineHeight: 1.5, fontStyle: "italic" }}>
        5 paliers dans les profondeurs · un héros offert à chaque descente.
      </div>
      <div className="fw">
        {FLOORS.map((f, i) => (
          <div key={i} className={`fc ${f.state === "done" ? "fc-dn" : ""} ${f.state === "current" ? "fc-cu" : ""} ${f.state === "locked" ? "fc-lock" : ""}`}>
            <div className="fc-depth">{f.depth}</div>
            <div className="fc-num"><span className="roman">{f.num}</span> · PALIER</div>
            <div className="fc-nm">{f.name}</div>
            <div className="fc-desc">{f.desc}</div>
            {f.gift && (
              <div className="fc-gift">
                <div className="fc-gift-ic"><I id="gift" /></div>
                <div className="fc-gift-text">
                  <span className="lbl">HÉROS OFFERT</span>
                  {f.gift}
                </div>
                {f.state === "current" && <span className="fc-new">NEW</span>}
              </div>
            )}
            {f.state === "current" && (
              <button className="fc-enter-btn">ENTRER DANS LE PALIER</button>
            )}
            {f.state === "locked" && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, color: "var(--dim2)", fontFamily: "var(--font-title)", fontSize: 9, letterSpacing: ".2em", padding: 6, marginTop: 4 }}>
                <I id="lock" className="ico" />VERROUILLÉ
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============ 04 · COMBAT ============ */
/**
 * Génère une grille d'exemple adaptée à la taille demandée.
 * Place 4 elfes en bas (2 rangées) et 3 ennemis en haut.
 * Marque les cases atteignables et la zone de prévisualisation de portée.
 */
function makeCombatGrid(cols, rows) {
  const grid = Array.from({ length: rows }, () => Array(cols).fill(null));

  // ===== Unités elfes (bas de la grille) =====
  // L'ordre des positions : archer (sélectionné), guerrier, mage, protecteur
  const elfClasses = ["archer", "warrior", "mage", "guardian"];
  let elfPositions;
  if (cols >= 5) {
    elfPositions = [
      [1, rows - 1],          // archer (sélectionnée)
      [0, rows - 2],          // guerrier (devant)
      [cols - 2, rows - 1],   // mage
      [cols - 1, rows - 2],   // protecteur (devant)
    ];
  } else if (cols === 4) {
    elfPositions = [
      [0, rows - 1],
      [1, rows - 2],
      [3, rows - 1],
      [2, rows - 2],
    ];
  } else { // cols === 3
    elfPositions = [
      [0, rows - 1],
      [1, rows - 1],
      [2, rows - 1],
      [1, rows - 2],
    ];
  }
  elfPositions.forEach(([x, y], i) => {
    if (x >= 0 && x < cols && y >= 0 && y < rows) {
      grid[y][x] = { kind: "elf", cls: elfClasses[i], hp: i === 1 ? .85 : 1, sel: i === 0 };
    }
  });

  // ===== Ennemis (haut de la grille) =====
  const enemies = [
    { cls: "spy",      hp: .8 },
    { cls: "warrior",  hp: 1 },
    { cls: "guardian", hp: .95 },
  ];
  const cMid = Math.floor(cols / 2);
  const enemyPositions = [
    [Math.max(0, cMid - 1), 0],
    [Math.min(cols - 1, cMid + 1), 0],
    [cMid, 1],
  ];
  enemyPositions.forEach(([x, y], i) => {
    if (x >= 0 && x < cols && y >= 0 && y < rows && !grid[y][x]) {
      grid[y][x] = { kind: "enemy", ...enemies[i] };
    }
  });

  // ===== Cases atteignables autour de l'archer sélectionné =====
  const [sx, sy] = elfPositions[0];
  const reach = [[sx - 1, sy], [sx + 1, sy], [sx, sy - 1], [sx - 1, sy - 1], [sx + 1, sy - 1]];
  reach.forEach(([x, y]) => {
    if (x >= 0 && x < cols && y >= 0 && y < rows && !grid[y][x]) grid[y][x] = "reach";
  });

  // ===== Prévisualisation portée (archer = 4 cases) =====
  // Marque quelques cases entre l'archer et la zone ennemie
  const midY = Math.floor(rows * 0.45);
  if (midY >= 0 && midY < rows && sx >= 0 && sx < cols && !grid[midY][sx]) {
    grid[midY][sx] = "preview";
  }
  if (midY - 1 >= 0 && sx >= 0 && sx < cols && !grid[midY - 1][sx]) {
    grid[midY - 1][sx] = "preview";
  }

  // ===== Attackable : marque le premier ennemi en haut (cible potentielle) =====
  // (pour mettre en évidence la portée d'attaque)
  const enemyHit = enemyPositions[0];
  if (enemyHit && grid[enemyHit[1]][enemyHit[0]]) {
    grid[enemyHit[1]][enemyHit[0]].targetable = true;
  }

  return grid;
}

function CombatTile({ cell, x, y, rows }) {
  const classes = ["tile"];
  let content = null;

  if (cell === "reach") classes.push("reachable");
  if (cell === "preview") classes.push("range-preview");

  // Zone de spawn elfe (2 dernières rangées) — visuel subtil
  if (y >= rows - 2) classes.push("zone-elf");

  if (cell && typeof cell === "object") {
    classes.push("has-unit");
    const isElf = cell.kind === "elf";
    classes.push(isElf ? `unit-${cell.cls}` : "unit-enemy");
    if (cell.sel) classes.push("selected-unit");
    if (cell.targetable) classes.push("attackable");

    const glyph = cell.cls;
    content = (
      <>
        {cell.sel && (
          <div className="ap-dots">
            <span className="ap-dot"></span>
            <span className="ap-dot"></span>
            <span className="ap-dot used"></span>
          </div>
        )}
        <div className="unit-glyph">
          <I id={glyph} />
        </div>
        <div className="tile-hp">
          <div style={{ width: `${cell.hp * 100}%`, background: isElf ? "var(--hp)" : "var(--red)" }}></div>
        </div>
      </>
    );
  }

  return <div className={classes.join(" ")}>{content}</div>;
}

function ScrCombat({ cols = 5, rows = 8, tileSize = 44 }) {
  const grid = React.useMemo(() => makeCombatGrid(cols, rows), [cols, rows]);

  return (
    <div className="scr on" id="s-combat">
      <div className="combat-topbar">
        <div className="combat-turn-info"><span className="turn-n">III</span> TOUR</div>
        <div className="combat-phase">phase elfique</div>
        <button className="bk" style={{ display: "flex", alignItems: "center", gap: 4 }}>
          FIN <I id="end" className="ico" />
        </button>
      </div>

      <div className="combat-queue">
        <span className="combat-queue-lbl">ORDRE</span>
        <div className="q-port is-active" style={{ color: "var(--gold-hi)" }}><I id="archer" className="ico" style={{ width: 14, height: 14 }} /></div>
        <div className="q-port"><I id="warrior" className="ico" style={{ width: 14, height: 14 }} /></div>
        <div className="q-port"><I id="mage" className="ico" style={{ width: 14, height: 14 }} /></div>
        <div className="q-port"><I id="guardian" className="ico" style={{ width: 14, height: 14 }} /></div>
        <div className="q-sep"></div>
        <div className="q-port is-enemy" style={{ color: "var(--red)" }}><I id="spy" className="ico" style={{ width: 14, height: 14 }} /></div>
        <div className="q-port is-enemy" style={{ color: "var(--red)" }}><I id="warrior" className="ico" style={{ width: 14, height: 14 }} /></div>
        <div className="q-port is-enemy is-dead" style={{ color: "var(--red)" }}><I id="guardian" className="ico" style={{ width: 14, height: 14 }} /></div>
      </div>

      <div className="combat-main">
        <div className="combat-grid-wrap">
          <div id="combat-grid" style={{ gridTemplateColumns: `repeat(${cols}, ${tileSize}px)` }}>
            {grid.flatMap((row, y) => row.map((cell, x) => (
              <CombatTile key={`${x}-${y}`} cell={cell} x={x} y={y} rows={rows} />
            )))}
          </div>
          {/* Tooltip preview (statique pour démo) */}
          <div className="tip" style={{ top: 64, right: 12 }}>
            <div className="tip-title">RAT D'OMBRE · NIV. 2</div>
            <div className="tip-row"><span>Dégâts</span><span className="v">18 – 24</span></div>
            <div className="tip-row"><span>Critique</span><span className="v v--crit">×1.75</span></div>
            <div className="tip-row"><span>Portée</span><span className="v">4 cases</span></div>
          </div>
        </div>

        <div className="combat-dock">
          <div className="dock-unit">
            <div className="dock-portrait is-active">
              <div style={{ color: "var(--gold-hi)" }}><I id="archer" className="ico" style={{ width: 28, height: 28 }} /></div>
              <div className="class-badge"><I id="archer" /></div>
            </div>
            <div className="dock-info">
              <div className="dock-name">Aeris Ventpâle</div>
              <div className="dock-meta">Elfe<span className="sep">·</span>Archère<span className="sep">·</span>Niv. 3</div>
              <div className="dock-stats">
                <div className="bar-wrap"><span className="lbl lbl-hp">PV</span><div className="bar bar--hp"><div className="fill" style={{ width: "100%" }}></div></div><span className="val">101</span></div>
                <div className="bar-wrap"><span className="lbl lbl-mp">PM</span><div className="bar bar--mp"><div className="fill" style={{ width: "82%" }}></div></div><span className="val">62</span></div>
              </div>
              <div className="dock-ap-row">
                <span className="ap-lbl">PA</span>
                <span className="ap-pip"></span><span className="ap-pip"></span><span className="ap-pip used"></span>
              </div>
            </div>
          </div>

          <div className="dock-actions">
            <button className="act-btn is-active"><I id="move" className="ico" />Déplacer<span className="ap-cost">1</span></button>
            <button className="act-btn"><I id="attack" className="ico" />Attaquer<span className="ap-cost">2</span></button>
            <button className="act-btn"><I id="spell" className="ico" />Sort<span className="ap-cost">2</span></button>
            <button className="dock-log-btn">JOURNAL · 12</button>
          </div>
        </div>
      </div>

      <div className="combat-bottom">
        <I id="info" className="ico" style={{ color: "var(--rune)" }} />
        Choisis une case bleutée pour déplacer Aeris.
      </div>
    </div>
  );
}

/* ============ 05 · MARCHÉ ============ */
const MARKET_ITEMS = [
  { name: "Hache d'argent",    type: "Arme · 2 mains", icon: "weapon",  stat: "+18 ATK · portée 1",  price: 220, rarity: "rare" },
  { name: "Bâton de Cristal",  type: "Arme · 2 mains", icon: "weapon",  stat: "+22 MAG · portée 3",  price: 380, rarity: "epic" },
  { name: "Arc Elfique",       type: "Arme · 2 mains", icon: "weapon",  stat: "+14 ATK · portée 4",  price: 160, rarity: "common" },
  { name: "Lame Stellaire",    type: "Arme · 1 main",  icon: "weapon",  stat: "+30 ATK · crit +6%",  price: 540, rarity: "epic" },
  { name: "Dague d'Ombre",     type: "Arme · 1 main",  icon: "weapon",  stat: "+12 ATK · vit +8",    price: 140, rarity: "common", soldOut: true },
  { name: "Flamberge Royale",  type: "Arme · 2 mains", icon: "weapon",  stat: "+45 ATK · crit +10%", price: 980, rarity: "legendary" },
];

function ScrMarche() {
  return (
    <div className="scr on" id="s-market">
      <ScrHeader title="MARCHÉ" gold={320} />
      <div className="mkt-tabs">
        <button className="mkt-tab on">ARMES</button>
        <button className="mkt-tab">ARMURES</button>
        <button className="mkt-tab">POTIONS</button>
      </div>
      <div className="mkt-body">
        <div className="gold-banner">
          <I id="coin" className="ico" />
          Tu disposes de <span style={{ color: "var(--gold-hi)", margin: "0 4px" }}>320</span> pièces d'or à dépenser.
        </div>
        <div className="item-grid">
          {MARKET_ITEMS.map((it, i) => (
            <div key={i} className={`item-card rarity rarity--${it.rarity}`}>
              <div className="rarity-bar"></div>
              <div className="item-img"><I id={it.icon} /></div>
              <div className="item-body">
                <div className="item-name">{it.name}</div>
                <div className="item-type">{it.type}</div>
                <div className="item-stat">{it.stat}</div>
                <div className="item-price"><I id="coin" className="ico" /> {it.price}</div>
                {it.soldOut
                  ? <div className="buy-btn-disabled">épuisé</div>
                  : <button className="buy-btn">ACHETER</button>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ============ 06 · GUILDE ============ */
function ScrGuilde() {
  return (
    <div className="scr on" id="s-guild">
      <ScrHeader title="GUILDE DES AVENTURIERS" orb={64} />
      <div className="guild-body">
        <div className="guild-info">
          <I id="orb" className="ico ic" />
          Les Orbes Runiques attirent des aventuriers depuis l'aube des âges. À 50 invocations sans Épique, un sort de garantie s'active.
        </div>

        <div className="guild-pull">
          <div className="guild-orb">
            <I id="orb" />
          </div>

          <div className="pity-wrap">
            <div className="pity-lbl">
              <span>SCEAU DE GARANTIE</span>
              <span className="pity-count">23 / 50</span>
            </div>
            <div className="pity-bg">
              <div className="pity-fill" style={{ width: "46%" }}></div>
            </div>
          </div>

          <div className="pull-btns">
            <button className="pb1">
              <span className="lbl">×1</span>
              <span className="price">10 ◆</span>
            </button>
            <button className="pb10">
              <span className="lbl">×10</span>
              <span className="price">90 ◆</span>
              <span className="bonus">+1 gratuit</span>
            </button>
          </div>

          <div className="rate-pills">
            <span className="rp rp-c">28% COMMUN</span>
            <span className="rp rp-r">54% RARE</span>
            <span className="rp rp-e">16% ÉPIQUE</span>
            <span className="rp rp-l">2% LÉGENDAIRE</span>
          </div>
        </div>

        <div className="guild-roster">
          <div className="roster-title">PANTHÉON · 9 / 24</div>
          <div className="roster-grid">
            {[
              { i: "warrior",  r: "rare" },
              { i: "archer",   r: "common" },
              { i: "mage",     r: "epic" },
              { i: "guardian", r: "rare" },
              { i: "spy",      r: "epic" },
              { i: "healer",   r: "rare" },
              { i: "archer",   r: "legendary" },
              { i: "warrior",  r: "common" },
              { i: "mage",     r: "epic" },
              { i: null,       r: null },
              { i: null,       r: null },
              { i: null,       r: null },
            ].map((p, i) => (
              <div key={i} className="roster-hero">
                <div className={`roster-port ${p.r ? `rarity rarity--${p.r}` : ""}`} style={{ borderColor: p.r ? "" : "var(--mute)", opacity: p.r ? 1 : .3 }}>
                  {p.i ? <I id={p.i} className="ico" style={{ width: 16, height: 16 }} /> : <I id="lock" className="ico" style={{ width: 12, height: 12, color: "var(--dim2)" }} />}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============ 07 · ÉQUIPE (heroes list) ============ */
function ScrHeroes() {
  return (
    <div className="scr on" id="s-heroes">
      <ScrHeader title="TON ÉQUIPE" />
      <div className="heroes-list">
        {MOCK_HEROES.map(h => (
          <div key={h.id} className={`hero-row rarity rarity--${h.rarity}`}>
            <div className="rarity-bar"></div>
            <div className={`hero-portrait hero-portrait--framed rarity--${h.rarity}`}>
              <div style={{ color: "var(--gold-hi)" }}><I id={h.icon} className="ico" style={{ width: 26, height: 26 }} /></div>
              <span className="hp-lv">LV.{h.lv}</span>
            </div>
            <div className="hr-info">
              <div className="hr-top">
                <span className="hr-name">{h.name}</span>
              </div>
              <div className="hr-class">
                <I id={h.icon} className="ico" /> {h.class} · <span style={{ color: "var(--dim)", fontStyle: "italic", letterSpacing: ".05em" }}>{h.race}</span>
              </div>
              <div className="hr-bars">
                <div className="bar-wrap">
                  <span className="lbl" style={{ color: "var(--hp)" }}>PV</span>
                  <div className="bar bar--hp"><div className="fill" style={{ width: `${(h.hp.c / h.hp.m) * 100}%` }}></div></div>
                  <span className="val">{h.hp.c}</span>
                </div>
                <div className="bar-wrap">
                  <span className="lbl" style={{ color: "var(--mp)" }}>PM</span>
                  <div className="bar bar--mp"><div className="fill" style={{ width: `${(h.mp.c / h.mp.m) * 100}%` }}></div></div>
                  <span className="val">{h.mp.c}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============ 08 · DÉTAIL HÉROS ============ */
function ScrHeroDetail() {
  return (
    <div className="scr on" id="s-hero-detail">
      <ScrHeader title="SYLVARA BRASIER" />
      <div className="hero-detail-body">
        <div className="hero-hero">
          <div className="hero-portrait hero-portrait--framed rarity--epic">
            <div style={{ color: "var(--gold-hi)" }}><I id="mage" className="ico" style={{ width: 44, height: 44 }} /></div>
            <span className="hp-lv">LV.5</span>
          </div>
          <div className="hh-info">
            <div className="hh-name">Sylvara<br />Brasier</div>
            <div className="hh-class"><I id="mage" className="ico" /> MAGE OFFENSIF</div>
            <div className="hh-race">Elfe · spécialiste du feu</div>
            <div className="hh-rarity-row">
              <span className="rp rp-e">ÉPIQUE</span>
              <span className="tag tag-floor">Portée 1 – 3</span>
            </div>
          </div>
        </div>

        <section>
          <div className="hd-section-title">STATISTIQUES</div>
          <div className="hero-stats-section">
            <div className="stat-row"><span className="k">PV</span><span className="v">85<span className="delta">+5</span></span></div>
            <div className="stat-row"><span className="k">PM</span><span className="v">148<span className="delta">+12</span></span></div>
            <div className="stat-row"><span className="k">ATK</span><span className="v">12</span></div>
            <div className="stat-row"><span className="k">MAG</span><span className="v">47<span className="delta">+8</span></span></div>
            <div className="stat-row"><span className="k">DEF</span><span className="v">26</span></div>
            <div className="stat-row"><span className="k">RES</span><span className="v">80<span className="delta">+5</span></span></div>
            <div className="stat-row"><span className="k">VIT</span><span className="v">70</span></div>
            <div className="stat-row"><span className="k">CRIT</span><span className="v">11%</span></div>
          </div>
        </section>

        <section>
          <div className="hd-section-title">ÉQUIPEMENT</div>
          <div className="equip-slots">
            <div className="equip-slot">
              <div className="slot-icon"><I id="head" /></div>
              <span className="slot-label">TÊTE</span>
              <div className="slot-item empty">— libre —</div>
            </div>
            <div className="equip-slot">
              <div className="slot-icon"><I id="body" /></div>
              <span className="slot-label">CORPS</span>
              <div className="slot-item">
                <div className="nm">Robe de Sylve</div>
                <div className="bonus">+8 RES · +4 MAG</div>
              </div>
              <button>RETIRER</button>
            </div>
            <div className="equip-slot">
              <div className="slot-icon"><I id="weapon" /></div>
              <span className="slot-label">ARME</span>
              <div className="slot-item">
                <div className="nm">Bâton Rouge de Feu</div>
                <div className="bonus">+13 MAG · portée 1-3</div>
              </div>
              <button>RETIRER</button>
            </div>
            <div className="equip-slot">
              <div className="slot-icon"><I id="offhand" /></div>
              <span className="slot-label">SECOND.</span>
              <div className="slot-item empty">bâton à deux mains</div>
            </div>
          </div>
        </section>

        <section>
          <div className="hd-section-title">INVENTAIRE</div>
          <div className="equip-grid">
            <div className="equip-item-card rarity rarity--rare"><div className="rarity-bar"></div><div className="item-name">Capuche tressée</div><div className="item-bonus">+6 RES</div></div>
            <div className="equip-item-card rarity rarity--epic"><div className="rarity-bar"></div><div className="item-name">Grimoire d'Ash</div><div className="item-bonus">+18 MAG</div></div>
          </div>
        </section>
      </div>
    </div>
  );
}

/* ============ 09 · MISSIONS ============ */
function ScrMissions() {
  return (
    <div className="scr on" id="s-missions">
      <ScrHeader title="MISSIONS" />
      <div className="missions-body">
        <section>
          <h3 className="missions-section-title">QUÊTES PRINCIPALES</h3>
          <div>
            <div className="mission-card claimable">
              <div className="mission-header">
                <span className="mission-name">Première Victoire</span>
                <span className="mission-reward"><I id="orb" className="ico" /> +30 <span className="bonus">×3 bonus</span></span>
              </div>
              <div className="mission-desc">Remporte un combat dans le Gouffre.</div>
              <div className="mission-progress-bar"><div style={{ width: "100%" }}></div></div>
              <div className="mission-footer">
                <span className="progress-txt">1 / 1</span>
                <button>RÉCLAMER</button>
              </div>
            </div>

            <div className="mission-card">
              <div className="mission-header">
                <span className="mission-name">Équipe Diversifiée</span>
                <span className="mission-reward"><I id="orb" className="ico" /> +50 <span className="bonus">×5 bonus</span></span>
              </div>
              <div className="mission-desc">Compose une équipe avec 3 classes différentes.</div>
              <div className="mission-progress-bar"><div style={{ width: "66%" }}></div></div>
              <div className="mission-footer">
                <span className="progress-txt">2 / 3</span>
                <span className="t-faint t-body" style={{ fontStyle: "italic" }}>en cours…</span>
              </div>
            </div>

            <div className="mission-card claimed">
              <div className="mission-header">
                <span className="mission-name">Héros Recruté</span>
                <span className="mission-reward"><I id="orb" className="ico" /> +20</span>
              </div>
              <div className="mission-desc">Invoque ton premier aventurier à la guilde.</div>
              <div className="mission-progress-bar"><div style={{ width: "100%" }}></div></div>
              <div className="mission-footer">
                <span className="progress-txt">1 / 1</span>
                <span className="mission-done-tag"><I id="check" className="ico" /> RÉCLAMÉ</span>
              </div>
            </div>
          </div>
        </section>

        <section>
          <h3 className="missions-section-title">MISSIONS QUOTIDIENNES</h3>
          <p className="daily-reset-label"><I id="time" className="ico" style={{ marginRight: 4, color: "var(--rune)" }} />Reset dans 06h 23m</p>
          <div>
            <div className="mission-card">
              <div className="mission-header">
                <span className="mission-name">Combat Quotidien</span>
                <span className="mission-reward"><I id="orb" className="ico" /> +8</span>
              </div>
              <div className="mission-desc">Termine un combat aujourd'hui.</div>
              <div className="mission-progress-bar"><div style={{ width: "0%" }}></div></div>
              <div className="mission-footer">
                <span className="progress-txt">0 / 1</span>
                <span className="t-faint t-body" style={{ fontStyle: "italic" }}>—</span>
              </div>
            </div>

            <div className="mission-card claimable">
              <div className="mission-header">
                <span className="mission-name">Connexion</span>
                <span className="mission-reward"><I id="orb" className="ico" /> +5</span>
              </div>
              <div className="mission-desc">Te connecter au royaume.</div>
              <div className="mission-progress-bar"><div style={{ width: "100%" }}></div></div>
              <div className="mission-footer">
                <span className="progress-txt">1 / 1</span>
                <button>RÉCLAMER</button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

Object.assign(window, {
  ScrSplash, ScrDungeons, ScrGouffre, ScrCombat,
  ScrMarche, ScrGuilde, ScrHeroes, ScrHeroDetail, ScrMissions
});
