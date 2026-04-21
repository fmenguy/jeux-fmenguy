### 📦 1. Ressources primaires

```
RESSOURCES ÂGE 1
│
├── 🪵 BOIS
│   ├── Source : Arbres sur la map (voxel, destructibles)
│   ├── Collecte : Bûcheron (hache en pierre requise)
│   ├── Usage : Construction cabane, foyer, abri
│   └── Stack max : à définir
│
├── 🪨 PIERRE
│   ├── Source : Affleurements rocheux
│   ├── Collecte : Mineur (mains nues Âge 1, pioche Âge 1+)
│   ├── Usage : Construction, outils
│   └── Sous-type : Silex (craft hache/pioche pierre)
│
├── 🫐 BAIES
│   ├── Source : Buissons (map générée)
│   ├── Collecte : Cueilleur (pas d'outil requis)
│   ├── Usage : Nourriture basique (Faim -X)
│   └── ⚠️ Buissons épuisables → notion de gestion ressource
│
├── 🦌 CHASSE (paquet ressource)
│   ├── Source : Animaux sauvages (cerf, sanglier...)
│   ├── Collecte : Chasseur (lance/arc pierre)
│   ├── Produit :
│   │   ├── 🥩 Viande → Nourriture (meilleure que baies)
│   │   ├── 🦴 Os → Craft outils basiques
│   │   └── 🧶 Peau → Vêtements (Nice-to-have, mais prévu)
│   └── ⚠️ Animaux se déplacent, pas fixes
│
└── 🔩 [RÉSERVÉ ÂGE 2] Cuivre/Bronze → hors scope Âge 1
    (les filons existent sur la map mais non exploitables encore)
```

---

### 👷 2. Métiers assignables

```
MÉTIERS ÂGE 1
│
├── 🪓 BÛCHERON
│   ├── Req : Hache en pierre (craftée au Foyer)
│   ├── Tâche : Abattre arbres → Bois
│   ├── Comportement IA : cherche l'arbre le plus proche
│   └── État visible : "Coupe du bois" / "Chemin vers arbre"
│
├── 🏹 CHASSEUR
│   ├── Req : Lance en bois (Foyer) ou Arc pierre
│   ├── Tâche : Traquer animal → Viande + Os + Peau
│   ├── Comportement IA : patrouille zone, attaque si animal proche
│   └── ⚠️ Risque blessure → état "blessé" (simple, pas maladie)
│
├── 🫐 CUEILLEUR
│   ├── Req : Aucun outil
│   ├── Tâche : Récolter buissons → Baies
│   ├── Comportement IA : priorité buissons non épuisés
│   └── C'est le métier "starter" par défaut avant outils
│
├── ⛏️ MINEUR
│   ├── Req : Pioche en pierre (craftée au Foyer)
│   ├── Tâche : Miner affleurements → Pierre + Silex
│   ├── Comportement IA : cherche affleurement le plus proche
│   └── [RÉSERVÉ] Minerai = visible mais locked Âge 1
│
└── 🔭 CHERCHEUR
    ├── Req : Hutte du Sage construite
    ├── Tâche : Génère Points de Recherche /tick
    ├── Comportement IA : reste dans le bâtiment
    └── 🌙 Version nocturne : Astronome (Promontoire)
        └── Génère Points Nocturnes /tick
```

---

### 🏗️ 3. Bâtiments Âge 1

```
BÂTIMENTS ÂGE 1
│
├── 🏕️ ABRI DE FORTUNE
│   ├── Coût : 5 Bois
│   ├── Effet : Loge 1 villageois (état Sans-abri résolu)
│   ├── Req : Aucun (disponible dès le début)
│   └── Upgradable → Cabane (Âge 1) → Maison (Âge 2)
│
├── 🛖 CABANE
│   ├── Coût : 10 Bois + 5 Pierre
│   ├── Effet : Loge 2 villageois
│   ├── Req : Foyer construit
│   └── Version améliorée de l'Abri de fortune
│
├── 🔥 FOYER
│   ├── Coût : 8 Pierre + 3 Bois
│   ├── Effet :
│   │   ├── Craft Hache pierre, Pioche pierre, Lance
│   │   ├── Cuisson viande (Viande crue → Viande cuite)
│   │   └── Futur : Traitement minerai (Âge 2)
│   └── C'est le "cœur" du camp Âge 1
│
├── 🌿 CHAMP / BUISSON
│   ├── Coût : 2 Bois (délimiter zone)
│   ├── Effet : Zone de cueillette gérée, repousse des baies
│   ├── Req : Aucun
│   └── Transition vers → Champ de blé (Âge 2, Tech requise)
│
├── 🔭 PROMONTOIRE
│   ├── Coût : 15 Pierre + 5 Bois
│   ├── Effet : Génère Points Nocturnes (nuit seulement)
│   ├── Req : Hutte du Sage
│   └── Déblocage : Astronome (métier nocturne)
│
├── 🗿 TOTEM
│   ├── Coût : 10 Bois sculpté (Os ?)
│   ├── Effet : Moral +1 (cohésion sociale visible)
│   ├── Req : Aucun
│   └── Catégorie Monument → pas d'effet prod, effet "bien-être"
│
└── 🏚️ HUTTE DU SAGE
    ├── Coût : 12 Bois + 8 Pierre
    ├── Effet : Active métier Chercheur (+pts recherche /tick)
    ├── Req : Cabane construite (il faut un abri avant un lieu de savoir)
    └── Déblocage : Arbre Recherche accessible
```

---

