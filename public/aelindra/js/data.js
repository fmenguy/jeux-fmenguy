/* ============================================
   AELINDRA · js/data.js
   Toutes les données statiques du jeu
   ============================================ */

// ============================================
// COULEURS DE RARETÉ
// ============================================
const RARITY_COLORS = {
  common:    '#3a9a4a',
  rare:      '#3a6aaa',
  epic:      '#7a3aaa',
  legendary: '#c87a20',
};

// ============================================
// HÉROS DE DÉPART (offerts par le tuto)
// ============================================
const STARTER_HEROES = [
  {
    id: 'dain',
    name: 'Daïn Piedlor',
    race: 'Nain',
    class: 'Guerrier',
    spec: 'guerrier',
    rarity: 'rare',
    emoji: '🪖',
    imagePath: 'https://feheroes.fandom.com/wiki/Special:FilePath/Hector_Marquess_of_Ostia_Face_FC.webp',
    desc: 'Corps à corps uniquement. Fort et résistant, spécialité CAC pur.',
    baseStats: { hp: 140, mp: 30, atk: 14, mag: 5, def: 70, res: 45, vit: 55, crit: 8, range: 1 },
    growth:    { hp: 18, mp: 2, atk: 7, mag: 0.5, def: 6.5, res: 4, vit: 2, crit: 0.2 },
    weapon: { id: 'hache_nain', name: 'Hache de Nain', emoji: '🪓', atk: 14, range: 1, twoHand: true },
    equipped: { head: null, body: null, weapon: 'hache_nain', offhand: null },
    level: 1, xp: 0,
    abilities: ['frappe_lourde', 'tourbillon', 'endurance', 'assaut'],
  },
  {
    id: 'aeris',
    name: 'Aeris Ventpâle',
    race: 'Elfe',
    class: 'Archère',
    spec: 'archer',
    rarity: 'common',
    emoji: '🏹',
    imagePath: 'https://feheroes.fandom.com/wiki/Special:FilePath/Klein_Pinnacle_of_Nobility_Face_FC.webp',
    desc: 'Portée 4 avec flèches en pierre. Plus de portée que le mage, dégâts inférieurs.',
    baseStats: { hp: 85, mp: 60, atk: 9, mag: 15, def: 30, res: 40, vit: 80, crit: 18, range: 4 },
    growth:    { hp: 8, mp: 5, atk: 6.5, mag: 1.5, def: 2, res: 2.5, vit: 3, crit: 0.4 },
    weapon: { id: 'arc_bouleau', name: 'Arc de Bouleau', emoji: '🏹', atk: 9, range: 4, twoHand: true },
    offhand: { id: 'fleches_pierre', name: 'Flèches en Pierre ×20', emoji: '🪃', atkBonus: 2, ammo: 20 },
    equipped: { head: null, body: null, weapon: 'arc_bouleau', offhand: 'fleches_pierre' },
    level: 1, xp: 0,
    abilities: ['tir_precis', 'pluie_fleches', 'esquive', 'point_faible'],
  },
  {
    id: 'sylva',
    name: 'Sylvara Brasier',
    race: 'Elfe',
    class: 'Mage Offensif',
    spec: 'offensive',
    rarity: 'epic',
    emoji: '🔥',
    imagePath: 'https://feheroes.fandom.com/wiki/Special:FilePath/Lilina_Delightful_Noble_Face_FC.webp',
    desc: 'Bâton rouge de feu, portée 1-3. Peut attaquer au CAC mais perd 50% d\'efficacité.',
    baseStats: { hp: 65, mp: 100, atk: 8, mag: 13, def: 20, res: 60, vit: 60, crit: 10, range: 3 },
    growth:    { hp: 5, mp: 12, atk: 1, mag: 8.5, def: 1.5, res: 5, vit: 2.5, crit: 0.3 },
    weapon: { id: 'baton_feu', name: 'Bâton Rouge de Feu', emoji: '🪄', mag: 13, range: 3, twoHand: true, minRange: 1 },
    equipped: { head: null, body: null, weapon: 'baton_feu', offhand: null },
    level: 1, xp: 0,
    abilities: ['fleche_arcane', 'bouclier_magique', 'explosion', 'meteorite'],
  },
  {
    id: 'borin',
    name: 'Borin Rempart',
    race: 'Humain',
    class: 'Protecteur',
    spec: 'guardian',
    rarity: 'rare',
    emoji: '🛡️',
    imagePath: 'https://feheroes.fandom.com/wiki/Special:FilePath/Fjorm_Princess_of_Ice_Face_FC.webp',
    desc: 'Bouclier Céleste : absorbe les dégâts des alliés adjacents (CAC et distance). 1 interception/tour.',
    baseStats: { hp: 190, mp: 20, atk: 8, mag: 5, def: 90, res: 50, vit: 45, crit: 4, range: 1 },
    growth:    { hp: 26, mp: 1, atk: 4, mag: 0.3, def: 10, res: 5, vit: 1.5, crit: 0.1 },
    weapon: { id: 'bouclier_celeste', name: 'Bouclier Céleste', emoji: '🛡️', defBonus: 35, type: 'shield' },
    equipped: { head: null, body: null, weapon: null, offhand: 'bouclier_celeste' },
    level: 1, xp: 0,
    abilities: ['provocation', 'forteresse', 'sacrifice', 'riposte'],
  },
];

