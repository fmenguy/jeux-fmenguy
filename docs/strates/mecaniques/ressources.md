# Ressources

**Statut : partiellement validé**

Liste des ressources in-game, leurs sources, leurs usages.

## Ressources actives

### Points de recherche (classique)

- **Source :** bâtiments de la chaîne Recherche (Laboratoire, Grand Laboratoire, Academie, etc.), production continue par tick.
- **Usage :** débloquer les techs de l'arbre tech classique (`techtree.json`).
- **Fichier source :** `state.researchPoints` dans `modules/state.js`.

## Ressources validées à implémenter

### Points nocturnes (nouveau, MVP C)

**Statut : validé 2026-04-20.**

- **Source :** observation du ciel la nuit depuis un "promontoire d'observation" (ou évolutions futures : observatoire, télescope). Nécessite un colon affecté à la tâche. Ne se génère que quand le mode nuit est actif.
- **Usage :** ressource **séparée** des points de recherche classiques, utilisée en **plus** des points classiques pour débloquer des techs et bâtiments spécifiques liés à :
  - L'espace (fusées, satellites, arcologie orbitale)
  - Le temps (astronomie, calendriers, prédiction des saisons)
  - La navigation (orientation par les étoiles, cartographie céleste)
  - L'exploration spatiale (endgame)
- **Principe :** une tech "spatiale" coûtera par exemple "200 pts recherche + 50 pts nocturnes", forçant le joueur à investir dans les activités nocturnes pour progresser vers l'endgame.
- **Affichage HUD :** à côté des points de recherche, icône lune/étoile.
- **Persistance :** ajouter `state.nightPoints` (int), sérialisé dans les slots de sauvegarde.

## Ressources à concevoir

Liste brute pour référence, pas encore validées :

- Nourriture (déjà partiellement présente via les champs)
- Bois (hache en pierre existe, à câbler comme ressource stockée)
- Pierre, minerais (pioche existe, à câbler)
- Moral / bonheur des colons
- Prestige / renom (effet social)
- Or et monnaie (pour le commerce)

À détailler quand on avance sur les systèmes correspondants.
