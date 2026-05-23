# 🛣️ Roadmap par lots

Découpage incrémental. Chaque lot livre un état jouable.

## ✅ Lot 1 · Squelette + IA Sylvie (mai 2026)

**Livré :**
- Page Astro `/stratageme/` (avant renommage)
- Moteur de base : main, défausse, énergie, 3 lanes
- Combat : "force la plus haute gagne, surplus en dégât au Champion"
- IA Sylvie heuristique simple
- 10 cartes personnages + 5 sortilèges
- UI minimaliste (cadres CSS, palette bois sombre + teal)
- Lien depuis [src/pages/index.astro](../../src/pages/index.astro)

## ✅ Lot 1.5 · Classes et lanes thématiques

**Livré :**
- 3 classes (vert/bleu/rouge) avec effets propres (Tir / Magie / Garde)
- 3 lanes thématiques avec affinité +1 Force
- IA améliorée (priorise affinité lane, embuscade smart)
- Renommage lanes → Marches, ajout encart lore
- Bug critique corrigé (énergie IA jamais rechargée)
- Équilibrage : winrate joueur ramené à 70 %

## ✅ Lot 2 · Architecture data-driven + 3 slots par Marche (23 mai 2026)

**Livré :**
- Refonte des types : Card, Effect, Synergy, GameState avec 3 slots par Marche
- Data files structurés : [classes.ts](../../src/games/achrogemme/data/classes.ts), [factions.ts](../../src/games/achrogemme/data/factions.ts), [synergies.ts](../../src/games/achrogemme/data/synergies.ts), [cards.ts](../../src/games/achrogemme/data/cards.ts)
- 30 cartes (10 par classe) incluant 5 légendaires (Lilia, Aldarian, Throrin, Amélie, Sylvie, Skarn)
- Registry d'effets déclaratifs (Tir, Garde, Charge, Riposte, Frappe double, Perce, Régen, ±Gemmes)
- Combat tour par tour avec **PV des unités** : attaques s'échangent, absorption front → milieu → arrière → Champion
- 4 synergies : Elfe (2/4), Nain (2/4), Humain (3), Couronnes d'Achronia (3 royaux)
- Système de Gemmes : monnaie (anciennement PA), +1 max par tour, cap 8, modifié par cartes et synergies
- Anatomie de carte style Krosmaga : coût ★ / ATQ ⚔ / PV ❤ / ±Gemmes 💎 / nom / texte / famille (faction · classe) / couronne pour légendaires
- IA Sylvie améliorée : choisit le bon slot (tank front, archer arrière)
- Renommage complet : **Stratagème → Achrogemme**, **PA → Gemmes**, dossiers `src/games/achrogemme/`, `src/pages/achrogemme/`, `public/achrogemme/`
- URL : `/achrogemme/`
- Build vert (7s)
- Documentation complète dans [docs/achrogemme/](./)

## 🟡 Lot 3 · Collection + Deck builder + Lilia (à venir)

**Cible** : permettre au joueur de construire ses propres decks à partir d'une collection grandissante.

