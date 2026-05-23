// SynergyBar.jsx — bandeau de synergies (chips dorées style TFT)
//
// Props :
//   counts   { elfe: 2, nain: 1, humain: 0, royal: 3 }
//   side     "joueur" | "ia"  (juste pour data-attr, pas utilisé visuellement)

function AchSynergyBar({ counts = {}, side = "joueur" }) {
  return (
    <div className="ach-board__synergies" data-side={side}>
      {window.ACH_SYNERGIES.map((syn) => {
        const n = counts[syn.id] || 0;
        // Palier le plus haut atteint
        const reachedSteps = syn.steps.filter((s) => n >= s);
        const active = reachedSteps.length > 0;
        const nextStep = syn.steps.find((s) => n < s) || syn.steps[syn.steps.length - 1];
        const targetStep = active ? reachedSteps[reachedSteps.length - 1] : nextStep;
        return (
          <div
            key={syn.id}
            className="ach-syn-chip"
            data-active={active ? "1" : "0"}
            title={syn.hint}
          >
            <span className="ach-syn-chip__icon">{syn.icon}</span>
            <span>{syn.label}</span>
            <span className="ach-syn-chip__count">
              {n}<i>/{targetStep}</i>
            </span>
          </div>
        );
      })}
    </div>
  );
}

Object.assign(window, { AchSynergyBar });
