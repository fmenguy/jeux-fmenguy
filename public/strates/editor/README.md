# Strates, editeur de carte

Editeur complet qui fusionne proto3 (visuel Dorfromantik, Sky, bloom, vignette, eau ShaderMaterial, maisons voxel), proto4 (colons InstancedMesh avec machine a etats, pathfind A*, gravite, errance, bulles de dialogue, designer Miner) et proto5 (barre de placement direct, filons cyclables, pinceau).

## Outils (barre du bas)

- Groupe Colons (orange) : Naviguer, Designer Miner, Annuler job.
- Groupe Editeur (bleu) : Arbre, Foret, Rocher, Filon (6 types cyclables : or, cuivre, argent, fer, charbon, amethyste), Maison, Champ, Effacer.
- Controles : pinceau 1 / 3 / 5, bouton Ajouter colon, bouton Reset.

## Raccourcis clavier

- 1 Naviguer, 2 Designer Miner, 3 Annuler job.
- 4 Arbre, 5 Foret, 6 Rocher, 7 Filon, 8 Maison, 9 Champ.
- R regenere la carte, C ajoute un colon.
- Shift + molette quand Filon est actif : cycle du type de filon.
- Reclic sur Filon alors qu'il est deja actif : cycle aussi.

## Note de conception

Cet editeur sert a construire des cartes et a tester la boucle colons qui executent des ordres. Le jeu final n'aura PAS les outils de placement direct (arbre, maison, champ, filon, etc.), le joueur donnera uniquement des ordres aux colons.
