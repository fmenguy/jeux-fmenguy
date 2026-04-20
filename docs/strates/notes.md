# Strates (titre de travail)

Notes de design initiales pour un nouveau jeu sandbox god-game inspiré de Godus, From Dust et From Dust d'Ubisoft.

## Vision

Mix entre Spore, Godus et From Dust. Sandbox en mode god avec outils de manipulation du terrain et observation d'agents autonomes qui colonisent l'environnement.

## Inspirations clés

### Godus (Peter Molyneux, 22cans)
Le truc le plus intéressant techniquement : le terrain n'est pas un simple heightmap. Il est structuré en strates / layers bien définies (herbe, terre, roche, etc.).

Quand le joueur sculpte avec son doigt ou la souris, il déplace des couches entières, crée des falaises abruptes, des terrasses.

Techniquement, ça ressemble à un système de terrain en voxels simplifié, ou en multi-heightmap par layer avec des algorithmes de "peignage" (comme un outil de modélisation qui déforme le mesh en gardant une structure en étages).

Ça permet aux bonhommes de construire sur des surfaces plates à différents niveaux de hauteur.

### From Dust (Ubisoft)
Manipulation de matière (sable, lave, eau) avec interactions physiques entre éléments.

### Spore
Évolution, simulation multi-agents, écosystèmes.

## Mécaniques de base à explorer

### Terrain
- Système de strates (herbe / terre / roche), pas un simple heightmap
- Sculptable : élever, abaisser, niveler
- Génération automatique de "plots" (parcelles habitables) quand le terrain est suffisamment plat
- Les maisons (abodes) apparaissent automatiquement sur ces plots

### Agents (followers)
- Chaque follower est une entité autonome avec IA simple
- Comportements : chercher de la nourriture, construire des maisons, se reproduire, former des villages
- Système multi-agents pas ultra-complexe (pour rester performant en web)
- Règles basées sur les ressources disponibles et le terrain accessible

### Croissance
- La multiplication et la croissance des villages dépendent directement de l'espace plat créé par le joueur
- Et des ressources (blé, minerai, eau...)

### Outils god (sandbox)
- Sculpter le terrain
- Possiblement : météo, catastrophes, miracles
- Observer l'équilibre se construire ou s'effondrer

## Questions ouvertes (à trancher avant de coder)

1. **Vue** : top-down 2D, isométrique 2.5D, ou full 3D ?
2. **Représentation du terrain** : voxels simplifiés (cubes empilés) ou multi-heightmap par strate ?
3. **Échelle** : combien de tuiles sur la carte ? Combien d'agents max ?
4. **Outils god** : lesquels au minimum pour avoir un MVP intéressant ?
5. **Conditions de fin** : est-ce qu'il y a des objectifs, ou pure sandbox ?
6. **Stack** : Canvas 2D, WebGL (Three.js / Babylon), ou WebGPU ?
7. **Persistance** : sauvegarder le monde en localStorage ?

## Statut

État : conception, pas une ligne de code écrite.

Carte affichée sur la page d'accueil dans la section "À venir" avec un design "WIP" pour communiquer que c'est planifié mais pas commencé.
