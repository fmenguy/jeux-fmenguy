# Changelog

Toutes les modifications notables du projet Arcade FM sont documentées ici.
Format inspiré de [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/).

---

## [2026-05-16] — 16h43

### Ajouté — Aelindra (combat T1 + T2)
- **Portée d'attaque visible** : toutes les cases dans la portée de l'unité s'affichent en orange au clic « Attaquer / Sort », même si elles sont vides — les ennemis attaquables pulsent en rouge
- **Portée ambiante** : cases de déplacement en bleu pâle dès qu'une unité est sélectionnée, sans attendre le choix d'action
- **Soin en vert** : les abilities `heal` affichent les alliés soignables en vert (était rouge par erreur)
- **Preview AoE** : hover d'une case en mode ability → diamant orange de rayon 2 centré sur le curseur
- **Tooltip dégâts** : survol d'un ennemi attaquable → `~X dmg · Y% crit` (formule déterministe)
- **Grille isométrique légère** : `rotateX(8°)` + `perspective 1000px` sur la grille, tuiles avec gradient top/bottom pour simuler la profondeur
- **Screen shake** : 350ms sur coup normal, 450ms (amplitude ×2) sur crit/kill
- **Zoom cinématique 600ms** sur crit ou kill (>25 % du maxHP ou mort) : scale 1→1.22→1.22→1, centré sur la cible, non-bloquant
- **Recul de la cible** : `translateX/Y 5px` + easing spring sur `.unit-glyph` à l'impact
- **Particules DOM** : 5 (coup) ou 10 (crit) particules étincelle en étoile autour de l'impact, auto-nettoyées à 850ms
- **Popup crit améliorée** : 20px, dorée avec glow, animation dédiée `dmg-float-crit`
- **Bandeau de phase** : sweep horizontal « PHASE ELFES » / « PHASE ENNEMIE » à chaque changement de phase (900ms)
- **Chevron flottant** : triangle doré pulsant au-dessus de l'unité sélectionnée
- **Barre de PV animée** : `transition width 0.4s ease-out` sur les barres de toutes les unités

### Modifié — Aelindra
- **`useCombatFx`** : détecte les coups critiques (>25 % maxHP ou kill) → expose `critIds` dans `UnitFxState`
- **`Combat.tsx`** : overlay useMemo refactorisé en objet multi-sets (`reachableSet`, `attackableSet`, `attackRangeSet`, `healSet`, `aoeSet`, `ambientSet`) + hover handlers + states T2
- **`animations.css`** : +8 keyframes combat (`screen-shake`, `screen-shake-big`, `cinematic-zoom`, `unit-recoil`, `pulse-attack`, `pulse-heal`, `phase-sweep`, `combat-spark`, `chevron-float`, `dmg-float-crit`)
- **`screens.css`** : +perspective isométrique, classes `.ambient-reach`, `.attack-range`, `.heal-range`, `.aoe-preview`, `.phase-banner`, `.combat-particle`

---

## [2026-05-16]

### Ajouté — Aelindra
- **Cinématique d'invocation Guild** : machine d'états animée (`idle → charging → bursting → revealing`), orbe qui charge, anneau de burst coloré selon la rareté, flash blanc, shake, flip de carte au reveal avec halo et sparks radiaux
- **Mini-cartes ×10** : rangée de cartes animées (`mini-pop`) pour les 9 autres résultats du tirage groupé
- **Sons Web Audio** (zéro fichier) : coup d'épée, flèche, boule de feu, sort, soin, mort, victoire, défaite, charge d'orbe, invocation par rareté (commun → légendaire)
- **PWA** : service worker activé en dev (`devOptions.enabled: true`)

### Modifié — Aelindra
- **Guild.tsx** : converti en composant smart (`useGameState` / `useDispatch` directs, plus de props externes)
- **Icônes d'invocation** : `emoji` texte remplacé par icônes SVG (`specToIcon`) dans la modal de résultats
- **Suppression de tous les mocks** : `MOCK_*` retirés de Missions, Splash, Dungeons, Heroes, Gouffre — remplacés par état réel ou empty state
- **Combat HUD** : typo "TUR" corrigée → "TOUR"
- **CSS mobile** : overrides typographie au breakpoint 720px (descriptions, labels, tap targets 44px)
- **Variables CSS** : contraste `--dim`/`--dim2` amélioré, tokens de couleur d'animation par rareté ajoutés
- **Animations CSS** : keyframes cinématique guilde (`orb-charge`, `burst-expand`, `guild-flash`, `card-flip-in`, `halo-pulse`, `spark-out`, `mini-pop`, `rune-ring`)

