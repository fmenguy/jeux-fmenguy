// Champion.jsx — bandeau de Champion (joueur ou IA)
// Mappable sur src/games/achrogemme/components/ChampionView.tsx
//
// Props :
//   side       "joueur" | "ia"
//   name       nom affiché
//   subtitle   sous-titre (ex: "Affinité Sylvestre")
//   avatar     emoji placeholder
//   hp, hpMax  points de vie
//   gemMax     gemmes maximum (optionnel)
//   gemSpent   gemmes dépensées (optionnel)
//   accent     "sylvestre" | "arcanique" | "rempart" | null  (teinte de cadre)

function AchChampion({ side, name, subtitle, avatar, hp, hpMax, gemMax, gemSpent, accent }) {
  const pct = Math.max(0, Math.min(100, (hp / hpMax) * 100));
  const showMana = typeof gemMax === "number" && gemMax > 0;
  const remaining = showMana ? Math.max(0, gemMax - (gemSpent || 0)) : 0;
  return (
    <div className="ach-champ" data-side={side} data-accent={accent || ""}>
      <div className="ach-champ__avatar">{avatar}</div>
      <div className="ach-champ__info">
        <h3 className="ach-champ__name">
          {name}
          {subtitle && <small>{subtitle}</small>}
        </h3>
        <div className="ach-champ__hpbar">
          <div className="ach-champ__hpfill" style={{ width: `${pct}%` }} />
          <div className="ach-champ__hpvalue">{hp} / {hpMax}</div>
        </div>
      </div>
      {showMana && (
        <div className="ach-champ__mana" title={`${remaining} Gemmes sur ${gemMax}`}>
          {Array.from({ length: gemMax }).map((_, i) => (
            <span
              key={i}
              className="ach-champ__mana-gem"
              data-spent={i < (gemSpent || 0) ? "1" : "0"}
              style={{ animationDelay: `${i * 0.18}s` }}
            />
          ))}
          <span className="ach-champ__mana-count">{remaining}/{gemMax}</span>
        </div>
      )}
    </div>
  );
}

Object.assign(window, { AchChampion });
