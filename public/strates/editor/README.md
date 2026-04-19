# Strates, editeur de carte http://localhost:4321/strates/editor/index.html

Editeur complet qui fusionne proto3 (visuel Dorfromantik, Sky, bloom, vignette, eau ShaderMaterial, maisons voxel), proto4 (colons InstancedMesh avec machine a etats, pathfind A*, gravite, errance, bulles de dialogue, designer Miner) et proto5 (barre de placement direct, filons cyclables, pinceau).

## Outils (barre du bas)

- Groupe Colons (orange) : Naviguer, Designer Miner, Annuler job.
- Groupe Editeur (bleu) : Arbre, Foret, Rocher, Filon (6 types cyclables : or, cuivre, argent, fer, charbon, amethyste), Maison, Champ, Effacer.
- Controles : pinceau 1 / 3 / 5, bouton Reset.

Poser une Maison (outil Maison) fait automatiquement apparaitre 2 colons sur des tiles adjacentes valides (non eau, non occupees). Le hameau initial genere 3 maisons et 5 colons au demarrage. L'outil Effacer retire la maison mais laisse les colons en place.

## Raccourcis clavier

- 1 Naviguer, 2 Designer Miner, 3 Annuler job.
- 4 Arbre, 5 Foret, 6 Rocher, 7 Filon, 8 Maison, 9 Champ.
- R regenere la carte.
- Shift + molette quand Filon est actif : cycle du type de filon.
- Reclic sur Filon alors qu'il est deja actif : cycle aussi.

## Deplacement camera

- ZQSD (AZERTY) ou WASD (QWERTY) pour deplacer la cible de la camera sur le plan horizontal. Z / W avance, S recule, Q / A pan gauche, D pan droite. Vitesse proportionnelle a la distance de zoom. Les touches peuvent etre maintenues.
- Clic droit glisse : pan libre (OrbitControls).
- Clic gauche glisse en mode Naviguer : rotation orbitale.
- Molette : zoom.

## Restrictions de placement par biome

- Champ et Buisson de baies : uniquement sur herbe (grass) et foret (forest).
- Filons (or, cuivre, argent, fer, charbon, amethyste) : uniquement sur roche et neige (blocs de montagne).
- Les autres outils (Arbre, Foret, Rocher, Maison, Miner, Effacer) n'ont pas de restriction.
- Le curseur filaire qui suit la souris devient rouge quand l'outil actif est refuse sur la tile survolee. Pour les outils au pinceau, les tiles invalides sont ignorees silencieusement.

## Note de conception

Cet editeur sert a construire des cartes et a tester la boucle colons qui executent des ordres. Le jeu final n'aura PAS les outils de placement direct (arbre, maison, champ, filon, etc.), le joueur donnera uniquement des ordres aux colons.
