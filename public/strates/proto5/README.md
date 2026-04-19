# Strates, proto 5, barre de placement

Test d'une barre d'action style colony sim (Banished, Cities Skylines) pour
peupler un terrain vierge en mode worldbuilder.

Outils : Naviguer, Arbre, Foret (zone), Rocher, Filon (zone), Maison, Champ
(zone), Effacer (zone). Pinceau de rayon 1, 3 ou 5 pour les outils zone.

L'outil Filon propose 6 types de minerai. Chaque type est represente par un
petit rocher voxel colore pose sur la tuile, surmonte de 2 a 4 petits
cristaux. Types disponibles : or, cuivre, argent, fer, charbon, amethyste.
Pour cycler entre les types, recliquer sur le bouton Filon (ou touche 5)
quand l'outil est deja actif. La molette avec Shift cycle aussi les types.

Controles : clic gauche selon outil (rotation en mode Naviguer, placement
sinon), clic droit pour panner, molette pour zoomer. Raccourcis 1 a 8 pour
changer d'outil, plus et moins pour le pinceau.

Pipeline visuel repris du proto 3 (Perlin FBM, biomes, Sky, bloom, vignette).
Arbres, rochers, rochers de filon et cristaux en InstancedMesh (un seul
InstancedMesh par forme avec couleurs par instance pour distinguer les 6
types de minerai), maisons en Group, champs par recoloration des voxels de
surface.
