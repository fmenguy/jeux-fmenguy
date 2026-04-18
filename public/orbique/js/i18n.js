// ============================================================
// I18N - Translations & keyboard layouts
// ============================================================

const LANG = {
    current: 'fr',
    layout: 'azerty' // 'azerty' or 'qwerty'
};

// Keyboard mappings per layout
const KEYS = {
    azerty: { forward: 'z', backward: 's', left: 'q', right: 'd' },
    qwerty: { forward: 'w', backward: 's', left: 'a', right: 'd' }
};

// Combo keys per layout (display & input)
const COMBO_KEYS = {
    azerty: ['Z', 'Q', 'S', 'D'],
    qwerty: ['W', 'A', 'S', 'D']
};

const TEXTS = {
    fr: {
        subtitle: "Rien n'est ce qu'il semble être",
        easy: 'FACILE',
        beginner: 'DÉBUTANT',
        simple: 'SIMPLE',
        plans: 'Plans',
        keys: 'Clefs',
        orbs: 'Orbes',
        zone: 'Zone',
        inverted: 'INVERSÉ',
        orbWhiteI: '○ Orbe Blanche I',
        orbWhiteII: '○ Orbe Blanche II',
        orbBlackI: '● Orbe Noire I',
        orbBlackII: '● Orbe Noire II',
        unlockTitle: 'MODE DÉVERROUILLAGE',
        unlockHint: 'Entrez la combinaison',
        unlockEsc: 'ESC pour quitter',
        closeMap: 'Appuyez M pour fermer',
        diffStart: difficulty => `Difficulté: ${difficulty.toUpperCase()} — Trouvez les 4 Orbes`,
        doorRoom: 'Salle des Portes',
        infiniteCorridor: 'Couloir Infini',
        labyrinth: 'Le Labyrinthe',
        welcome: "Bienvenue dans Orbique. Rien n'est logique.",
        backToHub: 'Retour au Hub',
        back: 'Retour',
        door: n => `Porte ${n}`,
        doorUnlocked: n => `Porte ${n} déverrouillée !`,
        doorLocked: 'Verrouillé — Il vous faut une clef',
        room: n => `Salle ${n}`,
        chestOpened: 'Coffre (ouvert)',
        chestLocked: 'Coffre — Appuyez U pour déverrouiller',
        chestAlready: 'Déjà ouvert',
        chestPrompt: 'Appuyez U pour le mode déverrouillage',
        hint: letter => `Indice: "${letter}"`,
        hintNumbered: (num, letter) => `Indice #${num} : "${letter}"`,
        plan: (n, total) => `Plan ${n}/${total}`,
        planCollected: (n, total) => `Plan ${n}/${total} récupéré !`,
        allPlans: 'Tous les plans ! Le labyrinthe est accessible !',
        keyFor: n => `Clef de la porte ${n}`,
        keyCollected: label => `${label} récupérée !`,
        corridorSign: 'Avancez... ou reculez. Le monde change.',
        corridorBack: "Le chemin en arrière n'est jamais le même...",
        secretPassage: "Un passage qui n'était pas là avant...",
        colorsRevealed: 'Des couleurs s\'illuminent au fond du hub...',
        colorPortal: 'Passage coloré',
        nothingRevealed: 'Rien n\'apparaît... explore d\'abord les salles d\'énigmes',
        ceilingSign: "Le sol n'est pas toujours en bas...",
        buttonRoom: 'Salle des Boutons',
        absurdRoomIntro: 'Bienvenue. Aucun bouton ne ment. (Sauf un. Ou plusieurs.)',
        btnPressMe: 'APPUYE-MOI',
        btnDontPress: "SURTOUT N'APPUIE PAS",
        btnInvert: 'INVERSER',
        btnTeleport: 'TÉLÉPORTER',
        btnZoom: 'ZOOM ÉTRANGE',
        btnAboutFace: 'PIVOT',
        btnHidden: '?',
        pressMeProgress: 'Encore...',
        pressMeReward: 'OK ça suffit. Voilà une clef.',
        pressMeEnough: 'Tu insistes pour rien.',
        dontPressFail: 'Tu vois, je t\'avais dit de ne pas appuyer.',
        dontPressFirst: 'Tu n\'as pas écouté. Retour au tutoriel.',
        dontPressReward: 'Bravo, tu as résisté. Voilà une clef.',
        invertVOn: 'Vertical inversé pendant 8 secondes.',
        invertVOff: 'Vertical restauré.',
        teleported: 'Pouf.',
        zoomEffect: 'La perspective vacille...',
        aboutFaceMsg: 'Demi-tour.',
        hiddenFound: 'Tu as trouvé le seul bouton honnête.',
        cubeRoom: 'Salle des Cubes',
        cubeRoomIntro: 'Lance les cubes (clic droit). Touche la cible 3 fois pour une clef.',
        cubeTarget: 'Cible (lance des cubes)',
        cubeTargetHit: 'Touché !',
        cubeTargetDone: 'Cible détruite ! Voilà une clef.',
        weightRoom: 'Salle des Pesées',
        weightRoomIntro: 'Pose chaque cube coloré sur la plaque de sa couleur.',
        platePlaced: 'Plaque activée.',
        weightSolved: 'Toutes les plaques sont actives ! Une clef apparaît.',
        weightRoomKey: 'Clef des Pesées',
        firstFall: 'Tu es tombé dans le puits sans fond... et tu réapparais.',
        fallAgain: 'Encore tombé.',
        saveHint: 'Marre de toujours recommencer ? Trouve la clef de sauvegarde !',
        saveKeyLabel: 'Clef de sauvegarde',
        saveKeyTaken: 'Clef de sauvegarde obtenue ! Appuie sur ÉCHAP pour sauvegarder.',
        saveNotUnlocked: 'Sauvegarde non débloquée.',
        savedSlot: 'Sauvegardé dans l\'emplacement',
        loadedSlot: 'Chargé depuis l\'emplacement',
        deletedSlot: 'Emplacement vidé',
        orbWhite: 'Orbe Blanche',
        orbBlack: 'Orbe Noire',
        orbCollected: label => `${label} récupérée !`,
        victory: 'VICTOIRE ! Vous avez trouvé toutes les Orbes !',
        transcended: 'Vous avez transcendé Orbique',
        invertH: 'Contrôles horizontaux inversés !',
        invertV: 'Contrôles verticaux inversés !',
        resetControls: 'Contrôles normaux restaurés',
        comboInvertH: '↔ Contrôles horizontaux inversés !',
        comboInvertV: '↕ Contrôles verticaux inversés !',
        comboReset: '✓ Contrôles réinitialisés',
        comboInvalid: '✗ Combinaison invalide',
        chestOpen: 'Coffre ouvert !',
        chestOpenHint: 'Coffre ouvert ! Cherchez le plan et la clef.',
        hub: 'HUB',
        doors: 'PORTES',
        laby: 'LABY',
        langSelect: 'Choisissez votre langue',
        langFr: 'FRANÇAIS',
        langEn: 'ENGLISH',
        // Interaction hints
        hintPickup: 'CLIC DROIT — Ramasser',
        hintActivate: 'CLIC GAUCHE — Activer',
        hintChest: 'E — Interagir',
        hintPress: 'CLIC GAUCHE — Appuyer',
        carrying: 'CLIC DROIT — Lancer',
        clickToResume: 'Cliquez pour reprendre',
        // Tutorial
        tutoButton: 'Bouton',
        tutoButtonPressed: 'Un passage vient de s\'ouvrir !',
        tutoComplete: 'Tutoriel terminé ! Bienvenue dans Orbique.',
        tutoStep0: (keys) => `Déplacez-vous avec <span class="key-hint">${keys}</span> et regardez autour avec la <span class="key-hint">SOURIS</span>`,
        tutoStep1: 'Approchez un <b>cube bleu</b> et appuyez sur <span class="key-hint">CLIC DROIT</span> pour le ramasser',
        tutoStep2: 'Appuyez à nouveau sur <span class="key-hint">CLIC DROIT</span> pour le lancer',
        tutoStep3: 'Un mur vous bloque le passage... Observez les marques au sol',
        tutoStep4: 'Approchez le <b>bouton lumineux</b> et appuyez sur <span class="key-hint">CLIC GAUCHE</span> ou <span class="key-hint">E</span>',
        tutoStep5: 'Traversez le <b>portail bleu</b> pour commencer l\'aventure !',
        tutoProgress: (step, total) => `ÉTAPE ${step} / ${total}`,
        tutoMustComplete: 'Terminez le tutoriel avant de continuer !',
        tutoBarrierOpen: 'Le passage est ouvert !'
    },
    en: {
        subtitle: "Nothing is what it seems",
        easy: 'EASY',
        beginner: 'BEGINNER',
        simple: 'SIMPLE',
        plans: 'Plans',
        keys: 'Keys',
        orbs: 'Orbs',
        zone: 'Zone',
        inverted: 'INVERTED',
        orbWhiteI: '○ White Orb I',
        orbWhiteII: '○ White Orb II',
        orbBlackI: '● Black Orb I',
        orbBlackII: '● Black Orb II',
        unlockTitle: 'UNLOCK MODE',
        unlockHint: 'Enter the combination',
        unlockEsc: 'ESC to quit',
        closeMap: 'Press M to close',
        diffStart: difficulty => `Difficulty: ${difficulty.toUpperCase()} — Find the 4 Orbs`,
        doorRoom: 'Door Room',
        infiniteCorridor: 'Infinite Corridor',
        labyrinth: 'The Labyrinth',
        welcome: "Welcome to Orbique. Nothing is logical.",
        backToHub: 'Back to Hub',
        back: 'Back',
        door: n => `Door ${n}`,
        doorUnlocked: n => `Door ${n} unlocked!`,
        doorLocked: 'Locked — You need a key',
        room: n => `Room ${n}`,
        chestOpened: 'Chest (opened)',
        chestLocked: 'Chest — Press U to unlock',
        chestAlready: 'Already opened',
        chestPrompt: 'Press U for unlock mode',
        hint: letter => `Hint: "${letter}"`,
        hintNumbered: (num, letter) => `Hint #${num}: "${letter}"`,
        plan: (n, total) => `Plan ${n}/${total}`,
        planCollected: (n, total) => `Plan ${n}/${total} collected!`,
        allPlans: 'All plans collected! The labyrinth is now accessible!',
        keyFor: n => `Key for door ${n}`,
        keyCollected: label => `${label} collected!`,
        corridorSign: 'Go forward... or backward. The world changes.',
        corridorBack: "The path behind is never the same...",
        secretPassage: "A passage that wasn't there before...",
        colorsRevealed: 'Colors light up at the back of the hub...',
        colorPortal: 'Colored passage',
        nothingRevealed: 'Nothing appears... explore the puzzle rooms first',
        ceilingSign: 'The floor is not always at the bottom...',
        buttonRoom: 'Button Room',
        absurdRoomIntro: 'Welcome. No button lies. (Except one. Or several.)',
        btnPressMe: 'PRESS ME',
        btnDontPress: 'DO NOT PRESS',
        btnInvert: 'INVERT',
        btnTeleport: 'TELEPORT',
        btnZoom: 'STRANGE ZOOM',
        btnAboutFace: 'PIVOT',
        btnHidden: '?',
        pressMeProgress: 'More...',
        pressMeReward: 'OK that\'s enough. Here\'s a key.',
        pressMeEnough: 'You insist for nothing.',
        dontPressFail: 'See, I told you NOT to press.',
        dontPressFirst: 'You didn\'t listen. Back to the tutorial.',
        dontPressReward: 'Well done, you resisted. Here\'s a key.',
        invertVOn: 'Vertical inverted for 8 seconds.',
        invertVOff: 'Vertical restored.',
        teleported: 'Poof.',
        zoomEffect: 'Perspective wobbles...',
        aboutFaceMsg: 'About-face.',
        hiddenFound: 'You found the only honest button.',
        cubeRoom: 'Cube Room',
        cubeRoomIntro: 'Throw cubes (right-click). Hit the target 3 times for a key.',
        cubeTarget: 'Target (throw cubes)',
        cubeTargetHit: 'Hit!',
        cubeTargetDone: 'Target destroyed! Here\'s a key.',
        weightRoom: 'Weight Room',
        weightRoomIntro: 'Place each colored cube on the plate of its color.',
        platePlaced: 'Plate activated.',
        weightSolved: 'All plates active! A key appears.',
        weightRoomKey: 'Weight Room Key',
        firstFall: 'You fell into the bottomless well... and reappear.',
        fallAgain: 'Fell again.',
        saveHint: 'Tired of always starting over? Find the save key!',
        saveKeyLabel: 'Save key',
        saveKeyTaken: 'Save key obtained! Press ESC to save.',
        saveNotUnlocked: 'Save not unlocked.',
        savedSlot: 'Saved to slot',
        loadedSlot: 'Loaded from slot',
        deletedSlot: 'Slot emptied',
        orbWhite: 'White Orb',
        orbBlack: 'Black Orb',
        orbCollected: label => `${label} collected!`,
        victory: 'VICTORY! You found all the Orbs!',
        transcended: 'You have transcended Orbique',
        invertH: 'Horizontal controls inverted!',
        invertV: 'Vertical controls inverted!',
        resetControls: 'Normal controls restored',
        comboInvertH: '↔ Horizontal controls inverted!',
        comboInvertV: '↕ Vertical controls inverted!',
        comboReset: '✓ Controls reset',
        comboInvalid: '✗ Invalid combination',
        chestOpen: 'Chest opened!',
        chestOpenHint: 'Chest opened! Look for the plan and the key.',
        hub: 'HUB',
        doors: 'DOORS',
        laby: 'MAZE',
        langSelect: 'Choose your language',
        langFr: 'FRANÇAIS',
        langEn: 'ENGLISH',
        // Interaction hints
        hintPickup: 'RIGHT CLICK — Pick up',
        hintActivate: 'LEFT CLICK — Activate',
        hintChest: 'E — Interact',
        hintPress: 'LEFT CLICK — Press',
        carrying: 'RIGHT CLICK — Throw',
        clickToResume: 'Click to resume',
        // Tutorial
        tutoButton: 'Button',
        tutoButtonPressed: 'A passage just opened!',
        tutoComplete: 'Tutorial complete! Welcome to Orbique.',
        tutoStep0: (keys) => `Move with <span class="key-hint">${keys}</span> and look around with the <span class="key-hint">MOUSE</span>`,
        tutoStep1: 'Approach a <b>blue cube</b> and press <span class="key-hint">RIGHT CLICK</span> to pick it up',
        tutoStep2: 'Press <span class="key-hint">RIGHT CLICK</span> again to throw it',
        tutoStep3: 'A wall blocks your path... Look at the marks on the floor',
        tutoStep4: 'Approach the <b>glowing button</b> and press <span class="key-hint">LEFT CLICK</span> or <span class="key-hint">E</span>',
        tutoStep5: 'Walk through the <b>blue portal</b> to begin your adventure!',
        tutoProgress: (step, total) => `STEP ${step} / ${total}`,
        tutoMustComplete: 'Complete the tutorial first!',
        tutoBarrierOpen: 'The passage is open!'
    }
};

function t(key, ...args) {
    const val = TEXTS[LANG.current][key];
    if (typeof val === 'function') return val(...args);
    return val || key;
}

function getKeys() {
    return KEYS[LANG.layout];
}

function getComboKeys() {
    return COMBO_KEYS[LANG.layout];
}

function setLanguage(lang) {
    LANG.current = lang;
    LANG.layout = lang === 'fr' ? 'azerty' : 'qwerty';
    applyLanguage();
}

function applyLanguage() {
    document.getElementById('menuSubtitle').textContent = t('subtitle');
    document.getElementById('btnEasy').textContent = t('easy');
    document.getElementById('btnBeginner').textContent = t('beginner');
    document.getElementById('btnSimple').textContent = t('simple');
    document.getElementById('invOrbeB1').textContent = t('orbWhiteI');
    document.getElementById('invOrbeB2').textContent = t('orbWhiteII');
    document.getElementById('invOrbeN1').textContent = t('orbBlackI');
    document.getElementById('invOrbeN2').textContent = t('orbBlackII');
    document.getElementById('unlockTitle').innerHTML = t('unlockTitle') + '<br>' + t('unlockHint');
    document.getElementById('unlockEsc').textContent = t('unlockEsc');
}