### 😣 4. Besoins minimum fonctionnels

```
BESOINS ÂGE 1
│
├── 🍖 FAIM
│   ├── Décroît avec le temps (rate à définir)
│   ├── Seuils :
│   │   ├── Rassasié → productivité normale
│   │   ├── Affamé → productivité -50%, animation visible
│   │   └── Famine → villageois meurt (game pressure)
│   ├── Sources de nourriture Âge 1 :
│   │   ├── Baies (faible valeur)
│   │   └── Viande cuite (haute valeur, req Foyer)
│   └── ⚠️ Pas de pain encore (Âge 2 minimum)
│
├── 🏠 SANS-ABRI
│   ├── État actif si aucun logement disponible
│   ├── Effets :
│   │   ├── Productivité -30%
│   │   ├── Moral -1/nuit passée dehors
│   │   └── En hiver → mortalité accélérée (Nice-to-have)
│   └── Résolu par : Abri de fortune, Cabane
│
├── [HORS SCOPE] 🤒 Maladie → Âge 2
└── [HORS SCOPE] 🥶 Froid/Vêtements → Âge 2
    (la mécanique existe conceptuellement,
     les filons de peau existent, mais pas activés)
```

---

### 🏆 5. Condition de passage Âge 2

```
CAIRN DE PIERRE — Condition de transition
│
├── 📋 CHECKLIST VISIBLE JOUEUR
│   ├── [ ] 5 villageois logés
│   ├── [ ] Stock : 50 Bois + 30 Pierre + 20 Nourriture
│   ├── [ ] Foyer construit et actif
│   ├── [ ] Hutte du Sage construite
│   ├── [ ] 1 Chercheur assigné
│   └── [ ] 100 Points de Recherche accumulés
│
├── 🗿 CAIRN DE PIERRE (bâtiment déclencheur)
│   ├── Coût : 50 Pierre + 20 Bois + 10 Os
│   ├── Disponible : quand checklist 100% complétée
│   ├── Construction : longue (rituel, progression visible)
│   └── Déclenche → Cinématique de transition
│
└── 🎬 CINÉMATIQUE BRONZE
    ├── Durée : 30-60 secondes
    ├── Contenu :
    │   ├── Vue aérienne du camp construit par le joueur
    │   ├── Un villageois découvre un filon de cuivre
    │   └── Texte narratif : "L'âge de pierre touche à sa fin..."
    └── Résultat : Âge 2 débloqué, nouvelles techs/bâtiments visibles
```

---

### 🎓 6. Tutoriel / Onboarding (15 premières minutes)

```
QUÊTES ENCHAÎNÉES — ONBOARDING
│
├── QUÊTE 1 — "Les premiers pas" (2 min)
│   ├── Objectif : Collecter 10 Bois + 5 Pierre (mains nues)
│   ├── Tutoriel : Clic sur ressource, déplacement villageois
│   └── Récompense : Schéma Foyer débloqué
│
├── QUÊTE 2 — "Le feu sacré" (3 min)
│   ├── Objectif : Construire le Foyer
│   ├── Tutoriel : Interface de construction, placement bâtiment
│   └── Récompense : Recettes Hache + Pioche + Lance débloquées
│
├── QUÊTE 3 — "Nourrir la tribu" (3 min)
│   ├── Objectif : Avoir 10 Nourriture en stock
│   ├── Tutoriel : Assigner Cueilleur, comprendre état Faim
│   └── Récompense : Schéma Abri de fortune débloqué
│
├── QUÊTE 4 — "Un toit pour tous" (3 min)
│   ├── Objectif : Loger 3 villageois
│   ├── Tutoriel : Construire Abri + Cabane, état Sans-abri
│   └── Récompense : 1 nouveau villageois arrive
│
├── QUÊTE 5 — "La chasse est ouverte" (4 min)
│   ├── Objectif : Obtenir 5 Viande + 3 Os
│   ├── Tutoriel : Craft Lance, assigner Chasseur, zones de chasse
│   └── Récompense : Recette Totem débloquée
│
├── QUÊTE 6 — "La nuit révèle les étoiles" (libre)
│   ├── Objectif : Construire Hutte du Sage + Promontoire
│   ├── Tutoriel : Toggle Jour/Nuit, Points Nocturnes
│   └── Récompense : Arbre de Recherche accessible
│
└── QUÊTE 7 — "L'héritage de pierre" (objectif long terme)
    ├── Objectif : Compléter checklist Cairn de pierre
    ├── Tutoriel : Lecture checklist, gestion des priorités
    └── Récompense : Cinématique Bronze + Âge 2 débloqué
```

---

## 🔜 NICE-TO-HAVE (repoussés mais documentés)

```
NICE-TO-HAVE — Âge 1 étendu
│
├── ❄️ HIVER + VÊTEMENTS
│   ├── Saison Hiver active : Faim augmente plus vite
│   ├── Sans vêtements → état Froid → mortalité
│   ├── Craft : Peau (chasse) → Vêtements (Foyer)
│   └── Status : Système saisons câblé, vêtements à activer
│
├── 👶 REPRODUCTION NATURELLE
│   ├── 2 villageois logés ensemble → bébé (délai long)
│   ├── Croissance pop organique vs arrivées scripted
│   └── Status : Complexe, post-MVP
│
└── 📋 FICHES PERSONNAGES
    ├── Nom généré, traits de caractère
    ├── Historique "né à l'Âge X"
    ├── Spécialisation métier avec XP
    └── Status : Enrichissement narratif, post-MVP
```
