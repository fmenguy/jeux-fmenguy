# 🎯 Niveaux de difficulté et IA adverses

3 niveaux d'IA prévus, chacun incarné par un personnage du roman. Chacun a son **archétype de jeu** distinct + une **profondeur de calcul** différente.

## 🟢 Sylvie · Facile (actif au Lot 2)

| | |
|---|---|
| **Personnage** | Sylvie, fille de Skarn. Joueuse débutante. |
| **Difficulté** | Facile (cible : 55-65 % winrate joueur expérimenté, 40-50 % débutant) |
| **Profondeur** | 0 tour d'anticipation. Heuristique simple sur le tour courant |
| **Archétype** | Tri-classe équilibré, défensive |
| **Tactique** | Pose la meilleure carte selon `(ATQ + PV × 0.6 - coût × 0.3)`. Soin si HP < 10. Embuscade si menace adverse ≥ 6. Tank au front. Archer à l'arrière. |

**Quand y jouer** : tu découvres le jeu, tu testes un nouveau deck.

**Comment la battre** : pousse une Meute Sylvestre pour tuer rapidement. Elle réagit défensive, donc tu prends l'initiative.

**Ce qu'elle ne fait pas** :
- N'anticipe pas tes attaques
- Ne sauvegarde pas ses sortilèges pour des moments clés
- Ne calcule pas les synergies adverses

## 🟡 Lilia · Médium (à venir, Lot 3)

| | |
|---|---|
| **Personnage** | Lilia, exploratrice elfe, tante de Sylvie. As de la chasse. |
| **Difficulté** | Médium (cible : 45-55 % winrate joueur expérimenté) |
| **Profondeur** | 1 tour d'anticipation. Compte les dégâts entrants au prochain combat |
| **Archétype** | Meute Sylvestre agressive. Joue beaucoup d'archers, sort en force tour 4-6 |
| **Tactique** | Priorise la Sylvestre. Pose ses Tirs en arrière pour les protéger. Garde les sortilèges pour : Embuscade sur le tank adverse, Volée de flèches sur Marche groupée. Joue Lilia tour 4 systématiquement (carte fétiche). Synergie Elfe (4) recherchée. |

**Quand y jouer** : tu maîtrises le jeu et tu veux du challenge.

**Comment la battre** : empile des Gardes au Rempart pour absorber, pousse en Magie pour soigner plus que ses tirs. Garde une Embuscade pour ses gros tirs (Rôdeur, Lilia).

**Spécificités code** :
- Évalue les coups joueur du prochain tour : « si je pose A, le joueur tape pour X dégâts → reste Y PV »
- Privilégie les coups qui changent l'évaluation (kill une menace > pose un tank)
- Joue Lilia en priorité dès qu'elle l'a en main (carte signature)

## 🔴 Skarn · Difficile (à venir, Lot 4)

| | |
|---|---|
| **Personnage** | Skarn, géologue humain, père de Sylvie. As du jeu de cartes (selon le lore). |
| **Difficulté** | Difficile (cible : 30-40 % winrate joueur expérimenté) |
| **Profondeur** | 2 tours d'anticipation. Mini-minimax sur les branches probables |
| **Archétype** | Mur du Rempart + finisseurs. Plays patiently, contre-attaque sur tes erreurs |
| **Tactique** | Construit un mur tour 1-3, attend que tu sur-investisses, puis sort Skarn / Throrin / Champion-Tonnerre en finisseur. Garde Souffle des Solilys pour les moments critiques. Calcule les meilleures synergies disponibles dans son deck et les construit étape par étape. |

**Quand y jouer** : tu veux le vrai challenge, tu connais toutes les cartes.

**Comment le battre** : tempo agressif. Ne le laisse pas atteindre tour 6+. Vise une victoire avant qu'il déploie ses légendaires. Sinon : course à la valeur, deck Cercle Arcanique pour le marathon (mais Skarn a aussi des soins).

**Spécificités code** :
- Mini-minimax 2 plis : « si je fais X, l'adversaire fera probablement Y, alors je fais Z »
- Branches élaguées sur ATQ × PV (élimine les coups perdants évidents)
- Bonus défensif quand HP < 12 (priorise survie sur tempo)
- Joue rarement Skarn et Throrin avant tour 6 (attend la valeur max)

## 🟣 Niveaux ultérieurs (Lot 5+)

### Naelia · Mystique (Lot 5)

Joueuse imprévisible. Utilise une mécanique de « pioche du chaos » : peut sacrifier des cartes pour en piocher 2 nouvelles. Difficile à anticiper.

### Le Maître d'Achronia · Cauchemar (Lot 6+)

L'IA finale. Voit ta main (oui, c'est de la triche). Joue toujours le coup optimal. Quasi imbattable sans une stratégie tordue. Récompense ultime débloque un cadre légendaire pour ton deck.

## Système de progression (Lot 3+)

| Difficulté | Récompense en cas de victoire |
|---|---|
| Sylvie (facile) | 3 cartes communes aléatoires + 1 rare aléatoire |
| Lilia (médium) | 5 cartes communes + 2 rares + 1 épique |
| Skarn (difficile) | 5 cartes rares + 3 épiques + 1 légendaire au choix dans une liste de 3 |
| Naelia (Lot 5) | 1 légendaire aléatoire + 1 pack d'extension |
| Maître (Lot 6+) | Cadre légendaire holographique + 5 légendaires aléatoires |

Les cartes débloquées sont stockées en localStorage (Lot 3) puis Firestore (Lot 5+ pour sync multi-appareil).

## Tableau récap

| Niveau | Profondeur | Archétype | Winrate cible | Lot |
|---|---|---|---|---|
| 🟢 Sylvie | 0 tour | Tri-classe défensif | 55-65 % joueur | 2 ✅ |
| 🟡 Lilia | 1 tour | Meute Sylvestre agressive | 45-55 % | 3 |
| 🔴 Skarn | 2 tours | Mur Rempart + finishers | 30-40 % | 4 |
| 🟣 Naelia | 1 tour + chaos | Pioche imprévisible | 35-45 % | 5 |
| ⚫ Maître | 3+ tours + triche | Optimal | 5-15 % | 6+ |

## Notes d'équilibrage

Le winrate cible n'est jamais 50 %. **C'est volontaire** :
- Sylvie doit être battue régulièrement (sinon frustrant pour les débutants)
- Skarn doit faire transpirer (sinon pas de progression ressentie)
- Le « Maître » doit être presque inhumain (pour valoriser la victoire ultime)

L'agent de test automatise des parties IA vs IA pour mesurer l'équilibrage à chaque modification de cartes ou de l'algo. Voir `d:/tmp/test-achrogemme.ts` (script de test, regénéré par l'agent à chaque pivot majeur).

Source : [`src/games/achrogemme/logic/ai/sylvie.ts`](../../src/games/achrogemme/logic/ai/sylvie.ts) (et futurs `lilia.ts`, `skarn.ts`, etc.)
