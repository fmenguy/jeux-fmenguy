// Champion.jsx — bandeau de Champion (joueur ou IA)
// Mappable sur src/games/achrogemme/components/ChampionView.tsx
//
// Props :
//   side       "joueur" | "ia"
//   name       nom affiché
//   subtitle   sous-titre (ex: "Affinité Sylvestre")
//   avatar     emoji placeholder
//   hp, hpMax  points de vie
//   accent     "sylvestre" | "arcanique" | "rempart" | null  (teinte de cadre)

function AchChampion({ side, name, subtitle, avatar, hp, hpMax, accent }) {
  const pct = Math.max(0, Math.min(100, (hp / hpMax) * 100));
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
    </div>
  );
}

Object.assign(window, { AchChampion });
