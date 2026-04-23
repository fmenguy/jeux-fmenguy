# Handoff Claude Code — Vue Population Strates v0.3

Maquette interactive HTML (Population.html) à intégrer dans le jeu réel.
Le fichier standalone `Population-standalone.html` fonctionne hors-ligne pour référence.

## 1. Contexte

Le jeu Strates est un city-builder/gestion de colonie en JS vanilla (pas React en runtime, pas de build step).
La maquette Population utilise React + Babel en CDN **uniquement** pour prototyper rapidement.
**Pour l'intégration finale** : convertir en DOM vanilla (template literals + delegated event listeners) et brancher sur les modules `state.js` / `hud.js` existants.

## 2. Structure finale de la vue Population

**6 onglets** dans le modal Population :

| Onglet | Contenu | Priorité |
|---|---|---|
| **Liste** | Table triable, filtrable, groupable. Panneau détail à droite. | P0 |
| **Compétences** | Matrice colons × skills (heatmap par catégorie) + vue "par compétence" (top 8 par skill) | P0 |
| **Métiers** | Cartes métier avec capacité, pré-requis, production, colons affectés + picker | P0 |
| **Relations** | Placeholder v0.3 (couples, généalogie) | P2 |
| **Démographie** | Pyramide des âges + alertes santé (HP/moral/faim/âge) | P1 |
| **Villages** | Stats par village + placeholder carte locale | P2 |

## 3. Modèle de données requis

Chaque colon doit exposer (cf. `DATA.colonists` dans la maquette) :

```js
{
  id: 1,
  name: "François",
  gender: "M" | "F",
  age: 34,
  chief: true,              // optionnel — étoile dorée
  village: "souche",        // id du village
  job: "Sage" | null,       // libellé métier ou null
  state: "recherche"        // activité courante : repos | travaille | flâne | recherche | ...
    | "repos" | "travaille" | "flâne",
  hp: 88,                   // 0-100
  mor: 72,                  // 0-100
  faim: 62,                 // 0-100
  skills: { recherche:4, oratoire:3, chasse:2 },  // clés = nom skill, val = niveau 1-5
  rel: [ { id: 2, kind: "couple" | "pere" | "mere" | "enfant" | "frere" | "soeur" } ],
  house: "Cabane #1"
}
```

**Champs manquants côté game state actuel** (à ajouter à `state.colonists[i]`) :
- `skills{}` — objet des compétences avec niveaux
- `rel[]` — tableau des relations familiales/couples
- `house` — logement assigné
- `state` — activité en cours (dérivé du loop de jeu ou stocké)
- `chief` — flag du chef (un seul par village)

Si les noms de tes champs diffèrent (ex: `health` au lieu de `hp`) : tout centraliser via un adapter `colonistView(raw)` qui retourne l'objet au format attendu par la vue.

## 4. Taxonomie des compétences

Catégories utilisées pour la vue Compétences (à confirmer/adapter avec le game design) :

```js
const SKILL_CATEGORIES = [
  { id:'harvest', label:'Récolte',   skills:['bois','cueillette','herboristerie','pioche','chasse','pêche'], color:'#8bb583' },
  { id:'craft',   label:'Artisanat', skills:['artisanat','cuisine','construction','forge'],                  color:'#d9b87a' },
  { id:'combat',  label:'Combat',    skills:['arc','force','discretion','combat'],                           color:'#c67a5a' },
  { id:'savoir',  label:'Savoir',    skills:['recherche','oratoire','medecine','magie'],                     color:'#a89ac8' }
];
```

Skills hors liste → catégorie "Autres" automatiquement.

## 5. Étapes d'intégration suggérées

### Étape 1 — Extraire le CSS
Copier tout le bloc `<style>` de `Population.html` dans `css/population.css`.
Variables utilisées : `--modal`, `--modal-border`, `--ink`, `--accent-gold`, `--accent-sepia`, etc. Vérifier qu'elles existent déjà dans le thème global ou les ajouter.

### Étape 2 — Construire le modal en vanilla JS
Créer `modules/population-modal.js` :
- Classe `PopulationModal` avec méthodes `open()`, `close()`, `setTab(id)`, `setVillage(id)`, `render()`.
- État local : `{ tab, village, query, sortKey, sortDir, selectedId, colFilters, groupBy, density, visibleCols }` persisté dans `localStorage`.
- Rendu par `innerHTML` + template literals pour chaque onglet.
- Délégation d'événements sur le root du modal (un seul `addEventListener` par type).

