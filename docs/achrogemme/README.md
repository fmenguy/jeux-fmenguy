# 📚 Achrogemme · Documentation

Documentation de suivi du jeu **Achrogemme**, le jeu de cartes web inspiré du roman *Sylvie et la Fracture Galactique* ([elfes.fmenguy.fr](https://elfes.fmenguy.fr)).

## Sommaire

| Doc | Contenu |
|---|---|
| [regles.md](regles.md) | Règles complètes : tour, combat, Marches, Gemmes, conditions de victoire |
| [cartes.md](cartes.md) | Liste exhaustive des cartes par famille (classe + faction) |
| [legendaires.md](legendaires.md) | Focus sur les cartes légendaires (personnages du roman) |
| [synergies.md](synergies.md) | Synergies actuelles + roadmap des synergies futures |
| [strategies.md](strategies.md) | Archétypes de deck et stratégies de jeu |
| [interface.md](interface.md) | UI, contrôles, actions possibles, raccourcis |
| [difficulte.md](difficulte.md) | Niveaux de difficulté et IA adverses |
| [roadmap.md](roadmap.md) | Découpage en lots de développement |

## Pitch en 1 phrase

Achrogemme est un jeu de cartes solo (puis multi 2 joueurs à terme) en français, hybride entre **Hearthstone** (cartes avec ATQ/PV qui s'attaquent), **TFT** (synergies de classe et faction), **Gwent** (3 Marches thématiques face à face), et **Krosmaga** (anatomie de carte, restriction stricte par classe).

## Lore

C'est le jeu de cartes auquel Sylvie, héroïne du roman, joue à bord de son vaisseau spatial l'Éclatmaris. Son père défunt Skarn lui a appris. Le jeu représente les **Trois Marches d'Achronia** (la planète elfique d'origine de Sylvie) :

- 🏹 **Sylvestre** — forêts d'archers
- ✨ **Arcanique** — plaines de mages
- ⚔ **Rempart** — forteresses de guerriers

Les pièces invoquées sont alimentées par les **Gemmes**, cristaux d'Achronia qui captent la volonté du joueur.

## État du projet (au 23 mai 2026)

- **Lot 1** ✅ Squelette + combat basique vs Sylvie
- **Lot 1.5** ✅ Classes (vert/bleu/rouge) + Marches thématiques
- **Lot 2** ✅ Architecture data-driven, 3 slots par Marche, combat tour par tour avec PV des unités, synergies, anatomie Krosmaga des cartes, renommage Achrogemme + Gemmes
- **Lot 3** ⏳ Collection + Deck builder + IA Lilia (médium)
- **Lot 4** ⏳ Skarn (difficile) + 5 sous-classes + progression
- **Lot 5+** ⏳ Visuel pro (Claude Design) + animations + multi

Voir [roadmap.md](roadmap.md) pour le détail.

## Stack technique actuelle

- Astro 5 (static) + React 19 + TypeScript
- CSS pur (Tailwind ajouté quand Claude Design livre le visuel)
- Cloudflare Pages
- URL actuelle : `jeux.fmenguy.fr/achrogemme/` (sous-domaine `achrogemme.fmenguy.fr` envisagé)

## Conventions

- **Pas de tiret long** (—, –, --) dans les textes ni l'UI (règle absolue auteur)
- Tout en français
- Mobile-first responsive (breakpoint 1100px)
- Cartes : anatomie inspirée de Krosmaga (coût ★ / ATQ ⚔ / PV ❤ / ±Gemmes 💎)