// ============================================
// POOL DE LA GUILDE (tirage aléatoire)
// ============================================
const FEH_PORTRAIT = (name) => `https://feheroes.fandom.com/wiki/Special:FilePath/${name}_Face_FC.webp`;

const GUILD_POOL = [
  {
    id: 'rogue',
    name: 'Lirien l\'Ombre',
    race: 'Elfe',
    class: 'Espion',
    spec: 'spy',
    rarity: 'epic',
    emoji: '🗡️',
    imagePath: FEH_PORTRAIT('Niles_Cruel_to_Be_Kind'),
    weight: 8,
    desc: 'Critique élevé, poison, disparition. Spécialiste des dégâts ponctuels.',
    baseStats: { hp: 75, mp: 40, atk: 15, mag: 6, def: 25, res: 30, vit: 90, crit: 30, range: 1 },
    growth:    { hp: 7, mp: 3, atk: 8, mag: 0.5, def: 2, res: 2.5, vit: 3.5, crit: 0.8 },
    weapon: { id: 'dague_ombre', name: 'Dague d\'Ombre', emoji: '🗡️', atk: 12, range: 1 },
    equipped: { head: null, body: null, weapon: 'dague_ombre', offhand: null },
    abilities: ['poison', 'disparition', 'esquive', 'point_faible'],
  },
  {
    id: 'healer',
    name: 'Elara Lumisoin',
    race: 'Humain',
    class: 'Soigneur',
    spec: 'healer',
    rarity: 'rare',
    emoji: '💚',
    imagePath: FEH_PORTRAIT('Henriette_Royal_Mother'),
    weight: 14,
    desc: 'Soins alliés, résurrection 1×/combat. Renforce la résistance magique.',
    baseStats: { hp: 80, mp: 90, atk: 5, mag: 16, def: 25, res: 65, vit: 55, crit: 5, range: 2 },
    growth:    { hp: 6, mp: 10, atk: 0.5, mag: 7, def: 2, res: 5.5, vit: 2, crit: 0.1 },
    weapon: { id: 'baton_soin', name: 'Bâton de Soin', emoji: '🪄', mag: 14, range: 2 },
    equipped: { head: null, body: null, weapon: 'baton_soin', offhand: null },
    abilities: ['soin_majeur', 'resurrection', 'bouclier_magique', 'benediction'],
  },
  {
    id: 'guard2',
    name: 'Throk Roc',
    race: 'Nain',
    class: 'Protecteur',
    spec: 'guardian',
    rarity: 'rare',
    emoji: '⛏️',
    imagePath: FEH_PORTRAIT('Black_Knight_Sinister_General'),
    weight: 14,
    desc: 'Protecteur nain. Taunt de zone, bloque les passages.',
    baseStats: { hp: 180, mp: 25, atk: 10, mag: 4, def: 95, res: 55, vit: 40, crit: 5, range: 1 },
    growth:    { hp: 25, mp: 1, atk: 5, mag: 0.3, def: 11, res: 5, vit: 1.5, crit: 0.1 },
    weapon: { id: 'rempart', name: 'Rempart de Pierre', emoji: '🛡️', defBonus: 30, type: 'shield' },
    equipped: { head: null, body: null, weapon: null, offhand: 'rempart' },
    abilities: ['provocation', 'forteresse', 'sacrifice', 'riposte'],
  },
  {
    id: 'zorah',
    name: 'Zorah Cendres',
    race: 'Elfe',
    class: 'Mage Offensif',
    spec: 'offensive',
    rarity: 'legendary',
    emoji: '💥',
    imagePath: FEH_PORTRAIT('Reinhardt_Thunder%27s_Fury'),
    weight: 2,
    desc: 'Sorts de zone massive. Dégâts × 3 avec l\'ultime.',
    baseStats: { hp: 70, mp: 120, atk: 7, mag: 18, def: 22, res: 70, vit: 65, crit: 12, range: 3 },
    growth:    { hp: 5, mp: 14, atk: 0.5, mag: 10, def: 1.5, res: 6, vit: 2.5, crit: 0.4 },
    weapon: { id: 'tome_cendres', name: 'Tome des Cendres', emoji: '📕', mag: 16, range: 3 },
    equipped: { head: null, body: null, weapon: 'tome_cendres', offhand: null },
    abilities: ['fleche_arcane', 'explosion', 'meteorite', 'ultime_zorah'],
  },
  {
    id: 'ranger',
    name: 'Sylwen Arc-d\'Argent',
    race: 'Elfe',
    class: 'Explorateur',
    spec: 'explorer',
    rarity: 'rare',
    emoji: '🌿',
    imagePath: FEH_PORTRAIT('Lyn_Lady_of_the_Wind'),
    weight: 14,
    desc: 'Archère exploratrice. Camouflage, mobilité +2, tir embusqué critique garanti.',
    baseStats: { hp: 90, mp: 55, atk: 11, mag: 8, def: 32, res: 38, vit: 88, crit: 22, range: 4 },
    growth:    { hp: 8, mp: 4, atk: 7, mag: 1, def: 2.2, res: 2.5, vit: 3.5, crit: 0.5 },
    weapon: { id: 'arc_argent', name: 'Arc d\'Argent', emoji: '🏹', atk: 13, range: 4, twoHand: true },
    equipped: { head: null, body: null, weapon: 'arc_argent', offhand: null },
    abilities: ['tir_precis', 'pluie_fleches', 'camouflage', 'point_faible'],
  },
  {
    id: 'bard',
    name: 'Orren Voix-d\'Or',
    race: 'Humain',
    class: 'Barde',
    spec: 'bard',
    rarity: 'common',
    emoji: '🎵',
    imagePath: FEH_PORTRAIT('Loki_The_Trickster'),
    weight: 28,
    desc: 'Buffs alliés, debuffs ennemis, polyvalent.',
    baseStats: { hp: 88, mp: 70, atk: 8, mag: 11, def: 30, res: 45, vit: 60, crit: 8, range: 2 },
    growth:    { hp: 7, mp: 6, atk: 4, mag: 4.5, def: 2.5, res: 3, vit: 2.2, crit: 0.2 },
    weapon: { id: 'luth', name: 'Luth Enchanté', emoji: '🎵', mag: 9, range: 2 },
    equipped: { head: null, body: null, weapon: 'luth', offhand: null },
    abilities: ['benediction', 'inspiration', 'malediction', 'esquive'],
  },
  {
    id: 'witch',
    name: 'Mara Lunaire',
    race: 'Humain',
    class: 'Entraveur',
    spec: 'entrave',
    rarity: 'epic',
    emoji: '🌙',
    imagePath: FEH_PORTRAIT('Tharja_Dark_Shadow'),
    weight: 8,
    desc: 'Gel, immobilisation, chaînes. Contrôle du champ de bataille.',
    baseStats: { hp: 72, mp: 95, atk: 6, mag: 14, def: 24, res: 60, vit: 58, crit: 10, range: 3 },
    growth:    { hp: 5, mp: 11, atk: 0.5, mag: 8, def: 1.8, res: 5.5, vit: 2, crit: 0.3 },
    weapon: { id: 'tome_lune', name: 'Tome Lunaire', emoji: '🌙', mag: 12, range: 3 },
    equipped: { head: null, body: null, weapon: 'tome_lune', offhand: null },
    abilities: ['gel', 'chaines', 'malediction', 'bouclier_magique'],
  },
  {
    id: 'monk',
    name: 'Solan Poing-Sacré',
    race: 'Nain',
    class: 'Moine',
    spec: 'monk',
    rarity: 'rare',
    emoji: '👊',
    imagePath: FEH_PORTRAIT('Byleth_Tested_Professor'),
    weight: 12,
    desc: 'CAC rapide, 3 attaques par tour à bas coût en PA.',
    baseStats: { hp: 110, mp: 50, atk: 12, mag: 7, def: 50, res: 50, vit: 80, crit: 15, range: 1 },
    growth:    { hp: 12, mp: 3, atk: 6.5, mag: 1, def: 4, res: 4, vit: 3, crit: 0.4 },
    weapon: { id: 'gantelets', name: 'Gantelets Bénis', emoji: '👊', atk: 10, range: 1 },
    equipped: { head: null, body: null, weapon: 'gantelets', offhand: null },
    abilities: ['triple_frappe', 'meditation', 'esquive', 'riposte'],
  },
];