### Étape 3 — Brancher sur le state
Remplacer `DATA.colonists` par un getter qui lit `state.colonists` (adapter si besoin).
`DATA.villages` → `state.villages`.
`DATA.jobs` → `state.jobDefs` (ou équivalent côté game design).

### Étape 4 — Actions live
Dans la maquette, `assign()` / `unassign()` mutent `DATA` directement. À remplacer par :
- `game.assignJob(colonistId, jobId)` → mute `state.colonists[i].job` + re-render
- `game.unassignJob(colonistId)` → idem
- `game.setChief(colonistId, villageId)` → marque `chief:true`, unset les autres

Après toute mutation, appeler `modal.render()` et `hud.refresh()`.

### Étape 5 — Remplacer l'appel existant
Dans `modules/hud.js`, là où `updateColonsList()` est appelée :
```js
// Avant :
updateColonsList(state.colonists);
// Après :
populationModal.open();  // le modal lit state au render
```

## 6. Tweaks persistés

La maquette expose des tweaks (`density`, `groupBy`, `visibleCols`) persistés via `postMessage` vers l'éditeur.
Pour le jeu : persister dans `localStorage['population.prefs']` (sérialiser l'objet entier), relire à l'ouverture du modal.

## 7. Parties à NE PAS porter tel quel

- `tweaks-panel.jsx` et protocole `__edit_mode_*` — spécifiques à l'éditeur, pas utiles dans le jeu. Si besoin d'un panneau de prefs in-game, fais-en un nouveau.
- Le header avec le "×" est un mock — utiliser ton système de modals existant.
- `React.Fragment`, `useState`, `useMemo`, `useEffect`, `useRef` — à réécrire en closures/getters vanilla.

## 8. Composants visuellement clés (à répliquer fidèlement)

1. **Table header** avec drag-reorder, filtre popover, bouton œil (masquer).
2. **Bars stats** (HP vert / Moral ambre / Faim sépia) dans la colonne "Santé / Moral / Faim".
3. **Pills de niveau de skill** (★★★☆☆) dans la vue Compétences par skill.
4. **Heatmap des compétences** — opacité graduée 0.18 → 0.9 selon niveau 1→5.
5. **Pyramide des âges** mirror-bars avec couleurs ♂#9dc4e8 / ♀#e89dc8.
6. **Alertes santé** en blocs avec border-left coloré (rouge/ambre/sépia/violet).

## 9. Accessibilité / navigation clavier (à ajouter)

La maquette ne gère pas le clavier. Pour l'intégration :
- `↑/↓` pour naviguer la table liste
- `Enter` pour sélectionner un colon
- `Tab` pour cycler entre les onglets (ou `1..6` comme shortcut)
- `Esc` pour fermer le modal
- `/` pour focus la recherche

## 10. Liste des priorités d'intégration

**Sprint 1 (P0)** — Liste + Détail + Métiers.
Cœur du gameplay : affecter des métiers, voir qui fait quoi.

**Sprint 2 (P1)** — Compétences + Démographie.
Aide à la décision : "qui affecter où" + "qui est en danger".

**Sprint 3 (P2)** — Relations + Villages.
Social et spatial, à creuser quand le gameplay est stable.

## 11. Fichiers à livrer

- `exports/Population-standalone.html` — maquette complète hors-ligne pour référence pixel-perfect.
- `Population.html` — source React/Babel éditable.
- Ce HANDOFF.

## 12. Questions ouvertes pour le game design

Avant l'intégration finale, trancher :

1. Les skills gagnent-ils de l'XP auto en travaillant, ou c'est un système d'apprentissage explicite ?
2. Un colon peut-il avoir plusieurs métiers / à temps partiel ?
3. Les relations sont-elles ressaisies manuellement (couples formés par le joueur) ou émergentes ?
4. Les "activités" (repos, travaille, flâne, recherche) sont-elles des états dérivés du tick de jeu ou stockés ?
5. Le chef est-il choisi par le joueur ou élu/déterminé par les stats ?
