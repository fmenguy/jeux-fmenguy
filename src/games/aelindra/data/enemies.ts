/* ============================================
   AELINDRA · data/enemies.ts
   Tous les types d'ennemis
   ============================================ */

import type { Enemy } from './types';

export const ENEMY_TYPES: Record<string, Enemy> = {
  // TUTORIEL
  rat:          { name: 'Rat des Cavernes', emoji: '🐀', hp: 12,  atk: 4,  def: 5,  range: 1, ap: 2, xpReward: 20 },
  gobelin:      { name: 'Gobelin',          emoji: '👺', hp: 18,  atk: 6,  def: 8,  range: 1, ap: 2, xpReward: 30 },
  archer_gob:   { name: 'Archer Gobelin',   emoji: '🏹', hp: 14,  atk: 8,  def: 4,  range: 3, ap: 2, xpReward: 35 },
  golem_glace:  { name: 'Golem de Glace',   emoji: '🧊', hp: 40,  atk: 10, def: 20, range: 1, ap: 1, xpReward: 60, resistance: 'physical' },
  troll:        { name: 'Troll',            emoji: '👹', hp: 35,  atk: 12, def: 10, range: 1, ap: 2, xpReward: 50 },
  titan:        { name: 'Titan Souterrain', emoji: '🗿', hp: 80,  atk: 18, def: 15, range: 1, ap: 2, xpReward: 120 },
  serviteur:    { name: 'Serviteur',        emoji: '💀', hp: 20,  atk: 8,  def: 6,  range: 1, ap: 2, xpReward: 30 },
  gardien:      { name: 'Gardien Abyssal',  emoji: '👾', hp: 120, atk: 22, def: 20, range: 2, ap: 3, xpReward: 200 },
  ombre:        { name: 'Ombre',            emoji: '🌑', hp: 25,  atk: 12, def: 2,  range: 1, ap: 3, xpReward: 40 },
  // FORÊT MAUDITE
  wolf_dark:     { name: 'Loup Sombre',          emoji: '🐺', hp: 25,  atk: 8,  def: 5,  mag: 0,  res: 0,  range: 1, ap: 2, xpReward: 45 },
  dark_elf:      { name: 'Elfe Sombre',          emoji: '🏹', hp: 20,  atk: 10, def: 3,  mag: 0,  res: 0,  range: 3, ap: 2, xpReward: 50 },
  corrupt_druid: { name: 'Druide Corrompu',      emoji: '🌿', hp: 35,  atk: 7,  def: 8,  mag: 12, res: 10, range: 2, ap: 2, xpReward: 65 },
  giant_spider:  { name: 'Araignée Géante',      emoji: '🕷️', hp: 30,  atk: 9,  def: 6,  mag: 0,  res: 0,  range: 1, ap: 2, xpReward: 55, tags: ['poison'] },
  forest_lord:   { name: 'Seigneur de la Forêt', emoji: '👹', hp: 80,  atk: 14, def: 10, mag: 8,  res: 8,  range: 1, ap: 2, xpReward: 200, isBoss: true },
  // MINES DE FER NOIR
  iron_golem:    { name: 'Golem de Fer',         emoji: '🤖', hp: 55,  atk: 12, def: 60, mag: 0,  res: 0,  range: 1, ap: 1, xpReward: 90 },
  berserk_dwarf: { name: 'Nain Berserk',         emoji: '⛏️', hp: 38,  atk: 14, def: 12, mag: 0,  res: 5,  range: 1, ap: 2, xpReward: 75 },
  cave_troll:    { name: 'Troll des Cavernes',   emoji: '👹', hp: 70,  atk: 10, def: 15, mag: 0,  res: 0,  range: 1, ap: 2, xpReward: 85 },
  mine_spectre:  { name: 'Mineur Spectre',       emoji: '👻', hp: 22,  atk: 8,  def: 3,  mag: 8,  res: 15, range: 2, ap: 2, xpReward: 60 },
  forge_master:  { name: 'Maître des Forges',    emoji: '🔨', hp: 100, atk: 16, def: 40, mag: 5,  res: 10, range: 1, ap: 2, xpReward: 250, isBoss: true },
  // TOUR DES OMBRES
  skeleton:      { name: 'Squelette',            emoji: '💀', hp: 18,  atk: 7,  def: 8,  mag: 0,  res: 0,  range: 1, ap: 2, xpReward: 40 },
  spectre:       { name: 'Spectre',              emoji: '👻', hp: 28,  atk: 5,  def: 2,  mag: 12, res: 12, range: 2, ap: 2, xpReward: 55, tags: ['intangible'] },
  undead_knight: { name: 'Chevalier Mort-Vivant',emoji: '⚔️', hp: 50,  atk: 12, def: 30, mag: 0,  res: 5,  range: 1, ap: 2, xpReward: 95 },
  banshee:       { name: 'Banshee',              emoji: '👸', hp: 35,  atk: 3,  def: 5,  mag: 15, res: 20, range: 3, ap: 2, xpReward: 85 },
  lich:          { name: 'Liche',                emoji: '🧙', hp: 120, atk: 10, def: 20, mag: 20, res: 25, range: 3, ap: 2, xpReward: 400, isBoss: true },
};