// ============================================
// MARCHÉ - OBJETS
// ============================================
const MARKET_ITEMS = {
  armes: [
    { id: 'epee_courte',   name: 'Épée Courte',       emoji: '⚔️', type: 'Arme 1M · Guerrier',   rarity: 'common',    stat: '+8 ATK, portée 1',           price: 80 },
    { id: 'arc_elfique',   name: 'Arc Elfique',        emoji: '🏹', type: 'Arme 2M · Archère',     rarity: 'rare',      stat: '+14 ATK, portée 5',          price: 200, twoHand: true, requiresAmmo: true },
    { id: 'hache_guerre',  name: 'Hache de Guerre',    emoji: '🪓', type: 'Arme 2M · Guerrier',    rarity: 'rare',      stat: '+18 ATK, portée 1',          price: 180, twoHand: true },
    { id: 'baton_givre',   name: 'Bâton de Givre',     emoji: '❄️', type: 'Arme 2M · Mage',        rarity: 'rare',      stat: '+16 MAG, gèle 20%',          price: 220, twoHand: true },
    { id: 'carquois_run',  name: 'Carquois Runique',   emoji: '🪃', type: 'Munitions · Archère',   rarity: 'common',    stat: 'Flèches ×40, +5 ATK',        price: 60,  isAmmo: true },
    { id: 'dague_poison',  name: 'Dague Empoisonnée',  emoji: '🗡️', type: 'Arme 1M · Espion',      rarity: 'rare',      stat: '+10 ATK, poison 3 tours',    price: 150 },
  ],
  armures: [
    { id: 'armure_plates', name: 'Armure de Plates',   emoji: '🥋', type: 'Corps · Guerrier',      rarity: 'rare',      stat: '+25 DEF, −5 VIT',            price: 220 },
    { id: 'robe_arcane',   name: 'Robe Arcanique',     emoji: '🧥', type: 'Corps · Mage',           rarity: 'rare',      stat: '+12 RES, +10 MP',            price: 190 },
    { id: 'cape_sylve',    name: 'Cape de Sylve',       emoji: '🧣', type: 'Corps · Archère',        rarity: 'common',    stat: '+8 DEF, +6 VIT',             price: 90 },
    { id: 'egide_chene',   name: 'Égide de Chêne',     emoji: '🛡️', type: 'Bouclier · Protecteur', rarity: 'rare',      stat: '+30 DEF, absorb++',          price: 240 },
    { id: 'diademe_arcane',name: 'Diadème Arcane',     emoji: '💎', type: 'Tête · Mage',            rarity: 'rare',      stat: '+15 MAG, +8 MP',             price: 200 },
    { id: 'jambières_fer', name: 'Jambières de Fer',   emoji: '🩱', type: 'Jambes · Guerrier',      rarity: 'common',    stat: '+10 DEF, +5 PV',             price: 70 },
  ],
  potions: [
    { id: 'potion_soin',   name: 'Potion de Soin',     emoji: '🧪', type: 'Consommable',            rarity: 'common',    stat: 'Restaure 40 PV',             price: 30 },
    { id: 'elixir_force',  name: 'Élixir de Force',    emoji: '⚗️', type: 'Consommable',            rarity: 'rare',      stat: '+20% ATK, 3 tours',          price: 80 },
    { id: 'baume_resist',  name: 'Baume Résistance',   emoji: '🫙', type: 'Consommable',            rarity: 'common',    stat: '+15 DEF, 2 tours',           price: 40 },
    { id: 'grande_potion', name: 'Grande Potion',      emoji: '🍶', type: 'Consommable',            rarity: 'rare',      stat: 'Restaure 100 PV',            price: 120 },
  ],
};

