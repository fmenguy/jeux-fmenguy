# Strates, changelog éditeur

Historique des itérations du proto. Les anciens protos 1 à 5 ont été fusionnés dans `public/strates/editor/`.

---

## 2026-04-21 (session 12) : Lot C -- hook refreshTechTreeAfterAgeChange pour Lot D

- Nouvelle fonction exportee `refreshTechTreeAfterAgeChange(age)` dans `modules/ui/techtree-panel.js`, egalement exposee sur `window` pour consommation par `age-transitions.js` (Lot D) sans import direct.
- Si le panneau est ouvert au moment de l'appel, re-render immediat (les techs nouvellement debloquees passent de teased a available/ready). Sinon, flag `dirty` consomme au prochain `openTechTreePanel()`.
- Source de verite inchangee : `TECH_TREE_DATA.ages[].unlocked` (SPEC v1). La fonction force uniquement le re-render DOM.

---

## 2026-04-21 (session 12) : Lot C -- UI Tech tree XXL (pan, zoom, filtres, anti-spoiler)

- Nouveau panneau plein ecran `modules/ui/techtree-panel.js` + noeuds `modules/ui/techtree-node.js`, feuille de style dediee `styles/techtree.css`.
- Ouverture via touche **T** ou bouton HUD (cablages existants dans `main.js`, non modifies). Fermeture via **Echap**, clic backdrop, ou bouton Fermer.
- Grille 7 ages x 6 branches, lecture directe de `TECH_TREE_DATA` (SPEC v1). `ROW_H` dynamique selon empilage max de techs dans la ligne (utile pour la branche outils age I, 4 techs).
- Etats visuels des noeuds : locked (opacite 0.3), available (bordure neutre), ready (glow bleu + bouton Rechercher), researching (progress bar, reserve), done (glow dore), teased (flou + `?????`). Les teased sortent leur `tech.id`, `branch` et cout du DOM pour prevenir toute lecture via devtools sur les ages 2+.
- Liens SVG Bezier entre prerequis, stroke dore plein si prereq debloque, pointille gris sinon. Les teased ne recoivent ni n'emettent de lien.
- Pan : drag souris sur le stage (cursor grab/grabbing). Zoom : molette de 0.5x a 2x, centre sur la position du curseur. Une seule transform CSS translate+scale, perf OK pour 48x48x8+.
- Filtres par branche : toggle par branche en haut, bouton `Toutes` pour reset. Recherche texte : filtre en opacity 0.18 les noeuds dont le nom ou l'id ne contient pas la query. Les teased ne matchent jamais (preserve la surprise).
- Deblocage : `unlockLocal` puise dans `state.researchPoints`, ecrit `state.techs[id].unlocked = true`, appelle `refreshTechsPanel` puis re-render. Pas de modification de `data/*.json`, pas de modification de `tech.js`, `jobs.js`, `needs.js` (scope Lot C respecte).
- `techtree-ui.js` devient un shim qui delegue au nouveau panel, ce qui evite de toucher a `main.js`.

---

## 2026-04-21 (session 12) : Lot B -- moteur comportemental, besoins Faim + Sans-abri

- **Pre-fix SPEC v1** (commit `lot-B: pre-fix SPEC v1`) : `main.js` injecte les techs du JSON gele en normalisant `cost: { research: N }` vers number et `requires: []` vers le champ plat `req`, le champ `requires[]` etant conserve a cote. `tech.js/unlockTech` accepte un tableau de prerequis (iteration sur `t.requires`) en plus du `t.req` legacy.
- Nouveau module **`modules/needs.js`** : lecture `needs.json` via `gamedata.js`, initialisation `c.needs` Map par colon, tick des jauges (hunger monte a `need.rate * 100% /s`), evaluation des regles (shelter via `assignedBuildingId`), calcul `productivityMul` compose en parsant `effects.productivity_N%`. Seuils `THRESHOLD_LOW = 50%`, `THRESHOLD_CRITICAL = 80%`.
- Nouveau module **`modules/tasks.js`** : scheduler de taches par colon. Constantes `PRIORITY` (SURVIVAL 100, WORK 60, LEISURE 30, IDLE 10) et `TASK_KIND`. Fonctions `enqueueTask`, `peekTask`, `popTask`, `hasTaskOfKind`, `clearLowPriorityTasks`, `canPreempt`. Renomme depuis `jobs.js` pour eviter collision avec les marqueurs de minage du joueur et `data/jobs.json` (metiers).
- **`state.js`** : champs `needsTickAccum`, `needsBuckets` (cache d index needs.json).
- **`colonist.js`** :
  - instance recoit `needs` (Map), `jobQueue` (Array), `currentTask`, `assignedBuildingId`, `productivityMul`, `wasAttacked`.
  - `initColonistNeeds(this)` au constructeur.
  - En IDLE, si `isNeedCritical(this, 'hunger')`, le colon abandonne tout et appelle `pickHarvest` en priorite SURVIVAL (jour et nuit).
  - Fin de WORKING sur un buisson : si `currentTask.kind === EAT_SEEK_FOOD`, les baies sont mangees sur place (baisse de hunger data-driven via `satisfied_by[berries].amount / 20` par baie), sinon elles vont au stock (cueillette leisure).
  - `spawnColonsAroundHouse` attribue `assignedBuildingId = 'cabane'` a chaque colon, fixant le besoin shelter.
  - Restauration de save : `assignedBuildingId` lu depuis la save si present, sinon attribue 'cabane' par defaut tant qu une maison existe.
