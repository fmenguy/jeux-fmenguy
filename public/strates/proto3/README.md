# Strates, proto 3, beauty shot

Objectif : un premier screenshot qui claque, direction Dorfromantik.

En place :
- terrain voxel 48x48, 6 strates, Perlin FBM maison, colline centrale, vallée, côte, montagne à l'est.
- 4 biomes (herbe, forêt dense, sable côtier, roche avec sommets neigeux).
- eau ShaderMaterial avec houle sinus et reflets, teintes bleu-vert.
- éclairage Sky shader, soleil chaud avec ombres PCFSoft, hemisphere fill, fog.
- post-process EffectComposer, bloom subtil, vignette chaude.
- arbres, maisons toits rouges, chemin de terre procéduraux.
- OrbitControls avec auto-rotate lent.

Manque : micro détails (rivières, ponts, champs patchwork, bords de tuiles), HDRI pour les highlights sur l'eau, instancing pour les arbres, palette d'automne variante.