// ============================================
// DONJONS
// ============================================
const TUTO_FLOORS = [
  {
    n: 1, name: 'Entrée du Gouffre', depth: '0m',
    desc: 'Rats des cavernes et gobelins. Initiation aux mécaniques de base.',
    enemies: '2× Rat des Cavernes, 1× Gobelin',
    heroGift: 'dain', // id dans STARTER_HEROES
    reward: { gold: 30, orbs: 5 },
  },
  {
    n: 2, name: 'La Galerie Effondrée', depth: '−50m',
    desc: 'Archers gobelins postés en hauteur. La portée est déterminante.',
    enemies: '3× Archer Gobelin',
    heroGift: 'aeris',
    reward: { gold: 40, orbs: 8 },
  },
  {
    n: 3, name: 'Caverne Enflammée', depth: '−120m',
    desc: 'Golems de glace résistants aux armes physiques. La magie de feu est nécessaire.',
    enemies: '2× Golem de Glace, 1× Troll',
    heroGift: 'sylva',
    reward: { gold: 60, orbs: 10 },
  },
  {
    n: 4, name: 'Salle du Titan', depth: '−200m',
    desc: 'Un Titan brutal. Sans protecteur pour absorber les coups, l\'équipe s\'effondre.',
    enemies: '1× Titan Souterrain, 2× Serviteurs',
    heroGift: 'borin',
    reward: { gold: 80, orbs: 12 },
  },
  {
    n: 5, name: 'Cœur des Profondeurs', depth: '−300m',
    desc: 'Le Gardien Abyssal. Utilise les 4 héros en parfaite synergie pour le vaincre.',
    enemies: '1× Gardien Abyssal, 3× Ombres',
    heroGift: null,
    reward: { gold: 150, orbs: 30, special: '+ Accès aventuriers légendaires' },
  },
];

