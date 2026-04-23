# Strates, plan de test v2

## Introduction

Ce document décrit le parcours de test de référence pour le projet Strates. Son objectif est double : détecter les régressions entre sessions et valider les features livrées dans les Lots A, B, C et D. Il est destiné à être rejoué manuellement en début ou fin de session avant tout merge vers `main`.

Pour un test interactif avec vraies cases à cocher et zones de commentaire, utiliser la version HTML `test-plan.html`.

Vocabulaire officiel des bâtiments posables en session courante : `Maison`, `Recherche`, `Champ`, `Promontoire`, `Cairn`. Utiliser ces noms dans les rapports.

---

## Parcours de test linéaire bout-en-bout

### 1. Nouvelle partie

**Action** : depuis la landing `/strates/`, cliquer sur "Nouvelle partie". Le jeu se charge sans données de sauvegarde résiduelles. État initial : âge 1 (Pierre), quelques colons, ressources à zéro ou valeurs de départ.

**Résultat attendu** : la map s'affiche en 3D, les colons bougent, aucune erreur console, le HUD affiche ressources et âge courant. Le panneau quêtes et le panneau sauvegarde ne se chevauchent pas (bug B8 connu).

Statut : ⬜

---

### 2. Construction base

**Action** : placer 3 à 5 bâtiments parmi `Maison`, `Recherche`, `Champ`, `Promontoire`. Utiliser le sélecteur de construction en bas de l'écran.

**Résultat attendu** : chaque bâtiment s'affiche immédiatement sur la map. Feedback visuel survol et placement fonctionne. Compteurs ressources cohérents. Fusion 4 maisons collées donne 1 manoir.

Statut : ⬜

---

### 3. Quêtes tutoriel

**Action** : vérifier que le panneau quêtes affiche les quêtes de départ (collecte baies, construction cairn). Progresser sur l'une d'elles.

**Résultat attendu** : quêtes déclenchées au bon moment, barre de progression mise à jour à chaque collecte, texte cohérent.

Statut : ⬜

---

### 4. Collecte ressources

**Action** : laisser les colons collecter automatiquement baies, bois, pierre sur quelques cycles. Vérifier compteurs HUD.

**Résultat attendu** : stocks Baies, Bois, Pierre augmentent progressivement. Colons se déplacent vers les sources. Aucun colon bloqué. Compteur de la quête "20 baies" se met à jour à chaque collecte.

Statut : ⬜

---

### 5. Construction Cairn

**Action** : réunir les conditions requises (ressources, quêtes), cliquer sur le bouton Cairn.

**Résultat attendu** : le bouton devient actif quand les conditions sont remplies. Après clic, le Cairn apparaît sur la map (en mode pose idéalement, voir roadmap). Le bouton passe grisé après la pose.

Statut : ⬜

---

### 6. Transition Bronze

**Action** : poser le Cairn avec toutes conditions remplies. La transition se déclenche automatiquement.

**Résultat attendu** : cinématique fade noir, titre "Âge du Bronze", fanfare supportable, retour fade. Le HUD passe à âge 2. Tech tree âge 2 affiche des techs ou un placeholder clair "Techs à venir".

Statut : ⬜

---

### 7. Tech tree (panneau touche T)

**Action** : ouvrir le panneau avec la touche T. Tester pan (drag), zoom (molette), filtres branches (clic sur un filtre en haut), recherche texte, fermeture (Échap ou bouton Fermer).

**Résultat attendu** : pan et zoom fluides. Filtres mettent en surbrillance la branche active et masquent ou atténuent les autres. Liens de dépendance proprement alignés entre cartes. Échap ferme le panneau sans ouvrir le menu pause.

Statut : ⬜

---

### 8. Aide en jeu (touche H)

**Action** : ouvrir l'aide en jeu avec la touche H. Naviguer entre les 7 rubriques. Vérifier que le jeu est en pause. Fermer avec H, Échap ou bouton Retour.

