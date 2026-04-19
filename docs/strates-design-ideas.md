# Strates, idées de design

Journal d'idées au fil de la conception du jeu. Toutes les idées ici ne seront pas forcément implémentées, mais elles sont à considérer pour la version finale.

Voir aussi [strates-notes.md](strates-notes.md) pour la vision initiale.

## Pivot central (confirmé 2026-04-19)

Le joueur ne terraforme pas directement. Il **désigne des zones de travail** via un pinceau. Des **colons autonomes** exécutent les ordres selon leurs outils et compétences. Références : The Settlers, Dwarf Fortress, Timberborn, Banished, RimWorld. Plus que Godus ou From Dust.

L'outil de sculpt existe comme outil in-game (pioche, pelle), pas comme pouvoir divin.

## Prérequis et contraintes de minage

### Gravité des colons (implémenté proto4)
Les colons tombent si le sol disparaît sous eux. Pas de lévitation. Cascade possible si on désigne une bande entière à miner.

### Obstacles au minage d'une colonne
Une colonne ne peut pas être minée tant que ce qui est posé dessus n'a pas été retiré. À implémenter :

- **Arbre sur la colonne** : il faut d'abord désigner "Abattre" (hache) pour le retirer, ensuite seulement le minage est possible. L'arbre fournit du bois comme ressource.
- **Maison ou bâtiment** : il faut détruire / déconstruire avant.
- **Champ cultivé** : il faut "désaffecter" (libère la tuile) avant.

Principe général : le jeu force le joueur à penser **ordre des opérations**, ce qui crée de la planification.

### Roches et minerais non minables par défaut
Dans certains biomes (montagne, grotte, caverne profonde), des **voxels de roche dure** ou de **minerais spéciaux** existent qu'on ne peut pas miner avec les outils de base :

- Roche basique : pioche en pierre OK.
- Roche dure / granite : pioche en fer requise (tech âge du fer).
- Minerai de fer : pioche en pierre OK.
- Or, mithril, etc. : pioche en fer ou mieux requise.
- Roches volcaniques / obsidienne : tech haute requise.

Le système sert de **gate naturel de progression** : on voit les ressources avant de pouvoir y accéder, ce qui motive à avancer dans la tech tree. Comme Timberborn avec ses niveaux d'eau ou Dwarf Fortress avec ses métaux profonds.

## Tech tree et passage d'âges

Progression type Empire Earth (confirmé vision initiale). Âges pressentis :

1. Âge de pierre (démarrage)
2. Âge du bronze
3. Âge du fer (médiéval, pivot de fait du jeu)
4. Âge industriel
5. Plus tard : moderne, futuriste ? À voir.

Les âges se débloquent par action du joueur (pas passifs) : collecte de ressources seuils, construction d'un bâtiment clé, validation par le joueur d'un passage. Les habitants évoluent seuls sur le plan social mais l'action du joueur reste obligatoire pour la progression technique.

Chaque âge débloque :
- Nouveaux outils (pioche bronze, pioche fer, pelle, hache, scie, marteau).
- Nouveaux bâtiments (forge, moulin, mine profonde, scierie).
- Nouvelles ressources exploitables.
- Nouvelles compétences de colons.

## Outils et compétences des colons

Chaque colon peut avoir un ou plusieurs rôles (comme RimWorld) :

- Mineur (pioche)
- Bûcheron (hache)
- Terrassier (pelle, sculpt terrain)
- Agriculteur (semences, outils ferme)
- Maçon (construction)
- Forgeron (forge, raffinage)
- Chasseur, pêcheur (plus tard)

Une action de désignation sélectionne automatiquement le colon avec la meilleure compétence ET l'outil dispo ET le chemin accessible le plus court. Priorités paramétrables par le joueur (Dwarf Fortress style).

## UX désignation

