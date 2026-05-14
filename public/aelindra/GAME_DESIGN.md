# AELINDRA · Chroniques des Profondeurs
## Document de Conception du Jeu

---

## 1. VISION GÉNÉRALE

Jeu tactique au tour par tour médiéval-fantasy, format mobile-first (360×640px, ratio 9:16).
Contrôles souris / toucher uniquement. Inspiré de X-COM mais dans un univers elfique/fantasy.

**Stack** : HTML5 + CSS3 + JavaScript Vanilla (aucune dépendance)
**Rendu** : DOM pur (pas de Canvas), grille CSS Grid pour la carte de combat.

---

## 2. ARCHITECTURE DES FICHIERS

```
aelindra/
├── index.html              # Point d'entrée, structure des écrans
├── GAME_DESIGN.md          # Ce document
├── css/
│   ├── variables.css       # Tokens CSS (couleurs, typographie, espacements)
│   ├── base.css            # Reset, layout, phone frame
│   ├── screens.css         # Styles de chaque écran (hub, donjons, combat...)
│   ├── components.css      # Composants réutilisables (cartes, barres, boutons)
│   └── animations.css      # Keyframes et transitions
├── js/
│   ├── main.js             # Initialisation, router d'écrans
│   ├── state.js            # État global du jeu (G)
│   ├── data.js             # Données statiques (héros, items, donjons...)
│   ├── combat.js           # Moteur de combat au tour par tour
│   ├── ui.js               # Fonctions de rendu DOM
│   ├── market.js           # Logique du marché
│   ├── guild.js            # Logique de la guilde (gacha)
│   ├── dungeons.js         # Logique des donjons et paliers
│   └── utils.js            # Fonctions utilitaires (toast, roll, etc.)
├── screens/
│   ├── splash.html         # Fragments HTML (inclus via JS innerHTML)
│   ├── combat.html
│   └── ...
└── assets/
    └── heroes/             # Dossier pour les images de héros générées
        └── README.md
```

---

## 3. ÉTAT GLOBAL (`state.js`)

```js
const G = {
  // Joueur
  playerName: 'Aventurier',
  gold: 120,          // Monnaie combat (dépensée au marché)
  orbs: 15,           // Orbes runiques (dépensés à la guilde)

  // Progression
  tutoFloor: 0,       // Palier du Gouffre complété (0-5)
  tutoComplete: false,

  // Équipe et collection
  team: [],           // Héros actifs (max 4 en combat)
  collection: [],     // Tous les héros possédés

  // Inventaire
  inventory: [],      // Objets achetés au marché

  // Gacha
  pity: 0,            // Compteur pity (reset à 50, force un Épique)

  // Combat en cours
  combat: null,       // Voir section 7
};
```

---

## 4. MODÈLE DE DONNÉES HÉROS

```js
// Template d'un héros
{
  id: 'dain',               // Identifiant unique
  name: 'Daïn Piedlor',
  race: 'Nain',             // 'Nain' | 'Elfe' | 'Humain'
  class: 'Guerrier',        // Classe de base
  spec: 'guerrier',         // Spécialisation active

  rarity: 'rare',           // 'common' | 'rare' | 'epic' | 'legendary'
  emoji: '🪖',              // Affichage si pas d'image
  imagePath: null,          // 'assets/heroes/dain.png' quand uploadé

  level: 1,
  xp: 0,
  xpCap: 1000,              // XP requis pour niveau suivant (×1.28 par niveau)

  // Stats de base (niveau 1)
  baseStats: {
    hp: 140, mp: 30,
    atk: 14, mag: 5,
    def: 70, res: 45,
    vit: 55, crit: 8,
    range: 1,               // Portée d'attaque en cases (distance de Manhattan)
  },

  // Croissance par niveau
  growth: {
    hp: 18, mp: 2, atk: 7, mag: 0.5,
    def: 6.5, res: 4, vit: 2, crit: 0.2
  },

  // Équipement (slots selon la classe)
  equipped: {
    head: null,
    body: null,
    weapon: null,
    offhand: null,   // Guerrier : bouclier | Mage : grimoire | Archère : flèches
  },

  // Position en combat (null hors combat)
  pos: { x: 0, y: 0 },
  ap: 3,            // Points d'Action restants ce tour
  maxAp: 3,
}
```

### 4.1 Calcul des Stats Totales

