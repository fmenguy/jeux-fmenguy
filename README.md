<a id="francais"></a>

# Arcade FM : jeux et expériences web

🇫🇷 Français · 🇬🇧 [English](#english)

[![License: CC BY-NC 4.0](https://img.shields.io/badge/License-CC%20BY--NC%204.0-lightgrey.svg)](https://creativecommons.org/licenses/by-nc/4.0/)
[![Changelog](https://img.shields.io/badge/Changelog-consulter-blue)](CHANGELOG.md)

Arcade FM réunit des jeux et des expériences interactives jouables dans le navigateur, sans installation ni compte. C'est un site Astro statique, hébergé par Cloudflare Pages sur **[jeux.fmenguy.fr](https://jeux.fmenguy.fr)**, et une partie de [fmenguy.fr](https://fmenguy.fr).

Les jeux et le site sont en français.

## Jeux complets

### Achrogemme
Duel de cartes tiré du roman des Sœurs Elfes : trois Marches, des Gemmes, et Sylvie, Lilia puis Skarn à faire tomber. Son journal des versions est public.

- **Adresse :** [/achrogemme/](https://jeux.fmenguy.fr/achrogemme/), [changelog](https://jeux.fmenguy.fr/achrogemme/changelog/)
- **Code :** [`src/games/achrogemme/`](src/games/achrogemme/) (React), règles et équilibrage dans [`docs/achrogemme/`](docs/achrogemme/)

### Forge des Âges
Gestion médiévale au tour par tour : ressources, exploration d'une carte, expansion à travers les âges. Ambiance sonore intégrée, jouable sur mobile.

- **Adresse :** [/fda/](https://jeux.fmenguy.fr/fda/)
- **Code :** [`public/fda/`](public/fda/)

### Orbique
Exploration en salles thématiques avec particules, textures et puzzles, tutoriel intégré.

- **Adresse :** [/orbique/](https://jeux.fmenguy.fr/orbique/)
- **Code :** [`public/orbique/`](public/orbique/) (Three.js)

## Mini-jeux et expériences

| Projet | Description | Code |
|--------|-------------|------|
| **[Eryndor : Duel d'IA](https://jeux.fmenguy.fr/eryndor/)** | Deux agents IA (Claude) s'affrontent à la tête des humains et des elfes. Chaque joueur fournit sa propre clé d'API Anthropic, appelée directement depuis son navigateur ; un mode sans clé (actions scriptées) permet de tester sans frais. | [`public/eryndor/`](public/eryndor/) |
| **[EcoSim](https://jeux.fmenguy.fr/ecosim/ecosystem.html)** | Créatures, nourriture, prédateurs : l'équilibre d'un écosystème qui se construit. | [`public/ecosim/`](public/ecosim/) |
| **[Jeu de la Vie](https://jeux.fmenguy.fr/conway/)** | Automate cellulaire de Conway : tracer des motifs et regarder la vie émerger. | [`src/pages/conway/`](src/pages/conway/) |
| **[Zentel](https://jeux.fmenguy.fr/zentel/)** | Expérimentation visuelle interactive avec p5.js. | [`src/pages/zentel/`](src/pages/zentel/), [`public/zentel/`](public/zentel/) |

## Projets mis en avant, développés ailleurs

L'accueil met en avant deux jeux dont le code vit dans d'autres dépôts.

- **Strates** : jeu de dieu voxel (Three.js) où une colonie traverse sept âges de civilisation, de la pierre jusqu'à l'espace. La V2 se joue sur [strates.fmenguy.fr](https://strates.fmenguy.fr/v2/), un accès anticipé sur Steam est en préparation. Ce dépôt héberge son [carnet de chantier](https://jeux.fmenguy.fr/strates-carnet/) et son [journal des POC](https://jeux.fmenguy.fr/strates-poc/).
- **Bathyrêve** : bâtir une cité au fond de la mer, démo jouable sur [bathyreve.fmenguy.fr](https://bathyreve.fmenguy.fr/).

## Structure du dépôt

```
jeux-fmenguy/
├── src/
│   ├── pages/        pages Astro : accueil, 404, achrogemme, conway, zentel,
│   │                 et deux anciennes adresses de Strates redirigées vers l'accueil
│   └── games/        jeux écrits en React (achrogemme)
├── public/           jeux autonomes servis tels quels (fda, orbique, eryndor, ecosim, zentel),
│                     pages de Strates (strates-carnet, strates-poc), robots.txt
├── docs/             documentation de conception d'Achrogemme
├── claude design/    maquettes de l'interface d'Achrogemme (v1, v2)
└── astro.config.mjs
```

Une adresse inconnue affiche une page 404 en forme de borne d'arcade (« Game over »), avec un retour vers l'accueil et la liste des jeux.

## Lancer en local

Prérequis : Node.js 22.12 ou plus récent (exigé par Astro).

```bash
npm install
npm run dev       # http://localhost:4321
npm run build     # site statique dans dist/
npm run preview   # sert le contenu de dist/
```

## Hébergement

Déployé par **[Cloudflare Pages](https://pages.cloudflare.com)** à chaque push sur `main`, sur le domaine `jeux.fmenguy.fr`. Tout est statique : aucun serveur, aucune base de données. Seul Eryndor contacte un service externe, l'API d'Anthropic, depuis le navigateur du joueur et avec sa propre clé.

## Licence

[CC BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/), François Menguy : utilisation non commerciale, attribution requise. Voir [LICENSE](LICENSE).

## Auteur

[François Menguy](https://fmenguy.fr)

---

<a id="english"></a>

# Arcade FM: web games and experiments

🇫🇷 [Version française](#francais) · 🇬🇧 English

Arcade FM gathers games and interactive experiments that run in the browser, with nothing to install and no account needed. It is a static Astro site, hosted on Cloudflare Pages at **[jeux.fmenguy.fr](https://jeux.fmenguy.fr)**, and part of [fmenguy.fr](https://fmenguy.fr).

The games and the site are in French.

## Full games

### Achrogemme
A card duel based on the Sœurs Elfes novel: three Marches, Gems, and Sylvie, Lilia then Skarn to defeat. Its version history is public.

- **URL:** [/achrogemme/](https://jeux.fmenguy.fr/achrogemme/), [changelog](https://jeux.fmenguy.fr/achrogemme/changelog/)
- **Code:** [`src/games/achrogemme/`](src/games/achrogemme/) (React), rules and balancing notes in [`docs/achrogemme/`](docs/achrogemme/)

### Forge des Âges
Turn-based medieval management: resources, map exploration, expansion through the ages. Built-in soundscape, playable on mobile.

- **URL:** [/fda/](https://jeux.fmenguy.fr/fda/)
- **Code:** [`public/fda/`](public/fda/)

### Orbique
Exploration through themed rooms with particles, textures and puzzles, plus a built-in tutorial.

- **URL:** [/orbique/](https://jeux.fmenguy.fr/orbique/)
- **Code:** [`public/orbique/`](public/orbique/) (Three.js)

## Mini-games and experiments

| Project | Description | Code |
|---------|-------------|------|
| **[Eryndor: AI Duel](https://jeux.fmenguy.fr/eryndor/)** | Two AI agents (Claude) lead the humans and the elves against each other. Each player brings their own Anthropic API key, called directly from their browser; a keyless mode (scripted actions) lets you try it at no cost. | [`public/eryndor/`](public/eryndor/) |
| **[EcoSim](https://jeux.fmenguy.fr/ecosim/ecosystem.html)** | Creatures, food, predators: watch an ecosystem find its balance. | [`public/ecosim/`](public/ecosim/) |
| **[Jeu de la Vie](https://jeux.fmenguy.fr/conway/)** | Conway's Game of Life: draw patterns and watch life emerge. | [`src/pages/conway/`](src/pages/conway/) |
| **[Zentel](https://jeux.fmenguy.fr/zentel/)** | An interactive visual experiment built with p5.js. | [`src/pages/zentel/`](src/pages/zentel/), [`public/zentel/`](public/zentel/) |

## Featured projects, developed elsewhere

The home page features two games whose code lives in other repositories.

- **Strates**: a voxel god game (Three.js) where a colony moves through seven ages of civilization, from the Stone Age to space. Version 2 is playable at [strates.fmenguy.fr](https://strates.fmenguy.fr/v2/), and a Steam early access release is in preparation. This repository hosts its [development log](https://jeux.fmenguy.fr/strates-carnet/) and its [prototype journal](https://jeux.fmenguy.fr/strates-poc/).
- **Bathyrêve**: build a city at the bottom of the sea, with a playable demo at [bathyreve.fmenguy.fr](https://bathyreve.fmenguy.fr/).

## Repository layout

```
jeux-fmenguy/
├── src/
│   ├── pages/        Astro pages: home, 404, achrogemme, conway, zentel,
│   │                 and two old Strates URLs redirected to the home page
│   └── games/        games written in React (achrogemme)
├── public/           standalone games served as is (fda, orbique, eryndor, ecosim, zentel),
│                     Strates pages (strates-carnet, strates-poc), robots.txt
├── docs/             Achrogemme design documentation
├── claude design/    Achrogemme interface mockups (v1, v2)
└── astro.config.mjs
```

Unknown URLs land on a 404 page styled as an arcade cabinet ("Game over"), with a way back to the home page and the list of games.

## Running locally

Requirement: Node.js 22.12 or later (required by Astro).

```bash
npm install
npm run dev       # http://localhost:4321
npm run build     # static site in dist/
npm run preview   # serves the content of dist/
```

## Hosting

Deployed by **[Cloudflare Pages](https://pages.cloudflare.com)** on every push to `main`, under the `jeux.fmenguy.fr` domain. Everything is static: no server, no database. Only Eryndor talks to an external service, the Anthropic API, from the player's browser and with the player's own key.

## License

[CC BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/), François Menguy: non-commercial use, attribution required. See [LICENSE](LICENSE).

## Author

[François Menguy](https://fmenguy.fr)
