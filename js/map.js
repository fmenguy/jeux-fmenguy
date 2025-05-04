import { villagesData, wells, mines, workshops, herbalists, wheatFields, mills, bakeries, sawmills, stoneQuarries, warehouses } from './game.js';

   // Configuration de la carte
   const canvas = document.getElementById('gameMap');
   const ctx = canvas.getContext('2d');
   const tileSize = 32; // Taille d'une case en pixels
   const mapWidth = 25; // Largeur de la grille (25 cases)
   const mapHeight = 18; // Hauteur de la grille (18 cases)
   const villageSize = 5; // Taille d'un village en cases (5x5)

   // Couleurs pour les éléments
   const colors = {
     ground: '#4a3f2e', // Couleur du sol
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
   };

   // Représentation des bâtiments
   const buildingTypes = [
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

   // Fonction pour dessiner la carte
   export function drawMap() {
     // Effacer le canvas
     ctx.fillStyle = colors.ground;
     ctx.fillRect(0, 0, canvas.width, canvas.height);

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

   // Mettre à jour la carte à chaque changement
   export function initMap() {
     drawMap();
     // Mettre à jour la carte à chaque tick du jeu
     setInterval(() => {
       drawMap();
     }, 1000);
   }