```js
function calcStats(hero) {
  const lv = hero.level - 1;
  const base = {};
  // Appliquer la croissance
  Object.keys(hero.baseStats).forEach(k => {
    base[k] = Math.round(hero.baseStats[k] + (hero.growth[k] || 0) * lv);
  });
  // Ajouter les bonus d'équipement
  const bonus = { hp:0, mp:0, atk:0, mag:0, def:0, res:0, vit:0, crit:0 };
  Object.values(hero.equipped).forEach(item => {
    if (!item) return;
    Object.entries(item.stats).forEach(([k, v]) => {
      if (typeof v === 'number' && k in bonus) bonus[k] += v;
    });
  });
  // Bonus de spécialisation
  applySpecBonus(hero.spec, hero.level, bonus);
  // Total
  const total = {};
  Object.keys(base).forEach(k => total[k] = base[k] + (bonus[k] || 0));
  return { base, bonus, total };
}
```

---

## 5. CLASSES ET SPÉCIALISATIONS

### Arbre de spécialisation

```
ARCHER  ──→ Archère (base)
        ──→ Explorateur  (niv. 5) : mobilité +2, camouflage, critique ++
        ──→ Espion       (niv. 5) : poison, marque, exécution <20% PV

GUERRIER ──→ Guerrier (base)
         ──→ Protecteur (niv. 5) : taunt, bouclier, riposte, PV/DEF ++

MAGE ──→ Mage (base)
     ──→ Mage Offensif (niv. 5)  : sorts de zone, météore, surcharge
     ──→ Entraveur     (niv. 5)  : gel, toile, chaînes
     ──→ Soigneur      (niv. 8)  : soins alliés, résurrection, bénédiction
```

### Croissance par classe

| Stat   | Guerrier | Archère | Mage  | Protecteur |
|--------|----------|---------|-------|------------|
| HP/niv | +18      | +8      | +5    | +26        |
| ATK/niv| +7       | +6.5    | +1    | +4         |
| DEF/niv| +6.5     | +2      | +1.5  | +10        |
| MAG/niv| +0.5     | +1.5    | +8.5  | +0.3       |

---

## 6. SYSTÈME D'ARMES ET PORTÉE

### Slots par classe

| Classe     | Tête | Corps | Arme principale | Slot secondaire    |
|------------|------|-------|-----------------|-------------------|
| Guerrier   | Oui  | Oui   | 1 ou 2 mains    | Bouclier (1 main) |
| Archère    | Oui  | Oui   | Arc (2 mains)   | Flèches (munitions)|
| Mage       | Oui  | Oui   | Bâton (2 mains) | Grimoire          |
| Protecteur | Oui  | Oui   | Arme 1 main     | Bouclier (obligatoire)|

### Règles de portée

```
Portée = distance de Manhattan entre attaquant et cible.
dist(a, b) = |a.x - b.x| + |a.y - b.y|

Exemples avec la grille 7×7 :
- Nain Guerrier     : portée 1 (CAC pur, dégâts élevés)
- Archère           : portée 4 (flèches en pierre, dégâts < mage)
- Mage de Feu       : portée 1-3 (peut attaquer au CAC mais sous-optimal)
- Protecteur        : portée 1 (CAC, mais absorbe les dégâts des alliés adjacents)

Arc = arme 2 mains → oblige à équiper des flèches dans le slot secondaire.
Sans flèches : portée réduite à 1, dégâts divisés par 2.
```

### Héros de départ (post-tuto)

```js
// Daïn Piedlor - Nain Guerrier
{ range: 1, atk: 14, baseHp: 140 }
// Arme : Hache de Nain (atk+14, portée 1, 2 mains)

// Aeris Ventpâle - Elfe Archère
{ range: 4, atk: 11, baseHp: 85 }
// Arme : Arc de Bouleau + Flèches en Pierre
// Note : portée 4, mais dégâts inférieurs au bâton de Sylvara

// Sylvara Brasier - Elfe Mage Offensif
{ range: 3, mag: 13, baseHp: 65 }
// Arme : Bâton Rouge de Feu (mag+13, portée 1-3)
// Peut attaquer au CAC (portée 1) mais -50% efficacité

// Borin Rempart - Humain Protecteur
{ range: 1, def: 90, baseHp: 190 }
// Arme : Bouclier Céleste (def+35)
// Capacité passive : absorbe dégâts sur allié adjacent (CAC + distance)
```

---

## 7. MOTEUR DE COMBAT (`combat.js`)

### Structure de la grille

