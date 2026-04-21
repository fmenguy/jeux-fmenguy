# Strates, plan de test v1

## Introduction

Ce document décrit le parcours de test de référence pour le projet Strates. Son objectif est double : détecter les régressions entre sessions et valider les features livrées dans les Lots A, B, C et D (session 12). Il est destiné à être rejoué manuellement en début ou fin de session avant tout merge vers `main`.

État couvert : Lot A (colons, saisons, audio, HUD), Lot B (moteur comportemental, besoins Faim et Sans-abri), Lot C (tech tree XXL pan/zoom/filtres, anti-spoiler), Lot D (transitions d'âge).

---

## Parcours de test linéaire bout-en-bout

### 1. Nouvelle partie

**Action attendue** : depuis la landing `/strates/`, cliquer sur "Nouvelle partie". Le jeu se charge dans l'éditeur sans données de sauvegarde résiduelles. L'état initial est : âge 1 (Pierre), quelques colons présents, ressources à zéro ou valeurs de départ, saison Printemps.

**Résultat attendu** : la map s'affiche en 3D, les colons bougent, aucun message d'erreur dans la console, le HUD affiche les ressources et l'âge courant.

Statut : ⬜ OK / ⬜ WIP / ⬜ KO

---

### 2. Construction base

**Action attendue** : placer 3 à 5 bâtiments de types différents (cabane, feu de camp, réserve). Utiliser le sélecteur de construction existant.

**Résultat attendu** : chaque bâtiment s'affiche immédiatement sur la map à l'emplacement cliqué, le feedback visuel (survol, placement) fonctionne, les compteurs de ressources ne partent pas en valeurs aberrantes.

Statut : ⬜ OK / ⬜ WIP / ⬜ KO

---

### 3. Quêtes tutoriel

**Action attendue** : vérifier que le panneau quêtes affiche les quêtes de départ (collecte baies, construction cairn, etc.). Progresser sur l'une d'elles partiellement.

**Résultat attendu** : les quêtes se déclenchent au bon moment, la barre de progression se met à jour à chaque collecte ou action, le texte de quête est lisible et cohérent avec l'état du jeu.

Statut : ⬜ OK / ⬜ WIP / ⬜ KO

---

### 4. Collecte ressources

**Action attendue** : laisser les colons collecter automatiquement baies, bois, pierre sur quelques cycles. Vérifier les compteurs HUD.

**Résultat attendu** : les stocks Baies, Bois, Pierre augmentent progressivement. Les colons se déplacent vers les sources, reviennent au dépôt. Aucun colon bloqué indéfiniment. Le compteur de la quête "20 baies" se met à jour à chaque collecte (attention : bug B1 connu, voir section Bugs).

Statut : ⬜ OK / ⬜ WIP / ⬜ KO

---

### 5. Construction Cairn

**Action attendue** : réunir les conditions requises pour construire le Cairn (ressources suffisantes, quête déclenchée), puis le poser sur la map.

**Résultat attendu** : le bouton Cairn devient actif quand les conditions sont remplies, le Cairn apparaît visuellement sur la map après pose (attention : bug B3 connu, voir section Bugs), le bouton repasse inactif après la pose (attention : bug B5 connu).

Statut : ⬜ OK / ⬜ WIP / ⬜ KO

---

### 6. Transition Bronze

**Action attendue** : remplir toutes les conditions de passage vers l'âge du Bronze (techs débloquées, ressources, population). Déclencher la transition.

**Résultat attendu** : une cinématique ou animation de passage d'âge se joue, le HUD passe à "Âge du Bronze", le tech tree se met à jour (les techs de l'âge 2 deviennent accessibles). La fanfare sonore joue (attention : bug B2, son jugé désagréable). Le tech tree âge 2 doit afficher des techs (attention : bug B4 à clarifier).

Statut : ⬜ OK / ⬜ WIP / ⬜ KO

---

### 7. Save / Reload

**Action attendue** : ouvrir le menu pause (Échap), sauvegarder la partie dans un slot. Retourner à l'accueil. Depuis l'accueil, charger la sauvegarde.

**Résultat attendu** : le jeu reprend exactement là où il a été sauvegardé (même âge, mêmes ressources, mêmes bâtiments placés, mêmes colons présents). Aucune régression visible. La sauvegarde auto fonctionne également si implémentée.

Statut : ⬜ OK / ⬜ WIP / ⬜ KO

---

## Bugs connus session 12

Ces bugs ont été identifiés lors de la session 12. Ne pas les remonter comme nouveaux. Suivre leur résolution ici.

| ID | Description | Statut |
|----|-------------|--------|
| B1 | Quête "20 baies" bloquée à 19/20 : le compteur n'est pas mis à jour quand c'est un colon qui ramasse (fonctionne uniquement en collecte directe joueur). | ⬜ Ouvert |
| B2 | Son fanfare lors de la transition vers l'âge du Bronze jugé désagréable (trop fort, mauvaise tonalité). À remplacer ou ajuster le volume. | ⬜ Ouvert |
| B3 | Cairn posé ne s'affiche pas visuellement sur la map. Le placement est enregistré mais le modèle 3D n'apparaît pas. | ⬜ Ouvert |
| B4 | Tech tree âge 2 reste vide après la transition Bronze. À clarifier : comportement voulu (techs verrouillées jusqu'à conditions) ou vrai bug de rendu. | ⬜ À clarifier |
| B5 | Le bouton Cairn reste actif avec les mêmes conditions après la pose. Il devrait passer inactif ou disparaître une fois le Cairn posé. | ⬜ Ouvert |
| B6 | Les filtres par branche dans le tech tree XXL (Lot C) ne filtrent rien : clic sur un filtre de branche sans effet visible sur les noeuds. | ⬜ Ouvert |
| B7 | Appuyer sur Échap depuis le tech tree XXL ouvre le menu pause au lieu de fermer le panneau tech tree. Conflit de capture d'événement clavier. | ⬜ Ouvert |

---

## Hors scope (à venir)

Les éléments suivants ne sont pas encore implémentés. Ne pas les remonter comme bugs.

- Métiers complets (spécialisation visible, chapeau coloré, actions exclusives par métier)
- Cycle jour/nuit automatique (le toggle manuel actuel est un MVP, le cycle auto est planifié)
- Ciel nuit stylisé (étoiles, lune, nuages nocturnes)
- Lumières dynamiques dans les bâtiments la nuit
- Palette de construction avancée type Pharaoh/Laysara
- Filons visuellement identifiables (couleurs par minerai)
- Code couleur des toits par type de bâtiment
- Modèle colons revu (moins cubique)
- Cairn visuel revu (empilement roches)
- Âges suivants (Fer, Industriel, Moderne, Atomique, Espace)
- Endgame changement de planète
- Fog of war
- Animaux et pêche
- Fiche personnage colon (panneau détaillé)
- Besoins vitaux complets (sommeil, social)
- Relations, couples, reproduction naturelle
- Mini-map
- Mode campagne et sandbox distincts
