# Documentation Strates

Index de toute la documentation du projet Strates (god-game voxel Three.js, `public/strates/editor/`).

## Organisation

```
docs/strates/
├── README.md            ← ce fichier, index master
├── notes.md             ← vision initiale du jeu
├── roadmap.md           ← axes d'amélioration, ordre de bataille
├── changelog.md         ← ce qui a été livré (dates, sessions)
├── design-ideas.md      ← journal brut des idées (peut être dense)
│
├── mecaniques/          ← systèmes de gameplay
│   ├── cycle-jour-nuit.md
│   └── ressources.md
│
├── arbres/              ← tech tree, bâtiments, sous-arbres futurs
│
├── ux/                  ← contrôles, UI, principes design
│
└── technique/           ← architecture, perf, persistance
```

## Conventions

- Toute nouvelle mécanique de gameplay documentée dans `mecaniques/<nom>.md`, une file par mécanique.
- Tout arbre (tech, bâtiments, futurs) dans `arbres/`, un fichier par arbre.
- Les décisions validées par l'utilisateur sont marquées **Statut : validé**.
- Les idées non validées sont marquées **Statut : proposé**.
- Pas de tiret long ni semi-long dans la doc, conformément aux règles projet.

## Pour une IA qui arrive sur le projet

Lire dans l'ordre :
1. `notes.md` : vision initiale
2. `roadmap.md` : où on va
3. `changelog.md` : où on en est
4. Le(s) doc(s) `mecaniques/` ou `arbres/` concernés par la tâche
5. `git log --oneline -20` pour le delta récent

Le sub-agent `strates-guide` fait cette synthèse automatiquement.