```
Grille 7 colonnes × 7 lignes
Coordonnées (x, y) de (0,0) en haut-gauche à (6,6) en bas-droite

Elfes spawn : rangée y=5-6 (bas)
Ennemis spawn : rangée y=0-1 (haut)
```

### État de combat

```js
G.combat = {
  grid: Array(7).fill(null).map(() => Array(7).fill(null)),
  units: [],          // Toutes les unités (elfes + ennemis)
  turn: 1,
  phase: 'elf',       // 'elf' | 'enemy'
  selected: null,     // id de l'unité sélectionnée
  action: null,       // 'move' | 'attack' | 'spell' | null
  log: [],            // Journal des actions
  isOver: false,
  winner: null,       // 'elf' | 'enemy'
};
```

### Déroulement d'un tour

```
1. PHASE ELFE
   - Joueur clique une unité elfe → sélection
   - Choisit une action : Déplacer (1 PA) / Attaquer (2 PA) / Sort (2 PA + PM)
   - Clique la case/cible
   - Quand toutes les unités ont 0 PA ou joueur clique "Fin de tour"

2. PHASE ENNEMIE
   - IA basique : chaque ennemi se déplace vers la cible la plus proche
   - Si à portée d'attaque → attaque
   - Avec clé API Anthropic → Claude Sonnet choisit les actions tactiques

3. VÉRIFICATION VICTOIRE
   - Tous ennemis morts → Victoire
   - Tous elfes morts → Défaite

4. CALCUL DES RÉCOMPENSES (si victoire)
   - Or = base + bonus par ennemi éliminé
   - XP pour chaque héros ayant participé
   - Chance de drop d'objet
```

### Calcul des dégâts

```js
function calcDamage(attacker, defender, actionType) {
  const atkStats = calcStats(attacker).total;
  const defStats = calcStats(defender).total;

  let raw = 0;
  if (actionType === 'attack') {
    raw = atkStats.atk + Math.floor(Math.random() * 3) - 1;
    // Réduction physique
    const reduction = defStats.def / (defStats.def + 100);
    raw = Math.round(raw * (1 - reduction));
  }
  if (actionType === 'spell') {
    raw = atkStats.mag + Math.floor(Math.random() * 4);
    // Réduction magique
    const reduction = defStats.res / (defStats.res + 100);
    raw = Math.round(raw * (1 - reduction));
  }

  // Critique
  const critRoll = Math.random() * 100;
  const isCrit = critRoll < atkStats.crit;
  if (isCrit) raw = Math.round(raw * 1.75);

  return { damage: Math.max(1, raw), isCrit };
}
```

### Capacité Protecteur : Absorption

```js
// Si un allié adjacent (distance 1) reçoit une attaque,
// le Protecteur peut intercepter.
// L'attaque frappe le Protecteur à la place.
// Applicable : CAC (portée 1) ET distance (toutes portées).
// 1 interception par tour (réinitialisée au début de la phase elfe).

function tryIntercept(target, attacker, allUnits) {
  const protectors = allUnits.filter(u =>
    u.spec === 'guardian' &&
    u.team === target.team &&
    u.hp > 0 &&
    !u.hasIntercepted &&
    dist(u, target) <= 1
  );
  return protectors[0] || null; // Premier protecteur disponible
}
```

---

## 8. PROGRESSION ET XP

```js
// XP requis par niveau
xpCap(level) = Math.round(1000 * Math.pow(1.28, level - 1))
// Niveau 1 → 1000 XP
// Niveau 2 → 1280 XP
// Niveau 3 → 1638 XP
// Niveau 5 → 2684 XP
// Niveau 10 → 11806 XP

// XP gagnée par combat
xpReward = 50 + (enemyLevel * 20) + (difficulty * 10)

// À chaque level up :
// - Toutes les stats augmentent selon la croissance de la classe
// - Si une spécialisation est maintenant disponible, notification
// - Les capacités verrouillées se débloquent si lvlReq atteint
```

---

## 9. LE MARCHÉ

**Monnaie** : Or uniquement (◈)
**L'or s'obtient** : récompenses de combat, missions journalières

```
Onglets : ARMES | ARMURES | POTIONS

Règles :
- Les armes 2 mains bloquent le slot secondaire
- Un arc NÉCESSITE des flèches dans le slot secondaire
- Sans flèches équipées : portée 1, dégâts ÷2
- Les consommables (potions) vont dans l'inventaire
  et peuvent être utilisés pendant le combat (1 PA)
```

### Rareté des objets

