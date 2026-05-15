/* ============================================
   AELINDRA · data/missions.ts
   Missions principales et quotidiennes
   ============================================ */

import type { Mission } from './types';

export const MAIN_MISSIONS: Mission[] = [
  { id: 'm1', name: 'Première Victoire',   desc: 'Remporte ton premier combat.',                    reward: { orbs: 30 },  bonusLabel: '×3 Orbes Débutant', total: 1 },
  { id: 'm2', name: 'Héros Recruté',       desc: 'Recrute ton premier aventurier à la guilde.',      reward: { orbs: 20 },  bonusLabel: '×2 Bonus',          total: 1 },
  { id: 'm3', name: 'Équipe Diversifiée',  desc: 'Débloque 3 types de classes différentes.',         reward: { orbs: 50 },  bonusLabel: '×5 Découverte',     total: 3 },
  { id: 'm4', name: 'Montée en Puissance', desc: 'Monte un héros au niveau 5.',                      reward: { orbs: 40 },  bonusLabel: '×4 Orbes',          total: 5 },
  { id: 'm5', name: 'Gouffre Terminé',     desc: 'Complète les 5 paliers du Gouffre des Origines.',  reward: { orbs: 100 }, bonusLabel: null,                total: 5 },
];

export const DAILY_MISSIONS: Mission[] = [
  { id: 'd1', name: 'Combat Quotidien',   desc: "Joue 1 combat aujourd'hui.", reward: { orbs: 8 }, total: 1 },
  { id: 'd2', name: 'Connexion',          desc: 'Te connecter au jeu.',        reward: { orbs: 5 }, total: 1 },
  { id: 'd3', name: 'Améliorer un Héros', desc: "Donne de l'XP à un héros.",  reward: { orbs: 6 }, total: 1 },
];
