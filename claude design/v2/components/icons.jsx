// icons.jsx — petites icônes SVG inline réutilisées (épée, cœur, gemme)
// Volontairement géométriques, pas d'illustration.

function IconSword({ size = 12 }) {
  return (
    <svg viewBox="0 0 12 12" width={size} height={size} aria-hidden="true">
      <path
        d="M9.5 1.5 6 5 4 7 2.5 8.5 1.5 9.5l1 1 1-1L5 8l2-2 3.5-3.5z"
        fill="currentColor" stroke="currentColor" strokeWidth="0.4" strokeLinejoin="round"
      />
      <path d="M3 9 1 11" stroke="currentColor" strokeWidth="0.8" strokeLinecap="round" />
    </svg>
  );
}

function IconHeart({ size = 12 }) {
  return (
    <svg viewBox="0 0 12 12" width={size} height={size} aria-hidden="true">
      <path
        d="M6 10.2 1.6 6c-1.4-1.4-.5-3.9 1.6-3.9 1 0 1.7.5 2.1 1.2L6 4l.7-.7c.4-.7 1.1-1.2 2.1-1.2 2.1 0 3 2.5 1.6 3.9L6 10.2z"
        fill="currentColor"
      />
    </svg>
  );
}

function IconGem({ size = 12 }) {
  return (
    <svg viewBox="0 0 12 12" width={size} height={size} aria-hidden="true">
      <path
        d="M2 4l2-2.5h4L10 4 6 10.5 2 4z"
        fill="currentColor" stroke="currentColor" strokeWidth="0.4" strokeLinejoin="round"
      />
      <path d="M2 4h8M4 1.5 6 4 8 1.5M6 4l-2 6.5M6 4l2 6.5"
        stroke="oklch(0 0 0 / 0.35)" strokeWidth="0.4" fill="none" />
    </svg>
  );
}

// Entrelac doré pour les coins de cartes légendaires.
// Forme géométrique simple, pas une illustration complexe.
function IconEntrelac({ size = 38 }) {
  return (
    <svg viewBox="0 0 38 38" width={size} height={size} aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round">
        <path d="M2 14 C 2 6, 6 2, 14 2" />
        <path d="M5 11 C 5 7, 7 5, 11 5" opacity="0.7" />
        <circle cx="9" cy="9" r="2.2" />
        <path d="M14 2 L 22 2" opacity="0.6" />
        <path d="M2 14 L 2 22" opacity="0.6" />
        <path d="M14 14 L 22 22" opacity="0.4" />
      </g>
    </svg>
  );
}

// Vrille végétale pour cadre B
function IconCorner({ size = 26 }) {
  return (
    <svg viewBox="0 0 26 26" width={size} height={size} aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round">
        <path d="M2 12 C 2 6, 6 2, 12 2" />
        <path d="M6 10 C 8 8, 10 8, 10 10 C 10 12, 8 12, 8 10" />
        <path d="M4 14 L 8 14" opacity="0.6" />
      </g>
    </svg>
  );
}

// Petite épée de phase Combat / icône de combat dans le log
function IconCombat({ size = 11 }) {
  return (
    <svg viewBox="0 0 12 12" width={size} height={size} aria-hidden="true">
      <path d="M2 10 L 6 6 L 10 10 M 6 6 L 6 2"
        stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" fill="none" />
    </svg>
  );
}

Object.assign(window, {
  IconSword, IconHeart, IconGem, IconEntrelac, IconCorner, IconCombat,
});
