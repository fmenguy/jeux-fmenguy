// Board.jsx — plateau jouable d'Achrogemme
// Mappable sur src/games/achrogemme/Game.tsx
//
// État simplifié pour la démo : on précharge un plateau en milieu de partie
// pour montrer la lisibilité tactique. Une main de 4 cartes, des unités déjà
// posées des deux côtés. "Fin du tour" déclenche une séquence d'animations.
//
// Props :
//   frame          variante de cadre pour les cartes ("sobre" | "vegetal" | "runique")
//   animDensity    facteur 0 / 0.5 / 1 (passé via CSS var sur la racine)

const CLASSES_ORDER = ["sylvestre", "arcanique", "rempart"];
const ROW_LABELS    = { front: "Avant", middle: "Milieu", back: "Arrière" };

function _findCard(id) {
  return window.ACH_CARDS.find((c) => c.id === id);
}

function _emptyBoard() {
  return {
    sylvestre: { front: null, middle: null, back: null },
    arcanique: { front: null, middle: null, back: null },
    rempart:   { front: null, middle: null, back: null },
  };
}

function _spawn(cardId, opts = {}) {
  const c = _findCard(cardId);
  return {
    instanceId: `${cardId}-${Math.random().toString(36).slice(2, 7)}`,
    card: c,
    hp: opts.hp ?? c.hp,
    hpMax: opts.hp ?? c.hp,
    atk: opts.atk ?? c.atk,
    anim: null,
  };
}

function _initialState() {
  return {
    turn: 3,
    gemmesMax: 4,
    gemmesSpent: 0,
    locked: false,
    selectedCardIdx: null,
    phaseLabel: null,
    phaseHue: 200,
    fxNodes: [], // animations transitoires (flèches, runes, slashes)
    player: {
      hp: 26, hpMax: 30,
      board: {
        sylvestre: { front: _spawn("syl-archer"),       middle: null,                       back: null },
        arcanique: { front: _spawn("arc-apprenti"),     middle: null,                       back: null },
        rempart:   { front: _spawn("rem-garde-nain"),   middle: _spawn("rem-throrin-jeune"), back: null },
      },
    },
    ia: {
      hp: 22, hpMax: 30,
      board: {
        sylvestre: { front: _spawn("syl-archer"),       middle: _spawn("syl-veteran"),       back: null },
        arcanique: { front: _spawn("arc-apprenti"),     middle: null,                       back: _spawn("arc-runes") },
        rempart:   { front: _spawn("rem-garde-nain"),   middle: null,                       back: null },
      },
    },
    hand: [
      _findCard("syl-veteran"),
      _findCard("arc-runes"),
      _findCard("sort-trait"),
      _findCard("syl-lilia"),
    ],
    log: [
      { phase: "Tour 3", text: null, kind: "phase" },
      { text: "Sylvie pose un Apprenti mage en Arcanique avant.", kind: "ia" },
      { text: "Vous tirez Lilia.", kind: "player" },
    ],
  };
}

function _countSynergies(board) {
  const counts = { elfe: 0, nain: 0, humain: 0, royal: 0 };
  for (const cls of CLASSES_ORDER) {
    for (const row of ["front", "middle", "back"]) {
      const u = board[cls][row];
      if (!u) continue;
      counts[u.card.faction] = (counts[u.card.faction] || 0) + 1;
    }
  }
  return counts;
}

function _emptyRow(board, cls) {
  for (const row of ["front", "middle", "back"]) {
    if (!board[cls][row]) return row;
  }
  return null;
}

