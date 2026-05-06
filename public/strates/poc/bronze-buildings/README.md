# POC bronze-buildings

Page Three.js standalone qui compare visuellement les options de bâtiments pour l'âge 2 (bronze).

## Objectif

Choisir les visuels définitifs pour les 5 bâtiments suivants en confrontant l'existant à 3 variantes.

## Ouvrir

Lancer un serveur statique depuis la racine du repo, par exemple :

```
npx http-server . -p 8080
```

Puis ouvrir l'URL :

```
http://localhost:8080/public/strates/poc/bronze-buildings/index.html
```

Note, ouvrir directement le fichier en `file://` ne marchera pas à cause de l'importmap CDN et du chargement GLB.

## Layout

Grille 5 lignes x 4 colonnes. Colonne 1 = visuel actuel, colonnes 2 à 4 = 3 variantes.

| Bâtiment       | V0 actuel       | V1                  | V2                | V3                       |
|----------------|-----------------|---------------------|-------------------|--------------------------|
| Cabane         | voxel actuel    | Hut.glb             | voxel pisé        | voxel bois               |
| Hutte du sage  | voxel actuel    | Wodden Temple.glb   | voxel torches     | Temple First Age Leve.glb |
| Promontoire    | voxel actuel    | Watch Tower.glb     | Stone Tower.glb   | voxel observatoire       |
| Grenier        | placeholder     | Storage Hut.glb     | voxel pilotis     | voxel silo               |
| Forge          | placeholder     | voxel primitive     | voxel tente       | Mine.glb détourné        |

## Toggle jour/nuit

Bouton en haut à droite. En nuit, l'ambient et le soleil chutent, les foyers et torches montent. Ça permet de juger l'ambiance de la forge et de la hutte du sage à torches.

## Contrôles

Clic glisser pour pivoter, molette pour zoomer. Une caméra par cellule.
