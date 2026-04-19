# Strates, Proto 2 : sculpting beauty

## Ce que teste le proto

Sculpter un terrain voxel (48x48, 8 strates) en temps reel, avec un rendu visuel proche de proto3 (Perlin FBM, biomes, sky shader, post process). Le terrain est decoupe en chunks 16x16, et chaque edition ne reconstruit que le chunk concerne (plus les chunks voisins si la colonne est en bordure).

## Controles souris (pattern colony sim)

Un outil "Naviguer" est selectionne par defaut dans la barre. Il pilote la camera comme un client OrbitControls standard.

- **Mode Naviguer** : clic gauche orbite, clic droit pan, molette zoom.
- **Mode sculpt actif** (Elever, Abaisser, Niveler) : clic gauche sculpte la colonne survolee. Clic droit pan, molette zoom restent toujours actifs. Maintenir Shift pendant le clic gauche orbite temporairement la camera. Echap revient en mode Naviguer.

Le curseur wireframe blanc qui suit la colonne survolee n'est visible qu'en mode sculpt.

## Outils

- **Elever** : ajoute un voxel au sommet de la colonne (max 8).
- **Abaisser** : retire le voxel du sommet (min 1).
- **Niveler** : clic, puis glisser. Toutes les colonnes survolees prennent la hauteur de la premiere cliquee.

## Pinceau

- **R 1** : une seule colonne.
- **R 3 (croix)** : croix de 5 cases.
- **R 5 (disque)** : disque de 13 cases (rayon ~1.6).

## Visuel

Repris de proto3 :

- Perlin FBM pour la generation initiale (colline centrale, vallee, ridges, montagne est).
- Biomes par altitude : sable, herbe, foret (avec arbres voxel), roche, neige aux sommets.
- Soleil chaud directionnel, ombres PCFSoft, hemisphere light.
- Sky shader Three.js, fog exponentiel.
- Post process : UnrealBloom doux et vignette ambree.
- Tonemapping ACES, antialiasing.
- Eau ShaderMaterial avec houle legere.
- Jitter HSL par cellule pour casser le plat.

## Limites

- Pas de greedy meshing, chaque chunk emet une face par voxel lateral visible. Acceptable pour 48x48x8.
- Pas de persistance, le terrain repart d'un seed fixe a chaque rechargement.
- Les arbres ne suivent pas le sculpt (ils restent ou ils ont ete poses au demarrage).
- L'eau est un plan fixe au niveau WATER_LEVEL.

## Stack

Three.js 0.161 via import map unpkg, ES modules, vanilla JS. Aucun bundler.