| Rareté    | Couleur | Bonus moyen | Prix or |
|-----------|---------|-------------|---------|
| Commun    | Vert    | +5-10       | 60-100  |
| Rare      | Bleu    | +12-20      | 150-250 |
| Épique    | Violet  | +25-40      | 350-500 |
| Légendaire| Or      | +50+        | 800+    |

---

## 10. LA GUILDE (Gacha)

**Monnaie** : Orbes runiques (◆)
**Les orbes s'obtiennent** : donjons, missions principales (bonus ×2 à ×5 au début)

```
Coûts :
  ×1 invocation  = 10 orbes
  ×10 invocations = 90 orbes (1 gratuit)

Taux de base :
  Commun    : 28%
  Rare      : 54%
  Épique    : 16%
  Légendaire:  2%

Pity system :
  Compteur incrementé à chaque tirage sans Épique+
  À 50 tirages → force un Épique ou Légendaire (reset le compteur)

Doublons :
  Si l'aventurier est déjà dans la collection → fragments
  10 fragments = montée en rareté (+1 niveau)
  (à implémenter dans v2)
```

---

## 11. LES DONJONS

### Le Gouffre des Origines (Tutoriel)

```
5 paliers séquentiels, débloqués un à un.
Chaque palier enseigne une mécanique via un héros offert.

Palier 1 · Entrée (0m)
  → Héros offert : Daïn (Guerrier Nain)
  → Enseignement : CAC, points d'action, grille
  → Ennemis : 2× Rat, 1× Gobelin

Palier 2 · Galerie (−50m)
  → Héros offert : Aeris (Archère Elfe)
  → Enseignement : portée, flèches, positionnement
  → Ennemis : 3× Archer Gobelin

Palier 3 · Caverne (−120m)
  → Héros offert : Sylvara (Mage Offensif)
  → Enseignement : magie, résistances élémentales, portée 1-3
  → Ennemis : 2× Golem de Glace, 1× Troll

Palier 4 · Salle du Titan (−200m)
  → Héros offert : Borin (Protecteur)
  → Enseignement : tanking, absorption, positionnement défensif
  → Ennemis : 1× Titan, 2× Serviteurs

Palier 5 · Cœur (−300m)
  → Pas de héros offert
  → Enseignement : synergie des 4 classes ensemble
  → Ennemis : 1× Gardien Abyssal, 3× Ombres
  → Récompense : +150 or, +30 orbes, débloque les autres donjons
```

### Donjons post-tuto (débloqués par paliers)

```
Forêt Maudite    (req. palier 1) → 8 étages, ennemis sylvestres
Mines de Fer Noir(req. palier 2) → 10 étages, golems
Tour des Ombres  (req. palier 3) → 12 étages, nécromanciens
```

---

## 12. SYSTÈME DE MISSIONS

### Missions Principales (progression permanente)

```js
const MAIN_MISSIONS = [
  { id: 'm1', name: 'Première Victoire',   reward: { orbs: 30, bonus: '×3' }, total: 1 },
  { id: 'm2', name: 'Héros Recruté',       reward: { orbs: 20, bonus: '×2' }, total: 1 },
  { id: 'm3', name: 'Équipe Diversifiée',  reward: { orbs: 50, bonus: '×5' }, total: 3 }, // 3 classes différentes
  { id: 'm4', name: 'Niveau 5',            reward: { orbs: 40, bonus: '×4' }, total: 5 }, // LV.5 sur un héros
  { id: 'm5', name: 'Gouffre Terminé',     reward: { orbs: 100 },              total: 5 },
];
```

### Missions Quotidiennes (reset à minuit)

```js
const DAILY_MISSIONS = [
  { id: 'd1', name: 'Combat Quotidien',    reward: { orbs: 8 },  total: 1 },
  { id: 'd2', name: 'Connexion',           reward: { orbs: 5 },  total: 1 },
  { id: 'd3', name: 'Améliorer un Héros',  reward: { orbs: 6 },  total: 1 },
];
```

---

## 13. INTÉGRATION CLAUDE SONNET (optionnelle)

Fichier `js/ai.js` - activé si une clé API est fournie.

