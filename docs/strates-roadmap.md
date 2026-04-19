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
- [ ] 1.3 Pathfinding en cache : corridor map, flood fill de régions, A\* restreint
- [ ] 1.4 Worker thread pour génération monde
- [ ] 1.5 Data-driven configs (biomes, techs, quêtes, pools de phrases en JSON)
- [ ] 1.6 Tests Vitest sur fonctions pures

### Axe 2, structure du jeu

- [ ] 2.1 Séparation claire éditeur vs jeu (nouvelle page `play/`)
- [ ] 2.2 Écran d'accueil `/strates/` (Nouvelle partie, Charger, Éditeur, Crédits)
- [ ] 2.3 Scénarios prédéfinis (îlot calme, archipel venté, vallée montagneuse)
- [ ] 2.4 Système d'âges et passage, de l'âge de pierre à l'âge de l'espace (voir vision **Tech tree XXL** dans `strates-design-ideas.md` : 7 âges + 6 branches thématiques + 60 à 90 techs en graphe, inspiré Total War Warhammer et Craft the World, passage d'âge à la FDA par conditions cumulatives)
- [ ] 2.5 Mode campagne / mode sandbox / endgame cyclique (changement de planète)
- [ ] 2.6 **Map plus grande + fog of war** (style Age of Empires) : révélation progressive par vision des colons et bâtiments (rayon ~8-12 tuiles), cellules explorées restent visibles en version figée
- [ ] 2.7 **Verticalité Minecraft** : hauteurs jusqu'à 10 blocs (montagnes) + minage jusqu'à 4 blocs sous la surface. Neige permanente sur les sommets. Danger de chute (voir besoins 3.4).
- [ ] 2.8 **Animaux** (axe à part entière) : cerfs, sangliers passifs, loups agressifs, chasse. Plus tard : élevage (poules, moutons, vaches).
- [ ] 2.9 **Pêche et maritime** : tech ports de pêche (bronze), bateaux de pêche, bateaux maritimes (fer, exploration/commerce). Nouvelle ressource poisson.
- [ ] 2.10 **Sons d'ambiance** : bruit de pas doux dans la neige (crack léger), vent dans les feuillages, clapotis d'eau, chant d'oiseaux au printemps
- [ ] 2.11 **Séparation éditeur / mode jeu + Godmod** : les outils éditeur actuels (forêt, rocher, filon, maison, champ, baies) impactent réellement la partie, mais seraient réservés à un panneau "Godmod" / mode créatif séparé. En mode jeu, le joueur ne peut que désigner des ordres aux colons.

### Axe 6, social (idées en vrac, à préciser)

- [ ] 6.1 **Fiches personnages** : clic sur un colon → panneau détaillé (nom, âge, métier, outils portés, relations, besoins, inventaire, historique). Édition directe de certains champs (métier, priorité).
- [ ] 6.2 Relations visibles (voir 3.5) : liens entre fiches, arbre généalogique.
- [ ] 6.3 Journal personnel par colon (bref historique des événements vécus).

### Axe 7, villes et villages (idées en vrac)

- [ ] 7.1 **Fiches de village** : chaque maison regroupe un village, panneau qui liste habitants, stocks locaux, bâtiments rattachés, niveau de satisfaction.
- [ ] 7.2 Hiérarchie village → hameau → ville selon population et bâtiments.
- [ ] 7.3 Zones de confort (rayon autour d'un puits, d'une place centrale).

### Axe 3, gameplay

- [x] 3.1 Extraction dédiée des filons (livré session 6 : mine = extraction si filon présent, gating tech, stocks remplis)
- [ ] 3.2 Outils et métiers spécialisés (partiel livré session 7 : hache en pierre + abattage arbres, gating tech, +wood. À venir : pelle, houe, faucille, marteau, canne)
- [ ] 3.3 Interface gestion des rôles par colon (cases à cocher, priorités)
- [ ] 3.4 Besoins vitaux (faim, sommeil, social) + cycle jour/nuit mécanique
- [ ] 3.5 Relations, couples, reproduction naturelle (remplace spawn par maison)
- [ ] 3.6 Bricoleur et escaliers voxel (verticalité au-delà de 2 voxels)
- [ ] 3.7 Événements et catastrophes (incendies, inondations, éboulements, animaux)
- [ ] 3.8 Économie et commerce (marchands ambulants, troc)

### Axe 4, visuel et UX

- [ ] 4.1 Signatures Dorfromantik (cel-shading, brume, heure dorée, HDRI eau)
- [ ] 4.2 Cycle jour/nuit (soleil qui tourne, lanternes qui s'allument)
- [ ] 4.3 Saisons (palette, neige, fleurs, rendements agricoles)
- [ ] 4.4 Particules (poussière minage, copeaux, fumée, feuilles)
- [ ] 4.5 Audio adaptatif par biome (crossfade, sons d'actions, fanfares tech)
- [ ] 4.6 UX HUD : panneau contrôles type Clair Obscur (pictos clavier élégants), mini-map, overlay vue de dessus, info-bulle voxel, timeline jour/saison/âge
- [ ] 4.7 Feedback clic (ripple, highlight, outline entité)
- [ ] 4.8 Animations entités (arbres qui poussent, champs qui mûrissent, buissons qui fleurissent)

### Axe 5, évolution et long terme

- [ ] 5.1 Démo jouable en ligne (landing soignée, tutoriel guidé, lien de partage)
- [ ] 5.2 Mode créatif et partage de cartes (export/import JSON, galerie)
- [ ] 5.3 Modding léger (JSON custom techs/biomes/quêtes)
- [ ] 5.4 Convergence avec FDA (même lore, portail `/jeux/`)
- [ ] 5.5 Ciblage plateforme (web pur vs Electron/Tauri pour Steam)
- [ ] 5.6 Feedback joueur (bouton discret, mailto ou Typeform)
- [ ] 5.7 Roadmap publique (`/strates/roadmap/` extraite du changelog)

---

## Ordre de bataille suggéré

Sans s'enfermer dans un ordre strict, cette séquence maximise la valeur visible à chaque étape.

**Court terme (quelques sessions)**
1. Axe 4 visuel : signatures Dorfromantik, cycle jour/nuit, particules minage, premiers sons. La claque visuelle justifie le temps investi, motive la suite.
2. Axe 3.1 extraction filons : débloque la progression tech au-delà de la pioche pierre.
3. Axe 3.2 outils diversifiés : hache, pelle, houe. Permet les quêtes intéressantes.

**Moyen terme (demi-douzaine de sessions)**
4. Axe 2.4 système d'âges concret : passage pierre → bronze avec animation.
5. Axe 3.4 besoins vitaux + 3.5 relations + reproduction : colonie qui vit toute seule.
6. Axe 2.2 écran d'accueil + 2.3 scénarios prédéfinis : expérience de jeu construite.

**Long terme (vision)**
7. Axe 3.7 événements + catastrophes : drama et enjeux.
8. Axe 2.4 âges industriel, moderne, atomique, espace : contenu.
9. Axe 2.5 endgame changement de planète : boucle finale, premier vrai cycle jouable.
10. Axe 5.1 démo publique : rendre jouable par d'autres.

## Fil directeur

L'agent `strates-guide` (voir `.claude/agents/strates-guide.md`) peut être invoqué à chaque début de session pour lire les docs, faire le point et proposer la prochaine étape. Usage conseillé : taper `/agents` puis choisir strates-guide, ou demander "où on en est ?".