**Résultat attendu** : 7 rubriques cliquables (Caméra, Construire, Colons, Ressources, Technologies, Sauvegarder, Raccourcis). Caméra sélectionnée par défaut. Mots clés dorés, icônes. Jeu en pause. Fermeture propre. Aucune référence obsolète au mode éditeur dans les textes.

Statut : ⬜

---

### 9. Save / Reload

**Action** : sauvegarder via le menu ou bouton dédié, retourner à l'accueil, charger la sauvegarde.

**Résultat attendu** : le jeu reprend exactement là où il a été sauvegardé (âge, ressources, bâtiments, colons, cairn posé le cas échéant).

Statut : ⬜

---

## Bugs connus

Ces bugs ont été identifiés lors des sessions précédentes. Ne pas les remonter comme nouveaux. Suivre leur résolution ici.

### Session 12 (corrigés session 13)

| ID | Description | Statut |
|----|-------------|--------|
| B1 | Quête "20 baies" bloquée à 19/20 quand c'est un colon qui ramasse. | ✅ Corrigé |
| B2 | Son fanfare transition Bronze désagréable. | ✅ Corrigé |
| B3 | Cairn posé ne s'affiche pas visuellement. | ✅ Corrigé |
| B4 | Tech tree âge 2 vide après transition, placeholder "Techs à venir" ajouté. | ✅ Corrigé |
| B5 | Bouton Cairn reste actif avec mêmes conditions après pose. | ✅ Corrigé |
| B6 | Filtres par branche tech tree XXL ne filtrent rien. | ❌ Régression confirmée session 14 (voir B13) |
| B7 | Échap depuis tech tree ouvre le menu pause. | ✅ Corrigé |

### Session 14 (nouveaux)

| ID | Description | Statut |
|----|-------------|--------|
| B8 | Panneau sauver/charger/nouvelle chevauche le panneau quêtes en haut droite. | ⬜ Ouvert |
| B9 | L'aide en jeu (touche H) mentionne l'outil éditeur alors qu'on est en mode jeu. Texte obsolète. | ⬜ Ouvert |
| B10 | Colons ne font rien sans ordre direct, pas d'auto-collecte au repos. | ⬜ Ouvert |
| B11 | Points de recherche continuent à s'accumuler même si toutes les techs disponibles sont débloquées. | ⬜ Ouvert |
| B12 | Liens de dépendance tech tree mal alignés sur certaines branches. | ⬜ Ouvert |
| B13 | Filtres branches tech tree ne filtrent rien. Le fix B6 de la session 13 n'a pas corrigé le comportement. | ⬜ Ouvert |

---

## Hors scope (à venir)

Les éléments suivants ne sont pas encore implémentés. Ne pas les remonter comme bugs.

- Métiers complets (spécialisation visible, chapeau coloré, actions exclusives par métier)
- Écran de création de partie (choix famille, génération monde)
- Biomes distincts et ressources spécifiques
- Cycle jour/nuit automatique et ciel nuit stylisé
- Lumières dynamiques dans les bâtiments la nuit
- Palette de construction avancée type Pharaoh/Laysara
- Filons visuellement identifiables (couleurs par minerai)
- Code couleur des toits par type de bâtiment
- Modèle colons revu (moins cubique)
- Cairn posé par le joueur (mode placement)
- Tech tree workflow Civilization (pop-up 3 choix en fin de recherche)
- Méta-info gated derrière tech Observation (température, saisons, météo)
- Agriculture repensée (zones fertiles générées, moulins posés dessus)
- Âges suivants (Fer, Industriel, Moderne, Atomique, Espace)
- Endgame changement de planète
- Fog of war
- Animaux et pêche
- Fiche personnage colon (panneau détaillé)
- Besoins vitaux complets (sommeil, social)
- Relations, couples, reproduction naturelle
- Mini-map
- Mode campagne et sandbox distincts