```js
// 1. IA tactique ennemie
async function getEnemyMoves(combatState, apiKey) {
  const prompt = buildTacticalPrompt(combatState);
  const response = await callAnthropic(prompt, apiKey);
  return parseAIMoves(response);
}

// 2. Narration de combat
async function getNarration(event, context, apiKey) {
  // event : 'combat_start' | 'kill' | 'victory' | 'defeat'
  const prompt = buildNarrationPrompt(event, context);
  const response = await callAnthropic(prompt, apiKey);
  return response; // Phrase épique affichée dans le log
}

// 3. Prompt système pour l'IA tactique
const TACTICAL_SYSTEM = `
Tu es le moteur IA d'un jeu tactique fantasy médiéval.
Grille 7×7, distance de Manhattan, PA limités.
Joue de façon tactique mais sans trichez : respecte les PA de chaque unité.
Réponds UNIQUEMENT en JSON : {"moves": [...], "narration": "..."}
`;
```

---

## 14. ROUTER D'ÉCRANS (`main.js`)

```js
// Écrans disponibles
const SCREENS = [
  'splash',       // Menu principal
  'dungeons',     // Liste des donjons
  'gouffre',      // Paliers du tutoriel
  'combat',       // Combat actif
  'market',       // Marché
  'guild',        // Guilde / gacha
  'heroes',       // Équipe et fiches héros
  'hero-detail',  // Fiche détaillée d'un héros
  'reward',       // Écran de récompense post-niveau
  'hero-reveal',  // Animation d'apparition d'un nouveau héros
];

function goScreen(id, params = {}) {
  document.querySelectorAll('.scr').forEach(s => s.classList.remove('on'));
  document.getElementById('s-' + id).classList.add('on');
  SCREEN_RENDERERS[id]?.(params);
}
```

---

## 15. PALETTE ET TOKENS CSS

```css
/* css/variables.css */
:root {
  /* Arrière-plans */
  --bg:     #07090e;   /* Fond global */
  --p:      #0d1320;   /* Panneaux */
  --p2:     #111925;   /* Panneaux secondaires */

  /* Bordures */
  --b:      #1c2a3a;
  --b2:     #243444;

  /* Couleurs principales */
  --gold:   #c8a84b;   /* Or, titres, highlights */
  --gold2:  #7a5820;   /* Or sombre, bordures actives */
  --orb:    #3a8aee;   /* Orbes runiques */
  --orb2:   #1a4a8a;   /* Orbes sombres */

  /* Texte */
  --text:   #c8d4e0;
  --dim:    #5a6a7a;
  --dim2:   #3a4a5a;

  /* Raretés */
  --common:    #3a9a4a;
  --rare:      #3a6aaa;
  --epic:      #7a3aaa;
  --legendary: #c87a20;

  /* Statuts */
  --green: #3a9a5a;
  --red:   #aa3a3a;
  --hp:    #3a8a4a;
  --mp:    #4a6aaa;

  /* Typographie */
  --font-title: 'Cinzel', serif;        /* Titres, UI */
  --font-body:  'Crimson Pro', serif;   /* Descriptions, stats */

  /* Espacements */
  --gap-sm: 6px;
  --gap-md: 10px;
  --gap-lg: 16px;
  --radius: 4px;
}
```

---

## 16. ROADMAP v1 → v2

### v1 (MVP actuel)
- [x] Hub principal (Donjons, Guilde, Marché, Équipe)
- [x] Gouffre des Origines (5 paliers tuto)
- [x] 4 héros de départ
- [x] Gacha guilde (pity, rarités)
- [x] Marché (or, 3 onglets)
- [x] Fiche héros (stats, équipement, spécialisations)
- [x] Écran de récompense post-niveau
- [x] Écran d'apparition de héros (slide reveal)
- [x] Combat tactique basique (7×7, PA, portée, log)

### v2
- [ ] Système de doublons → fragments → montée en rareté
- [ ] Fog of war (rayon de vision par héros)
- [ ] Couverture (malus/bonus selon terrain)
- [ ] Missions quotidiennes avec reset timer
- [ ] Persistance localStorage
- [ ] Son (Web Audio API)
- [ ] Plus de donjons (Forêt, Mines, Tour)
- [ ] Système de guilde multijoueur (classement)

---

## 17. CONVENTIONS DE CODE

```
- Fonctions de rendu : rNomEcran()   → ex: rSplash(), rGuild()
- Fonctions d'action : doAction()    → ex: doLevelUp(), doPull()
- Fonctions de calcul : calcXxx()    → ex: calcStats(), calcDamage()
- Fonctions UI : showXxx()/hideXxx() → ex: showToast(), showModal()
- Données statiques : SCREAMING_SNAKE_CASE → ex: STARTER_HEROES, GUILD_POOL
- État global : G.propriété
- Identifiants DOM : 's-' + screenName pour les écrans
```
