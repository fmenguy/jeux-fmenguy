# 📜 Règles d'Achrogemme

## Objectif

Réduire les **Points de Vie** du Champion adverse à 0. Champion de départ : 25 PV.

## Mise en place

Chaque joueur :
- Choisit un **Champion** (joueur = Voyageur, IA = Sylvie / Lilia / Skarn selon difficulté)
- Démarre avec **25 PV**, **1 Gemme max**, et un **deck de 25 cartes** (deck équilibré pré-construit pour le Lot 2)
- Pioche **5 cartes** dans sa main de départ

## Le plateau

Trois **Marches** verticales face à face :

```
     🏹 Sylvestre    ✨ Arcanique    ⚔ Rempart
   ┌──────────────┬──────────────┬──────────────┐
   │  Slot 1 IA   │  Slot 1 IA   │  Slot 1 IA   │
   │  Slot 2 IA   │  Slot 2 IA   │  Slot 2 IA   │
   │  Slot 3 IA   │  Slot 3 IA   │  Slot 3 IA   │
   ├──────────────┼──────────────┼──────────────┤
   │  Slot 3 JR   │  Slot 3 JR   │  Slot 3 JR   │
   │  Slot 2 JR   │  Slot 2 JR   │  Slot 2 JR   │
   │  Slot 1 JR   │  Slot 1 JR   │  Slot 1 JR   │
   └──────────────┴──────────────┴──────────────┘
```

**Slot 1 = Front** (proche de la frontière, encaisse en premier)
**Slot 2 = Milieu**
**Slot 3 = Arrière** (proche du Champion, protégé)

Restriction stricte : une carte de classe **vert** ne peut être posée que sur la Marche **Sylvestre**, une **bleue** sur l'**Arcanique**, une **rouge** sur le **Rempart**.

## Déroulement d'un tour

1. **Début de tour joueur** : les Gemmes du joueur sont rechargées à leur max actuel. Le maximum monte de +1 par tour (cap 8). Le joueur pioche jusqu'à 5 cartes en main.
2. **Phase d'action** : le joueur pose des cartes en payant leur coût en Gemmes. Il peut poser autant de cartes qu'il a de Gemmes disponibles. Il peut lancer des sortilèges.
3. **Fin de tour joueur** : clic sur "Fin du tour".
4. **Tour IA** : l'IA recharge ses Gemmes, pioche, joue ses cartes.
5. **Phase de résolution** (voir ci-dessous).
6. Retour à 1, tour suivant.

## Phase de résolution (combat)

Quatre sous-phases dans l'ordre, visibles dans le journal de combat :

### 🏹 Phase Tir
Chaque unité avec le mot-clé **Tir** (généralement Sylvestre) inflige son ATQ directement au Champion adverse, indépendamment du combat de Marche. Les nouveaux arrivants (tour 0 sans **Charge**) ne tirent pas encore.

### ⚔ Phase Combat
Pour chaque Marche, on calcule la **somme des ATQ** alliées et ennemies (hors unités Tir).

Les dégâts s'appliquent en cascade depuis le **front** :
1. Toute unité avec **Garde** absorbe les dégâts en priorité jusqu'à ses PV
2. Sinon les dégâts tombent sur l'unité en slot 1, puis débordent vers slot 2, puis slot 3
3. Si tous les slots sont morts ou vides, les dégâts résiduels frappent le Champion

### ✨ Phase Magie
Chaque unité avec **Magie** (généralement Arcanique) applique son effet : soin du Champion, régénération propre, etc.

### ☠ Phase Mort
Les unités à 0 PV sont défaussées. Recalcul des synergies.

## Conditions de victoire

- Premier Champion à 0 PV : son adversaire gagne
- Si les deux Champions tombent au même tour : celui qui a le moins de PV "négatifs virtuels" perd

## Mots-clés

| Mot-clé | Effet |
|---|---|
| **Tir** | L'unité ignore le combat de Marche et frappe direct le Champion adverse |
| **Garde** | L'unité absorbe les dégâts en priorité dans sa Marche |
| **Charge** | L'unité agit dès le tour où elle est posée (sinon : attend un tour) |
| **Riposte** | Quand l'unité reçoit un coup, elle riposte (passif) |
| **Frappe double** | L'unité tape deux fois à la phase Tir |
| **Perce X** | Inflige X dégâts directs au Champion en plus du combat |
| **Régénération X** | À chaque résolution, l'unité regagne X PV jusqu'à son max |
| **Royauté** | Tag pour la synergie « Couronnes d'Achronia » |
| **±N Gemmes max** | Modifie le maximum de Gemmes du joueur tant que l'unité est en jeu |

## Sortilèges

Les sortilèges sont des cartes à usage unique (vont au cimetière après utilisation). Ils ont :
- Un **coût** en Gemmes
- Une **cible** (Champion, unité, Marche entière, etc.)
- Un effet immédiat (soin, dégâts, kill, buff)

## Économie des Gemmes

- Tour 1 : 1 Gemme max
- Tour 2 : 2 Gemmes max
- ...
- Tour 8 : 8 Gemmes max (cap)
- Les Gemmes non utilisées **ne se reportent pas** sur le tour suivant
- Certaines cartes donnent un **bonus permanent** : +1 Gemme max tant qu'elles vivent (Druide, Méditant)
- Certaines cartes donnent un **malus permanent** : -1 Gemme max tant qu'elles vivent (Champion-Tonnerre, Doyen mage). Ce sont des cartes très fortes mais coûteuses sur la durée
- La synergie **Humain (3)** donne aussi +1 Gemme max

## Main et deck

- **Main** : 5 cartes maximum (excédent piochés défaussés au tirage si déjà 5)
- **Deck** : 25 cartes pour le Lot 2 (deck pré-construit équilibré)
- Quand le deck est vide, la défausse est mélangée pour reformer un nouveau deck

## Cas particuliers

- Si tu n'as pas de carte d'une classe dans ton deck, tu ne peux jamais poser sur cette Marche
- Si tu n'as plus de cartes en main ni en deck ni en défausse, tu pioches rien (pas de dégâts comme dans Hearthstone, pour l'instant)
- Une unité avec PV à 0 mais effet « ne meurt pas » (à venir) survit avec 1 PV