const POST_TUTO_DUNGEONS = [
  {
    id: 'foret',
    name: 'La Forêt Maudite',
    emoji: '🌲',
    desc: 'Ennemis sylvestres. Armes spéciales recommandées.',
    floors: 8,
    unlockAfterFloor: 1,
    reward: 'Or + Équipements',
  },
  {
    id: 'mines',
    name: 'Mines de Fer Noir',
    emoji: '⛏️',
    desc: 'Golems et nains corrompus. Lourde résistance physique.',
    floors: 10,
    unlockAfterFloor: 2,
    reward: 'Or ++ + Objets rares',
  },
  {
    id: 'tour',
    name: 'Tour des Ombres',
    emoji: '🗼',
    desc: 'Nécromanciens et spectres. La magie est clé.',
    floors: 12,
    unlockAfterFloor: 3,
    reward: 'Orbes + Objets épiques',
  },
];

// ============================================
// MISSIONS
// ============================================
const MAIN_MISSIONS = [
  { id: 'm1', name: 'Première Victoire',    desc: 'Remporte ton premier combat.',                     reward: { orbs: 30 }, bonusLabel: '×3 Orbes Débutant', total: 1 },
  { id: 'm2', name: 'Héros Recruté',        desc: 'Recrute ton premier aventurier à la guilde.',       reward: { orbs: 20 }, bonusLabel: '×2 Bonus',          total: 1 },
  { id: 'm3', name: 'Équipe Diversifiée',   desc: 'Débloque 3 types de classes différentes.',          reward: { orbs: 50 }, bonusLabel: '×5 Découverte',     total: 3 },
  { id: 'm4', name: 'Montée en Puissance',  desc: 'Monte un héros au niveau 5.',                       reward: { orbs: 40 }, bonusLabel: '×4 Orbes',          total: 5 },
  { id: 'm5', name: 'Gouffre Terminé',      desc: 'Complète les 5 paliers du Gouffre des Origines.',   reward: { orbs: 100 }, bonusLabel: null,               total: 5 },
];

const DAILY_MISSIONS = [
  { id: 'd1', name: 'Combat Quotidien',    desc: 'Joue 1 combat aujourd\'hui.', reward: { orbs: 8 }, total: 1 },
  { id: 'd2', name: 'Connexion',           desc: 'Te connecter au jeu.',         reward: { orbs: 5 }, total: 1 },
  { id: 'd3', name: 'Améliorer un Héros',  desc: 'Donne de l\'XP à un héros.',   reward: { orbs: 6 }, total: 1 },
];

// ============================================
// CAPACITÉS
// ============================================
const ABILITIES = {
  // GUERRIER
  frappe_lourde:   { name: 'Frappe Lourde',    icon: '⚔️', desc: 'ATK × 1.6. Chance de renverser 1 tour.',      tags: ['dmg','debuff'], lvlReq: 1, apCost: 2 },
  tourbillon:      { name: 'Tourbillon',        icon: '🔄', desc: 'Frappe tous les ennemis adjacents. ATK × 0.9.', tags: ['dmg'],           lvlReq: 3, apCost: 2 },
  endurance:       { name: 'Endurance',         icon: '💪', desc: 'Passive : réduit les dégâts reçus de 10%.',    tags: ['passive'],        lvlReq: 1, apCost: 0 },
  assaut:          { name: 'Assaut',            icon: '⚡', desc: 'Déplacement 3 cases + attaque immédiate.',     tags: ['dmg'],            lvlReq: 5, apCost: 3 },
  // ARCHÈRE
  tir_precis:      { name: 'Tir Précis',        icon: '🏹', desc: 'ATK × 1.4. Utilise 1 flèche.',                tags: ['dmg'],            lvlReq: 1, apCost: 2 },
  pluie_fleches:   { name: 'Pluie de Flèches',  icon: '🌧️', desc: 'Zone 2×2, 3 cibles max. Utilise 2 flèches.',  tags: ['dmg'],            lvlReq: 3, apCost: 2 },
  esquive:         { name: 'Esquive',           icon: '💨', desc: 'Passive : 20% esquive attaque physique.',      tags: ['passive'],        lvlReq: 1, apCost: 0 },
  point_faible:    { name: 'Point Faible',      icon: '🎯', desc: '+30% dégâts sur cible pendant 2 tours.',       tags: ['debuff'],         lvlReq: 6, apCost: 1 },
  // MAGE
  fleche_arcane:   { name: 'Flèche Arcane',     icon: '⭐', desc: 'MAG × 1.3. Portée 4.',                        tags: ['dmg'],            lvlReq: 1, apCost: 2 },
  bouclier_magique:{ name: 'Bouclier Magique',  icon: '🔮', desc: 'Absorbe MAG × 0.8 dégâts.',                   tags: ['buff'],           lvlReq: 2, apCost: 2 },
  explosion:       { name: 'Explosion',         icon: '✨', desc: 'Zone 3×3. MAG × 1.1 par cible.',              tags: ['dmg'],            lvlReq: 4, apCost: 2 },
  meteorite:       { name: 'Météorite',         icon: '💥', desc: 'Zone 4×4. MAG × 2. Rechargé 3 tours.',        tags: ['dmg'],            lvlReq: 8, apCost: 3 },
  // PROTECTEUR
  provocation:     { name: 'Provocation',       icon: '🛡️', desc: 'Force les ennemis adj. à attaquer le tank.',  tags: ['buff','debuff'],  lvlReq: 1, apCost: 1 },
  forteresse:      { name: 'Forteresse',        icon: '🏰', desc: 'DEF +40% ce tour. Immobile.',                 tags: ['buff'],           lvlReq: 3, apCost: 1 },
  sacrifice:       { name: 'Sacrifice',         icon: '💖', desc: 'Absorbe les dégâts d\'un allié adj. 1×/tour.',tags: ['buff'],           lvlReq: 5, apCost: 0 },
  riposte:         { name: 'Riposte',           icon: '⚔️', desc: 'Passive : renvoie 30% des dégâts reçus.',    tags: ['passive'],        lvlReq: 7, apCost: 0 },
};