function AchBoard({ frame = "sobre", animDensity = 1 }) {
  const [s, setS] = React.useState(_initialState);

  const playerSyn = React.useMemo(() => _countSynergies(s.player.board), [s.player.board]);
  const iaSyn = React.useMemo(() => _countSynergies(s.ia.board), [s.ia.board]);

  const remainingGemmes = s.gemmesMax - s.gemmesSpent;

  const pushLog = (entry) => {
    setS((p) => ({ ...p, log: [...p.log, entry].slice(-40) }));
  };
  const phaseFlash = (label, hue) => {
    setS((p) => ({ ...p, phaseLabel: label, phaseHue: hue }));
    setTimeout(() => setS((p) => ({ ...p, phaseLabel: null })), 700 * animDensity);
  };

  // ---- Pose d'une carte ----
  const onSelectHand = (idx) => {
    if (s.locked) return;
    setS((p) => ({ ...p, selectedCardIdx: p.selectedCardIdx === idx ? null : idx }));
  };

  const onClickSlot = (side, cls, row) => {
    if (s.locked || side !== "player") return;
    const idx = s.selectedCardIdx;
    if (idx == null) return;
    const card = s.hand[idx];
    if (!card) return;
    // Vérifs : classe correspondante, slot vide, assez de Gemmes
    if (card.type === "unite" && card.classe !== cls) return;
    if (card.type === "unite" && s.player.board[cls][row] != null) return;
    if (card.cost > remainingGemmes) return;
    setS((p) => {
      const board = { ...p.player.board };
      board[cls] = { ...board[cls] };
      if (card.type === "unite") {
        board[cls][row] = { ..._spawn(card.id), anim: "enter" };
        // Clear anim after 600ms
        setTimeout(() => {
          setS((pp) => {
            const b = { ...pp.player.board };
            b[cls] = { ...b[cls] };
            if (b[cls][row]) b[cls][row] = { ...b[cls][row], anim: null };
            return { ...pp, player: { ...pp.player, board: b } };
          });
        }, 600 * animDensity);
      }
      const hand = p.hand.filter((_, i) => i !== idx);
      return {
        ...p,
        hand,
        selectedCardIdx: null,
        gemmesSpent: p.gemmesSpent + card.cost,
        player: { ...p.player, board },
        log: [...p.log, { kind: "player", text: `Vous posez ${card.name} (${cls} ${ROW_LABELS[row].toLowerCase()}).` }],
      };
    });
  };

  // ---- Fin de tour : séquence d'animations ----
  const endTurn = async () => {
    if (s.locked) return;
    setS((p) => ({ ...p, locked: true, selectedCardIdx: null }));
    pushLog({ phase: `Résolution du tour ${s.turn}`, kind: "phase" });

    const wait = (ms) => new Promise((r) => setTimeout(r, ms * animDensity));

    // --- Phase Tir (Sylvestres) ---
    phaseFlash("Phase Tir", 145);
    pushLog({ kind: "phase", phase: "🏹 Phase Tir" });
    await wait(700);
    // Tirs alliés
    let iaHp = s.ia.hp;
    for (const cls of ["sylvestre"]) {
      for (const row of ["front", "middle", "back"]) {
        const u = s.player.board[cls][row];
        if (!u) continue;
        const dmg = u.atk;
        iaHp -= dmg;
        pushLog({ kind: "combat", text: `${u.card.name} tire et inflige ${dmg} au Champion adverse.` });
        await wait(140);
      }
    }
    // Tirs ennemis
    let plHp = s.player.hp;
    for (const cls of ["sylvestre"]) {
      for (const row of ["front", "middle", "back"]) {
        const u = s.ia.board[cls][row];
        if (!u) continue;
        const dmg = u.atk;
        plHp -= dmg;
        pushLog({ kind: "combat", text: `${u.card.name} adverse tire et inflige ${dmg} à votre Champion.` });
        await wait(140);
      }
    }
    setS((p) => ({ ...p, ia: { ...p.ia, hp: Math.max(0, iaHp) }, player: { ...p.player, hp: Math.max(0, plHp) } }));
    await wait(400);

    // --- Phase Combat (par Marche) ---
    phaseFlash("Phase Combat", 60);
    pushLog({ kind: "phase", phase: "⚔ Phase Combat" });
    await wait(700);

    // On va calculer les dégâts par Marche et les appliquer.
    let nextPlayer = JSON.parse(JSON.stringify(s.player.board));
    let nextIA = JSON.parse(JSON.stringify(s.ia.board));
    let chHp = { player: plHp, ia: iaHp };

    for (const cls of CLASSES_ORDER) {
      const plUnits = ["front", "middle", "back"].map((r) => nextPlayer[cls][r]).filter(Boolean);
      const iaUnits = ["front", "middle", "back"].map((r) => nextIA[cls][r]).filter(Boolean);
      const plAtk = plUnits.reduce((a, u) => a + u.atk, 0);
      const iaAtk = iaUnits.reduce((a, u) => a + u.atk, 0);
      if (plAtk === 0 && iaAtk === 0) continue;
      pushLog({ kind: "combat", text: `Marche ${cls} : ${plAtk} vs ${iaAtk}.` });
      await wait(200);

      // Dégâts du joueur sur l'IA
      let dmg = plAtk;
      for (const row of ["front", "middle", "back"]) {
        if (dmg <= 0) break;
        const u = nextIA[cls][row];
        if (!u) continue;
        const absorbed = Math.min(u.hp, dmg);
        u.hp -= absorbed;
        u.anim = "hit";
        dmg -= absorbed;
        await wait(220);
      }
      if (dmg > 0) {
        chHp.ia = Math.max(0, chHp.ia - dmg);
        pushLog({ kind: "combat", text: `Débordement, ${dmg} infligés au Champion adverse.` });
      }

      // Dégâts de l'IA sur le joueur
      dmg = iaAtk;
      for (const row of ["front", "middle", "back"]) {
        if (dmg <= 0) break;
        const u = nextPlayer[cls][row];
        if (!u) continue;
        const absorbed = Math.min(u.hp, dmg);
        u.hp -= absorbed;
        u.anim = "hit";
        dmg -= absorbed;
        await wait(220);
      }
      if (dmg > 0) {
        chHp.player = Math.max(0, chHp.player - dmg);
        pushLog({ kind: "combat", text: `Débordement, ${dmg} infligés à votre Champion.` });
      }

      setS((p) => ({
        ...p,
        player: { ...p.player, hp: chHp.player, board: JSON.parse(JSON.stringify(nextPlayer)) },
        ia:     { ...p.ia,     hp: chHp.ia,     board: JSON.parse(JSON.stringify(nextIA)) },
      }));
      await wait(300);
    }

    // Clear anim hit
    setS((p) => ({
      ...p,
      player: { ...p.player, board: _clearAnim(p.player.board) },
      ia: { ...p.ia, board: _clearAnim(p.ia.board) },
    }));
    await wait(200);

    // --- Phase Magie ---
    phaseFlash("Phase Magie", 220);
    pushLog({ kind: "phase", phase: "✨ Phase Magie" });
    await wait(700);
    const plMages = _countClass(nextPlayer, "arcanique");
    const iaMages = _countClass(nextIA, "arcanique");
    if (plMages > 0) {
      pushLog({ kind: "combat", text: `Vos mages soignent ${plMages} PV au Champion.` });
      chHp.player = Math.min(s.player.hpMax, chHp.player + plMages);
    }
    if (iaMages > 0) {
      pushLog({ kind: "combat", text: `Les mages adverses soignent ${iaMages} PV.` });
      chHp.ia = Math.min(s.ia.hpMax, chHp.ia + iaMages);
    }
    setS((p) => ({ ...p, player: { ...p.player, hp: chHp.player }, ia: { ...p.ia, hp: chHp.ia } }));
    await wait(500);

    // --- Phase Morts ---
    pushLog({ kind: "phase", phase: "☠ Morts" });
    let killed = 0;
    setS((p) => {
      const b = _markDeaths(p.player.board);
      const ib = _markDeaths(p.ia.board);
      killed = b.killed + ib.killed;
      return { ...p, player: { ...p.player, board: b.board }, ia: { ...p.ia, board: ib.board } };
    });
    await wait(620);
    setS((p) => ({
      ...p,
      player: { ...p.player, board: _removeDead(p.player.board) },
      ia: { ...p.ia, board: _removeDead(p.ia.board) },
    }));
    if (killed > 0) pushLog({ kind: "combat", text: `${killed} unité(s) tombée(s).` });

    // --- Nouveau tour ---
    await wait(400);
    setS((p) => ({
      ...p,
      turn: p.turn + 1,
      gemmesMax: Math.min(8, p.gemmesMax + 1),
      gemmesSpent: 0,
      locked: false,
      hand: [...p.hand, _findCard("rem-garde-nain")].slice(0, 7),
      log: [...p.log, { kind: "phase", phase: `Tour ${p.turn + 1}` }],
    }));
  };

  const resetGame = () => setS(_initialState());

  // === Rendu ===
  const renderSlot = (side, cls, row, slotLabel, gridRow, colIndex) => {
    const board = side === "player" ? s.player.board : s.ia.board;
    const u = board[cls][row];
    const isDropTarget =
      side === "player" &&
      s.selectedCardIdx != null &&
      s.hand[s.selectedCardIdx] &&
      s.hand[s.selectedCardIdx].type === "unite" &&
      s.hand[s.selectedCardIdx].classe === cls &&
      !u &&
      s.hand[s.selectedCardIdx].cost <= remainingGemmes;
    const popSide = colIndex === 3 ? "left" : "right";
    return (
      <div
        key={`${side}-${cls}-${row}`}
        className="ach-slot"
        data-row={row}
        data-empty={u ? "0" : "1"}
        data-droptarget={isDropTarget ? "1" : "0"}
        data-row-label={slotLabel}
        style={{ gridRow, gridColumn: colIndex }}
        onClick={() => onClickSlot(side, cls, row)}
      >
        {u && (
          <>
            <AchCard
              card={u.card}
              frame={frame}
              onBoard
              anim={u.anim}
            />
            <div className="ach-slot__popover" data-pop-side={popSide}>
              <AchCard card={u.card} frame={frame} />
            </div>
          </>
        )}
      </div>
    );
  };

  const colHead = (cls, colIndex) => {
    const label = {
      sylvestre: "🏹 Sylvestre",
      arcanique: "✨ Arcanique",
      rempart:   "⚔ Rempart",
    }[cls];
    return (
      <div
        key={`head-${cls}`}
        className="ach-board__col-head"
        data-class={cls}
        style={{ gridRow: 3, gridColumn: colIndex }}
      >
        {label}
      </div>
    );
  };

  return (
    <div className="ach-board-stage">
    <div
      className="ach-board"
      style={{ "--ach-anim-density": animDensity }}
    >
      <div className="ach-board__playzone">
        {/* Bandeau Champion IA */}
        <div className="ach-board__champion-row" style={{ gridRow: 1 }}>
          <AchChampion
            side="ia"
            name="Sylvie"
            subtitle="Élue, Tome 2"
            avatar="🧝‍♀️"
            hp={s.ia.hp}
            hpMax={s.ia.hpMax}
            gemMax={s.gemmesMax}
            gemSpent={0}
            accent="sylvestre"
          />
        </div>

        {/* Synergies IA */}
        <div style={{ gridRow: 2, gridColumn: "1 / -1" }}>
          <AchSynergyBar counts={iaSyn} side="ia" />
        </div>

        {/* Fonds de colonne et headers de Marche */}
        {CLASSES_ORDER.map((cls, idx) => (
          <div
            key={`bg-${cls}`}
            className="ach-board__col-bg"
            data-class={cls}
            style={{ "--col": idx + 1, gridColumn: idx + 1 }}
          />
        ))}
        {CLASSES_ORDER.map((cls, idx) => colHead(cls, idx + 1))}

        {/* Slots IA (back, middle, front) — rangées 4, 5, 6 */}
        {CLASSES_ORDER.map((cls, idx) => renderSlot("ia", cls, "back",   "arrière", 4, idx + 1))}
        {CLASSES_ORDER.map((cls, idx) => renderSlot("ia", cls, "middle", "milieu",  5, idx + 1))}
        {CLASSES_ORDER.map((cls, idx) => renderSlot("ia", cls, "front",  "avant",   6, idx + 1))}

        {/* Center rule (rangée 7) */}
        <div className="ach-board__center-rule" style={{ gridRow: 7 }} />

        {/* Slots joueur (front, middle, back) — rangées 8, 9, 10 */}
        {CLASSES_ORDER.map((cls, idx) => renderSlot("player", cls, "front",  "avant",   8,  idx + 1))}
        {CLASSES_ORDER.map((cls, idx) => renderSlot("player", cls, "middle", "milieu",  9,  idx + 1))}
        {CLASSES_ORDER.map((cls, idx) => renderSlot("player", cls, "back",   "arrière", 10, idx + 1))}

        {/* Synergies joueur (rangée 11) */}
        <div style={{ gridRow: 11, gridColumn: "1 / -1" }}>
          <AchSynergyBar counts={playerSyn} side="joueur" />
        </div>

        {/* Bandeau Champion joueur (rangée 12) */}
        <div className="ach-board__champion-row" style={{ gridRow: 12 }}>
          <AchChampion
            side="joueur"
            name="Vous"
            subtitle="Affinité libre"
            avatar="🛡️"
            hp={s.player.hp}
            hpMax={s.player.hpMax}
            gemMax={s.gemmesMax}
            gemSpent={s.gemmesSpent}
            accent="rempart"
          />
        </div>

        {/* Main du joueur (rangée 13) */}
        <div className="ach-board__hand" style={{ gridRow: 13 }}>
          {s.hand.map((c, i) => (
            <AchCard
              key={`${c.id}-${i}`}
              card={c}
              frame={frame}
              interactive
              playable={c.cost <= remainingGemmes && !s.locked}
              anim={null}
              onClick={() => onSelectHand(i)}
            />
          ))}
        </div>

        {/* Flash de phase, overlay */}
        {s.phaseLabel && (
          <div
            className="ach-phase-flash"
            style={{
              "--phase-hue": s.phaseHue,
              gridRow: "3 / 11",
              gridColumn: "1 / -1",
            }}
          >
            <div className="ach-phase-flash__label">{s.phaseLabel}</div>
          </div>
        )}
      </div>

      {/* Panneau latéral */}
      <div className="ach-board__side">
        <div className="ach-side__title">Achrogemme</div>

        <div className="ach-side__turn">
          <span>Tour</span>
          <b>{s.turn}</b>
        </div>

        <button
          className="ach-side__btn"
          onClick={endTurn}
          disabled={s.locked}
        >
          Fin du tour
        </button>

        <button
          className="ach-side__btn ach-side__btn--ghost"
          onClick={resetGame}
          disabled={s.locked}
        >
          Nouvelle partie
        </button>

        {/* Gemmes désormais affichées dans le bandeau Champion ;
            on garde le côté droit pour le turn + boutons + log */}

        <div className="ach-side__log">
          {s.log.map((l, i) =>
            l.kind === "phase" ? (
              <div key={i} className="ach-log-line ach-log-line--phase">{l.phase}</div>
            ) : (
              <div key={i} className={`ach-log-line ach-log-line--${l.kind}`}>{l.text}</div>
            )
          )}
        </div>
      </div>
    </div>
    </div>
  );
}

function _countClass(board, cls) {
  let n = 0;
  for (const row of ["front", "middle", "back"]) if (board[cls][row]) n++;
  return n;
}
function _clearAnim(board) {
  const b = JSON.parse(JSON.stringify(board));
  for (const cls of CLASSES_ORDER) {
    for (const row of ["front", "middle", "back"]) {
      if (b[cls][row]) b[cls][row].anim = null;
    }
  }
  return b;
}
function _markDeaths(board) {
  const b = JSON.parse(JSON.stringify(board));
  let killed = 0;
  for (const cls of CLASSES_ORDER) {
    for (const row of ["front", "middle", "back"]) {
      const u = b[cls][row];
      if (u && u.hp <= 0) { u.anim = "death"; killed++; }
    }
  }
  return { board: b, killed };
}
function _removeDead(board) {
  const b = JSON.parse(JSON.stringify(board));
  for (const cls of CLASSES_ORDER) {
    for (const row of ["front", "middle", "back"]) {
      const u = b[cls][row];
      if (u && u.hp <= 0) b[cls][row] = null;
    }
  }
  return b;
}

Object.assign(window, { AchBoard });