- **`main.js`** : `tickAllNeeds(dt)` appele a chaque frame avant la MAJ des colons.
- `productivityMul` est expose sur chaque colon. Le cablage avec les vitesses de production (placements.js, tech.js) est un ticket separe post-Lot-B.
- Scope respecte : pas de modification de `data/*.json`, `ui/*`, `hud.js`, `placements.js`, `techtree-ui.js`.

---

## 2026-04-21 (session 12) : Lot D -- Monument Cairn, conditions Bronze, cinematique de passage

### Nouveaux fichiers
- `modules/age-transitions.js` : logique complete du passage Age de Pierre vers Age du Bronze.
  - `canBuildCairn(state)` : verifie les 7 conditions cumulatives (population, stocks bois/pierre/nourriture, hutte du sage, chercheur, points de recherche). Retourne `{ ok, missing }`.
  - `getCairnProgress(state)` : ratio 0-1 de progression (pour le badge "Monument proche").
  - `triggerAgeTransitionBronze()` : declenche la cinematique puis applique la bascule d'age.
  - `initAgeTransitions()` : injecte le bouton Cairn dans le groupe "Monument" de l'actionbar.
  - `checkCairnOverlay()` : appele en tick lent (1s), met a jour le badge et l'etat visuel du bouton.
  - Flag `DEV_SKIP_BONES = true` : bypass la condition "os" tant que Lot B (Chasseur) n'est pas livre.
- `modules/cinematics.js` : cinematique generique `playCinematic({ title, subtitle, onEnd })`.
  - Fanfare synthetique Web Audio API (aucun fichier MP3).
  - Sequence : fade noir 1s, titre "AGE DU BRONZE" 2s, son fanfare 0.5s, fade retour 1s.
- `styles/cinematic.css` : overlay noir, titre epique, badge "Monument proche", tooltip conditions Cairn.

### Modifications
- `modules/state.js` : ajout `currentAge = 1`, `ageUnlockedAt`, `achievements`.
- `modules/persistence.js` : serialisation et restauration de ces trois champs. Reinitialisation dans `clearEverything()`.
- `modules/gamedata.js` : ajout `getBuildingsForAge(n)` et `getTotalFood(state)`.
- `index.html` : `<link>` vers `cinematic.css`, trois divs Lot D (`#cinematic-overlay`, `#cairn-overlay-badge`, `#cairn-conditions-tooltip`).
- `main.js` : import et appel de `initAgeTransitions()` au boot, `checkCairnOverlay()` dans le tick lent.

### Definition of Done partielle
- Conditions verifiees, bouton Cairn grise (visuel) si conditions non reunies, tooltip au survol.
- Badge "Monument proche" apparait quand progression > 80%.
- Cinematique : fade noir + titre "AGE DU BRONZE" + fanfare + fade retour.
- `state.currentAge = 2`, `state.achievements` enregistre l'evenement, sauvegarde checkpoint auto.
- Persistance : reload apres passage confirme `state.currentAge === 2`.

### Ticket ouvert pour Lot C
- `techtree-panel.js` doit tenir compte de `state.currentAge` dans `techStatus()` pour que les techs Bronze deviennent "recherchables" (et non "teased") apres la transition. La condition actuelle `(tech.age >= 2) => 'teased'` ne lit pas `state.currentAge`. Lot D appelle deja `refreshTechTreeAfterAgeChange(2)` en import dynamique -- Lot C doit exposer cette fonction.

---

## 2026-04-21 (session 11) : Lot A -- SPEC v1 gelee, JSON data-driven age I complet

- **BREAKING** : `data/techtree.json` et `data/buildings.json` protos remplacés par les versions SPEC v1 gelées.
- Nouveau `data/resources.json` (13 entrees) : toutes les ressources age I + stubs cuivre/charbon age II.
- `data/techtree.json` reécrit (SPEC v1) : 7 ages (1 actif, 2-7 stubs), 6 branches, 13 techs age I exhaustives.
- `data/buildings.json` reécrit (SPEC v1) : 11 batiments age I (habitation, production, recherche, alimentation, nocturne, monument). Cairn avec `onBuild: trigger_age_transition_bronze`.
- Nouveau `data/jobs.json` (8 metiers age I) : Cueilleur, Bucheron, Mineur, Chasseur, Chercheur, Astronome, Terrassier, Explorateur.
- Nouveau `data/needs.json` (3 besoins age I) : Faim, Sans-abri, Blesse.
- `modules/gamedata.js` etendu : charge les 5 nouveaux JSON, expose 5 accesseurs (`getTechsForAge`, `getBuildingById`, `getJobsRequiringTech`, `getNeedsForAge`, `getResourceById`), linter cross-fichiers au boot, 7 tests unitaires purs (`runUnitTests()`).
- Schema SPEC v1 gele -- tout changement de schema necessite un bump vers v2 avec validation utilisateur.
- Note pour Lot B/C : `modules/tech.js` et `modules/techtree-ui.js` sont a adapter pour lire les nouveaux JSON au lieu des donnees hardcodees.

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
