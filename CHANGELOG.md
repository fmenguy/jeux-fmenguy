# Changelog

Toutes les modifications notables du projet Arcade FM sont documentées ici.
Format inspiré de [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/).

---

## [2026-04-20]

### Ajouté
- **Strates** : page d'accueil landing (design Claude, ambiance Dorfromantik cosy)

### Modifié
- **FDA** : refonte design v2, cartes ressources en plaques forgées, actions bulk +5/+50
- **FDA** : design bâtiments forgés avec classe `.ready` pulsante
- **FDA** : fix guillemets JS, nettoyage `v2.css` (bloc `.resource` supprimé)
- **FDA** : panneaux Fabrication, Main-d'oeuvre et Reliques intégrés au design v2, mise en avant des ember workers
- **FDA** : manteau affiche la progression X/Y (manteaux / villageois)
- **FDA** : progression débloquée, UI objectif refonte, bot console, corrections critiques

---

## [2026-04-17]

### Modifié
- **Eryndor** passe en mode **duel d'agents IA autonomes**. Les deux factions (Humains, Elfes) sont désormais pilotées par de vrais appels à l'API Anthropic (Sonnet 4.6 vs Haiku 4.5 par défaut, configurables). Le joueur devient spectateur.
- Les déciseurs heuristiques (`AIDirector` et ses 8 sous-systèmes, ainsi que les auto-build/auto-research/auto-war internes à `Faction`) sont supprimés. Seule la « physique » du monde reste (mouvement, combat, ressources, recherche, reproduction).
- Nouvelle architecture `js/agent/` : client Anthropic (BYOK navigateur), snapshots JSON, 10 tools (build/train/research/attack/declare_war/offer_peace/set_jobs/found_colony/trade/end_turn), validateur d'actions, scheduler parallèle.
- Nouveau setup au lancement : saisie clé API (localStorage optionnel), choix des modèles, mode mock pour tests sans coût.
- Ajout d'un journal des agents en bas de page (raisonnement + tool calls + compteur de tokens).

---

## [2026-04-11]

### Ajouté
- **Orbique** — jeu d'exploration en salles thématiques (particules, textures, puzzles, tutoriel intégré)
- **Jeu de la Vie (Conway)** — automate cellulaire de Conway
- **Eryndor v2** — remplacement par la version complète multi-fichiers
- **Hub Arcade FM** — page d'accueil unifiée avec grille jeux complets / mini-jeux
- Restructuration du dépôt en dossiers par jeu

---

## [2025-11-21]

### Modifié
- Ajout du `.gitignore` pour le déploiement automatique

---

## [2025-05-18 – 2025-05-20]

### Ajouté
- **Zentel** — 42 niveaux générés, boss final, système d'astuces, compatibilité mobile
- Refonte complète de l'interface Zentel (Zentel v2)

---

## [2025-05-15]

### Ajouté
- **EcoSim** — simulateur d'écosystème complet : proies, prédateurs, nouvelles espèces, accélération, cooldown, compatibilité mobile

---

## [2025-05-03]

### Ajouté
- **FDA** — ambiance sonore et musique de fond avec gestion du volume

---

## [2025-04-17]

### Ajouté
- **FDA v2.2** — barre d'exploration avancée, compteur de bâtiments, gestion des messages d'erreur

---

## [2025-04-15]

### Ajouté
- **FDA v2.1** — système de villages, gestion du chef, barre d'exploration, indices de progression
- Sauvegarde automatique de la partie
- Traduction et interface enrichie

---

## [2025-04-13 – 2025-04-14]

### Ajouté
- **Forge des Âges (FDA)** — commit initial
- Mise en place des modules JS, arborescence et déploiement Cloudflare Pages
