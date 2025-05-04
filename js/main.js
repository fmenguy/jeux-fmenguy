import { initGame, gameLoop, gatherBerries, gatherWood, gatherStone, gatherWater, gatherMeat, gatherFibers, gatherMetals, craftAxe, craftBucket, craftPickaxe, craftBow, craftCoat, craftMetalAxe, craftRemedy, craftWell, craftMine, craftWorkshop, craftHerbalist, craftWheatField, craftMill, craftBakery, craftSawmill, craftStoneQuarry, craftWarehouse, recruitVillager, appointChief, recruitTinker, recruitPicker, recruitHunter, recruitResearcher, sendExplorers, recruitMiner, recruitFarmer, foundVillage, seekShard, dynamicHints, purchasedHints, setCurrentHint, setIsMusicPlaying } from './game.js';
import { updateDisplay, updateResourcesDisplay, updateSeasonDisplay, updateExplorationDisplay, showAlert, hideAlert, enableDragAndDrop, applyCraftOrder, buyHint, toggleHints, enhancedUpdateDisplay } from './ui.js';
import { saveGame, loadGame, exportSave, importSavePrompt } from './save.js';
import { initMap } from './map.js';

// Exporter les fonctions globales pour les événements onclick
window.gatherBerries = () => {
  gatherBerries();
  enhancedUpdateDisplay();
};

window.gatherWood = () => {
  gatherWood();
  enhancedUpdateDisplay();
};

window.gatherStone = () => {
  gatherStone();
  enhancedUpdateDisplay();
};

window.gatherWater = () => {
  gatherWater();
  enhancedUpdateDisplay();
};

window.gatherMeat = () => {
  gatherMeat();
  enhancedUpdateDisplay();
};

window.gatherFibers = () => {
  gatherFibers();
  enhancedUpdateDisplay();
};

window.gatherMetals = () => {
  gatherMetals();
  enhancedUpdateDisplay();
};

window.craftAxe = () => {
  const result = craftAxe();
  if (result && result.error) {
    showAlert(result.error);
  }
  enhancedUpdateDisplay();
};

window.craftBucket = () => {
  const result = craftBucket();
  if (result && result.error) {
    showAlert(result.error);
  }
  enhancedUpdateDisplay();
};

window.craftPickaxe = () => {
  const result = craftPickaxe();
  if (result && result.error) {
    showAlert(result.error);
  }
  enhancedUpdateDisplay();
};

window.craftBow = () => {
  const result = craftBow();
  if (result && result.error) {
    showAlert(result.error);
  }
  enhancedUpdateDisplay();
};

window.craftCoat = () => {
  const result = craftCoat();
  if (result && result.error) {
    showAlert(result.error);
  }
  enhancedUpdateDisplay();
};

window.craftMetalAxe = () => {
  const result = craftMetalAxe();
  if (result && result.error) {
    showAlert(result.error);
  }
  enhancedUpdateDisplay();
};

window.craftRemedy = () => {
  const result = craftRemedy();
  if (result && result.error) {
    showAlert(result.error);
  }
  enhancedUpdateDisplay();
};

window.craftWell = () => {
  const result = craftWell();
  if (result && result.error) {
    showAlert(result.error);
  }
  enhancedUpdateDisplay();
};

window.craftMine = () => {
  const result = craftMine();
  if (result && result.error) {
    showAlert(result.error);
  }
  enhancedUpdateDisplay();
};

window.craftWorkshop = () => {
  const result = craftWorkshop();
  if (result && result.error) {
    showAlert(result.error);
  }
  enhancedUpdateDisplay();
};

window.craftHerbalist = () => {
  const result = craftHerbalist();
  if (result && result.error) {
    showAlert(result.error);
  }
  enhancedUpdateDisplay();
};

window.craftWheatField = () => {
  const result = craftWheatField();
  if (result && result.error) {
    showAlert(result.error);
  }
  enhancedUpdateDisplay();
};

window.craftMill = () => {
  const result = craftMill();
  if (result && result.error) {
    showAlert(result.error);
  }
  enhancedUpdateDisplay();
};

