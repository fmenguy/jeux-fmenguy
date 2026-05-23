// IntroScreen.jsx — écran d'accueil
//
// Props :
//   onStart   callback pour lancer la première partie

function AchIntro({ onStart }) {
  // Petites gemmes flottantes en décor, positions stables (pas de Math.random
  // par render pour éviter le clignotement).
  const gems = [
    { top: "12%", left: "8%",  delay: 0   },
    { top: "70%", left: "12%", delay: 1.2 },
    { top: "22%", left: "88%", delay: 2.4 },
    { top: "78%", left: "85%", delay: 0.8 },
    { top: "45%", left: "4%",  delay: 3.6 },
    { top: "55%", left: "94%", delay: 1.8 },
  ];
  return (
    <div className="ach-intro">
      <div className="ach-intro__deco" aria-hidden="true">
        {gems.map((g, i) => (
          <div
            key={i}
            className="ach-intro__deco-gem"
            style={{ top: g.top, left: g.left, animationDelay: `${g.delay}s` }}
          />
        ))}
      </div>

      <div className="ach-intro__inner">
        <div className="ach-intro__sup">Le jeu de cartes d'Achronia</div>
        <h1 className="ach-intro__title">
          <span className="ach-intro__title-orn">✦</span>
          Achrogemme
          <span className="ach-intro__title-orn">✦</span>
        </h1>
        <div className="ach-intro__subtitle">
          Trois Marches, des Gemmes, et la mémoire de Skarn.
        </div>

        <div className="ach-intro__lore">
          À bord de l'Éclatmaris, Sylvie déploie le jeu que son père lui a appris.
          La Sylvestre garde les forêts, l'Arcanique veille sur les plaines de runes,
          le Rempart tient les forteresses naines. Chaque Gemme captée alimente
          les pièces invoquées. Que la Couronne d'Achronia se relève par votre main.
        </div>

        <button className="ach-intro__cta" onClick={onStart}>
          Affronter Sylvie
          <span className="ach-intro__cta-sub">premier niveau de difficulté</span>
        </button>
      </div>
    </div>
  );
}

Object.assign(window, { AchIntro });