// ============================================
// ENNEMIS (types de base et post-tutorial)
// ============================================
const ENEMY_TYPES = {
  // TUTORIEL
  rat:        { name: 'Rat des Cavernes', emoji: '🐀', hp: 12, atk: 4, def: 5,  range: 1, ap: 2, xpReward: 20 },
  gobelin:    { name: 'Gobelin',          emoji: '👺', hp: 18, atk: 6, def: 8,  range: 1, ap: 2, xpReward: 30 },
  archer_gob: { name: 'Archer Gobelin',   emoji: '🏹', hp: 14, atk: 8, def: 4,  range: 3, ap: 2, xpReward: 35 },
  golem_glace:{ name: 'Golem de Glace',   emoji: '🧊', hp: 40, atk: 10,def: 20, range: 1, ap: 1, xpReward: 60, resistance: 'physical' },
  troll:      { name: 'Troll',            emoji: '👹', hp: 35, atk: 12,def: 10, range: 1, ap: 2, xpReward: 50 },
  titan:      { name: 'Titan Souterrain', emoji: '🗿', hp: 80, atk: 18,def: 15, range: 1, ap: 2, xpReward: 120 },
  serviteur:  { name: 'Serviteur',        emoji: '💀', hp: 20, atk: 8, def: 6,  range: 1, ap: 2, xpReward: 30 },
  gardien:    { name: 'Gardien Abyssal',  emoji: '👾', hp: 120,atk: 22,def: 20, range: 2, ap: 3, xpReward: 200 },
  ombre:      { name: 'Ombre',            emoji: '🌑', hp: 25, atk: 12,def: 2,  range: 1, ap: 3, xpReward: 40 },
  // FORÊT MAUDITE
  wolf_dark:    { name: 'Loup Sombre',           emoji: '🐺', hp: 25, atk: 8,  def: 5,  mag: 0,  res: 0,  range: 1, ap: 2, xpReward: 45 },
  dark_elf:     { name: 'Elfe Sombre',           emoji: '🏹', hp: 20, atk: 10, def: 3,  mag: 0,  res: 0,  range: 3, ap: 2, xpReward: 50 },
  corrupt_druid:{ name: 'Druide Corrompu',       emoji: '🌿', hp: 35, atk: 7,  def: 8,  mag: 12, res: 10, range: 2, ap: 2, xpReward: 65 },
  giant_spider: { name: 'Araignée Géante',       emoji: '🕷️', hp: 30, atk: 9,  def: 6,  mag: 0,  res: 0,  range: 1, ap: 2, xpReward: 55, tags: ['poison'] },
  forest_lord:  { name: 'Seigneur de la Forêt',  emoji: '👹', hp: 80, atk: 14, def: 10, mag: 8,  res: 8,  range: 1, ap: 2, xpReward: 200, isBoss: true },
  // MINES DE FER NOIR
  iron_golem:   { name: 'Golem de Fer',          emoji: '🤖', hp: 55, atk: 12, def: 60, mag: 0,  res: 0,  range: 1, ap: 1, xpReward: 90 },
  berserk_dwarf:{ name: 'Nain Berserk',          emoji: '⛏️', hp: 38, atk: 14, def: 12, mag: 0,  res: 5,  range: 1, ap: 2, xpReward: 75 },
  cave_troll:   { name: 'Troll des Cavernes',    emoji: '👹', hp: 70, atk: 10, def: 15, mag: 0,  res: 0,  range: 1, ap: 2, xpReward: 85 },
  mine_spectre: { name: 'Mineur Spectre',        emoji: '👻', hp: 22, atk: 8,  def: 3,  mag: 8,  res: 15, range: 2, ap: 2, xpReward: 60 },
  forge_master: { name: 'Maître des Forges',     emoji: '🔨', hp: 100,atk: 16, def: 40, mag: 5,  res: 10, range: 1, ap: 2, xpReward: 250, isBoss: true },
  // TOUR DES OMBRES
  skeleton:     { name: 'Squelette',             emoji: '💀', hp: 18, atk: 7,  def: 8,  mag: 0,  res: 0,  range: 1, ap: 2, xpReward: 40 },
  spectre:      { name: 'Spectre',               emoji: '👻', hp: 28, atk: 5,  def: 2,  mag: 12, res: 12, range: 2, ap: 2, xpReward: 55, tags: ['intangible'] },
  undead_knight:{ name: 'Chevalier Mort-Vivant', emoji: '⚔️', hp: 50, atk: 12, def: 30, mag: 0,  res: 5,  range: 1, ap: 2, xpReward: 95 },
  banshee:      { name: 'Banshee',               emoji: '👸', hp: 35, atk: 3,  def: 5,  mag: 15, res: 20, range: 3, ap: 2, xpReward: 85 },
  lich:         { name: 'Liche',                 emoji: '🧙', hp: 120,atk: 10, def: 20, mag: 20, res: 25, range: 3, ap: 2, xpReward: 400, isBoss: true },
};

