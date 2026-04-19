# Strates, proto 4, designer et observer

## Ambition

Premiere preuve de concept du gameplay colony sim. Le joueur ne mine pas
directement, il **designe** des colonnes a miner. Cinq colons autonomes
prennent les jobs un par un, vont sur place via A star, et minent.

C'est la boucle minimale : designer, colons reagissent, monde change.

## Controles

- Outil **Naviguer** (defaut) : clic gauche orbite, clic droit pan, molette zoom.
- Outil **Designer Miner** : clic gauche (drag) peint en rouge les colonnes
  a miner. Un marker rouge billboard apparait au-dessus.
- Outil **Annuler** : retire la designation et libere le colon eventuel.
- Pinceau **1**, **3** (croix), **5** (disque rayon 2).

## Ce qui est prouve

- Pipeline visuel proto3 conserve (Perlin FBM, biomes, Sky, ACES, bloom, vignette).
- Designation persistante via Map de jobs, marker billboard et tinte rouge sur le voxel top.
- Pathfinding A star Manhattan, 4 directions, infranchissable si difference
  d'altitude > 2 ou si dans l'eau.
- 5 colons distincts (couleur differente) avec etats IDLE, MOVING, WORKING.
- Lock par colon pour eviter qu'ils convoitent le meme job.
- Re-pathfind implicite : a chaque IDLE, le colon re-cherche le job le plus
  proche, donc un voxel mine peut ouvrir un chemin pour le suivant.
- Feedback : flash blanc 300ms sur le voxel sous-jacent revele, ligne
  pointillee colorisee montrant le chemin restant.
- HUD live : FPS, jobs en attente, colons par etat.

## Ce qui manque (suite probable)

- Diagonales dans A star, et lissage du chemin (les angles sont durs).
- Animation outil pioche (la, juste un bounce vertical pendant 2 sec).
- File de jobs prioritaires, repartition plus maline (assignment Hongrois ou
  cout tourne par colon).
- Notion de ressource collectee (pierre, terre) et inventaire.
- Autres designations : abattre arbre, construire, deposer.
- Pathfinding base sur volumes 3D (la, on ignore les surplombs).
- Persistance des markers en cas de re-mesh, et culling visuel.

## Notes techniques

- Voxels en InstancedMesh, on cache un voxel mine via une matrice nulle
  (scale 0). Pas de rebuild de geometrie, instantane.
- A star naif (extraction min lineaire), suffisant pour 48x48.
- Pinceau pinceau via raycaster sur l'instanced mesh, normale de face pour
  retomber dans la bonne colonne.
