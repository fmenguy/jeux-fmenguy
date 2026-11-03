# Arcade FM : jeux et expériences web

[![License: CC BY-NC 4.0](https://img.shields.io/badge/License-CC%20BY--NC%204.0-lightgrey.svg)](https://creativecommons.org/licenses/by-nc/4.0/)
[![Changelog](https://img.shields.io/badge/Changelog-consulter-blue)](CHANGELOG.md)

Collection de jeux et d'expériences interactives jouables dans le navigateur, réunis sur un site Astro hébergé par Cloudflare Pages.

**[jeux.fmenguy.fr](https://jeux.fmenguy.fr)**, qui fait partie de [fmenguy.fr](https://fmenguy.fr)

---

## Jeux complets

### Achrogemme
Duel de cartes tiré du roman des Sœurs Elfes : trois Marches, des Gemmes, et Sylvie, Lilia puis Skarn à faire tomber. Son journal des versions est public sur le site.

- **Adresse :** [/achrogemme/](https://jeux.fmenguy.fr/achrogemme/), [changelog](https://jeux.fmenguy.fr/achrogemme/changelog/)
- **Code :** [`src/games/achrogemme/`](src/games/achrogemme/) (React), règles et équilibrage dans [`docs/achrogemme/`](docs/achrogemme/)

### Forge des Âges
Gestion médiévale au tour par tour : ressources, exploration d'une carte, expansion à travers les âges. Ambiance sonore intégrée, compatible mobile.

- **Adresse :** [/fda/](https://jeux.fmenguy.fr/fda/)
- **Code :** [`public/fda/`](public/fda/)

### Orbique
Exploration en salles thématiques avec particules, textures et puzzles, tutoriel intégré.

- **Adresse :** [/orbique/](https://jeux.fmenguy.fr/orbique/)
- **Code :** [`public/orbique/`](public/orbique/) (Three.js)

---

## Mini-jeux et expériences

| Projet | Description | Code |
|--------|-------------|------|
| **[Eryndor : Duel d'IA](https://jeux.fmenguy.fr/eryndor/)** | Deux agents IA (Claude) s'affrontent à la tête des humains et des elfes. Chacun apporte sa propre clé d'API, utilisée depuis son navigateur ; un mode sans IA permet de tester sans coût. | [`public/eryndor/`](public/eryndor/) |
| **[EcoSim](https://jeux.fmenguy.fr/ecosim/ecosystem.html)** | Créatures, nourriture, prédateurs : l'équilibre d'un écosystème qui se construit. | [`public/ecosim/`](public/ecosim/) |
| **[Jeu de la Vie](https://jeux.fmenguy.fr/conway/)** | Automate cellulaire de Conway : tracer des motifs et regarder la vie émerger. | [`src/pages/conway/`](src/pages/conway/) |
| **[Zentel](https://jeux.fmenguy.fr/zentel/)** | Expérimentation visuelle interactive avec p5.js. | [`src/pages/zentel/`](src/pages/zentel/), [`public/zentel/`](public/zentel/) |

---

## Projets mis en avant, développés ailleurs

- **Strates** : jeu de dieu voxel (Three.js) où une colonie traverse sept âges de civilisation. Le jeu a son propre dépôt ; ce site héberge son [carnet de chantier](https://jeux.fmenguy.fr/strates-carnet/) et son [journal des POC](https://jeux.fmenguy.fr/strates-poc/).
- **Bathyrêve** : bâtir une cité au fond de la mer, sur [bathyreve.fmenguy.fr](https://bathyreve.fmenguy.fr/).

---

## Structure du dépôt

```
jeux-fmenguy/
├── src/
│   ├── pages/        pages Astro : accueil, achrogemme, conway, zentel, strates
│   └── games/        jeux écrits en React (achrogemme)
├── public/           jeux autonomes servis tels quels (fda, orbique, eryndor, ecosim, zentel)
│                     et pages de Strates (strates-carnet, strates-poc)
├── docs/             documentation de conception d'Achrogemme
└── astro.config.mjs
```

## Lancer en local

```bash
npm install
npm run dev       # http://localhost:4321
npm run build     # site statique dans dist/
```

## Hébergement

Déployé par **[Cloudflare Pages](https://pages.cloudflare.com)** à chaque push sur `main`, sur le domaine `jeux.fmenguy.fr`. Tout est statique : aucun serveur, aucune base de données.

---

## Licence

[CC BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/) François Menguy : utilisation non commerciale, attribution requise.

## Auteur

[François Menguy](https://fmenguy.fr)
