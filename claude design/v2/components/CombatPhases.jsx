// CombatPhases.jsx — vignette statique illustrant les 4 phases de combat
// pour le design canvas (pas interactif).

function AchCombatPhases() {
  const phases = [
    {
      key: "tir", label: "Phase Tir", icon: "🏹", hue: 145,
      desc: "Les Sylvestres tirent leur ATQ directement sur le Champion adverse.",
      anim: <ArrowFx />,
    },
    {
      key: "combat", label: "Phase Combat", icon: "⚔", hue: 60,
      desc: "Pour chaque Marche, somme ATQ allié contre ennemi. Les dégâts traversent avant, milieu, arrière, puis le Champion en cas de débordement.",
      anim: <SlashFx />,
    },
    {
      key: "magie", label: "Phase Magie", icon: "✨", hue: 220,
      desc: "Les Arcaniques soignent le Champion allié et régénèrent les unités marquées.",
      anim: <RuneFx />,
    },
    {
      key: "morts", label: "Phase des Morts", icon: "☠", hue: 30,
      desc: "Les unités dont les PV tombent à zéro chutent et disparaissent. Les synergies sont recalculées.",
      anim: <DeathFx />,
    },
  ];

  return (
    <div className="ach-cp">
      <style>{ `
        .ach-cp {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 18px;
          padding: 28px;
          width: 100%;
          height: 100%;
          background: var(--ach-wood-deep);
          background-image:
            repeating-linear-gradient(92deg,
              oklch(0.18 0.02 55) 0px,
              oklch(0.22 0.025 60) 2px,
              oklch(0.16 0.02 55) 5px,
              oklch(0.20 0.025 60) 8px);
        }
        .ach-cp__cell {
          position: relative;
          border-radius: 14px;
          padding: 18px;
          background: linear-gradient(180deg, oklch(0.26 0.035 65) 0%, oklch(0.18 0.025 58) 100%);
          border: 0.5px solid oklch(0 0 0 / 0.5);
          box-shadow: 0 4px 14px oklch(0 0 0 / 0.4), inset 0 1px 0 oklch(1 0 0 / 0.06);
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        .ach-cp__head {
          display: flex; align-items: baseline; gap: 10px;
          margin-bottom: 8px;
          font-family: var(--ach-font-title);
          color: var(--ach-gold-bright);
          letter-spacing: 0.12em;
          text-transform: uppercase;
          font-size: 14px;
        }
        .ach-cp__icon { font-size: 18px; }
        .ach-cp__desc {
          font-size: 11.5px;
          line-height: 1.55;
          color: var(--ach-parch);
          opacity: 0.9;
          text-wrap: pretty;
          max-width: 360px;
        }
        .ach-cp__stage {
          flex: 1;
          margin-top: 14px;
          border-radius: 10px;
          background:
            radial-gradient(ellipse at 50% 60%,
              oklch(0.28 0.04 65 / 0.5) 0%,
              transparent 60%),
            repeating-linear-gradient(92deg,
              oklch(0.14 0.018 50) 0px,
              oklch(0.18 0.025 56) 2px,
              oklch(0.12 0.015 48) 5px,
              oklch(0.16 0.022 54) 8px);
          position: relative;
          overflow: hidden;
          display: grid;
          place-items: center;
          box-shadow: inset 0 2px 8px oklch(0 0 0 / 0.55);
          min-height: 160px;
        }
        .ach-cp__minislot {
          width: 70px;
          height: 100px;
          border-radius: 6px;
          background:
            linear-gradient(180deg, oklch(0.32 0.035 65) 0%, oklch(0.22 0.025 58) 100%);
          box-shadow: 0 2px 6px oklch(0 0 0 / 0.5), inset 0 0 0 1px oklch(0 0 0 / 0.4);
          display: grid;
          place-items: center;
          font-size: 26px;
        }
        .ach-cp__minislot.ia { border-top: 2px solid var(--ach-sylvestre-deep); }
        .ach-cp__minislot.pl { border-bottom: 2px solid var(--ach-rempart-deep); }
        .ach-cp__row {
          display: flex;
          gap: 100px;
          align-items: center;
        }
      `}</style>
      {phases.map((p) => (
        <div key={p.key} className="ach-cp__cell">
          <div className="ach-cp__head">
            <span className="ach-cp__icon">{p.icon}</span>
            <span>{p.label}</span>
          </div>
          <div className="ach-cp__desc">{p.desc}</div>
          <div className="ach-cp__stage">
            {p.anim}
          </div>
        </div>
      ))}
    </div>
  );
}

function ArrowFx() {
  return (
    <div className="ach-cp__row">
      <div className="ach-cp__minislot pl">🏹</div>
      <div style={{ position: "relative", width: 100, height: 30 }}>
        <div className="ach-arrow" style={{ left: 0, top: 12, animationIterationCount: "infinite", animationDuration: "1.6s" }} />
        <div className="ach-arrow" style={{ left: 0, top: 4, animationDelay: "0.4s", animationIterationCount: "infinite", animationDuration: "1.6s" }} />
        <div className="ach-arrow" style={{ left: 0, top: 20, animationDelay: "0.8s", animationIterationCount: "infinite", animationDuration: "1.6s" }} />
      </div>
      <div className="ach-cp__minislot ia">👸</div>
    </div>
  );
}

function SlashFx() {
  return (
    <div className="ach-cp__row">
      <div className="ach-cp__minislot pl">⚔</div>
      <div style={{ position: "relative", width: 100, height: 60 }}>
        <div className="ach-slash" style={{ left: 20, top: 28, animationIterationCount: "infinite", animationDuration: "1.4s" }} />
        <div className="ach-slash" style={{ left: 20, top: 28, animationDelay: "0.7s", animationIterationCount: "infinite", animationDuration: "1.4s" }} />
      </div>
      <div className="ach-cp__minislot ia">🛡️</div>
    </div>
  );
}

function RuneFx() {
  return (
    <div style={{ position: "relative", width: 200, height: 100 }}>
      <div className="ach-cp__minislot pl" style={{ position: "absolute", bottom: 0, left: "50%", transform: "translateX(-50%)" }}>✨</div>
      <div className="ach-rune" style={{ left: 80, top: 20, animationIterationCount: "infinite", animationDuration: "1.6s" }} />
      <div className="ach-rune" style={{ left: 110, top: 10, animationDelay: "0.5s", animationIterationCount: "infinite", animationDuration: "1.6s" }} />
      <div className="ach-rune" style={{ left: 50, top: 30, animationDelay: "1s", animationIterationCount: "infinite", animationDuration: "1.6s" }} />
    </div>
  );
}

function DeathFx() {
  return (
    <div style={{ display: "flex", gap: 24, alignItems: "center" }}>
      <div className="ach-cp__minislot" style={{ animation: "ach-card-death 2.4s ease-in-out infinite", opacity: 0.7 }}>💀</div>
      <div className="ach-cp__minislot" style={{ animation: "ach-card-death 2.4s ease-in-out infinite", animationDelay: "0.6s", opacity: 0.7 }}>💀</div>
    </div>
  );
}

Object.assign(window, { AchCombatPhases });