### Sons — Aelindra
- **sfx.ts** réécrit : pool HTML5 Audio (4 instances/son), variation de pitch ±7%, anti-spam 40ms, persistance localStorage
- **34 fichiers Kenney CC0** copiés dans `public/games/aelindra/sfx/` : combat (épée×3, impacts×4, arc×2, mort×2, victoire, défaite), sorts (feu, glace, soin, buff, dash), guilde (charge orbe×2, pop/épique/légendaire, flip×2), UI (click, back, or)

### Corrigé — Aelindra
- Invocations : les orbes étaient débités mais aucun héros n'apparaissait — résolu via `lastPullResults` dans le store
- `sfx.ts` : bug `[392, 523], [392, 523].forEach` → `[392, 523].forEach` (erreur TS2695)

---

## [2026-04-20]

### Ajouté
- **Strates** : page d'accueil landing (design Claude, ambiance Dorfromantik cosy)

### Modifié
- **FDA** : refonte design v2, cartes ressources en plaques forgées, actions bulk +5/+50
- **FDA** : design bâtiments forgés avec classe `.ready` pulsante
- **FDA** : fix guillemets JS, nettoyage `v2.css` (bloc `.resource` supprimé)
- **FDA** : panneaux Fabrication, Main-d'oeuvre et Reliques intégrés au design v2, mise en avant des ember workers
- **FDA** : manteau affiche la progression X/Y (manteaux / villageois)
- **FDA** : progression débloquée, UI objectif refonte, bot console, corrections critiques

---

## [2026-04-17]

### Modifié
- **Eryndor** passe en mode **duel d'agents IA autonomes**. Les deux factions (Humains, Elfes) sont désormais pilotées par de vrais appels à l'API Anthropic (Sonnet 4.6 vs Haiku 4.5 par défaut, configurables). Le joueur devient spectateur.
- Les déciseurs heuristiques (`AIDirector` et ses 8 sous-systèmes, ainsi que les auto-build/auto-research/auto-war internes à `Faction`) sont supprimés. Seule la « physique » du monde reste (mouvement, combat, ressources, recherche, reproduction).
- Nouvelle architecture `js/agent/` : client Anthropic (BYOK navigateur), snapshots JSON, 10 tools (build/train/research/attack/declare_war/offer_peace/set_jobs/found_colony/trade/end_turn), validateur d'actions, scheduler parallèle.
- Nouveau setup au lancement : saisie clé API (localStorage optionnel), choix des modèles, mode mock pour tests sans coût.
- Ajout d'un journal des agents en bas de page (raisonnement + tool calls + compteur de tokens).

---

## [2026-04-11]

### Ajouté
- **Orbique** — jeu d'exploration en salles thématiques (particules, textures, puzzles, tutoriel intégré)
- **Jeu de la Vie (Conway)** — automate cellulaire de Conway
- **Eryndor v2** — remplacement par la version complète multi-fichiers
- **Hub Arcade FM** — page d'accueil unifiée avec grille jeux complets / mini-jeux
- Restructuration du dépôt en dossiers par jeu

---

## [2025-11-21]

### Modifié
- Ajout du `.gitignore` pour le déploiement automatique

---

## [2025-05-18 – 2025-05-20]

### Ajouté
- **Zentel** — 42 niveaux générés, boss final, système d'astuces, compatibilité mobile
- Refonte complète de l'interface Zentel (Zentel v2)

---

## [2025-05-15]

### Ajouté
- **EcoSim** — simulateur d'écosystème complet : proies, prédateurs, nouvelles espèces, accélération, cooldown, compatibilité mobile

---

## [2025-05-03]

### Ajouté
- **FDA** — ambiance sonore et musique de fond avec gestion du volume

---

## [2025-04-17]

### Ajouté
- **FDA v2.2** — barre d'exploration avancée, compteur de bâtiments, gestion des messages d'erreur

---

## [2025-04-15]

### Ajouté
- **FDA v2.1** — système de villages, gestion du chef, barre d'exploration, indices de progression
- Sauvegarde automatique de la partie
- Traduction et interface enrichie

---

## [2025-04-13 – 2025-04-14]

### Ajouté
- **Forge des Âges (FDA)** — commit initial
- Mise en place des modules JS, arborescence et déploiement Cloudflare Pages
