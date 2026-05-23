# 🖥️ Interface et actions

## Vue d'ensemble

```
┌────────────────────────────────────────────────────────────┐
│  ← Arcade FM             ACHROGEMME           📖 Lore · Restart│  ← Barre du haut
├────────────────────────────────────────────────────────────┤
│  ☘ Peuple Elfe (2) · +1 ATQ                                │  ← Bandeau synergies IA
├──────────────────────────────────────┬─────────────────────┤
│  [Sylvie] [HP barre]   💎 3/4         │                     │  ← Champion IA
│  [Main IA face cachée]                │  TOUR 4 · à toi     │
│  ┌────────┬────────┬────────┐         │                     │
│  │Sylv. IA│Arc. IA │Remp. IA│         │  [Fin du tour]      │
│  │ Slot 1 │ Slot 1 │ Slot 1 │         │                     │
│  │ Slot 2 │ Slot 2 │ Slot 2 │         │  ─────────────────  │
│  │ Slot 3 │ Slot 3 │ Slot 3 │         │  📜 Journal :       │
│  │  VS    │  VS    │  VS    │         │  ⚔ Combat Sylvestre │
│  │ Slot 3 │ Slot 3 │ Slot 3 │         │  🏹 Volée 3 dégâts  │
│  │ Slot 2 │ Slot 2 │ Slot 2 │         │  ✨ Soin +2 PV       │
│  │ Slot 1 │ Slot 1 │ Slot 1 │         │  ☠ Garde nain tombe │
│  └────────┴────────┴────────┘         │                     │
│  [Main joueur]                        │                     │
│  [Voyageur] [HP barre]   💎 3/4       │                     │  ← Champion joueur
├──────────────────────────────────────┴─────────────────────┤
│  ☘ Peuple Elfe (2) · +1 ATQ  ⚒ Clan Nain (2) · +1 PV       │  ← Bandeau synergies joueur
└────────────────────────────────────────────────────────────┘
```

## Composants principaux

