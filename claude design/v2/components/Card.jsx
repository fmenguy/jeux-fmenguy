// Card.jsx — composant carte Achrogemme
// Mappable 1:1 sur src/games/achrogemme/components/CardView.tsx
//
// Props :
//   card        objet de données (voir data.jsx)
//   frame       "sobre" | "vegetal" | "runique"  (variante de cadre)
//   onBoard     bool, rend la carte en taille plateau
//   interactive bool, ajoute hover et cursor pointer
//   playable    bool, grise la carte si non jouable
//   anim        "enter" | "draw" | "hit" | "heal" | "death" | "guard" | null
//   onClick     callback

function AchCard({
  card,
  frame = "sobre",
  onBoard = false,
  interactive = false,
  playable = true,
  anim = null,
  onClick,
}) {
  const isLegendary = card.rarete === "legendaire";
  const isSpell = card.type === "sort";
  const factionLabel = {
    elfe: "Elfe",
    nain: "Nain",
    humain: "Humain",
    royal: "Royal",
  }[card.faction] || card.faction;
  const classeLabel = {
    sylvestre: "Sylvestre",
    arcanique: "Arcanique",
    rempart: "Rempart",
  }[card.classe];
  const classeIcon = {
    sylvestre: "🏹",
    arcanique: "✨",
    rempart: "⚔",
  }[card.classe];
  const factionIcon = {
    elfe: "☘",
    nain: "⚒",
    humain: "🏰",
    royal: "👑",
  }[card.faction];

  return (
    <div
      className="ach-card"
      data-rarity={card.rarete}
      data-class={card.classe}
      data-frame={frame}
      data-type={card.type}
      data-saga={card.saga || ""}
      data-onboard={onBoard ? "1" : "0"}
      data-interactive={interactive ? "1" : "0"}
      data-playable={playable ? "1" : "0"}
      data-anim={anim || ""}
      onClick={onClick}
    >
      {isLegendary && <div className="ach-card__halo" />}
      {isLegendary && card.saga === "tome2" && (
        <>
          <div className="ach-card__crystal-marker" />
          <div className="ach-card__crystal-marker" />
        </>
      )}

      <div className="ach-card__frame">
        {/* Coins végétaux (cadre B) */}
        {frame === "vegetal" && !isLegendary && (
          <>
            <div className="ach-card__corner ach-card__corner--tl"><IconCorner /></div>
            <div className="ach-card__corner ach-card__corner--tr"><IconCorner /></div>
            <div className="ach-card__corner ach-card__corner--bl"><IconCorner /></div>
            <div className="ach-card__corner ach-card__corner--br"><IconCorner /></div>
          </>
        )}

        {/* Entrelacs dorés (légendaires) */}
        {isLegendary && (
          <>
            <div className="ach-card__entrelac ach-card__entrelac--tl"><IconEntrelac /></div>
            <div className="ach-card__entrelac ach-card__entrelac--tr"><IconEntrelac /></div>
            <div className="ach-card__entrelac ach-card__entrelac--bl"><IconEntrelac /></div>
            <div className="ach-card__entrelac ach-card__entrelac--br"><IconEntrelac /></div>
          </>
        )}

        {/* Anatomie : top stats */}
        <div className="ach-card__top">
          <div className="ach-card__cost" title="Coût en Gemmes">{card.cost}</div>
          <div />
          {!isSpell && (
            <div className="ach-card__stats">
              <div className="ach-card__atk" title="Attaque">
                <IconSword />
                <span>{card.atk}</span>
              </div>
              <div className="ach-card__hp" title="Points de vie">
                <IconHeart />
                <span>{card.hp}</span>
              </div>
            </div>
          )}
        </div>

        {/* Badge ±Gemmes max, optionnel */}
        {card.gemMod && (
          <div
            className="ach-card__gemmod"
            data-sign={card.gemMod > 0 ? "+" : "-"}
            title="Modifie le maximum de Gemmes"
          >
            {card.gemMod > 0 ? `+${card.gemMod}` : card.gemMod}
            <span className="ach-card__gemmod-label">Gemme max</span>
          </div>
        )}

        {/* Illustration (placeholder rayé tant que card.art n'est pas fourni) */}
        <div className="ach-card__art">
          <div className="ach-card__art-halo" />
          {card.art ? (
            <img className="ach-card__art-img" src={card.art} alt="" loading="lazy" decoding="async" />
          ) : (
            <div className="ach-card__art-glyph">{card.glyph}</div>
          )}
          {!onBoard && !card.art && <div className="ach-card__art-placeholder">art : {card.id}</div>}
        </div>

        {/* Bandeau nom */}
        <div className="ach-card__name">
          {isLegendary && <span className="ach-card__crown">👑</span>}
          <span>{card.name}</span>
        </div>

        {/* Texte d'effet */}
        {!onBoard && (
          <div className="ach-card__text">
            <span>{card.text}</span>
          </div>
        )}

        {/* Pied : faction · classe */}
        {!onBoard && (
          <div className="ach-card__footer">
            <span>{factionIcon} {factionLabel}</span>
            <span className="ach-card__footer-dot" />
            <span>{classeIcon} {classeLabel}</span>
          </div>
        )}
      </div>
    </div>
  );
}

Object.assign(window, { AchCard });
