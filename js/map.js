import { villagesData, wells, mines, workshops, herbalists, wheatFields, mills, bakeries, sawmills, stoneQuarries, warehouses, discoveredFibers, discoveredMetals, discoveredHerbs, villageFounded } from './game.js';

// Configuration de la carte
const canvas = document.getElementById('gameMap');
const ctx = canvas.getContext('2d');

// Paramètres de la grille
const mapWidth = 25; // Largeur de la grille (25 cases)
const mapHeight = 18; // Hauteur de la grille (18 cases)
const villageSize = 5; // Taille d'un village en cases (5x5)
let tileSize = 24; // Taille de base d'une case en pixels (ajustée dynamiquement)

// Ajuster la taille du canvas et des cases pour la compatibilité mobile
function resizeCanvas() {
  const maxWidth = Math.min(window.innerWidth * 0.9, 600); // 90% de la largeur de l'écran, max 600px
  const maxHeight = maxWidth * (mapHeight / mapWidth); // Maintenir le ratio
  tileSize = Math.floor(maxWidth / mapWidth); // Ajuster tileSize
  canvas.width = tileSize * mapWidth;
  canvas.height = tileSize * mapHeight;
}

// Appeler resizeCanvas au chargement et lors du redimensionnement
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Couleurs pour les éléments
const colors = {
  ground: '#d2b48c', // Couleur du sol (beige clair pour mieux contraster)
  village: '#2f231a', // Couleur du village
  well: '#1e90ff', // Bleu pour les puits
  mine: '#696969', // Gris pour les mines
  workshop: '#8b4513', // Marron pour les ateliers
  herbalist: '#228b22', // Vert pour les herboristeries
  wheatField: '#f4a460', // Sable pour les champs de blé
  mill: '#cd853f', // Brun clair pour les moulins
  bakery: '#deb887', // Beige pour les boulangeries
  sawmill: '#a0522d', // Marron foncé pour les scieries
  stoneQuarry: '#808080', // Gris clair pour les carrières
  warehouse: '#4682b4', // Bleu acier pour les entrepôts
  villager: '#d4a017', // Or pour les villageois
  fog: '#000000', // Brouillard de guerre (noir complet pour un contraste plus fort)
};

// Fonction pour obtenir les types de bâtiments avec leurs comptes actuels
function getBuildingTypes() {
  return [
    { type: 'well', count: wells, color: colors.well },
    { type: 'mine', count: mines, color: colors.mine },
    { type: 'workshop', count: workshops, color: colors.workshop },
    { type: 'herbalist', count: herbalists, color: colors.herbalist },
    { type: 'wheatField', count: wheatFields, color: colors.wheatField },
    { type: 'mill', count: mills, color: colors.mill },
    { type: 'bakery', count: bakeries, color: colors.bakery },
    { type: 'sawmill', count: sawmills, color: colors.sawmill },
    { type: 'stoneQuarry', count: stoneQuarries, color: colors.stoneQuarry },
    { type: 'warehouse', count: warehouses, color: colors.warehouse },
  ];
}

// Gestion du brouillard de guerre
const fogOfWar = Array(mapHeight).fill().map(() => Array(mapWidth).fill(true)); // Tout est caché par défaut

