/* ============================================
   AELINDRA · icons.jsx
   Bibliothèque d'icônes runiques (SVG inline)
   Tous monolinéaires, viewBox 24x24
   Utilisation : <Ico id="warrior" className="ico ico-lg" />
   ============================================ */

const ICON_DEFS = (
  <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
    <defs>
      {/* ===== SIGIL LOGO — étoile elfique dans cercle runique ===== */}
      <symbol id="i-sigil" viewBox="0 0 64 64">
        <g fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="32" cy="32" r="28" opacity=".4" />
          <circle cx="32" cy="32" r="22" />
          <path d="M32 8 L36 28 L56 32 L36 36 L32 56 L28 36 L8 32 L28 28 Z" />
          <circle cx="32" cy="32" r="3" fill="currentColor" stroke="none" />
          {/* Petits ticks runiques sur l'orbite extérieure */}
          <path d="M32 2 v3 M32 59 v3 M2 32 h3 M59 32 h3 M11 11 l2 2 M51 51 l2 2 M53 11 l-2 2 M13 53 l-2 -2" opacity=".7" />
        </g>
      </symbol>

      {/* ===== HUB — DONJONS (arche d'entrée + flèche descendante) ===== */}
      <symbol id="i-dungeon" viewBox="0 0 24 24">
        <g fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 21 V11 a8 8 0 0 1 16 0 V21" />
          <path d="M4 21 H20" />
          <path d="M9 21 V14 a3 3 0 0 1 6 0 V21" />
          <path d="M12 9 V4" />
          <path d="M9 6 L12 3 L15 6" />
        </g>
      </symbol>

      {/* ===== HUB — GUILDE (cercle runique avec lames croisées) ===== */}
      <symbol id="i-guild" viewBox="0 0 24 24">
        <g fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="9" opacity=".5" />
          <path d="M7 7 L17 17" />
          <path d="M17 7 L7 17" />
          <path d="M5.5 5.5 L8 8 M16 16 L18.5 18.5 M18.5 5.5 L16 8 M8 16 L5.5 18.5" />
          <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
        </g>
      </symbol>

      {/* ===== HUB — MARCHÉ (balance / chalice) ===== */}
      <symbol id="i-market" viewBox="0 0 24 24">
        <g fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 4 V20" />
          <path d="M8 20 H16" />
          <path d="M4 8 H20" />
          <path d="M4 8 L2 13 a3 3 0 0 0 6 0 L6 8" />
          <path d="M20 8 L22 13 a3 3 0 0 1 -6 0 L18 8" />
          <circle cx="12" cy="6" r="1.5" />
        </g>
      </symbol>

      {/* ===== HUB — ÉQUIPE (livre ouvert avec sceau) ===== */}
      <symbol id="i-team" viewBox="0 0 24 24">
        <g fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 5 H10 a2 2 0 0 1 2 2 V20 a2 2 0 0 0 -2 -2 H3 Z" />
          <path d="M21 5 H14 a2 2 0 0 0 -2 2 V20 a2 2 0 0 1 2 -2 H21 Z" />
          <path d="M5 9 H9 M5 12 H9 M15 9 H19 M15 12 H19" opacity=".7" />
          <circle cx="12" cy="15" r="1.5" />
        </g>
      </symbol>

      {/* ===== HUB — MISSIONS (parchemin + plume) ===== */}
      <symbol id="i-missions" viewBox="0 0 24 24">
        <g fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 3 H17 a2 2 0 0 1 2 2 V19 a2 2 0 0 1 -2 2 H7 a2 2 0 0 1 -2 -2 V5 a2 2 0 0 1 1 -2 Z" />
          <path d="M8 8 H14" />
          <path d="M8 11 H14" />
          <path d="M8 14 H12" />
          <path d="M16 16 L19 13 L21 15 L18 18" />
        </g>
      </symbol>

      {/* ===== CLASS — GUERRIER (hache stylisée) ===== */}
      <symbol id="i-warrior" viewBox="0 0 24 24">
        <g fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22 V8" />
          <path d="M12 8 L7 5 a6 6 0 0 1 5 -3 a6 6 0 0 1 5 3 L12 8 Z" />
          <path d="M9 22 H15" />
        </g>
      </symbol>

      {/* ===== CLASS — ARCHER (arc + flèche) ===== */}
      <symbol id="i-archer" viewBox="0 0 24 24">
        <g fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 19 C 11 17, 17 11, 19 5" />
          <path d="M3 21 L21 3" />
          <path d="M16 3 H21 V8" />
          <path d="M5 19 L3 21 L5 21 L3 19 Z" opacity=".7" />
        </g>
      </symbol>

      {/* ===== CLASS — MAGE (spirale de feu) ===== */}
      <symbol id="i-mage" viewBox="0 0 24 24">
        <g fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22 C 17 18, 19 14, 17 10 C 15 7, 11 7, 10 11 C 9 14, 12 16, 14 14 C 16 12, 14 9, 12 10" />
          <path d="M12 4 L13 1 L14 4 L17 5 L14 6 L13 9 L12 6 L9 5 Z" opacity=".8" />
        </g>
      </symbol>

      {/* ===== CLASS — PROTECTEUR (bouclier + croix runique) ===== */}
      <symbol id="i-guardian" viewBox="0 0 24 24">
        <g fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3 L20 6 V12 C 20 16, 16 20, 12 22 C 8 20, 4 16, 4 12 V6 Z" />
          <path d="M12 8 V16" />
          <path d="M8 12 H16" />
        </g>
      </symbol>

      {/* ===== CLASS — ESPION (dague) ===== */}
      <symbol id="i-spy" viewBox="0 0 24 24">
        <g fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2 L14 14 L12 16 L10 14 Z" />
          <path d="M8 14 H16" />
          <path d="M12 16 V22" />
          <path d="M9 22 H15" />
        </g>
      </symbol>

      {/* ===== CLASS — SOIGNEUR (feuille + croix lumineuse) ===== */}
      <symbol id="i-healer" viewBox="0 0 24 24">
        <g fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 20 C 5 12, 12 4, 20 5 C 19 13, 11 20, 5 20 Z" />
          <path d="M9 14 H14 M11.5 12 V16" />
        </g>
      </symbol>

      {/* ===== CLASS — MOINE (chakra : cercles concentriques + dot) ===== */}
      <symbol id="i-monk" viewBox="0 0 24 24">
        <g fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="9" />
          <circle cx="12" cy="12" r="5" opacity=".7" />
          <path d="M3 12 H6 M18 12 H21 M12 3 V6 M12 18 V21" opacity=".6" />
          <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
        </g>
      </symbol>

      {/* ===== CLASS — BARDE (luth elfique) ===== */}
      <symbol id="i-bard" viewBox="0 0 24 24">
        <g fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 4 L20 10 L14 16 C 11 19, 6 19, 5 17 C 4 14, 8 11, 11 11 C 13 11, 14 9, 14 4 Z" />
          <path d="M8 14 L13 9" opacity=".7" />
          <path d="M9 16 L14 11" opacity=".5" />
          <circle cx="16" cy="8" r=".8" fill="currentColor" />
          <circle cx="18" cy="10" r=".8" fill="currentColor" />
        </g>
      </symbol>

      {/* ===== CLASS — ENTRAVEUR (toile / chaînes) ===== */}
      <symbol id="i-ensnarer" viewBox="0 0 24 24">
        <g fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2 V22 M2 12 H22" />
          <path d="M5 5 L19 19 M19 5 L5 19" opacity=".7" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="12" cy="12" r="8" opacity=".5" />
          <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
        </g>
      </symbol>

      {/* ===== CURRENCY — OR (losange gravé) ===== */}
      <symbol id="i-coin" viewBox="0 0 24 24">
        <g fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2 L22 12 L12 22 L2 12 Z" />
          <path d="M12 7 L17 12 L12 17 L7 12 Z" />
          <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
        </g>
      </symbol>

      {/* ===== CURRENCY — ORBE RUNIQUE ===== */}
      <symbol id="i-orb" viewBox="0 0 24 24">
        <g fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="8" />
          <circle cx="12" cy="12" r="3" />
          <path d="M12 4 L13 6 L11 6 Z" fill="currentColor" stroke="none" />
          <path d="M12 20 L13 18 L11 18 Z" fill="currentColor" stroke="none" />
          <path d="M4 12 L6 13 L6 11 Z" fill="currentColor" stroke="none" />
          <path d="M20 12 L18 13 L18 11 Z" fill="currentColor" stroke="none" />
        </g>
      </symbol>

      {/* ===== ACTION — MOVE (chevrons multidirectionnels) ===== */}
      <symbol id="i-move" viewBox="0 0 24 24">
        <g fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3 L9 6 H15 Z" fill="currentColor" />
          <path d="M12 21 L9 18 H15 Z" fill="currentColor" />
          <path d="M3 12 L6 9 V15 Z" fill="currentColor" />
          <path d="M21 12 L18 9 V15 Z" fill="currentColor" />
          <circle cx="12" cy="12" r="2" />
        </g>
      </symbol>

      {/* ===== ACTION — ATTAQUE (lames croisées) ===== */}
      <symbol id="i-attack" viewBox="0 0 24 24">
        <g fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 5 L13 13 L15 15 L17 17 L19 19" />
          <path d="M19 5 L11 13 L9 15 L7 17 L5 19" />
          <path d="M5 5 L7 3 M19 5 L21 7 M5 19 L7 21 M19 19 L21 17" />
        </g>
      </symbol>

      {/* ===== ACTION — SORT (étincelle runique) ===== */}
      <symbol id="i-spell" viewBox="0 0 24 24">
        <g fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2 L13.5 9 L20 10 L13.5 11 L12 18 L10.5 11 L4 10 L10.5 9 Z" />
          <path d="M19 17 L19.5 19 L21 19.5 L19.5 20 L19 22 L18.5 20 L17 19.5 L18.5 19 Z" opacity=".8" />
          <path d="M5 18 L5.5 19.5 L7 20 L5.5 20.5 L5 22 L4.5 20.5 L3 20 L4.5 19.5 Z" opacity=".6" />
        </g>
      </symbol>

      {/* ===== EQUIP — HEAD (heaume) ===== */}
      <symbol id="i-head" viewBox="0 0 24 24">
        <g fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12 C 5 7, 8 4, 12 4 C 16 4, 19 7, 19 12 V18 C 19 19, 18 20, 17 20 H7 C 6 20, 5 19, 5 18 Z" />
          <path d="M5 14 H19" />
          <path d="M9 17 V20 M15 17 V20" opacity=".6" />
        </g>
      </symbol>

      {/* ===== EQUIP — BODY (cuirasse) ===== */}
      <symbol id="i-body" viewBox="0 0 24 24">
        <g fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 6 L9 4 L12 6 L15 4 L19 6 V18 C 19 19, 18 20, 17 20 H7 C 6 20, 5 19, 5 18 Z" />
          <path d="M12 6 V20" opacity=".5" />
          <path d="M9 11 H15" opacity=".5" />
        </g>
      </symbol>

      {/* ===== EQUIP — WEAPON (épée) ===== */}
      <symbol id="i-weapon" viewBox="0 0 24 24">
        <g fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2 L20 8 L8 20 L4 20 L4 16 Z" />
          <path d="M16 6 L18 8" opacity=".6" />
          <path d="M4 16 L8 20" />
        </g>
      </symbol>

      {/* ===== EQUIP — OFFHAND (bouclier rond) ===== */}
      <symbol id="i-offhand" viewBox="0 0 24 24">
        <g fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="9" />
          <circle cx="12" cy="12" r="4" opacity=".7" />
          <path d="M12 3 V21 M3 12 H21" opacity=".4" />
        </g>
      </symbol>

      {/* ===== MISC — ARROW LEFT (retour) ===== */}
      <symbol id="i-back" viewBox="0 0 24 24">
        <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 6 L8 12 L14 18" />
          <path d="M8 12 H20" opacity=".7" />
        </g>
      </symbol>

      {/* ===== MISC — CHECK ===== */}
      <symbol id="i-check" viewBox="0 0 24 24">
        <g fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12 L10 17 L19 7" />
        </g>
      </symbol>

      {/* ===== MISC — GIFT (héros offert) ===== */}
      <symbol id="i-gift" viewBox="0 0 24 24">
        <g fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9 H21 V11 H3 Z" />
          <path d="M5 11 V20 H19 V11" />
          <path d="M12 9 V20" />
          <path d="M12 9 C 9 9, 7 7, 7 5 C 7 3, 9 3, 10 4 C 11 5, 12 7, 12 9" />
          <path d="M12 9 C 15 9, 17 7, 17 5 C 17 3, 15 3, 14 4 C 13 5, 12 7, 12 9" />
        </g>
      </symbol>

      {/* ===== MISC — LOCK ===== */}
      <symbol id="i-lock" viewBox="0 0 24 24">
        <g fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 11 H18 V20 H6 Z" />
          <path d="M9 11 V8 a3 3 0 0 1 6 0 V11" />
          <circle cx="12" cy="15" r="1.5" fill="currentColor" stroke="none" />
        </g>
      </symbol>

      {/* ===== MISC — INFO ===== */}
      <symbol id="i-info" viewBox="0 0 24 24">
        <g fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 11 V17" />
          <circle cx="12" cy="8" r=".5" fill="currentColor" />
        </g>
      </symbol>

      {/* ===== MISC — STAR (rareté) ===== */}
      <symbol id="i-star" viewBox="0 0 24 24">
        <g fill="currentColor" stroke="none">
          <path d="M12 3 L14 9 L20 9 L15 13 L17 19 L12 15 L7 19 L9 13 L4 9 L10 9 Z" />
        </g>
      </symbol>

      {/* ===== MISC — POTION (fiole) ===== */}
      <symbol id="i-potion" viewBox="0 0 24 24">
        <g fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10 3 H14 V7" />
          <path d="M9 3 H15" />
          <path d="M14 7 C 17 9, 18 13, 18 16 a4 4 0 0 1 -4 4 H10 a4 4 0 0 1 -4 -4 C 6 13, 7 9, 10 7 Z" />
          <path d="M8 15 H16" opacity=".5" />
        </g>
      </symbol>

      {/* ===== MISC — RUNE GLYPH (ornement) ===== */}
      <symbol id="i-rune" viewBox="0 0 24 24">
        <g fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3 V21" />
          <path d="M12 7 L7 12" />
          <path d="M12 11 L17 16" />
          <path d="M7 12 H4" opacity=".7" />
          <path d="M17 16 H20" opacity=".7" />
        </g>
      </symbol>

      {/* ===== MISC — TIME / RESET (sablier) ===== */}
      <symbol id="i-time" viewBox="0 0 24 24">
        <g fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 3 H18 V6 L13 12 L18 18 V21 H6 V18 L11 12 L6 6 Z" />
        </g>
      </symbol>

      {/* ===== MISC — EDIT (plume) ===== */}
      <symbol id="i-edit" viewBox="0 0 24 24">
        <g fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 4 L20 9 L9 20 L4 20 L4 15 Z" />
          <path d="M13 6 L18 11" opacity=".5" />
        </g>
      </symbol>

      {/* ===== MISC — TARGET (combat) ===== */}
      <symbol id="i-target" viewBox="0 0 24 24">
        <g fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="9" />
          <circle cx="12" cy="12" r="5" />
          <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
        </g>
      </symbol>

      {/* ===== MISC — END TURN (chevron double) ===== */}
      <symbol id="i-end" viewBox="0 0 24 24">
        <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 6 L12 12 L6 18" />
          <path d="M12 6 L18 12 L12 18" />
        </g>
      </symbol>
    </defs>
  </svg>
);

/* ===== Composant utilitaire ===== */
function Ico({ id, className = "ico", style }) {
  return (
    <svg className={className} style={style} aria-hidden="true">
      <use href={`#i-${id}`} />
    </svg>
  );
}

window.Ico = Ico;
window.ICON_DEFS = ICON_DEFS;
