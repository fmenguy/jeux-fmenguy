# Strates, roadmap et fil directeur

Document de pilotage du projet. Complète `strates-notes.md` (vision initiale), `strates-design-ideas.md` (journal d'idées détaillé) et `strates-changelog.md` (historique des livraisons). Voir aussi l'agent `.claude/agents/strates-guide.md` qui lit ces quatre fichiers pour donner le fil directeur.

## Vision long terme

Un jeu web jouable sur navigateur PC, beau, vivant, sans fin imposée. Une colonie part d'un âge de pierre et traverse les âges jusqu'à l'âge de l'espace. Le joueur n'est pas omnipotent, il désigne et débloque, les colons font. La progression se fait par tech, quêtes et événements, pas par une horloge artificielle.

### Traversée des âges (cible narrative)

1. Âge de pierre, point de départ : cueillette, baies, premières pioches.
2. Âge du bronze : alliages, premières routes, premiers couples.
3. Âge du fer, pivot médiéval : châteaux, forge, blé cultivé, colonie durable.
4. Âge industriel : vapeur, usines, premiers trains.
5. Âge moderne : électricité, chemins de fer, mines profondes.
6. Âge atomique : réacteurs, villes, automatismes.
7. Âge de l'espace : fusées, exploration orbitale, premières stations.
8. Endgame ouvert : **changement de planète**. Les colons les plus avancés quittent la carte via une fusée, régénération d'un nouveau monde aux biomes exotiques (volcan lunaire, glace martienne, archipel océanique, forêt alien), possibilité de reporter tech et lore acquis. Pas de victoire, pas de game over, juste un cycle qui recommence avec un nouveau défi. Grande cinématique avec musique.

### Principes directeurs

- Un seul fichier `main.js` à terme, modularisé en ES6 natif, pas de bundler.
- Chaque session ajoute une valeur visible au joueur, même minime.
- Le changelog (`strates-changelog.md`) est mis à jour à chaque livraison.
- Préférer les petits commits vérifiables aux gros refactors risqués.
- Toujours vérifier dans le navigateur avant de commit, pas juste la syntaxe.

---

## Axes d'amélioration

Cinq axes parallèles, déclinables indépendamment. La section détaillée a été initialement rédigée en plan lors de la session de modularisation (2026-04-19) et reste la référence de travail.

### Axe 1, technique

- [x] **1.1 Modularisation ES6** (livré 2026-04-19 session 4)
- [x] **1.2 Persistance localStorage** (livré 2026-04-19 session 4)
- [x] **1.5 Data-driven configs JSON** (livré 2026-04-20 session 9 : speech.json, colonists.json, quests.json, module gamedata.js)
- [ ] 1.3 Pathfinding en cache (à faire quand la perf devient visible, ~150+ colons) : corridor map, flood fill de régions, A\* restreint
- [ ] 1.4 Worker thread pour génération monde
- [ ] 1.5 Data-driven configs (biomes, techs, quêtes, pools de phrases en JSON)
- [ ] 1.6 Tests Vitest sur fonctions pures

### Axe 2, structure du jeu

- [x] **2.1 Écran d'accueil `/strates/`** (livré 2026-04-18 `98ff8f1`, enrichi 2026-04-20)
  - [x] Landing page thématique (île voxel CSS, pitch, frise des âges)
  - [x] Menu Nouvelle partie / Charger / Éditeur / Crédits
  - [x] Section "Mécaniques" (4 cartes : colons, saisons, ressources, recherche)
  - [x] Section "Moments de jeu" (vignettes CSS animées : hiver, minage, recherche)
  - [x] Section "Origine FDA" avec logo et lien vers Forge des Âges
  - [x] Bulles rotatives avec vraies phrases du jeu
  - [x] Panneau "Charger une partie" depuis l'accueil (lit localStorage, slots 1-5 + auto)
  - [x] "Continuer" vs "Nouvelle partie" contextuel selon sauvegardes existantes
  - [x] Vraie nouvelle partie (flag `strates-new-game`, ignore saves existantes)
- [ ] 2.2 Scénarios prédéfinis (îlot calme, archipel venté, vallée montagneuse)
- [ ] 2.3 **Tech tree XXL et passage d'âges** (PRIORITÉ HAUTE, cœur du jeu)
  - Distinct de la fusion de bâtiments : la tech tree commande ce qui est possible, la fusion l'exploite
  - 60 à 90 techs réparties sur 7 âges et 6 branches (Outils, Agriculture, Construction, Militaire, Savoir, Âge)
  - Passage d'âge par conditions cumulatives sur plusieurs branches (comme FDA)
  - UI : arbre visuel interactif scrollable/zoomable, colonnes = âges, lignes = branches
  - Data-driven : JSON `data/techtree.json` avec `{ id, name, age, branch, icon, cost, requires[], unlocks{} }`
  - Le panneau Tech actuel (4 techs linéaires) est un proto à remplacer par l'arbre complet
  - À faire avant ou en parallèle des POC visuels axe 4 — voir `strates-design-ideas.md` section "Tech tree XXL"
- [ ] 2.4 Mode campagne / mode sandbox / endgame cyclique (changement de planète)
- [x] **2.5 Map plus grande** (GRID 96x96, livré `88612ab` + `c42038e`)
- [ ] 2.6 **Fog of war** (style Age of Empires) : révélation progressive par vision des colons et bâtiments (rayon ~8-12 tuiles), cellules explorées restent visibles en version figée — MVP livré `7480879`/`91119a7`, désactivé temporairement `83f0b9f`
- [x] **2.7 Verticalité** : hauteurs jusqu'à 10 blocs (MAX\_STRATES 10, livré `88612ab`)
  - [ ] Minage jusqu'à 4 blocs sous la surface, neige permanente sur les sommets, danger de chute
- [ ] 2.8 **Animaux** : cerfs, sangliers passifs, loups agressifs, chasse. Plus tard : élevage.
- [ ] 2.9 **Pêche et maritime** : ports de pêche (bronze), bateaux, ressource poisson.
- [ ] 2.10 **Sons d'ambiance** : bruit de pas, vent, clapotis, chant d'oiseaux au printemps
- [ ] 2.11 **Séparation éditeur / mode jeu + Godmod** : outils éditeur réservés à un panneau "Godmod" séparé ; en mode jeu, le joueur ne peut que désigner des ordres aux colons
  - [x] Menu pause (Échap) : Continuer, Sauvegardes, Retour à l'accueil (livré 2026-04-20)
  - [ ] Deux modes distincts dans l'URL (`?mode=sandbox` vs partie normale)
- [ ] 2.12 **Stocks utiles à la construction** : poser une maison consomme pierre + bois + terre ; l'outil Placer propose un choix de matériau

### Axe 3, gameplay

- [x] **3.1 Extraction dédiée des filons** (livré `5eefc98` : mine = extraction si filon présent, gating tech, stocks remplis)
- [x] **3.2 Outils et métiers spécialisés** (partiel livré `e26d48d` : hache en pierre + abattage arbres, gating tech, +wood)
  - [ ] Pelle, houe, faucille, marteau, canne à pêche
- [ ] 3.3 Interface gestion des rôles par colon (cases à cocher, priorités)
- [ ] 3.4 Besoins vitaux (faim, sommeil, social) + cycle jour/nuit mécanique
- [ ] 3.5 Relations, couples, reproduction naturelle (remplace spawn par maison)
- [ ] 3.6 Bricoleur et escaliers voxel (verticalité au-delà de 2 voxels)
- [ ] 3.7 Événements et catastrophes (incendies, inondations, éboulements, animaux)
- [ ] 3.8 Économie et commerce (marchands ambulants, troc)

### Axe 4, visuel et UX (**PRIORITÉ remontée** : le jeu est jugé trop basique par l'utilisateur, les chantiers visuels de cet axe passent devant le reste)

- [ ] 4.1 Signatures Dorfromantik (cel-shading, brume, heure dorée, HDRI eau)
- [ ] 4.2 Cycle jour/nuit (soleil qui tourne, lanternes qui s'allument)
- [x] **4.3 Saisons** (livré `106a1c1` + `9d12db8` + `04bd4ed` : palette herbe/forêt, neige hivernale, pluie printanière, dialogues saisonniers, durée 600s)
  - [ ] Fleurs visuelles au printemps, rendements agricoles saisonniers
- [ ] 4.4 Particules (poussière minage, copeaux, fumée, feuilles)
- [x] **4.5 Audio adaptatif par saison** (partiel : livré `ec9cbea`/`5ed7d97` : playlist MP3 par saison, crossfade, toggle mute)
  - [ ] Sons d'actions (minage, abattage), fanfares tech, sons d'ambiance biome
- [x] **4.6 UX HUD** (partiel)
  - [x] Rotation caméra azimut A/E (livré `95e0b97`)
  - [x] Menu pause Échap avec navigation retour accueil (livré 2026-04-20)
  - [ ] Panneau contrôles type Clair Obscur (pictos clavier élégants)
  - [ ] Mini-map (ajoutée `04bd4ed`, retirée 2026-04-20 car non fonctionnelle)
  - [ ] Overlay vue de dessus, info-bulle voxel, timeline jour/saison/âge
- [ ] 4.7 Feedback clic (ripple, highlight, outline entité)
- [x] **4.8 Animations entités** (livré `8c9026f` : arbres qui poussent, champs qui mûrissent, buissons qui fleurissent)

### Axe 5, évolution et long terme

- [ ] 5.1 Démo jouable en ligne (landing soignée, tutoriel guidé, lien de partage)
- [ ] 5.2 Mode créatif et partage de cartes (export/import JSON, galerie)
- [ ] 5.3 Modding léger (JSON custom techs/biomes/quêtes)
- [x] **5.4 Convergence avec FDA** (livré 2026-04-20 : section "Origine FDA" sur la landing avec logo et lien)
- [ ] 5.5 Ciblage plateforme (web pur vs Electron/Tauri pour Steam)
- [ ] 5.6 Feedback joueur (bouton discret, mailto ou Typeform)
- [ ] 5.7 Roadmap publique (`/strates/roadmap/` extraite du changelog)

### Axe 6, social (idées en vrac, à préciser)

- [x] **6.0 Colons nommés et genrés avec dialogues personnalisés** (livré `334a75c` : François chef avec couronne, Fred, Belkacem, etc., phrases spécifiques par personnage + dialogues saisonniers)
- [ ] 6.1 **Fiches personnages** : clic sur un colon → panneau détaillé (nom, âge, métier, outils portés, relations, besoins, inventaire, historique). Édition directe de certains champs (métier, priorité).
- [ ] 6.2 Relations visibles : liens entre fiches, arbre généalogique.
- [ ] 6.3 Journal personnel par colon (bref historique des événements vécus).

### Axe 7, villes et villages (idées en vrac)

- [ ] 7.1 **Fiches de village** : chaque maison regroupe un village, panneau qui liste habitants, stocks locaux, bâtiments rattachés, niveau de satisfaction.
- [ ] 7.2 Hiérarchie village → hameau → ville selon population et bâtiments.
- [ ] 7.3 Zones de confort (rayon autour d'un puits, d'une place centrale).

---

## Ordre de bataille suggéré

Sans s'enfermer dans un ordre strict, cette séquence maximise la valeur visible à chaque étape.

**Court terme (quelques sessions)**
1. **Axe 4 POC visuels** : tester cel-shading, cycle jour/nuit, eau dans des pages isolées `poc/`. Intégrer uniquement ce qui convainc.
2. **Axe 2.3 Tech tree XXL** : data/techtree.json + UI arbre visuel. C'est le cœur du jeu, le reste en dépend.
3. **Fusion de bâtiments** : étendre la mécanique 2x2 à toutes les catégories (habitation, recherche, alimentation). Page codex des chaînes.
4. Axe 3.2 outils diversifiés : pelle, houe. Permet les quêtes agricoles.

**Moyen terme (demi-douzaine de sessions)**
4. Axe 2.3 système d'âges concret : passage pierre → bronze avec animation.
5. Axe 3.4 besoins vitaux + 3.5 relations + reproduction : colonie qui vit toute seule.
6. Axe 2.6 fog of war réactivé et poli : révélation progressive par vision des colons.

**Long terme (vision)**
7. Axe 3.7 événements + catastrophes : drama et enjeux.
8. Axe 2.3 âges industriel, moderne, atomique, espace : contenu.
9. Axe 2.4 endgame changement de planète : boucle finale, premier vrai cycle jouable.
10. Axe 5.1 démo publique : rendre jouable par d'autres.

## Fil directeur

L'agent `strates-guide` (voir `.claude/agents/strates-guide.md`) peut être invoqué à chaque début de session pour lire les docs, faire le point et proposer la prochaine étape. Usage conseillé : taper `/agents` puis choisir strates-guide, ou demander "où on en est ?".