// Révéler les zones en fonction des ressources découvertes et des villages
function updateFogOfWar() {
  // Réinitialiser le brouillard
  for (let y = 0; y < mapHeight; y++) {
    for (let x = 0; x < mapWidth; x++) {
      fogOfWar[y][x] = true;
    }
  }

  // Révéler les zones des villages
  villagesData.forEach((village, index) => {
    if (villageFounded) {
      const villageX = 2 + (index % 5) * (villageSize + 1);
      const villageY = 2 + Math.floor(index / 5) * (villageSize + 1);
      for (let y = villageY; y < villageY + villageSize; y++) {
        for (let x = villageX; x < villageX + villageSize; x++) {
          if (y < mapHeight && x < mapWidth) {
            fogOfWar[y][x] = false;
          }
        }
      }
    }
  });

  // Révéler des zones spécifiques pour les ressources découvertes
  if (discoveredFibers) {
    // Révéler une zone pour les fibres (par exemple, en haut à gauche)
    for (let y = 0; y < 3; y++) {
      for (let x = 0; x < 3; x++) {
        fogOfWar[y][x] = false;
      }
    }
  }
  if (discoveredMetals) {
    // Révéler une zone pour les métaux (par exemple, en haut à droite)
    for (let y = 0; y < 3; y++) {
      for (let x = mapWidth - 3; x < mapWidth; x++) {
        fogOfWar[y][x] = false;
      }
    }
  }
  if (discoveredHerbs) {
    // Révéler une zone pour les herbes (par exemple, en bas à gauche)
    for (let y = mapHeight - 3; y < mapHeight; y++) {
      for (let x = 0; x < 3; x++) {
        fogOfWar[y][x] = false;
      }
    }
  }
}

// Fonction pour dessiner la carte
export function drawMap() {
  // Mettre à jour le brouillard de guerre
  updateFogOfWar();

  // Effacer le canvas
  ctx.fillStyle = colors.ground;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Obtenir les types de bâtiments au moment du rendu
  const buildingTypes = getBuildingTypes();

  // Dessiner les villages
  villagesData.forEach((village, index) => {
    const villageX = 2 + (index % 5) * (villageSize + 1); // Position X du village
    const villageY = 2 + Math.floor(index / 5) * (villageSize + 1); // Position Y du village

    // Dessiner le fond du village
    ctx.fillStyle = colors.village;
    ctx.fillRect(villageX * tileSize, villageY * tileSize, villageSize * tileSize, villageSize * tileSize);

    // Dessiner les bâtiments
    village.buildings.forEach((building, bIndex) => {
      const buildingInfo = buildingTypes.find(b => b.type === building);
      if (buildingInfo) {
        const bx = villageX + (bIndex % villageSize);
        const by = villageY + Math.floor(bIndex / villageSize);
        ctx.fillStyle = buildingInfo.color;
        ctx.fillRect(bx * tileSize, by * tileSize, tileSize, tileSize);
      }
    });

    // Dessiner la population
    const totalPopulation = Object.values(village.population).reduce((sum, count) => sum + count, 0);
    for (let i = 0; i < Math.min(totalPopulation, villageSize * villageSize); i++) {
      const px = villageX + (i % villageSize);
      const py = villageY + Math.floor(i / villageSize);
      // Éviter de dessiner les villageois sur les bâtiments
      if (!village.buildings.some(b => {
        const bIndex = village.buildings.indexOf(b);
        return (bIndex % villageSize) === (i % villageSize) && Math.floor(bIndex / villageSize) === Math.floor(i / villageSize);
      })) {
        ctx.fillStyle = colors.villager;
        ctx.beginPath();
        ctx.arc((px + 0.5) * tileSize, (py + 0.5) * tileSize, tileSize / 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  });

  // Dessiner le brouillard de guerre
  for (let y = 0; y < mapHeight; y++) {
    for (let x = 0; x < mapWidth; x++) {
      if (fogOfWar[y][x]) {
        ctx.fillStyle = colors.fog;
        ctx.fillRect(x * tileSize, y * tileSize, tileSize, tileSize);
      }
    }
  }

  // Dessiner la grille
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1;
  for (let x = 0; x <= mapWidth; x++) {
    ctx.beginPath();
    ctx.moveTo(x * tileSize, 0);
    ctx.lineTo(x * tileSize, canvas.height);
    ctx.stroke();
  }
  for (let y = 0; y <= mapHeight; y++) {
    ctx.beginPath();
    ctx.moveTo(0, y * tileSize);
    ctx.lineTo(canvas.width, y * tileSize);
    ctx.stroke();
  }
}

// Initialiser la carte
export function initMap() {
  drawMap();
}