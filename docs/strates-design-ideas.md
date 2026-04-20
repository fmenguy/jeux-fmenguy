# Strates, idées de design

Journal d'idées au fil de la conception du jeu. Toutes les idées ici ne seront pas forcément implémentées, mais elles sont à considérer pour la version finale.

Voir aussi [strates-notes.md](strates-notes.md) pour la vision initiale.

## Positionnement (confirmé 2026-04-19)

Strates est pensé comme la **version 3D simulation de vie** du jeu FDA (Forge des Âges), qui existe déjà dans ce repo en version 2D. Même univers thématique (âges successifs, médiéval en pivot, progression technologique), mais transposé en sim de colons voxel. Les deux jeux peuvent partager lore, noms, iconographie à terme. FDA reste l'expérience courte et arcade, Strates est l'expérience longue et profonde.

## Pivot central (confirmé 2026-04-19)

Le joueur ne terraforme pas directement. Il **désigne des zones de travail** via un pinceau. Des **colons autonomes** exécutent les ordres selon leurs outils et compétences. Références : The Settlers, Dwarf Fortress, Timberborn, Banished, RimWorld. Plus que Godus ou From Dust.

L'outil de sculpt existe comme outil in-game (pioche, pelle), pas comme pouvoir divin.

## Séparation éditeur / jeu (confirmé 2026-04-19)

Deux modes bien distincts, avec deux UI différentes :

### Mode éditeur (outil de construction de cartes)
- **Tous les outils de placement direct** : poser arbres, rochers, filons, maisons, champs.
- **Outils de sculpt de terrain** : élever, abaisser, niveler.
- **Désignation de jobs** (pour tester la boucle colons dans une carte donnée).
- Sert au mapmaker, aux tests, aux scénarios prémadés.
- Par défaut pas accessible au joueur dans la version publique (peut-être via un mode "bac à sable" optionnel plus tard).

### Mode jeu (expérience finale)
- **Aucun outil de placement direct**. Pas de "poser un arbre" ou "poser une maison" depuis la main du joueur.
- **Aucun outil de sculpt direct**. Pas de "élever le terrain".
- Le joueur agit **uniquement via des ordres aux colons** : désigner des zones à miner, à défricher, à construire, à cultiver.
- Les colons exécutent selon leurs outils, compétences, état du terrain et tech dispo.
- La progression vient du gate tech (âges), pas de l'omnipotence du joueur.
- L'écosystème évolue seul (arbres qui poussent et meurent, animaux, météo).

Références proches qui ont cette séparation : Timberborn, RimWorld, The Settlers. L'éditeur n'est pas le jeu, c'est l'outil interne de design.

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

## Recherche et arbre technologique

Système central de progression, à placer au cœur du gameplay. Inspiré Civilization, Banished, The Settlers.

