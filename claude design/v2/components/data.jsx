// data.jsx — données des 12 cartes exemples
// (à porter en src/games/achrogemme/data/cards.ts plus tard)
//
// Champs :
//   id          identifiant stable
//   name        nom affiché
//   type        unite | sort
//   classe      sylvestre | arcanique | rempart
//   faction     elfe | nain | humain | royal
//   rarete      commune | rare | legendaire
//   saga        tome1 | tome2 (uniquement légendaires, pour cadre cristal)
//   cost        coût en Gemmes
//   atk, hp     stats (unités uniquement)
//   gemMod      bonus / malus permanent de Gemmes max (entier signé, optionnel)
//   glyph       emoji placeholder (le user fournira l'image plus tard)
//   text        texte d'effet, sans tiret long
//   keywords    mots-clés affichés en bandeau (Tir, Garde, Magie, etc.)

window.ACH_CARDS = [
  // ---------- Sylvestre (vert mousse) ----------
  {
    id: "syl-archer",
    name: "Archer elfe",
    type: "unite", classe: "sylvestre", faction: "elfe", rarete: "commune",
    cost: 2, atk: 2, hp: 1,
    glyph: "🏹",
    text: "Tir. Inflige 2 au Champion adverse.",
    keywords: ["Tir"],
  },
  {
    id: "syl-veteran",
    name: "Archer vétéran",
    type: "unite", classe: "sylvestre", faction: "elfe", rarete: "rare",
    cost: 4, atk: 3, hp: 3,
    glyph: "🎯",
    text: "Tir. Frappe double si une Élue est en jeu.",
    keywords: ["Tir", "Frappe double"],
  },
  {
    id: "syl-lilia",
    name: "Lilia",
    type: "unite", classe: "sylvestre", faction: "royal", rarete: "legendaire",
    saga: "tome1",
    cost: 6, atk: 4, hp: 5,
    gemMod: 1,
    glyph: "👸",
    text: "Tir, Perce. Ignore les Gardes. Active la Couronne d'Achronia.",
    keywords: ["Tir", "Perce"],
  },

  // ---------- Arcanique (cyan glacier) ----------
  {
    id: "arc-apprenti",
    name: "Apprenti mage",
    type: "unite", classe: "arcanique", faction: "humain", rarete: "commune",
    cost: 2, atk: 1, hp: 2,
    glyph: "✨",
    text: "Magie. Soigne 1 PV au Champion allié.",
    keywords: ["Magie"],
  },
  {
    id: "arc-runes",
    name: "Mage des runes",
    type: "unite", classe: "arcanique", faction: "elfe", rarete: "rare",
    cost: 3, atk: 1, hp: 4,
    glyph: "🔮",
    text: "Magie, Régénération. Soigne 2 PV par tour au Champion allié.",
    keywords: ["Magie", "Régénération"],
  },
  {
    id: "arc-sandara",
    name: "Sandara",
    type: "unite", classe: "arcanique", faction: "royal", rarete: "legendaire",
    saga: "tome2",
    cost: 7, atk: 2, hp: 6,
    gemMod: 1,
    glyph: "🧙‍♀️",
    text: "Magie. À l'invocation, soigne 5 PV. Vos sorts coûtent 1 Gemme de moins.",
    keywords: ["Magie", "Régénération"],
  },

  // ---------- Rempart (ocre cuivre) ----------
  {
    id: "rem-garde-nain",
    name: "Garde nain",
    type: "unite", classe: "rempart", faction: "nain", rarete: "commune",
    cost: 3, atk: 1, hp: 5,
    glyph: "🛡️",
    text: "Garde. Encaisse les dégâts à la place des unités derrière.",
    keywords: ["Garde"],
  },
  {
    id: "rem-throrin-jeune",
    name: "Guerrier nain robuste",
    type: "unite", classe: "rempart", faction: "nain", rarete: "rare",
    cost: 5, atk: 3, hp: 6,
    glyph: "⚒️",
    text: "Garde, Riposte. Renvoie la moitié des dégâts subis.",
    keywords: ["Garde", "Riposte"],
  },
  {
    id: "rem-throrin",
    name: "Throrin",
    type: "unite", classe: "rempart", faction: "royal", rarete: "legendaire",
    saga: "tome1",
    cost: 7, atk: 5, hp: 8,
    glyph: "👑",
    text: "Garde, Charge. Active la Couronne d'Achronia. Inflige 2 dégâts à toutes les unités adverses à l'invocation.",
    keywords: ["Garde", "Charge"],
  },

  // ---------- Sortilèges ----------
  {
    id: "sort-trait",
    name: "Trait précis",
    type: "sort", classe: "sylvestre", faction: "elfe", rarete: "commune",
    cost: 1,
    glyph: "🪶",
    text: "Inflige 3 dégâts au Champion adverse.",
    keywords: ["Sort"],
  },
  {
    id: "sort-regen",
    name: "Brise de régénération",
    type: "sort", classe: "arcanique", faction: "elfe", rarete: "rare",
    cost: 2,
    glyph: "💧",
    text: "Soigne 4 PV au Champion allié et 1 PV à toutes vos unités.",
    keywords: ["Sort", "Magie"],
  },
  {
    id: "sort-sylvie",
    name: "Cri de Sylvie",
    type: "sort", classe: "rempart", faction: "royal", rarete: "legendaire",
    saga: "tome2",
    cost: 4,
    glyph: "💎",
    text: "Vos unités gagnent +1 ATQ et Garde jusqu'à la fin du tour. Les Élues gagnent +2 ATQ supplémentaires.",
    keywords: ["Sort", "Cristal"],
  },
];

window.ACH_SYNERGIES = [
  { id: "elfe",    label: "Elfe",                       icon: "🌿", steps: [2, 4], hint: "+1 ATQ aux Elfes puis +1 PV" },
  { id: "nain",    label: "Nain",                       icon: "⚒️", steps: [2, 4], hint: "+1 PV aux Nains puis Garde sur tous les Nains" },
  { id: "humain",  label: "Humain",                     icon: "🏰", steps: [3],    hint: "+1 Gemme max" },
  { id: "royal",   label: "Couronnes d'Achronia",       icon: "👑", steps: [3, 5], hint: "+5 PV max au Champion" },
];
