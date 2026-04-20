# Cycle jour/nuit

**Statut : validé (2026-04-20), MVP à implémenter**

## Principe

Pas de cycle automatique qui tourne en continu (l'utilisateur n'aime pas).

Le joueur bascule manuellement jour/nuit via un toggle (touche **N**). Chaque mode donne accès à des activités exclusives, ce qui transforme le bascule en vraie mécanique gameplay et pas en simple effet visuel.

Une option "cycle auto lent" pourra être ajoutée plus tard, désactivée par défaut.

## Mécanique

- Touche **N** (ou bouton HUD soleil/lune) bascule entre jour et nuit.
- Transition visuelle rapide (1 à 2 secondes) : couleur ambiante, directional light, skybox.
- Chaque bâtiment et tâche a un flag `activity: 'day' | 'night' | 'both'`.
- Les colons repèrent les tâches disponibles selon le mode courant.
  - Un boulanger rentre chez lui la nuit, un gardien sort.
- HUD : icône soleil ou lune bien visible, mode courant affiché clairement.

## Activités exclusives jour

- Agriculture (photosynthèse, récolte)
- Pêche
- Exploration lointaine
- Construction lourde
- Commerce entre villages

## Activités exclusives nuit

### Immédiat (âge pierre/bronze), MVP C

- **Feu de camp social** : les colons se réunissent au foyer, moral augmenté, dialogues spéciaux, cohésion de groupe.
- **Observation du ciel** : un colon à un "promontoire d'observation" génère des **points nocturnes** (voir `ressources.md`).

### Intermédiaire (fer à industriel)

- **Chasse nocturne** : gibier spécifique (sangliers, cerfs nocturnes), nécessite torche ou lanterne.
- **Cueillette de nuit** : champignons, herbes médicinales exclusives nuit.
- **Taverne / Bar** : bâtiment nocturne, boost moral, consomme nourriture et boisson, débloque dialogues sociaux (rumeurs, quêtes, événements).
- **Gardes de nuit** : rôle nocturne pour défendre contre événements (voleurs, animaux), rémunération.
- **Forge nocturne** : certains métaux nobles (bronze de cérémonie, acier damassé) ne se travaillent que la nuit.

### Avancé (atomique à espace)

- **Observatoire scientifique** : évolution du promontoire, débloque vraies techs (navigation, astrophysique, satellites). Impact croissant avec les âges.
- **Radio / télescope** : détection de signaux, événements cosmiques.
- **Lancement de fusée** : nocturne obligatoire pour visibilité et précision de trajectoire.

## MVP C (scope validé)

Démarrage minimal :

1. Toggle jour/nuit touche **N**, transition visuelle (ambiance, ciel, lumière).
2. Icône HUD soleil/lune.
3. 2 activités nocturnes immédiates :
   - Feu de camp social (comportement des colons, pas nouveau bâtiment nécessaire).
   - Observation du ciel (nouveau placement "promontoire", génère des points nocturnes passivement si un colon y est affecté).
4. Au moins 1 activité exclusive jour désactivée la nuit pour démontrer le principe (ex : pêche, ou agriculture).

Le reste (bars, chasse nocturne, observatoire avancé) arrive par incréments ultérieurs.

## Dépendances

- Nouveau système de ressources : **points nocturnes**, voir `ressources.md`.
- Pas de besoin de refondre le système de jour/saison existant (600s), le cycle jour/nuit est indépendant.
- À terme, intégration avec les saisons (plus de nuit en hiver par exemple).
