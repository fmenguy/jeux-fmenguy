# Strates, changelog éditeur

Historique des itérations du proto. Les anciens protos 1 à 5 ont été fusionnés dans `public/strates/editor/`.

---

## 2026-04-20 (session 10) : MVP cycle jour/nuit (axe 4.2)

- Nouveau module `modules/daynight.js` : toggle manuel via touche **N** ou icône HUD soleil/lune, transition d'ambiance lissée (~1.5s) sur la couleur de fond, fog, directional light (intensité 2.4 le jour, 0.35 la nuit, teinte lunaire bleutée), hemisphere light et uniforms du Sky.
- Nouvelle ressource `state.nightPoints` (int) et `state.isNight` (bool), sérialisées dans les sauvegardes.
- Nouveau placement "Promontoire d'observation" (touche **P**, bouton dans la barre Construire) : tour simple en pierre et bois avec une étoile dorée au sommet. Quand un colon IDLE y stationne la nuit, +1 point nocturne toutes les 5 secondes.
- HUD : pastille soleil/lune (clic pour basculer) à côté de la pastille saison, nouvelle ligne "Points nocturnes" dans le panneau Ressources.
- Colons : la nuit, attirance vers le foyer le plus proche (feu de camp social) depuis l'état IDLE, moral nocturne cumulé tant qu'ils sont proches d'une maison ou d'un manoir. La cueillette de baies (`pickHarvest`) est désactivée la nuit (activité exclusive jour).
- Nouvelle chaîne de bâtiments "Astronomie" dans `data/buildings.json` : Promontoire, Observatoire, Grand télescope, Radio-télescope.
- Overlay d'aide (touche H) et guide texte mis à jour avec les touches **N** (jour/nuit) et **P** (promontoire).

---

## 2026-04-20 (session 9) : Data-driven configs JSON (axe 1.5)

- Nouveau dossier `data/` avec trois fichiers JSON : `speech.json` (phrases, dialogues, bulles contextuelles), `colonists.json` (prénoms M/F), `quests.json` (définitions des quêtes).
- Nouveau module `gamedata.js` : charge les trois fichiers en `Promise.all` au démarrage, exports en live bindings ES6.
- `constants.js` allégé de ~200 lignes : ne contient plus que des constantes numériques et `THREE.Color`.
- `colonist.js`, `speech.js`, `tech.js`, `quests.js` importent depuis `gamedata.js` au lieu de `constants.js`.
- `quests.js` : `QUEST_DEFS` devient un `let` initialisé par `initQuestDefs()` après chargement des données.
- `main.js` : `await loadGameData()` + `initQuestDefs()` avant `buildTerrain()`.
- Ajouter une phrase ou une quête ne nécessite plus de toucher au code JS.

---

## 2026-04-20 (session 8) : Landing enrichie, menu pause, navigation accueil

