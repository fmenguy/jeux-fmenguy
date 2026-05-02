// fog.js - fog of war gere par couleur dans repaintCellSurface
// Les cellules non revelees sont peintes en noir directement sur l'instanced mesh.
// Pas de geometrie 3D, pas de InstancedMesh supplementaire.

export function buildFog() {}
export function tickFog(_dt) {}
export function clearFog() {}
export function revealAll() {}
export function isVisible(_x, _z) { return true }
export function wasExplored(_x, _z) { return true }
