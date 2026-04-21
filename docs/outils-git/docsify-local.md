# Docsify - Documentation locale

Serveur de documentation Markdown en local, sans build. Lit les `.md` directement.

## Installation (une seule fois)

```bash
npm install -g docsify-cli
```

## Lancer la doc Strates

```bash
docsify serve docs/strates --port 3300
```

Puis ouvrir http://localhost:3300

## Ajouter une page

1. Créer le fichier `.md` dans le bon sous-dossier de `docs/strates/`
2. Ajouter la ligne dans `docs/strates/_sidebar.md` :

```markdown
- [Titre affiché](chemin/vers/fichier.md)
```

Docsify recharge automatiquement.

## Fichiers clés

| Fichier | Rôle |
|---|---|
| `docs/strates/index.html` | Config Docsify (thème, plugins) |
| `docs/strates/_sidebar.md` | Navigation latérale |
| `docs/strates/README.md` | Page d'accueil |