// ============================================
// CONFIGURATION DES PALIERS (liste ennemis)
// ============================================
const FLOOR_ENEMY_CONFIGS = {
  1: [{ type: 'rat', pos: {x:0,y:0} }, { type: 'rat', pos: {x:2,y:0} }, { type: 'gobelin', pos: {x:1,y:1} }],
  2: [{ type: 'archer_gob', pos: {x:0,y:0} }, { type: 'archer_gob', pos: {x:1,y:0} }, { type: 'archer_gob', pos: {x:2,y:0} }],
  3: [{ type: 'golem_glace', pos: {x:0,y:0} }, { type: 'golem_glace', pos: {x:2,y:0} }, { type: 'troll', pos: {x:1,y:1} }],
  4: [{ type: 'titan', pos: {x:1,y:0} }, { type: 'serviteur', pos: {x:0,y:1} }, { type: 'serviteur', pos: {x:2,y:1} }],
  5: [{ type: 'gardien', pos: {x:1,y:0} }, { type: 'ombre', pos: {x:0,y:0} }, { type: 'ombre', pos: {x:2,y:0} }, { type: 'ombre', pos: {x:1,y:2} }],
};

// ============================================
// POST-TUTORIAL : CONFIGURATIONS DES ÉTAGES
// ============================================
const POST_DUNGEON_FLOORS = {
  foret: [
    {
      id: 'foret_1',
      name: 'Lisière Maudite',
      depth: '-500m',
      dungeonId: 'foret',
      enemies: [
        { type: 'wolf_dark', pos: {x:0,y:0} },
        { type: 'wolf_dark', pos: {x:2,y:0} },
        { type: 'dark_elf', pos: {x:1,y:1} },
      ],
      reward: { gold: 40, orbs: 1, xp: 60 },
      isBoss: false,
    },
    {
      id: 'foret_2',
      name: 'Sous-bois Empoisonné',
      depth: '-600m',
      dungeonId: 'foret',
      enemies: [
        { type: 'giant_spider', pos: {x:0,y:0} },
        { type: 'giant_spider', pos: {x:2,y:0} },
        { type: 'corrupt_druid', pos: {x:1,y:1} },
      ],
      reward: { gold: 60, orbs: 1, xp: 80 },
      isBoss: false,
    },
    {
      id: 'foret_3',
      name: 'Clairière Noire',
      depth: '-700m',
      dungeonId: 'foret',
      enemies: [
        { type: 'dark_elf', pos: {x:0,y:0} },
        { type: 'dark_elf', pos: {x:2,y:0} },
        { type: 'giant_spider', pos: {x:1,y:1} },
        { type: 'corrupt_druid', pos: {x:1,y:2} },
      ],
      reward: { gold: 80, orbs: 2, xp: 100 },
      isBoss: false,
    },
    {
      id: 'foret_4',
      name: 'Trône de la Forêt',
      depth: '-800m',
      dungeonId: 'foret',
      enemies: [
        { type: 'forest_lord', pos: {x:1,y:0} },
        { type: 'wolf_dark', pos: {x:0,y:1} },
        { type: 'wolf_dark', pos: {x:2,y:1} },
      ],
      reward: { gold: 150, orbs: 5, xp: 200 },
      isBoss: true,
    },
  ],
  mines: [
    {
      id: 'mines_1',
      name: 'Galerie Effondrée',
      depth: '-800m',
      dungeonId: 'mines',
      enemies: [
        { type: 'mine_spectre', pos: {x:0,y:0} },
        { type: 'mine_spectre', pos: {x:2,y:0} },
        { type: 'iron_golem', pos: {x:1,y:1} },
      ],
      reward: { gold: 70, orbs: 1, xp: 90 },
      isBoss: false,
    },
    {
      id: 'mines_2',
      name: 'Forge Abandonnée',
      depth: '-900m',
      dungeonId: 'mines',
      enemies: [
        { type: 'berserk_dwarf', pos: {x:0,y:0} },
        { type: 'berserk_dwarf', pos: {x:2,y:0} },
        { type: 'iron_golem', pos: {x:1,y:1} },
      ],
      reward: { gold: 90, orbs: 2, xp: 110 },
      isBoss: false,
    },
    {
      id: 'mines_3',
      name: 'Puits Sans Fond',
      depth: '-1000m',
      dungeonId: 'mines',
      enemies: [
        { type: 'cave_troll', pos: {x:1,y:0} },
        { type: 'berserk_dwarf', pos: {x:0,y:1} },
        { type: 'berserk_dwarf', pos: {x:2,y:1} },
        { type: 'mine_spectre', pos: {x:1,y:2} },
      ],
      reward: { gold: 110, orbs: 2, xp: 130 },
      isBoss: false,
    },
    {
      id: 'mines_4',
      name: 'Coeur de la Mine',
      depth: '-1200m',
      dungeonId: 'mines',
      enemies: [
        { type: 'forge_master', pos: {x:1,y:0} },
        { type: 'cave_troll', pos: {x:0,y:1} },
        { type: 'iron_golem', pos: {x:2,y:1} },
      ],
      reward: { gold: 200, orbs: 6, xp: 250 },
      isBoss: true,
    },
  ],
  tour: [
    {
      id: 'tour_1',
      name: 'Crypte de l\'Entrée',
      depth: '-1200m',
      dungeonId: 'tour',
      enemies: [
        { type: 'skeleton', pos: {x:0,y:0} },
        { type: 'skeleton', pos: {x:1,y:0} },
        { type: 'skeleton', pos: {x:2,y:0} },
        { type: 'spectre', pos: {x:1,y:1} },
      ],
      reward: { gold: 80, orbs: 2, xp: 100 },
      isBoss: false,
    },
    {
      id: 'tour_2',
      name: 'Salle des Gardiens',
      depth: '-1400m',
      dungeonId: 'tour',
      enemies: [
        { type: 'undead_knight', pos: {x:0,y:0} },
        { type: 'undead_knight', pos: {x:2,y:0} },
        { type: 'banshee', pos: {x:1,y:1} },
      ],
      reward: { gold: 100, orbs: 2, xp: 120 },
      isBoss: false,
    },
    {
      id: 'tour_3',
      name: 'Bibliothèque Maudite',
      depth: '-1600m',
      dungeonId: 'tour',
      enemies: [
        { type: 'undead_knight', pos: {x:1,y:0} },
        { type: 'spectre', pos: {x:0,y:1} },
        { type: 'spectre', pos: {x:2,y:1} },
        { type: 'banshee', pos: {x:1,y:2} },
      ],
      reward: { gold: 120, orbs: 3, xp: 150 },
      isBoss: false,
    },
    {
      id: 'tour_4',
      name: 'Chambre des Rites',
      depth: '-1800m',
      dungeonId: 'tour',
      enemies: [
        { type: 'banshee', pos: {x:1,y:0} },
        { type: 'banshee', pos: {x:5,y:0} },
        { type: 'undead_knight', pos: {x:2,y:1} },
        { type: 'undead_knight', pos: {x:4,y:1} },
      ],
      reward: { gold: 150, orbs: 3, xp: 180 },
      isBoss: false,
    },
    {
      id: 'tour_5',
      name: 'Sanctuaire de la Liche',
      depth: '-2000m',
      dungeonId: 'tour',
      enemies: [
        { type: 'lich', pos: {x:3,y:1} },
        { type: 'banshee', pos: {x:5,y:0} },
        { type: 'spectre', pos: {x:1,y:1} },
        { type: 'spectre', pos: {x:5,y:2} },
      ],
      reward: { gold: 300, orbs: 10, xp: 400 },
      isBoss: true,
    },
  ],
};

// ============================================
// POST-TUTORIAL : MÉTADONNÉES DES DONJONS
// ============================================
const DUNGEONS_META = [
  {
    id: 'foret',
    name: 'Forêt Maudite',
    icon: '🌲',
    levels: 4,
    minTeamLevel: 3,
    depth: '-500m à -800m',
    description: 'Une forêt corrompue par une magie ancienne. Ennemis sylvestres et créatures maléfiques de la nature.'
  },
  {
    id: 'mines',
    name: 'Mines de Fer Noir',
    icon: '⛏️',
    levels: 4,
    minTeamLevel: 6,
    depth: '-800m à -1200m',
    description: 'Des mines abandonnées hantées par leurs anciens ouvriers et golems défaillants.'
  },
  {
    id: 'tour',
    name: 'Tour des Ombres',
    icon: '🗼',
    levels: 5,
    minTeamLevel: 10,
    depth: '-1200m à -2000m',
    description: 'Une tour millénaire où règne une liche immortelle, gardée par des légions de morts-vivants.'
  },
];