- Barre d'outils en bas de page avec icônes : Miner, Abattre, Construire, Niveler, Cultiver, Annuler.
- Pinceau rayon 1 / 3 / 5 pour zones.
- Couleur overlay par type de job (rouge miner, orange abattre, bleu niveler, vert cultiver).
- Petite icône flottante 2D au dessus du voxel désigné pour clarté.
- Jobs listés dans un panneau latéral avec priorités drag and drop.

## Audio adaptatif

- Musiques libres de droit par biome (plaine, forêt, côte, montagne, désert).
- Transition douce quand la caméra change de zone dominante.
- Sources à explorer : OpenGameArt, itch.io tag "music", Kevin MacLeod (attribution requise).

## Visuel

- Base esthétique Dorfromantik (validée via proto3) : low-poly coloré, palettes désaturées chaleureuses, ombres douces, post-process léger.
- **Bordures cel-shading noires sur les voxels de surface** : signature Dorfromantik, à ajouter.
- **Instancing massif** pour arbres (500+ au lieu de dizaines).
- **Brume basse** dans les vallées, animée.
- **Mode heure dorée** (soleil bas rouge, optionnel via toggle jour/nuit).
- **HDRI Poly Haven** pour reflets eau réalistes.

## Mode worldbuilder / éditeur

Proto5 montre un mode où le joueur pose manuellement arbres, rochers, filons, maisons, champs. À conserver comme :

- Mode de scénario initial (placer manuellement le décor avant de lancer la simulation colons).
- Outil interne pour construire des cartes premadées.
- Éventuel mode créatif pour joueur sans contrainte de ressources.

## Persistance

- Sauvegarde localStorage minimum (heightmap compressée + liste entités + âge + ressources + colons).
- Plus tard : export / import de cartes en JSON, partage communautaire.

## Vie et personnalité des colons

Les colons ne sont pas de simples unités RTS exécutant des ordres. Ils ont une vie visible :

- **Errance en idle** : quand aucun job n'est dispo, le colon se balade, regarde autour, fait une pause, repart. Animation de démarche (bob vertical subtil).
- **Bulles de dialogue** au-dessus de la tête, 2D sprite ou CSS2D, apparaissent toutes les 10 à 20 secondes en idle, s'affichent 4 secondes puis fade-out. Phrases bateau qui donnent de la personnalité ("Qu'est-ce qu'on fait ?", "Il fait beau ici", "Je m'ennuie", "Faudrait creuser là, non ?", plus insistantes si le joueur n'a rien désigné depuis un moment).
- Plus tard : **personnalités différenciées** (travailleur, rêveur, râleur, optimiste), chacun avec son pool de phrases.
- Plus tard : **besoins** (faim, sommeil, social) qui ajoutent des contraintes à gérer pour le joueur.
- Plus tard : **bulles de job** (icône pioche quand ils travaillent, icône point d'interrogation quand ils cherchent un job, icône zzz quand ils dorment).
- Plus tard : **noms propres** par colon, affichés dans la bulle ou au survol.

## Idées ouvertes à explorer plus tard

- **Catastrophes** : incendie de forêt, inondation, éboulement, maladie.
- **Miracles** limités (cadeaux du joueur, budget spirituel basé sur foi des colons, façon Black and White).
- **Saisons** qui affectent rendements agricoles et comportement colons.
- **Animaux sauvages** passifs (cerfs, sangliers) puis agressifs (loups) avec chasse.
- **Autres tribus / voisins** neutres ou hostiles (diplomatie, commerce, guerre, à voir selon ambition).
- **Conditions de fin** optionnelles (atteindre âge X, population Y, monument) ou sandbox pur avec scoring.

## Statut

Phase : prototypes techniques.

Protos actifs :
- proto2 : sculpting manuel, bac à sable d'outils.
- proto3 : beauty-shot de référence visuelle.
- proto4 : core gameplay (désignation + colons + pathfind + minage + gravité).
- proto5 : worldbuilder (barre placement).

proto1 est à supprimer (stress-test obsolète, fonctionnalités absorbées par les autres).
