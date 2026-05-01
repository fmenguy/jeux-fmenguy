# Skills Claude Code — Projet Strates

## Skills dédiés Strates

| Skill | Commande | Usage |
|---|---|---|
| Valider les interfaces inter-lots | `/validate-strates` | Après commits de plusieurs lots, vérifie que tous les imports/exports JS sont cohérents. Détecte les bugs type "camera is not defined" avant qu'ils arrivent en prod. Agent Sonnet. |
| Mettre à jour le pilotage agile | `/update-agile` | Analyse les commits récents et met à jour les statuts dans `docs/strates/agile/age-pierre-pilotage-v0.3.html`. Agent Sonnet. |

## Skills globaux utiles sur Strates

| Skill | Commande | Usage |
|---|---|---|
| Analyser le code | `/analyse` | Audit qualité/performance/sécurité sur un fichier ou module. |
| Simplifier | `/simplify` | Relit le code récemment modifié et propose des simplifications. |
| Réduire les prompts de permission | `/fewer-permission-prompts` | Scan les commandes fréquentes et les ajoute en allowlist dans `.claude/settings.json`. |
| Configurer les settings | `/update-config` | Modifier hooks, permissions, variables d'env dans `settings.json`. |

## Automatismes en place

| Déclencheur | Modèle | Rôle |
|---|---|---|
| Après chaque `git push` | Haiku | Scanne les fichiers modifiés : imports manquants, variables non définies. Signale les problèmes critiques avant qu'ils arrivent en prod. |
| Chaque lundi 9h17 (session) | Haiku | Cherche `console.log` oubliés, `TODO/FIXME`, exports orphelins sur la branche `strate` vs `main`. À relancer si Claude Code est redémarré. |

## Agents de développement (lots)

Les agents de développement ne sont pas des skills, ils sont pilotés manuellement via des prompts.

| Agent | Rôle |
|---|---|
| strates-data (Lot A) | Fichiers JSON : techtree, buildings, jobs, needs, resources |
| strates-engine (Lot B) | Gameplay : colonists, interaction, worldgen, jobs, placements |
| strates-ui (Lot C) | Interface : tech tree, panneaux, tutoriel, HUD, aide |
| strates-transitions (Lot D) | Passage d'âge : Cairn, cinématique, conditions Bronze |