**Contenu :**
- **Persistance localStorage** : cartes débloquées, decks créés, statistiques
- **Écran Collection** : grille des cartes possédées, filtres par classe / faction / rareté
- **Écran Deck Builder** : drag/drop, contraintes (15-25 cartes, max 2 copies par carte sauf légendaires en 1 seule)
- **Système de récompenses** : battre Sylvie débloque X cartes
- **IA Lilia** : médium, 1 tour d'anticipation, archétype Meute Sylvestre
- **Sélection d'adversaire** à l'écran de démarrage
- **+30 cartes** (60 total) : sortilèges Rempart manquants, Galdor légendaire, variantes (Archer royal, Mage de l'ombre, Berserker fauché)
- **Animations basiques** : pose de carte (slide-in), mort (fade-down), pulse au combat
- **Framer Motion** ajouté pour gérer les animations React

**Estimé** : 4-6 jours de dev.

## 🔴 Lot 4 · Sous-classes + Skarn + Progression complète

**Cible** : profondeur stratégique, ajout de 5 sous-classes pour multiplier les archétypes.

**Contenu :**
- **5 sous-classes** : Druide (Sylvestre), Pyromage (Arcanique), Berserker (Rempart), Nécromancien (Arcanique sombre), Cavalier (Rempart mobile)
- **+50 cartes** (110 total)
- **+10 synergies** (sous-classes + tags)
- **IA Skarn** : difficile, 2 tours minimax, archétype Mur du Rempart
- **Tutoriel interactif** au premier lancement
- **Statistiques de jeu** : nb parties, winrate par adversaire, légendaire favori
- **Système de quêtes journalières** : « Gagne avec un deck Mono-Nain », « Pose 3 légendaires en une partie »

**Estimé** : 8-12 jours.

## 🟣 Lot 5 · Nouvelles factions + Naelia + Multi

**Cible** : élargir l'univers, multi 2 joueurs.

**Contenu :**
- **4 nouvelles factions** : Orc, Gobelin, Dragon (unique), Mort-vivant
- **+100 cartes** (210 total) incluant Hargrek, Kazrak, KrotorK (légendaires ennemis du Tome 1)
- **+20 synergies**
- **IA Naelia** : mystique, pioche du chaos
- **Multijoueur 2 joueurs via Firestore** : lobby par code, vue miroir
- **Sous-domaine `achrogemme.fmenguy.fr`** configuré
- **PWA** : installation home-screen mobile

**Estimé** : 15-25 jours (multi est complexe).

## ⚫ Lot 6+ · Polish visuel + Maître + extensions thématiques

**Cible** : niveau pro, esthétique cinématographique.

**Contenu :**
- **Refonte visuelle complète** avec Claude Design intégré (déjà en cours côté brief)
- **PixiJS** pour effets particulaires (volée de flèches qui vole, halos magiques)
- **Howler.js** pour audio (sons de pose, attaque, sort, mort, musique d'ambiance)
- **IA Maître d'Achronia** : ultime, voit la main joueur, joue optimal
- **Extensions thématiques** :
  - « À bord de l'Éclatmaris » : cartes avec touche SF, faction « Éclatmaris »
  - « Légendes d'Achronia » : cartes mythologiques
  - « Famille de Sylvie » : pack légendaire complet
- **Saisons** : meta tournant, balance patches, nouvelles cartes mensuelles
- **Animations cinématiques** : intro de chaque adversaire, écran de fin avec stats
- **Audio dynamique** : musique qui s'intensifie quand HP bas

**Estimé** : 30+ jours.

## ♾️ Long terme (au-delà du Lot 6)

- **300 cartes** au total (objectif initial validé)
- **100 synergies** opérationnelles
- **Mode draft** : sélection de 30 cartes parmi des paquets aléatoires, construit un deck à la volée
- **Mode classé** : ELO, ladder mensuel
- **Réplays partageables**
- **Mode spectateur** pour matchs multi
- **Editeur de cartes communautaire** (très long terme)

## Cibles et garde-fous

| Critère | Cible Lot 2 | Cible long terme |
|---|---|---|
| **Build time** | 7 s | < 15 s |
| **Bundle JS gzip** | ~150 kB | < 500 kB |
| **Time to interactive** mobile 4G | 1.5 s | < 3 s |
| **60 fps** sur le board | OK desktop | OK mobile bas de gamme |
| **Mode hors-ligne** (PWA) | Non | Oui (Lot 5+) |

## Suivi

- **Build vert** vérifié à chaque ajout majeur (`npm run build`)
- **Tests fonctionnels** : agent automatique simule des parties (winrate, anomalies)
- **Tests d'équilibrage** : à chaque ajout de cartes ou modif IA
- **Versionning** : à chaque fin de lot, tag git `achrogemme-v2.0.0`, etc.

## Dépendances inter-lots

```
Lot 1 ─── Lot 1.5 ─── Lot 2 (✅ ici) ─── Lot 3 ─── Lot 4 ─── Lot 5 ─── Lot 6+
                                  │           │           │           │
                                  │           │           │           └─ visuel PixiJS
                                  │           │           └─ multi Firestore
                                  │           └─ sous-classes
                                  └─ deck builder + collection
```

Le visuel (Claude Design) est en parallèle, intégré progressivement à partir du Lot 3 ou directement après le Lot 2 si livré rapidement.

## Quand publier le sous-domaine ?

À partir du **Lot 3** (deck builder + persistance), le jeu devient assez riche pour être partagé. À ce moment-là :
- Setup Cloudflare Pages pour `achrogemme.fmenguy.fr`
- Lien depuis le roman (`elfes.fmenguy.fr/tome2`) vers le jeu
- Annonce sur les réseaux si pertinent