### Barre du haut
- **Retour** : lien vers `jeux.fmenguy.fr` (Arcade FM)
- **Titre** : ACHROGEMME (Cinzel, espacé, teal)
- **Boutons** : 📖 Lore (affiche/masque le texte d'ambiance sur chaque carte) · Recommencer

### Bandeau de synergies (haut et bas)
- Chips dorées style TFT : nom de la synergie + seuil atteint + effet
- Inactives en gris, actives en doré brillant
- Hover : tooltip avec description longue de la synergie

### Champion (en haut pour IA, en bas pour joueur)
- **Portrait** : initiale du nom dans un cercle teal
- **Nom** : Cinzel, teal pour joueur, doré pour IA
- **Barre PV** : dégradé rouge → or → teal selon PV (rouge si faible)
- **Texte PV** : « 18 / 25 PV »
- **Compteur Gemmes** : 💎 5/8 (chiffre doré, max en gris)
- Bordure teal pulsante si c'est le tour de ce joueur

### Plateau central
- 3 colonnes verticales (Marches)
- Chaque colonne a un **label** en haut (« 🏹 Marche Sylvestre », « ✨ Marche Arcanique », « ⚔ Marche du Rempart »)
- Couleur de fond par Marche : vert mousse / cyan glacier / cuivre patiné (proposition Claude Design)
- Chaque Marche contient :
  - Zone IA (3 slots empilés)
  - Séparateur « VS » au centre
  - Zone joueur (3 slots empilés)

### Slot (carte sur le board)
- 3 par côté par Marche, soit 9 par joueur, 18 total
- Vide : petit point décoratif gris
- Occupé : carte compacte affichant cost / ATQ / PV / nom / glyphe / faction-classe
- Hover : tooltip avec texte d'effet complet
- État « PV bas » : carte qui clignote rouge ou se penche

### Main du joueur (bas)
- Cartes au format moyen (un peu plus larges qu'en slot)
- Drag possible (Lot 3+, pour l'instant clic)
- Cartes injouables (coût > Gemmes dispo) : grisées
- Carte sélectionnée : flotte vers le haut, contour teal

### Main de l'IA (haut)
- Cartes face cachée (dos avec runes)
- Compteur indiquant le nb de cartes

### Panneau latéral droit
- **Badge tour** : « Tour 4 · à toi » / « Tour 4 · Sylvie joue »
- **Bouton « Fin du tour »** (gros bouton teal)
- **Encart d'aide contextuel** : « Clique un slot vide en Sylvestre » quand une carte est sélectionnée
- **Journal de combat** : log scrollable, dernières actions en haut
  - Phases marquées par des emojis (🏹 Tir, ⚔ Combat, ✨ Magie, ☠ Mort, ✦ Sort, ◆ Pose, ➤ Débordement)
  - Couleurs par phase

## Actions du joueur

### Cliquer une carte en main

| Type de carte | Effet du clic |
|---|---|
| Personnage Sylvestre | Active la sélection. Les slots vides en Marche Sylvestre s'illuminent |
| Personnage Arcanique | Idem, sur Marche Arcanique |
| Personnage Rempart | Idem, sur Marche du Rempart |
| Sortilège « Soin Champion » | Application immédiate, pas de cible |
| Sortilège « Embuscade » (kill) | Active la sélection. Toutes les unités adverses s'illuminent |
| Sortilège « Volée de flèches » (damage_lane) | Active la sélection. Les 3 Marches adverses s'illuminent |
| Sortilège « Runes pulsantes » (buff_lane) | Active la sélection. Tes 3 Marches s'illuminent |

### Cliquer un slot / une Marche / une unité (en mode sélection)

- Slot vide compatible : pose la carte ici
- Slot occupé compatible (kill) : détruit l'unité
- Marche entière (damage_lane / buff_lane) : applique l'effet sur toute la Marche

### Annuler une sélection
- Bouton « Annuler » dans l'encart d'aide
- Échap (à ajouter au Lot 3)
- Re-cliquer la même carte (à ajouter au Lot 3)

### Finir son tour
- Bouton « Fin du tour »
- Désactivé pendant le tour IA et en phase de résolution
- Reset la sélection en cours

### Recommencer
- Bouton « Recommencer » en haut à droite
- Démarre une nouvelle partie immédiatement (pas de confirmation pour l'instant)

### Toggle Lore
- Bouton « 📖 Lore » : affiche/masque le texte d'ambiance (lore) sous chaque carte
- Pratique pour découvrir l'univers Achronia / le roman

## Actions automatiques (système)

- **Tirage** : au début de chaque tour, le joueur pioche jusqu'à 5 cartes en main
- **Synergies** : recalculées à chaque mutation (pose, kill, mort)
- **Gemmes** : reset au max au début de chaque tour
- **Tour IA** : déclenché 700ms après la fin du tour joueur (laisser le temps de lire)
- **Résolution** : automatique après le tour IA, affiche les phases dans le journal

## États visuels des cartes

| État | Apparence |
|---|---|
| Jouable (Gemmes OK) | Pleine couleur, hover lève légèrement |
| Injouable (pas assez Gemmes) | Grisée, opacity 0.55, filter grayscale |
| Sélectionnée (en cours de pose) | Flotte vers le haut, contour teal lumineux |
| Légendaire | Halo doré permanent, couronne 👑, bordure ornée |
| Sur le board | Compacte, ATQ/PV mis à jour si bonus |
| En train de mourir (Lot 3+) | Animation fade-down + rouge |
| Vient d'arriver (Lot 3+) | Slide-in depuis la main |

## États visuels des Marches

| État | Apparence |
|---|---|
| Repos | Fond léger de couleur de la classe (vert/cyan/cuivre) |
| Targetable (en mode pose ou sort) | Bordure teal pulsante |
| Combat en cours (Lot 3+) | Flash bref à la résolution |

## Raccourcis clavier (Lot 3+)

| Touche | Action |
|---|---|
| Espace | Fin du tour |
| Échap | Annuler la sélection |
| 1-9 | Sélectionner la nième carte de la main |
| L | Toggle Lore |
| R | Recommencer (avec confirmation) |

## Responsive

| Breakpoint | Layout |
|---|---|
| > 1100px | Layout 2 colonnes (plateau + panneau droit) |
| < 1100px | Layout 1 colonne, scroll vertical, panneau passe en bas |
| < 600px | Cartes en main réduites à 80px, scroll horizontal dans la main |

## Accessibilité (cibles)

- Toutes les cartes ont un `title` HTML avec leur texte d'effet
- Boutons avec `aria-label`
- Contraste WCAG AA sur les textes principaux
- Navigation clavier complète (Lot 3+)
- Mode daltonien : icônes 🏹 ✨ ⚔ en plus des couleurs (déjà fait)

## Conventions de code (composants React)

| Composant | Fichier | Rôle |
|---|---|---|
| `Game` | [Game.tsx](../../src/games/achrogemme/Game.tsx) | Racine, state + handlers |
| `IntroScreen` | dans Game.tsx | Écran d'accueil + bouton start |
| `EndOverlay` | dans Game.tsx | Écran de fin (victoire/défaite) |
| `BoardLanes` | dans Game.tsx | Plateau 3 Marches |
| `SynergyBar` | dans Game.tsx | Bandeau de synergies |
| `LogPanel` | dans Game.tsx | Journal de combat |
| `CardView` | [CardView.tsx](../../src/games/achrogemme/components/CardView.tsx) | Anatomie complète d'une carte |
| `ChampionView` | [ChampionView.tsx](../../src/games/achrogemme/components/ChampionView.tsx) | Bloc Champion (PV + Gemmes) |

## Tweaks à ajouter (Lot 3+)

- Switch dark/light (cohérence avec le reste du site, déjà géré ailleurs via `data-theme`)
- Densité d'animations (off / subtil / full) pour les machines lentes
- Volume sonore (quand on aura ajouté Howler.js)
- Choix du Champion adverse (Sylvie facile / Lilia médium / Skarn dur) au démarrage