window.craftBakery = () => {
  const result = craftBakery();
  if (result && result.error) {
    showAlert(result.error);
  }
  enhancedUpdateDisplay();
};

window.craftSawmill = () => {
  const result = craftSawmill();
  if (result && result.error) {
    showAlert(result.error);
  }
  enhancedUpdateDisplay();
};

window.craftStoneQuarry = () => {
  const result = craftStoneQuarry();
  if (result && result.error) {
    showAlert(result.error);
  }
  enhancedUpdateDisplay();
};

window.craftWarehouse = () => {
  const result = craftWarehouse();
  if (result && result.error) {
    showAlert(result.error);
  }
  enhancedUpdateDisplay();
};

window.recruitVillager = () => {
  const result = recruitVillager();
  if (result && result.error) {
    showAlert(result.error);
  }
  enhancedUpdateDisplay();
};

window.appointChief = () => {
  const result = appointChief();
  if (result && result.error) {
    showAlert(result.error);
  }
  enhancedUpdateDisplay();
};

window.recruitTinker = () => {
  const result = recruitTinker();
  if (result && result.error) {
    showAlert(result.error);
  }
  enhancedUpdateDisplay();
  updateSeasonDisplay();
};

window.recruitPicker = () => {
  const result = recruitPicker();
  if (result && result.error) {
    showAlert(result.error);
  }
  enhancedUpdateDisplay();
};

window.recruitHunter = () => {
  const result = recruitHunter();
  if (result && result.error) {
    showAlert(result.error);
  }
  enhancedUpdateDisplay();
};

window.recruitResearcher = () => {
  const result = recruitResearcher();
  if (result && result.error) {
    showAlert(result.error);
  }
  enhancedUpdateDisplay();
};

window.sendExplorers = () => {
  const result = sendExplorers();
  if (result && result.error) {
    showAlert(result.error);
  }
  enhancedUpdateDisplay();
};

window.recruitMiner = () => {
  const result = recruitMiner();
  if (result && result.error) {
    showAlert(result.error);
  }
  enhancedUpdateDisplay();
};

window.recruitFarmer = () => {
  const result = recruitFarmer();
  if (result && result.error) {
    showAlert(result.error);
  }
  enhancedUpdateDisplay();
};

window.foundVillage = () => {
  const result = foundVillage();
  if (result && result.error) {
    showAlert(result.error);
  }
  enhancedUpdateDisplay();
  updateSeasonDisplay();
};

window.seekShard = () => {
  const result = seekShard();
  if (result && result.error) {
    showAlert(result.error);
  }
  enhancedUpdateDisplay();
};

window.saveGame = saveGame;
window.loadGame = loadGame;
window.exportSave = exportSave;
window.importSavePrompt = importSavePrompt;

window.buyHint = () => {
  buyHint();
  enhancedUpdateDisplay();
};

window.toggleHints = toggleHints;

// Définir les fonctions pour le contrôle audio
window.playMusic = () => {
  const music = document.getElementById("backgroundMusic");
  if (music) {
    music.play().then(() => {
      console.log("Musique démarrée");
      setIsMusicPlaying(true);
    }).catch((error) => {
      console.error("Erreur lors de la lecture de la musique :", error);
    });
  }
};

window.pauseMusic = () => {
  const music = document.getElementById("backgroundMusic");
  if (music) {
    music.pause();
    console.log("Musique en pause");
    setIsMusicPlaying(false);
  }
};

window.toggleSidebar = () => {
  const sidebarContent = document.getElementById("audioSidebarContent");
  if (sidebarContent) {
    sidebarContent.classList.toggle("open");
  }
};

