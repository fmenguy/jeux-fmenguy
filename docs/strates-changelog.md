# Strates, changelog éditeur

Historique des itérations du proto. Les anciens protos 1 à 5 ont été fusionnés dans `public/strates/editor/`.

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
