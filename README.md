# Arcade FM - Jeux & Expériences Web

[![License: CC BY-NC 4.0](https://img.shields.io/badge/License-CC%20BY--NC%204.0-lightgrey.svg)](https://creativecommons.org/licenses/by-nc/4.0/)
[![Changelog](https://img.shields.io/badge/Changelog-consulter-blue)](CHANGELOG.md)

Collection de jeux et expériences interactives développés en JavaScript vanilla, hébergée sur Cloudflare Pages.

**[jeux.fmenguy.fr](https://jeux.fmenguy.fr)** · Fait partie de [fmenguy.fr](https://fmenguy.fr)

---

## Jeux complets

### Forge des Âges

Jeu de gestion médiéval au tour par tour. Gérez vos ressources, explorez une carte procédurale, forgez votre empire à travers les âges. Ambiance sonore intégrée, compatible mobile.

- **Genre :** Gestion / 4X (exploration, expansion, exploitation - sans extermination)
- **URL :** [fda.fmenguy.fr](https://fda.fmenguy.fr)
- **Dossier :** [`fda/`](fda/)

### Eryndor : Duel d'IA

Simulation stratégique fantasy **en mode spectateur**. Deux agents Claude (Sonnet 4.6 pour les Humains, Haiku 4.5 pour les Elfes, configurables) s'affrontent en respectant les règles du jeu. Apporte ta propre clé Anthropic au lancement ; elle ne quitte jamais ton navigateur. Mode mock disponible pour tester sans coût.

- **Genre :** Simulation stratégique / Duel d'IA
- **Dossier :** [`eryndor/`](eryndor/)

### Orbique

Exploration en salles thématiques avec particules, textures procédurales et puzzles. Tutoriel intégré pour une prise en main immédiate.

- **Genre :** Exploration / Puzzle
- **Dossier :** [`orbique/`](orbique/)

### Strates

God-game voxel 3D en temps réel. Guide une colonie de l'Âge de Pierre jusqu'à l'Âge de l'Espace : posez des bâtiments, gérez des colons avec besoins réels (faim, moral, compétences), débloquez des technologies via un arbre de recherche, et franchissez les âges en construisant un Cairn. Monde procédural avec cycle jour/nuit, météo saisonnière et modèles GLB (arbres, maisons, cerfs, foyer).

- **Genre :** God-game / Simulation de colonie
- **URL :** [jeux.fmenguy.fr/strates/](https://jeux.fmenguy.fr/strates/)
- **Dossier :** [`public/strates/`](public/strates/)
- **Moteur :** Three.js r168, voxels procéduraux, GLB via GLTFLoader

---

## Mini-jeux & Expériences

| Projet                                 | Description                                                                    | Stack               |
| -------------------------------------- | ------------------------------------------------------------------------------ | ------------------- |
| **[Zentel](zentel/zentel.html)**    | Expérimentation visuelle générative et interactive                          | p5.js               |
| **[EcoSim](ecosim/ecosystem.html)** | Simulation d'écosystème - proies, prédateurs, équilibre                   | JS vanilla          |
| **[Jeu de la Vie](conway/)**        | Automate cellulaire de Conway - tracez des patterns, regardez la vie émerger | JS vanilla / Canvas |

---

## Stack technique

Tout le code est front-end, sans dépendance serveur.

| Technologie                       | Usage                                                    |
| --------------------------------- | -------------------------------------------------------- |
| HTML5 / CSS3                      | Structure et styles, responsive mobile                   |
| JavaScript (ES6+)                 | Logique de jeu, rendu Canvas, gestion d'état            |
| [Three.js](https://threejs.org) r168 | Rendu 3D voxel pour Strates (GLTFLoader, Web Audio)      |
| [p5.js](https://p5js.org)            | Génératif / expérimental pour Zentel                  |
| Canvas API                        | Rendu 2D natif (FDA, EcoSim, Orbique, Conway)            |
| Web Audio API                     | Ambiance sonore (FDA, Strates)                           |
| GLB / GLTF                        | Modèles 3D (arbres, maisons, cerfs, foyer) dans Strates |

Aucun framework, aucun bundler - du web natif.

---

## Hébergement

Déployé via **[Cloudflare Pages](https://pages.cloudflare.com)** en déploiement continu depuis ce dépôt.

- Domaine personnalisé : `jeux.fmenguy.fr`
- Sous-domaine dédié pour FDA : `fda.fmenguy.fr`
- CDN mondial, HTTPS automatique, zéro coût d'hébergement

---

## Structure du dépôt

```
jeux-fmenguy/
├── index.html        # Hub Arcade FM
├── fda/              # Forge des Âges
├── eryndor/          # Eryndor : L'Aube des Royaumes
├── orbique/          # Orbique
├── conway/           # Jeu de la Vie
├── ecosim/           # EcoSim
├── fps/              # Achronia (FPS Three.js)
├── public/strates/   # Strates (god-game voxel)
└── zentel/           # Zentel (p5.js)
```

---

## Licence

[CC BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/) - François Menguy · Utilisation non commerciale, attribution requise.

## Auteur

[François Menguy](https://fmenguy.fr)