### Bâtiment de recherche
- **Maison avec toit bleu** (variante visuelle d'une maison classique), outil de placement dédié dans l'éditeur et plus tard déblocable via quête dans le mode jeu.
- Représente la "hutte du sage", "bibliothèque", "laboratoire" selon l'âge.
- Nécessite **un colon attribué à la recherche** pour produire des points de recherche.
- Sans colon attribué, le bâtiment existe mais ne produit rien.

### Déclencheurs contextuels (bulles colons)
Les colons expriment des besoins via bulles quand le joueur les met dans une situation qui appelle un déblocage tech. Exemples :
- Plusieurs champs posés sans houe déblocage : "Il me faut une houe", "Comment on fait pour manger du pain ?", "Ces champs servent à rien sans outils".
- Minage de roche dure sans pioche adéquate : "Ma pioche ne fait rien", "Il faut du bronze pour casser ça".
- Arbres à abattre sans hache : "Pas d'arbre sans hache".
- Manque de nourriture : "J'ai faim", "On a plus de baies".

Ces bulles contextuelles sont **ciblées** (un colon près de la situation concernée) plutôt qu'aléatoires, pour orienter le joueur vers la tech à débloquer.

### Arbre technologique initial (âge de pierre)
- **Houe** : permet de cultiver les champs (ajoute une quête "Récolter 10 blés"). Requiert X points de recherche.
- **Hache en pierre** : permet d'abattre les arbres (avant, les arbres sont juste décoratifs).
- **Pioche en pierre** : permet de miner les rochers (récolte de pierre).
- **Four à pain** : transforme blé récolté en pain, nourriture plus riche que les baies.
- **Cueillette améliorée** : +1 baie par buisson récolté.

Puis débloque le passage à l'âge du bronze, nouveau tier, etc.

### Attribution des métiers
- Interface de **gestion des rôles** (inspirée RimWorld) : pour chaque colon, cocher les compétences qu'il peut exercer.
- Un colon dédié recherche ne fait plus de minage, errance, récolte, sauf en mode secours.
- Plus tard : progression dans la compétence (expérience, niveau), bonus productivité.

### Implémentation v1 (éditeur, état 2026-04-19)

Base technique dans `public/strates/editor/main.js` (unique fichier ~2500 lignes) et `index.html`.

#### Terrain et rendu

- Génération Perlin FBM (PRNG mulberry32, octaves) avec falloff insulaire (bordures forcées à eau profonde sur 3 tiles, eau peu profonde sur 2 tiles).
- Chunks 16x16 avec face culling complet (seules les faces visibles sont générées via `BufferGeometry` et `vertexColors`). Pas de lag sur une grille 48x48x8.
- Biomes : herbe, forêt, sable, roche, neige. Palettes voxel désaturées et chaleureuses (style Dorfromantik).
- Eau double plan : profonde (`#1a3a5e`) et peu profonde (`#5ba8c4`), `ShaderMaterial` avec ondulations animées.
- Sky shader Three.js, `EffectComposer` avec `UnrealBloom` + vignette, `ACESFilmicToneMapping`.
- `InstancedMesh` pour arbres et rochers (`frustumCulled = false` pour éviter le culling erroné quand le bounding sphere est en (0,0,0)).

#### Colons

- Machine à états : `IDLE / MOVING / WORKING / RESEARCHING / wander`.
- A\* pathfinding 2D sur grille de colonnes, franchissement max 2 voxels, eau profonde bloquante, eau peu profonde traversable.
- Gravité : si le sol disparaît sous un colon (minage), il tombe immédiatement.
- Errance en idle : déplacement aléatoire toutes les 5 à 12 s.
- Bulles 2D CSS au-dessus de la tête, pool de phrases aléatoires + bulles contextuelles prioritaires.
- Identité : nom tiré dans `MALE_NAMES` (21) ou `FEMALE_NAMES` (21), genre ♂/♀ affiché en couleur. François est le chef (étoile dorée ★, `isChief=true`, toujours spawné en premier).
- Toggle affichage noms (bouton HUD), prénoms absents des bulles par défaut (la bulle est un monologue intérieur).
- Spawn : 2 colons par maison posée.

#### Outils de placement (barre bas de page)

| Raccourci | Outil | Contrainte |
|---|---|---|
| 1 | Naviguer | Pas de job, caméra libre |
| 2 | Miner | Gate tech (voir ci-dessous) |
| 3 | Placer (déposer voxel) | Stock requis, tile libre, portée vert ≤ 3 |
| 4 | Forêt | Herbe / forêt uniquement |
| 5 | Rocher | Partout sauf eau |
| 6 | Filon | Roche / neige uniquement |
| 7 | Maison | Herbe / forêt / sable |
| 8 | Champ | Herbe uniquement |
| 9 | Baies | Herbe / forêt uniquement |
| 0 | Recherche (toit bleu) | Toute surface solide |
| Eff | Effacer | Retire entité ou voxel |

Pinceau : rayon 1 / 3 / 5 (chiffres en bas à droite, défaut = 1).

Shift + clic : sélection BFS de toute la strate (même biome, même hauteur, max 200 tiles).

#### Stocks et ressources

Objet `stocks` : `stone, dirt, copper, silver, iron, coal, gold, amethyst`. Incrément automatique à chaque minage via `incrStockForBiome` (grass/forest/sand → dirt, rock/snow → stone). Les filons bloquent le minage direct (mapping `ORE_TO_STOCK` prêt pour une prochaine feature d'extraction dédiée). Affichage HUD compact, types vides masqués.

L'outil Placer consomme le stock le plus abondant (pierre ou terre).

#### Recherche et tech tree

Bâtiment de recherche (toit bleu `#3c7fb8`) : à la pose, le colon IDLE le plus proche lui est attribué (`researchBuildingId`), il passe en état `RESEARCHING` et produit 1 point toutes les 3 s dans `researchPoints`.

4 techs initiales débloquables dans l'ordre : `pick-stone` (5 pts) → `pick-bronze` (15 pts) → `pick-iron` (30 pts) → `pick-gold` (60 pts). Panneau HUD "Tech" avec bouton "Rechercher" par tech, flash doré au déblocage.

`canMineCell` vérifie la tech : roche/neige requiert `pick-stone`, filons suivent `ORE_TECH` (cuivre/charbon → bronze, fer/argent → fer, or/améthyste → or). Jobs refusés déclenchent une bulle contextuelle (cooldown 60 s par tech).

Bulles contextuelles supplémentaires : `field-no-research` (2+ champs posés sans bâtiment de recherche) et `empty-lab` (bâtiment sans chercheur).

#### Quêtes

Panneau #quests (haut droite, bordure dorée). 3 quêtes initiales actives au démarrage :
- "Construire une 2ème maison" (déclenche spawn 2 colons, récompense +5 pts recherche).
- "Miner 5 blocs" (avec pioche stone).
- "Récolter 5 baies".

#### Ce qui manque (prochaines itérations)

- Extraction des filons (outil ou job dédié, distinct du minage de bloc).
- Interface de gestion des rôles par colon (cocher les compétences).
- Visuel différencié pour le chercheur (pupitre, animation lecture).
- Outils Hache (abattage arbre) et Pelle (sculpt terrain) séparés.
- Besoins et nourriture (faim, consommation baies/pain).
- Relations et reproduction naturelle.

## Tech tree XXL et passage d'âges

### Distinction avec la fusion de bâtiments

Ces deux systèmes sont **indépendants et complémentaires** :

- **Fusion de bâtiments** : mécanique visuelle et logistique. 4 huttes → 1 longhouse. Le joueur voit sa colonie grandir physiquement. Pas de points de recherche, pas de choix stratégique, juste de la planification urbaine.
- **Tech tree** : mécanique de progression et de déblocage. Le joueur dépense des points de recherche pour ouvrir des capacités nouvelles (outils, recettes, bâtiments disponibles, compétences colons). C'est le **cœur du jeu** : sans débloquer de tech, la colonie stagne. Sans faire progresser la tech tree, on ne change pas d'âge.

La tech tree commande ce qui est possible. La fusion de bâtiments exploite ce qui est possible pour le matérialiser dans la carte.

### Ambition

Arbre de recherche gigantesque, inspiré **Total War Warhammer** (High Elves: une grille 8 colonnes × 6 rangs) et **Craft the World** (arbre qui part dans toutes les directions, lié à l'époque). Pas 4 techs linéaires comme actuellement, plutôt **60 à 90 techs** réparties sur 7 âges et 6 branches thématiques, avec prérequis croisés qui obligent à faire des choix.

### Les 7 âges (+ endgame cyclique)

Inspiration Empire Earth, étendue à la vision long terme du projet.

1. **Âge de pierre** : démarrage, cueillette, premières pioches.
2. **Âge du bronze** : alliages, premières routes, couples.
3. **Âge du fer** : pivot médiéval (châteaux, forge, blé cultivé).
4. **Âge industriel** : vapeur, usines, premiers trains.
5. **Âge moderne** : électricité, chemins de fer, mines profondes.
6. **Âge atomique** : réacteurs, villes, automatismes.
7. **Âge de l'espace** : fusées, stations orbitales.
8. **Endgame cyclique** : changement de planète, regénération avec biomes exotiques.

### Les 6 branches thématiques

Chaque branche traverse tous les âges, avec 8 à 15 techs réparties. Les branches se croisent (une tech de la branche Savoir peut requérir une tech de la branche Construction).

| Branche | Couleur | Exemples de techs par âge |
|---|---|---|
| **Outils** | gris / bronze / fer | pioches, haches, pelles, marteaux, houes, faucilles, perforatrices |
| **Agriculture** | vert doré | champs, moulin, four à pain, élevage, brasserie, serres, hydroponie |
| **Construction** | bois brun | maisons améliorées, forge, scierie, moulin à eau, aqueducs, palais, gratte-ciels |
| **Militaire** | rouge grenat | palissade, archers, guet, chevaliers, canons, tranchées, missiles (déclenchable aux événements) |
| **Savoir** | bleu | école, bibliothèque, université, imprimerie, laboratoire scientifique, internet, IA |
| **Âge** (transition) | doré | bâtiments monuments qui déclenchent le passage d'âge lorsque certaines techs des autres branches sont acquises |

### Mécanique de progression (à la FDA)

Comme dans le projet jumeau FDA, le passage d'un âge à l'autre se fait par **conditions cumulatives** sur plusieurs branches :

- **Âge du bronze** requiert : avoir débloqué pioche pierre (Outils) + avoir construit 1 forge (Construction) + avoir 3 chercheurs actifs (Savoir).
- **Âge du fer** requiert : pioche bronze + moulin (Agriculture) + première route (Construction) + 5 chercheurs.
- Etc.

Le passage d'âge est **déclaré** par le joueur (clic sur le bâtiment monument correspondant) une fois les conditions remplies. Animation cinématique courte, bulle d'annonce, déblocage des techs du nouveau âge.

**Recherche à débloquer** : à l'intérieur d'un âge atteint, les techs sont accessibles une par une en dépensant des points de recherche. Les coûts doivent croître fortement (5 → 30 → 100 → 300 → 1000 pts pour les plus avancées) pour que le rythme reste lent une fois la colonie grosse. Plusieurs chercheurs = plusieurs labos = plus de points par seconde, mais moins de colons disponibles pour le reste. Arbitrage permanent.

### Prérequis croisés

Exemples inspirés Total War :

- **Pioche de fer** (Outils, âge fer) requiert : pioche bronze + forge améliorée (Construction).
- **Cathédrale** (Construction, âge fer) requiert : aqueduc (Construction) + scribe (Savoir).
- **Hydroponie** (Agriculture, âge espace) requiert : serre (Agriculture) + panneau solaire (Construction) + génie génétique (Savoir).

Un tech ne peut pas être débloqué tant qu'UN de ses prérequis n'est pas rempli. L'arbre forme un graphe orienté acyclique, pas juste une chaîne linéaire.

### Visualisation

Panneau Tech actuel (liste verticale 4 entrées) insuffisant pour 60+ techs. À refaire en **arbre visuel interactif** :

- Vue scrollable/zoomable (pan à la souris, molette = zoom), plein écran ou modale large.
- Colonnes = âges, lignes = branches thématiques. Même structure que FDA dans `forge-enhance.js TECH_TREE`.
- Chaque tech = carte (icône emoji + nom + coût + état), liens visibles entre prérequis et descendants.
- États visuels : verrouillée (opacity 0.3), prérequis OK (bordure neutre), recherchable (glow bleu), en cours (progress bar), débloquée (glow doré).
- Filtres par branche (toggle Outils / Agri / Construction / Militaire / Savoir / Âge).
- Recherche texte (filtrer les techs visibles par nom).
- Les âges non atteints sont masqués ou teased en flou, pour préserver la surprise (comme FDA qui cache les âges futurs).

### Implémentation pressentie

- **Data-driven** : un JSON (ou objet JS) `TECH_TREE` listant toutes les techs avec `{ id, name, age, branch, icon, cost, requires: [ids], unlocks: { buildings: [], tools: [], colonistSkills: [] } }`.
- Aligné sur l'axe 1.5 de la roadmap (data-driven configs), faire les deux ensemble.
- Au démarrage : charger le JSON, construire le graphe, calculer les niveaux de profondeur, positionner les cartes visuellement.
- Conserver le panneau Tech actuel en version "résumé/compacte" pour les 3 techs recherchables à court terme, le grand arbre s'ouvre via un bouton dédié.

### Ce qui est déjà en place (proto minimal)

Les 4 techs actuelles (`pick-stone`, `pick-bronze`, `pick-iron`, `pick-gold`) forment juste la branche **Outils, colonne Minage**, et leurs coûts (5, 15, 30, 60) sont volontairement petits pour valider la boucle. Elles seront intégrées à l'arbre XXL lorsqu'on le construira.

## Outils et compétences des colons

Chaque colon peut avoir un ou plusieurs rôles (comme RimWorld) :

- Mineur (pioche)
- Bûcheron (hache)
- Terrassier (pelle, sculpt terrain)
- Agriculteur (semences, outils ferme)
- Maçon (construction)
- Forgeron (forge, raffinage)
- Chasseur, pêcheur (plus tard)
- **Bricoleur** (plus tard) : sait construire des **escaliers voxel** (marches posées en cascade sur une falaise) qui permettent à tous les colons de monter ou descendre au-delà de la limite de 2 voxels de franchissement. Débloque la verticalité à grande échelle sans passer par le minage systématique. Métier à débloquer via une tech ou une quête spécifique.

Règle de franchissement de base (sans bricoleur) : un colon peut monter ou descendre **au maximum 2 voxels** de différence entre deux tiles adjacentes. Au-delà, il faut soit miner une colonne pour créer un passage, soit poser un escalier (bricoleur). Cette limite crée du sens pour le métier bricoleur et force la planification du relief.

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

### Identité et relations

Chaque colon possède désormais une identité minimale (implémentée proto4.1) qui servira de socle aux systèmes sociaux futurs.

- **Nom + genre** à la naissance. Nom tiré dans un pool français (30+ prénoms masculins, 30+ prénoms féminins, mélange médiéval, classique, moderne). Unicité garantie dans la colonie, suffixe romain (II, III, etc.) si le pool est épuisé. Genre M ou F en 50/50 au spawn. Symboles typographiques ♂ (bleu) et ♀ (rose saumon) utilisés dans la bulle de dialogue, dans l'étiquette de survol et dans la liste HUD.
- **Structure `relationships`** déjà présente sur chaque colon (Map vide) prête à accueillir des entrées du type `{ colonistId, type, strength }`.
- **Types de relations prévus** : couple, famille (parent, enfant, fratrie), amitié, rivalité. Chaque relation porte une intensité évolutive (0 à 1) qui monte avec le temps passé ensemble, le travail partagé, les interactions réussies, et qui descend avec les conflits ou l'éloignement prolongé.
- **Influence prévue sur les bulles** : phrases qui citent d'autres colons ("J'ai vu Aldric aujourd'hui", "Clotilde est pénible en ce moment", "Maël me manque"), phrases de couple, disputes, déclarations. Le pool de phrases d'un colon s'enrichit selon ses relations actives.
- **Influence prévue sur le pathfind et le travail** : les colons amis ou en couple ont tendance à choisir un job proche d'un proche ou à converger vers la même zone de pause. Possibilité de dyades de travail (deux colons qui minent ensemble, plus efficaces mais moins flexibles).
- **Reproduction naturelle** : un couple stabilisé (intensité haute, temps écoulé, maison disponible) peut produire un enfant. La colonie croît sans bouton artificiel, uniquement par le tissu social. Cela remplace à terme le spawn fixe de 2 colons par maison posée.
- **Conflits et ruptures** : les rivalités dégradent la productivité quand les colons sont forcés de cohabiter, génèrent des bulles négatives, peuvent mener à un départ volontaire (colon qui quitte la carte) si trop prolongé.

## Quêtes et objectifs (inspiré FDA)

Le jeu propose au joueur une **progression via quêtes** qui structure les premières heures et balise la progression. Reprend l'esprit de FDA (quêtes d'âge, objectifs concrets, déblocages échelonnés).

### Mécanique
- Panneau de quêtes (colonne droite ou top HUD) avec quête active + progression (ex: "Récolter 5 baies", barre 3/5).
- Complétion déclenche récompense (ressource, déblocage d'outil, point de tech, cinématique courte).
- Plusieurs quêtes peuvent coexister (principale + secondaires).
- Quêtes d'âge (objectif majeur de l'âge courant) et quêtes flash (petites tâches opportunistes type "un colon a faim, nourris-le").

### Premiers exemples de quêtes
- **Récolter 5 baies** (tutoriel, âge de pierre démarrage). Nécessite des buissons de baies violettes à faire pousser naturellement sur la carte.
- **Abattre 3 arbres** pour collecter du bois.
- **Miner 10 blocs de pierre** avec la première pioche.
- **Construire une deuxième maison** pour accueillir plus de colons.
- **Atteindre l'âge du bronze** en collectant 5 de cuivre + 5 d'étain.
- **Former un couple** (quête sociale, les colons le font seuls quand les conditions sont réunies).

### Ressources récoltables initiales
- **Baies** (buissons violets, régénèrent lentement). Nourriture de base à l'âge de pierre.
- **Bois** (arbres abattus).
- **Pierre** (minage roche basique).
- **Fibres** (herbe cueillie). Pour corde, vêtements primitifs.
- Puis selon âge : minerais (cuivre, étain, fer, or), argile, charbon.

## Mort des colons (prévu pour plus tard, pas implémenté dans la v1)

Pour l'instant les colons ne meurent pas (v alpha). À terme, ils auront :
- **Besoins vitaux** : faim, soif, sommeil. Un colon négligé décline puis meurt.
- **Vieillesse** : mort naturelle après N années de jeu (rythme à calibrer pour que la colonie survive plusieurs générations en temps de jeu raisonnable).
- **Accidents** : chute, animal sauvage, éboulement en mine.
- **Maladies** (plus tard, avec saisons).
- Enterrement avec cimetière en voxel, tombe persistante, effet moral sur les autres colons selon les relations (deuil d'un proche déprime).

## Idées ouvertes à explorer plus tard

- **Catastrophes** : incendie de forêt, inondation, éboulement, maladie.
- **Miracles** limités (cadeaux du joueur, budget spirituel basé sur foi des colons, façon Black and White).
- **Saisons** qui affectent rendements agricoles et comportement colons.
- **Animaux sauvages** passifs (cerfs, sangliers) puis agressifs (loups) avec chasse.
- **Autres tribus / voisins** neutres ou hostiles (diplomatie, commerce, guerre, à voir selon ambition).
- **Conditions de fin** optionnelles (atteindre âge X, population Y, monument) ou sandbox pur avec scoring.

## Dialogues contextuels

Les bulles de dialogue des colons peuvent aller bien plus loin que de simples phrases aléatoires si elles réagissent au contexte précis du jeu.

### Déclencheurs événementiels

Chaque événement notable du jeu peut déclencher un pool de répliques ciblées :

- **Pluie** : répliques différentes selon le métier (le fermier est content, la bûcheronne agacée).
- **Récolte** : satisfaction ou commentaire sur l'abondance / la pénurie.
- **Changement de saison** : répliques d'ambiance ou d'anticipation.
- **Construction d'un bâtiment** : fierté, curiosité, scepticisme selon le colon.
- **Découverte d'un filon** : excitation, convoitise, prudence.
- **Faim** : plainte croissante jusqu'à ce que le joueur intervienne (lié à l'axe 3.4 besoins vitaux).

Le système existant `SPEECH_CONTEXT_FIELD_NO_RESEARCH` montre déjà le patron à étendre : un déclencheur, une condition, un pool de phrases, un cooldown.

### Filtres de répliques

Pour que chaque colon s'exprime de façon cohérente avec son identité, les pools de phrases peuvent être filtrés en cascade :

- **Par métier/rôle** : le fermier dit "Trop bien pour mes champs !" sous la pluie, la bûcheronne dit "Mon bois va être trempé.", le chercheur ne sort pas du labo.
- **Par genre** : certaines répliques réservées aux F ou M. Exemple : "Oh non, ma robe va être trempée." pour une colonne féminine sous la pluie. Même événement, ton différent.
- **Par nom** : comme le système `SPEECH_LINES_BY_NAME` déjà en place, des répliques propres à un colon particulier (ex : François le chef peut avoir des répliques de commandement).

### Priorité de sélection

Ordre de résolution pour trouver la réplique à afficher :
1. Ligne spécifique au nom du colon (priorité max).
2. Ligne filtrée par métier + genre.
3. Ligne filtrée par métier seul.
4. Ligne filtrée par genre seul.
5. Ligne générique de l'événement (fallback).

### Liens avec la roadmap

- Axe 3.2 (métiers) : les répliques de métier arrivent naturellement avec l'attribution des rôles.
- Axe 3.4 (besoins vitaux) : la faim, la fatigue et la soif sont des déclencheurs prioritaires, les répliques renforcent l'urgence sans tooltip.

## Fusion de bâtiments

### Principe (validé proto, commit `8ac021c`)

Quatre bâtiments identiques adjacents en carré 2x2 fusionnent automatiquement en un bâtiment de niveau supérieur. Le bâtiment résultant est plus grand visuellement, débloque plus de colons et de fonctions. La mécanique s'applique à terme à toutes les catégories de bâtiments.

- **Déclencheur** : détection automatique à la pose d'un nouveau bâtiment (scan des 4 voisins immédiats pour trouver un carré 2x2 complet de même type).
- **Résultat** : les 4 tuiles sont libérées, un bâtiment fusionné 2x2 prend leur place.
- **Récursif** : 4 manoirs adjacents fusionnent en un château, etc.
- **Colons** : lors d'une fusion, les colons précédemment liés au bâtiment restent et rejoignent le nouveau. Le nouveau bâtiment logera plus de monde.
- **Page de progression** : une interface dédiée (à concevoir) affiche les chaînes de fusion possibles par type, les bâtiments débloqués et ceux à venir. Style livre ou codex, accessible depuis le menu principal.

### Chaînes de fusion par type

#### Habitation (spawn et logement)
| Niveau | Nom | Taille | Colons max | Âge requis |
|---|---|---|---|---|
| 1 | Hutte | 1x1 | 1 | Pierre |
| 2 | Longhouse | 2x2 | 4 | Pierre (4 huttes) |
| 3 | Maison | 2x2 | 6 | Bronze (4 longhouses) |
| 4 | Manoir | 2x2 | 12 | Fer (4 maisons) |
| 5 | Château | 2x2 | 30 | Industriel (4 manoirs) |
| 6 | Palais | 2x2 | 80 | Atomique (4 châteaux) |

#### Recherche (production de points)
| Niveau | Nom | Taille | Pts/s | Âge requis |
|---|---|---|---|---|
| 1 | Hutte du sage | 1x1 | 0.33 | Pierre |
| 2 | Scriptorium | 2x2 | 1.5 | Bronze (4 huttes) |
| 3 | Bibliothèque | 2x2 | 4 | Fer (4 scriptoriums) |
| 4 | Université | 2x2 | 12 | Industriel (4 bibliothèques) |
| 5 | Institut | 2x2 | 40 | Atomique (4 universités) |

#### Production alimentaire
| Niveau | Nom | Taille | Âge requis |
|---|---|---|---|
| 1 | Buisson cultivé | 1x1 | Pierre |
| 2 | Potager | 2x2 | Pierre (4 buissons) |
| 3 | Champ de blé | 2x2 | Bronze (4 potagers) |
| 4 | Ferme | 2x2 | Fer (4 champs + moulin) |
| 5 | Exploitation agricole | 2x2 | Industriel (4 fermes) |

#### Transformation / industrie (bâtiments uniques, pas de fusion)
| Nom | Âge | Rôle |
|---|---|---|
| Forge | Bronze | Raffinage cuivre, bronze, alliages |
| Scierie | Bronze | Transformation bois en planches |
| Moulin | Fer | Transformation blé en farine |
| Four à pain | Fer | Transformation farine en pain |
| Fonderie | Industriel | Fonte fer, acier |
| Usine | Industriel | Production de masse |
| Réacteur | Atomique | Énergie, débloque automatismes |
| Silo | tout âge | Stockage ressources (quantité x4) |

#### Bâtiments spéciaux (monument d'âge, unique par partie)
| Nom | Âge | Rôle |
|---|---|---|
| Cairn de pierre | Pierre | Monument, débloque passage âge du bronze |
| Marché | Bronze | Commerce, spawn marchands ambulants |
| Cathédrale | Fer | Moral colons +20%, passage âge industriel |
| Gare | Industriel | Transport rapide colons entre zones |
| Tour de contrôle | Espace | Passage endgame, lancement fusée |

---

## Catalogue des métiers

Un colon peut exercer plusieurs métiers (RimWorld style), priorisés dans un panneau de gestion. Les métiers se débloquent via la tech tree ou sont disponibles dès le départ.

### Métiers disponibles dès l'âge de pierre
| Métier | Outil requis | Tâches |
|---|---|---|
| Cueilleur | Aucun | Récolte baies, plantes, fibres |
| Maçon | Aucun | Construction et déconstruction de bâtiments |
| Chercheur | Aucun | Assigné à une hutte du sage, génère des points |

### Débloqués par tech

| Métier | Tech requise | Tâches |
|---|---|---|
| Mineur | Pioche en pierre | Minage rocher, extraction filons |
| Bûcheron | Hache en pierre | Abattage arbres, collecte bois |
| Terrassier | Pelle (à venir) | Sculpt terrain, nivellement |
| Agriculteur | Houe (à venir) | Cultive champs, récolte blé |
| Forgeron | Forge (bronze) | Raffinage minerais, fabrication outils |
| Médecin | Herboristerie (bronze) | Soigne blessures, ralentit maladie |
| Chasseur | Arc en bois (fer) | Chasse cerfs, sangliers |
| Pêcheur | Canne (bronze) | Pêche poisson en bord d'eau |
| Marchand | Marché (bronze) | Gère les échanges avec marchands ambulants |
| Bricoleur | Tech bricolage (fer) | Construit escaliers voxel, accès verticalité |
| Garde | Palissade (fer) | Protège colonie contre animaux/événements |
| Ingénieur | Université (industriel) | Construit machines, automatismes |
| Pilote | Tour de contrôle (espace) | Pilote fusée, exploration orbitale |

### Règles de priorité
- Un colon exerce ses métiers dans l'ordre de priorité défini par le joueur (liste drag and drop).
- Si aucun job de son métier n'est disponible, il erre (IDLE) ou aide un autre colon.
- Un colon peut être assigné à un bâtiment fixe (chercheur, forgeron), auquel cas il ne part plus en tâche nomade sauf en mode "urgence".
- La compétence s'améliore avec l'expérience : un mineur chevronné (100 blocs minés) est 20% plus rapide.

---

## Statut

Phase : éditeur consolidé (voir [strates-changelog.md](strates-changelog.md) pour l'historique détaillé).

Un seul proto actif : `public/strates/editor/` qui fusionne tous les anciens protos. Sert à la fois de mapmaker et de banc de test gameplay. Les anciens protos numérotés (1 à 5) ont été supprimés.