// Fonction pour initialiser les écouteurs d'événements
function initializeEventListeners() {
  const toggleSidebarBtn = document.getElementById("toggleSidebarBtn");
  const playBtn = document.getElementById("playMusicBtn");
  const pauseBtn = document.getElementById("pauseMusicBtn");
  const volumeSlider = document.getElementById("volumeSlider");
  const volumePercentage = document.getElementById("volumePercentage");
  const music = document.getElementById("backgroundMusic");
  const saveGameBtn = document.getElementById("saveGameBtn");
  const loadGameBtn = document.getElementById("loadGameBtn");
  const exportSaveBtn = document.getElementById("exportSaveBtn");
  const importSaveBtn = document.getElementById("importSaveBtn");

  if (music) {
    music.volume = 0.5;
    console.log("Audio initialisé, volume défini à 0.5");
  } else {
    console.error("Élément backgroundMusic non trouvé lors de l'initialisation");
  }

  if (toggleSidebarBtn) {
    toggleSidebarBtn.addEventListener("click", () => {
      console.log("Bouton toggleSidebar cliqué");
      window.toggleSidebar();
    });
  } else {
    console.error("Élément toggleSidebarBtn non trouvé");
  }

  if (playBtn) {
    playBtn.addEventListener("click", () => {
      console.log("Bouton Play cliqué");
      window.playMusic();
    });
  } else {
    console.error("Élément playMusicBtn non trouvé");
  }

  if (pauseBtn) {
    pauseBtn.addEventListener("click", () => {
      console.log("Bouton Pause cliqué");
      window.pauseMusic();
    });
  } else {
    console.error("Élément pauseMusicBtn non trouvé");
  }

  if (volumeSlider && volumePercentage) {
    volumePercentage.textContent = `${Math.round(volumeSlider.value)}%`;
    volumeSlider.addEventListener("input", (e) => {
      if (music) {
        const volumeValue = e.target.value / 100;
        music.volume = volumeValue;
        volumePercentage.textContent = `${e.target.value}%`;
        console.log("Volume ajusté à :", volumeValue);
      } else {
        console.error("Élément backgroundMusic non trouvé pour ajuster le volume");
      }
    });
  } else {
    console.error("Élément volumeSlider ou volumePercentage non trouvé");
  }

  // Initialisation des boutons de sauvegarde
  if (saveGameBtn) {
    saveGameBtn.addEventListener("click", () => {
      console.log("Bouton Sauvegarder cliqué");
      window.saveGame(0);
    });
  } else {
    console.error("Élément saveGameBtn non trouvé");
  }

  if (loadGameBtn) {
    loadGameBtn.addEventListener("click", () => {
      console.log("Bouton Charger cliqué");
      window.loadGame(0);
    });
  } else {
    console.error("Élément loadGameBtn non trouvé");
  }

  if (exportSaveBtn) {
    exportSaveBtn.addEventListener("click", () => {
      console.log("Bouton Exporter cliqué");
      window.exportSave(0);
    });
  } else {
    console.error("Élément exportSaveBtn non trouvé");
  }

  if (importSaveBtn) {
    importSaveBtn.addEventListener("click", () => {
      console.log("Bouton Importer cliqué");
      window.importSavePrompt();
    });
  } else {
    console.error("Élément importSaveBtn non trouvé");
  }
}

// Initialisation du jeu après le chargement du DOM
document.addEventListener('DOMContentLoaded', () => {
  initGame();
  initMap();
  enhancedUpdateDisplay();
  updateSeasonDisplay();
  enableDragAndDrop();
  applyCraftOrder();
  initializeEventListeners();

  // Initialisation de currentHint
  const availableHint = dynamicHints.find(
    (hint) => hint.condition() && !purchasedHints.includes(hint.id)
  );
  if (availableHint) {
    setCurrentHint(availableHint);
  }

  // Réappliquer les écouteurs lorsque l'onglet Jeu est activé
  document.querySelectorAll('.tab-button').forEach(button => {
    button.addEventListener('click', () => {
      if (button.dataset.tab === 'gameTab') {
        setTimeout(() => {
          enhancedUpdateDisplay();
          enableDragAndDrop();
          applyCraftOrder();
          initializeEventListeners();
        }, 0);
      }
    });
  });
});

// Boucle de jeu
setInterval(() => {
  const result = gameLoop();
  if (result && result.alert) {
    showAlert(result.alert);
  } else if (result && result.hideAlert) {
    hideAlert();
  }
  updateResourcesDisplay();
  if (result && (result.ageChanged || result.seasonChanged)) {
    enhancedUpdateDisplay();
    updateSeasonDisplay();
  }
  updateExplorationDisplay();
}, 1000);