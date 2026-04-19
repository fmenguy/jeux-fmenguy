# Strates, Proto 1

Stress-test voxel pour le god-game "Strates", rendu aligne sur proto3 (Perlin FBM, biomes par altitude, Sky shader, soleil chaud avec ombres PCFSoft, fog exponentiel, post-process bloom et vignette, ACES tonemapping). Conserve le decoupage en chunks 16x16 avec face culling et le HUD FPS, triangles, draw calls, chunks. Boutons 64, 128, 256 pour faire chuter le FPS a la demande. Three.js r161 via importmap unpkg. Ouvrir `index.html` via le serveur statique du repo.
