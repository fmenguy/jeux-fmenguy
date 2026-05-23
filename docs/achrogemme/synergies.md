# 🔗 Synergies

Inspirées de **TFT** (Teamfight Tactics) : un bonus collectif se déclenche quand tu as un certain nombre d'unités partageant un trait (faction, classe ou tag) sur le board.

À terme : **100 synergies**. Au Lot 2 : **4 synergies de base** opérationnelles.

## Synergies actives au Lot 2

### ☘ Peuple Elfe (faction)

Les Elfes d'Achronia se renforcent en nombre.

| Seuil | Effet |
|---|---|
| **2 Elfes** | +1 ATQ à tous les Elfes |
| **4 Elfes** | +1 PV à tous les Elfes |

Atteignable assez facilement (le deck a 8-9 Elfes potentiels). Combo naturel avec Lilia / Sentinelle / Druide.

---

### ⚒ Clan Nain (faction)

Les Nains des montagnes serrent les rangs.

| Seuil | Effet |
|---|---|
| **2 Nains** | +1 PV à tous les Nains |
| **4 Nains** | Garde sur tous les Nains |

Quasi automatique si tu joues Rempart (Garde nain + Guerrier marteau + Guerrier robuste + Throrin = 4 Nains, Garde généralisée).

---

### ⚜ Royaumes Humains (faction)

Les Humains adaptent leur stratégie au combat.

| Seuil | Effet |
|---|---|
| **3 Humains** | +1 Gemme max |

Plus dur à atteindre (3 unités humaines simultanément). Mais énorme : +1 Gemme max permanent, c'est comme avoir un Druide ou un Méditant gratuit. Combo : Milicien + Apprenti + Amélie.

---

### 👑 Couronnes d'Achronia (tag « royaute »)

Les rois et reines réunis insufflent du courage.

| Seuil | Effet |
|---|---|
| **3 Royaux** | +5 PV max au Champion (+ soin immédiat) |

Les royaux sont **Lilia** (Sylvestre), **Aldarian** (Arcanique), **Throrin** (Rempart), **Amélie** (Rempart). 4 disponibles, il en faut 3 simultanément. Difficile mais game-changing : Champion à 30 PV au lieu de 25.

---

## Comment ça se calcule

À chaque mutation du board (pose, mort, kill par sortilège), on recalcule toutes les synergies :

1. Pour chaque synergie, on compte les unités de ton board qui matchent son trait
2. On trouve le **plus haut seuil atteint**
3. On applique son effet à toutes les unités correspondantes

Les effets se cumulent : si tu as 2 Elfes ET 2 Nains, tu as les deux synergies (+1 ATQ Elfes, +1 PV Nains).

Les synergies de **chaque côté** sont indépendantes : ton synergie « Elfe (2) » n'affecte pas les Elfes de l'IA (et inversement).

## Lecture sur le plateau

Un **bandeau** en haut (côté IA) et en bas (côté joueur) affiche les synergies actives, sous forme de chips dorées (style TFT) :

```
[ ☘ Peuple Elfe (2) · +1 ATQ ]  [ ⚒ Clan Nain (4) · Garde ]
```

Quand un seuil monte (passe de 2 à 4), le chip s'illumine en plus brillant. Animation discrete pour signaler le déclenchement.

## Roadmap des synergies futures (Lot 3-5)

### Faction

| Faction | Seuils prévus |
|---|---|
| **Orc** (Lot 5) | 2 : +1 ATQ Orcs. 4 : +2 ATQ Orcs (faction agressive) |
| **Gobelin** (Lot 5) | 3 : un gobelin gratuit. 5 : ton deck pioche en double |
| **Dragon** (Lot 5+) | 1 (les dragons sont uniques) : +3 ATQ à toutes tes unités, mais -2 PV Champion |
| **Mort-vivant** (Lot 5+) | 2 : si une unité morte-vivante meurt, elle revient avec 1 PV. 4 : Régénération 1 sur toutes |
| **Sylvain** (Lot 4) | 2 : tes Sylvestres ont +1 Perce. 4 : Tir double pour tous |

### Classe

| Classe | Seuils prévus |
|---|---|
| **Sylvestre (5+)** | Tes Tirs ignorent les Gardes adverses |
| **Arcanique (5+)** | Tes soins de Champion se cumulent en bouclier (PV temporaires) |
| **Rempart (5+)** | Tous tes Gardes ont +2 PV |

### Sous-classes (Lot 4)

Quand on ajoute les sous-classes (Druide, Pyromage, Berserker, Nécromancien, Cavalier), chacune aura 1-2 synergies dédiées.

Exemples :
- **Druide (3)** : tes Sylvestres soignent 1 PV Champion par tour
- **Pyromage (2)** : tes sortilèges de dégâts gagnent +1 dégât
- **Berserker (3)** : tes Rempart gagnent +2 ATQ quand ils sont à moins de la moitié PV
- **Nécromancien (2)** : quand une unité ennemie meurt, tu pioches 1 carte

### Tags thématiques

| Tag | Seuils |
|---|---|
| **Royauté** | 3 (déjà actif). 5 (à terme avec plus de royaux) : +10 PV max Champion |
| **Légende** (Sylvie, Skarn, futures cartes Tome 2) | 2 : tes Légendes ont +1 ATQ. 3 : pioche 2 cartes au début de chaque tour |
| **Famille de Sylvie** (Sylvie + Skarn + Amélie + Lilia + Aldarian) | 4 : ton Champion devient « Sylvie » avec son passif (Régénération) |
| **Éclatmaris** (cartes du Tome 2 SF) | 3 : tes Gemmes coûtent 1 de moins (cap à 0) |

### Synergies négatives (pour le piquant)

| Tag | Effet |
|---|---|
| **Solitaire** | 0 autre unité de la même classe sur ton board : +2 ATQ |
| **Conflit Elfes/Nains** | Si tu as 2+ Elfes ET 2+ Nains : -1 ATQ à tous |

## Affichage visuel à concevoir

Pour 100 synergies, le bandeau doit pouvoir scroll horizontalement quand trop chargé, et grouper par catégorie (faction / classe / tag thématique). Un onglet « Voir toutes les synergies » au-dessus permettra de consulter le catalogue complet pendant la partie.

Source : [`src/games/achrogemme/data/synergies.ts`](../../src/games/achrogemme/data/synergies.ts)