### Landing page (`/strates/index.html`)
- Section "Mécaniques" (4 cartes : colons nommés, saisons, ressources, recherche) avec icônes SVG.
- Section "Moments de jeu" (3 vignettes CSS animées : premier hiver avec flocons, minage d'un filon avec étincelle, recherche active avec labo).
- Section "Origine FDA" : logo Forge des Âges, texte de filiation, lien vers `jeux.fmenguy.fr/fda/`.
- Bulles rotatives dans la scène héros : cycle toutes les 7 s sur les vraies phrases du jeu.
- Panneau "Charger une partie" depuis l'accueil : lit le localStorage, affiche les 5 slots manuels + slot auto avec métadonnées (date, nb colons, cycle). Bouton "Charger" grisé si slot vide.
- Menu contextuel "Continuer / Nouvelle partie" : si une sauvegarde existe, le bouton 01 devient "Continuer" et un bouton "Nouvelle partie" apparaît. La vraie nouvelle partie passe un flag `strates-new-game` et ignore les saves existantes.

### Jeu (`editor/`)
- Menu pause (Échap) dans le style du jeu : Continuer, Sauvegardes, Retour à l'accueil.
- `main.js` : lecture de `strates-pending-load` (charger un slot spécifique) et `strates-new-game` (ignorer les saves) au démarrage.
- Mini-map retirée (non fonctionnelle, à réintroduire plus tard).

### Roadmap
- Axe 1.5 coché, axes 2.1 et 5.4 cochés, cases détaillées mises à jour.

---

## 2026-04-19 (session 7) : Abattage d'arbres et hache en pierre (axe 3.2 MVP)

### Nouvelle tech
- `axe-stone` (Hache en pierre), coût 4 pts, âge de pierre, sans prérequis. Débloque l'abattage des arbres.

### Abattage
- L'outil **Miner (2)** détecte désormais si la tuile contient un arbre.
  - **Arbre présent** : le colon abat l'arbre, remplit `resources.wood`, l'arbre est retiré du mesh. Le voxel sous reste en place.
  - **Filon** : extraction (session 6).
  - **Sinon** : minage classique.
- `canMineCell` requiert `axe-stone` pour les tuiles à arbre. Sans la tech, bulle indice bleue "Il nous faudrait une hache pour cet arbre".
- Nouveau helper `isTreeOn(x, z)` et `chopTreeAt(x, z)` dans `placements.js`.

### Audio playlist par âge
- Refactor `modules/audio.js` : lecteur `<audio>` HTML5 avec crossfade 2,5 s.
- Mapping âge → fichier dans `public/strates/editor/audio/stone.mp3`, `bronze.mp3`, `iron.mp3`, `gold.mp3`.
- README dans `public/strates/editor/audio/` avec sources suggérées (Pixabay, FMA, OpenGameArt, Incompetech).
- Âge courant déduit automatiquement des pioches débloquées.

---

## 2026-04-19 (session 6) : Extraction des filons (axe 3.1)

### Extraction
- Les filons sont désormais récoltables via l'outil **Miner (2)**.
- Le colon se rend sur la tuile du filon, anime le minage, puis :
  - **si cellule avec filon** : retire le filon, incrémente le stock correspondant (`copper`, `iron`, `coal`, `silver`, `gold`, `amethyst`), laisse le voxel sous intact.
  - **sinon** : minage normal, retire le voxel top, incrémente `stone` ou `dirt`.
- `extractOreAt(x, z)` dans `placements.js` retire proprement le filon et renvoie son type.
- `isMineBlocked` allégé : ne bloque plus sur filon, seulement maison et buisson.

### Gating tech côté joueur
- `applyToolAtCell` et `applyToolToStrata` appellent désormais `canMineCell` avant `addJob` et enregistrent `lastBlockedMineTech` si la tech manque, ce qui déclenche la bulle indice bleue.
- Le minerai suit le mapping `ORE_TECH` existant : cuivre/charbon → `pick-bronze`, fer/argent → `pick-iron`, or/améthyste → `pick-gold`.

### Doc
- Panneau d'aide mis à jour : section dédiée à l'extraction des filons.

---

## 2026-04-19 (session 5) : Saisons, audio lofi, décorations végétales

### Cycle de saisons
- Nouveau module `seasons.js` : 4 saisons (printemps, été, automne, hiver), 120 s chacune, 8 min par cycle complet.
- Transition linéaire sur les 20 dernières secondes de chaque saison.
- Palette de tints multiplicatifs par biome (grass, forest, snow, sand) + champs, appliquée sur les voxels top toutes les 2 s.
- Printemps : herbe vive, fleurs. Été : vert saturé, champs dorés. Automne : feuillage roux/bronze. Hiver : palette ternie, champs au repos.
- Sauvegarde de l'état saison dans le snapshot (idx, elapsed, cyclesDone).
- Pastille HUD en haut centre avec icône emoji et nom de saison.

### Décorations végétales
- Nouveau module `vegetation.js` : 3 InstancedMesh (brins d'herbe, fleurs, épis de blé).
- Brins d'herbe : dispersés sur biomes grass (dense) et forest (épars), 2 à 6 brins par tuile concernée.
- Fleurs : 5 couleurs (rose, jaune, lavande, corail, blanc), clairsemées sur herbe (~7% de densité).
- Épis de blé : 10 à 18 par tuile `field`, petites barres verticales dorées.
- `buildVegetation()` reconstruit tout à partir de `cellBiome` / `cellSurface`, appelé après `populateDefaultScene`, après `loadGame` et dans `resetWorld`.
- `clearVegetation()` vidage propre lors des resets.

### Audio lofi procédural
- Nouveau module `audio.js`, Web Audio API, aucun fichier externe.
- Drone bas deux oscillateurs détunés (La1/Mi2), filtre lowpass, vibrato LFO lent.
- Arpège aléatoire pentatonique, notes 2-5 s espacées, filtre résonant.
- Noise bandpass 800 Hz très discret pour texture cassette.
- Bouton HUD flottant `♪` qui toggle mute. État muté par défaut (respect autoplay policies), mémorisé en localStorage.
- Démarrage au premier geste utilisateur, fondu doux.

### Plus
- Correction persistance : sauvegarde/restauration de l'état saison (idx, elapsed, cyclesDone).

---

## 2026-04-19 (session 4) : Modularisation ES6 et persistance localStorage

### Modularisation (axe technique 1.1)
- Découpage de `main.js` (3533 lignes) en 18 modules ES6 natifs dans `public/strates/editor/modules/` : `constants`, `state`, `rng`, `scene`, `terrain`, `placements`, `stocks`, `tech`, `pathfind`, `jobs`, `bubbles`, `speech`, `colonist`, `quests`, `worldgen`, `interaction`, `camera-pan`, `hud`.
- `main.js` devient un bootstrap de 25 lignes qui importe et démarre la tick loop.
- Pas de bundler, imports ES6 natifs relatifs, importmap Three.js inchangée.
- Etat mutable partagé via un objet container `state` exporté par `state.js` (contourne les limites des `let` exportés).
- PRNG réassignable via container `prng` pour permettre à worldgen de changer le seed.
- Aucune régression fonctionnelle (terrain, colons, pathfind, bulles, jobs, tech tree, Shift+strate, ZQSD, quêtes).

### Persistance localStorage (axe technique 1.2)
- Nouveau module `persistence.js` avec `saveGame`, `loadGame`, `hasSave`, `deleteSave`, `startAutoSave`.
- Format JSON versionné (v1), clé `strates-save-auto`.
- Sauvegarde complète du terrain (heightmap, biomeNoise, cellTop, cellBiome, cellSurface, cellOre), des entités (arbres, rochers, filons, buissons, maisons, labo), des colons (id, nom, genre, chef, position, état, labo assigné), des jobs, stocks, techs, ressources, stats, quêtes.
- Sauvegarde auto toutes les 30 s, au `beforeunload` et au passage en onglet caché.
- Au démarrage, si une save existe elle est chargée automatiquement, sinon `populateDefaultScene` génère un monde neuf.
- Nouveaux boutons HUD : "Sauver" (manuel), "Charger" (recharge la save auto), "Nouvelle" (confirme puis efface la save et regénère).
- Reconstruction du terrain via nouvelle fonction `rebuildTerrainFromState()` dans `terrain.js` qui recrée l'InstancedMesh sans régénérer le Perlin.
- `Colonist` accepte désormais une option `restore` pour forcer nom, genre, chef, ty, state, researchBuildingId.
- `addBush` retourne désormais le bush créé (au lieu de `true`) pour permettre la restauration des baies et regenTimer.

---

## 2026-04-19 (session 3) : Colons vivants, hints, tech tree visuel, monde peuplé

### Colons enrichis
- Silhouettes retravaillées : torse + jambes + bras + tête + cheveux différenciés M/F.
- François porte une couronne dorée voxel (base + 4 pointes) à la place de la simple étoile de bandeau.
- Animation de marche : swing jambes et bras en opposition, bob vertical calé sur le pas.
- Retour au repos progressif (lerp) quand le colon passe en IDLE, WORKING ou RESEARCHING.

### Noms permanents au-dessus de la tête
- Étiquette nom + genre (+ étoile chef) affichée en permanence au-dessus de chaque colon (auparavant seulement au survol).
- Bulle de dialogue remontée à y=2.75 pour ne pas chevaucher l'étiquette.
- Suppression du toggle HUD "Afficher les noms dans les bulles". Les bulles ne portent plus jamais le nom (pensée intérieure du colon).

### Bulles indice bleues
- Nouvelle variante `sayHint(line)` dessinant une bulle bleu pâle cerclée de bleu vif avec une pastille jaune style ampoule.
- Utilisée automatiquement pour les situations pédagogiques : minage bloqué par manque de tech, champs posés sans labo, labo sans chercheur.
- Durée d'affichage rallongée (6 s vs 4 s) pour laisser le joueur lire.

### Monde peuplé au spawn
- Forêts denses en bosquets de 3 à 6 arbres (~55 arbres en zone forêt), plus 15 arbres isolés sur herbe à distance du hameau.
- 30 rochers répartis (majorité montagne, quelques-uns épars sur herbe).
- 10 filons initiaux (cuivre, fer, charbon, argent, or) en montagne.
- 14 buissons de baies distribués sur herbe et forêt.
- 3 parcelles de champs cultivés pré-posées autour du hameau.

### Tech tree visuel
- Panneau `#techs` refait : cards avec pastille colorée (pierre grise, bronze, fer, or), nom, âge, barre de progression remplie par les points de recherche accumulés.
- Connecteurs verticaux entre techs, colorés quand la tech précédente est débloquée.
- États visuels : locked, available, ready (glow bleu), done (glow doré).
- Bouton de recherche stylisé (gradient, hover lift).

---

## 2026-04-19 (session 2) : Stocks, Placer, Tech tree, Bords eau, Shift-sélection

### Stocks de ressources
- Objet `stocks` avec 8 types : `stone, dirt, copper, silver, iron, coal, gold, amethyst`.
- Incrément automatique au minage selon le biome (`incrStockForBiome`).
- Affichage HUD compact sous "Ressources", types vides masqués.

### Outil Placer (raccourci 3)
- Nouveau job `buildJobs` séparé de `jobs`.
- Marker vert clair semi-transparent sur la tile cible.
- Contraintes : tile libre, hors eau, hauteur max, portée verticale colon <= 3.
- Exécution : A\*, animation bounce 1,5 s, voxel ajouté, biome conservé, stock consommé.
- Clic droit bref annule le job.
- `InstancedMesh` sur-alloué (GRID x GRID slots) pour absorber les voxels posés.

### Tech tree et gate minage
- 4 techs : `pick-stone` (5 pts) → `pick-bronze` (15) → `pick-iron` (30) → `pick-gold` (60).
- `canMineCell` : roche/neige gate par `pick-stone`, filons gate par `ORE_TECH`.
- Jobs refusés declenchent bulle contextuelle (cooldown 60 s par tech).
- Panneau HUD "Tech" avec bouton "Rechercher" et flash doré au déblocage.

### Bâtiment de recherche et points de recherche
- Outil Recherche (raccourci 0), toit bleu (`#3c7fb8`).
- Attribution automatique du colon IDLE le plus proche au placement.
- Etat `RESEARCHING` : 1 pt toutes les 3 s, bob lent, orienté vers le bâtiment.
- Effacer un labo : colons attribués repassent en IDLE proprement.
- Bulles contextuelles : `field-no-research` et `empty-lab`.

### Bords de carte insulaire
- Falloff `smoothstep` sur la heightmap : ring extérieur 3 tiles forcé à eau profonde, ring 2 tiles intermédiaires à eau peu profonde.
- A\* : eau profonde bloquante, eau peu profonde traversable.

### Shift + sélection de strate
- Shift + clic gauche lance un BFS : sélectionne toutes les tiles du même biome à la même hauteur, max 200.
- Applique l'outil actif sur toute la sélection en une opération.

### Correctifs divers
- Pinceau default corrigé de 3 à 1 (moins surprenant au minage).
- Q/D inversés corrigés (vecteur right recalculé).
- Champs et baies contraints à biome herbe ou forêt.
- Filons contraints à biome roche ou neige.
- Toggle affichage prénoms colons (bouton HUD).
- Prénoms absents des bulles par défaut.

---

## 2026-04-19 (session 1) : Fusion proto1-5 en éditeur consolidé

### Proto1 (référence)
- Terrain Perlin FBM avec biomes 5 types.
- Rendu Three.js, face culling, chunks 16x16.
- Caméra : clic gauche rotation, clic droit pan, molette zoom (style que l'utilisateur préfère).
- Eau double plan avec shader ondulations.
- Sky shader + EffectComposer (UnrealBloom + vignette).

### Proto2 (abandon)
- Pinceau de sculpt terrain direct (élever/abaisser/niveler).
- Bonne idée conservée en concept : l'outil de sculpt existe comme outil in-game pour les colons, pas comme pouvoir divin.

### Proto3 (référence visuelle)
- Style Dorfromantik confirmé (palettes désaturées, post-process léger).
- Minage par désignation de zone, premier proof-of-concept colons.
- Filons cyclables 6 types (cuivre, argent, fer, charbon, or, améthyste).

### Proto4 (référence gameplay)
- Colons avec identité (nom, genre), bulles de dialogue.
- Machine à états : IDLE / MOVING / WORKING / wander.
- A\* pathfinding avec gravité (tombe si sol retiré).
- Barre de placement : arbres, rochers, filons, maisons, champs.
- Spawn 2 colons par maison. François = chef (étoile dorée).
- Colons contraints au biome (champs sur herbe, filons sur roche).

### Proto5 (partiel, fusionné)
- Baies, bâtiment de recherche (concept initial).
- Quêtes basiques.

### Éditeur consolidé
- Fusion en un seul fichier `main.js` (~2500 lignes).
- Anciens protos supprimés.
- ZQSD pour panner la caméra (ajout confirmé).
- Sélection Shift + BFS strate.
- Hameau par défaut enrichi avec bâtiment de recherche et colon attribué.
- `InstancedMesh frustumCulled = false` pour arbres/rochers (fix bug ombres visibles mais mesh absent).
