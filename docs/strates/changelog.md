# Strates, changelog éditeur

Historique des itérations du proto. Les anciens protos 1 à 5 ont été fusionnés dans `public/strates/editor/`.

---

## 2026-05-05 : fix Lot B, quetes batiments comptent les chantiers termines

- `fix(engine) building quests count only completed buildings` : les quetes "Construire N maisons" (`houses-3`, `houses-5`) reposaient sur le compteur `state.gameStats.housesPlaced` incremente des la pose du chantier, validant la quete avant la fin reelle de la construction. Nouveau type de goal `buildingsBuilt` dans `quests.js` qui compte les batiments du tableau d etat (`state.houses`, `state.bigHouses`, etc.) en filtrant `isUnderConstruction` et `isUnderUpgrade`. Pas de double-comptage entre cabane source en upgrade et big-house finale. Les quetes deja validees a tort en save ne sont pas devalidees retroactivement (juste plus produites a l avenir).

---

## 2026-05-04 : recapitulatif des commits non encore documentes (UI actionbar, social, dialogues, divers)

Synthese groupee par lot des commits du 04 mai non couverts par les sections detaillees ci-dessous. Tri chronologique inverse (commit le plus recent en tete dans chaque lot).

### Lot E (world / UI)

- `4b5b0a0` feat(engine) defaults residents and couple links for new houses : a la completion d une cabane, spawn d un couple homme + femme, lien `partnerId` reciproque, `building.residents` cable, `colonist.homeBuildingId` pose. Grosse cabane : 2 couples spawnes, 2 places restantes.
- `6d65a3b` feat(world) show residents in house panel and add social MVP modal : fiche batiment cabane / grosse cabane affiche les residents avec gender, metier, badge couple. Click resident ouvre charsheet. Nouvelle modale Social (rail droit) read-only listant couples, celibataires, sans-abri.
- `9343a2d` chore(data) rename big-house to Grosse cabane and document residents schema : renommage Manoir -> Grosse cabane pour les 3 premiers ages, documentation du champ `residentsCapacity` et de `socialRelations`.
- `896a945` feat(world) upgrade button from house to big-house in building panel : bouton "Ameliorer en grosse maison" sur fiche cabane terminee, gating tech / ressources / footprint 4x4, barre de progression pendant l upgrade, bascule auto sur fiche big-house a l achevement.
- `1c1b1e8` chore(world) disable medieval field visual evolution : annulation du swap visuel du champ vers la version medievale, conservation du glb farm de base a toutes etapes de croissance.
- `b76345c` feat(world) show assigned colonists in job picker greyed : modale Population / Metiers liste tous les colons en 3 groupes (libres, autres metiers, deja assignes grise avec badge ✓ Assigne et bouton Changer de metier).
- `a379662` chore(world) remove builder tutorial step : suppression complete du tuto Constructeur (apparait trop tard, plus de valeur pedagogique). Flag `builderTutoDone` nettoye automatiquement par `resetTutorialFlags`.
- `5b501c6` feat(world) redesign speech bubbles slate gold style : bulles colons passent de blanc translucide a fond ardoise opaque + bordure or 3px + texte creme. Contraste 9:1, lisibilite garantie sur tous biomes. Variantes `hint` (bleu) et `idle` (couleur metier) preservees.
- `b3bd21f` fix(world) shrink tool labels to fit actionbar buttons : suppression d un bloc CSS `.tool` duplique qui overrideait silencieusement les regles POC A. Labels passent en mono 7.5px avec wrap autorise sur 2 lignes (HUTTE DU SAGE -> 2 lignes).
- `7b809b5` fix(world) align in-game actionbar with POC A reference : alignement du markup et du CSS de #actionbar sur le POC A (3 zones ancrees, espacements, typo).
- `6740fa4` fix(world) cell tooltip distinguishes basic rock from mountain rock : utilisation de `classifyMineableBlock` comme source de verite. Roche de base -> "Necessite une Pioche". Roche de montagne -> "Mineur Niv.5+ requis".
- `0fa3e40` feat(world) three-zone anchored actionbar layout : refonte d actionbar en CSS Grid 3 zones (Naviguer gauche, outils centre, Annuler+Demolir droite). Annuler et Demolir restent au meme pixel quel que soit l onglet.
- `d14229e` fix(world) bubble scale grows with camera distance : echelle des bulles colons ajustee selon distance camera (clamp [0.95, 2.2]), plus de troncature visuelle au dezoom.
- `cc37f96` feat(world) enlarge colonist speech bubbles : premiere passe d agrandissement bulles, canvas 768x240, font Inter 700 38px, scale Sprite 3.4x1.1.

### Lot B (engine)

- `df08560` fix(engine) single-click activation for cancel and destroy buttons : helper `exitAllModesAndEnter(modeName)` consolide la sortie atomique de tous les modes (outil, field placement, cairn placement, destroy). Un clic unique sur Annuler ou Demolir entre directement dans le mode cible, sans double-clic.
- `ef2769c` fix(engine) cancel zone removes construction sites and frees builders : `cancelJobsInRect` etendu pour detecter les chantiers via `findConstructionSitesInCells`, suppression via `removeConstructionSite` qui libere les colons BUILDER (reset IDLE, vide `targetConstructionSite`). Demolir bloque sur chantier non termine via toast informatif.
- `d03e453` feat(engine) promontoire houses up to 2 researchers at night with active light : `OBSERVATORY_CAPACITY = 2`, helpers `enterObservatory` / `releaseFromObservatory` / `releaseAllObservatoryOccupants`, PointLight 0xffd070 active si occupants > 0, mesh chercheur masque a l entree, sortie automatique au lever du jour.

### Lot A (data)

- `e32aa5a` feat(data) add upgrade cost from house to big-house : ajout du bloc `upgradeFrom` sur big-house dans buildings.json. From `cabane`, cost wood:8 stone:5, buildTime 24s. Schema documente via `_upgradeFromSchema`.
- `88214d9` chore(data) remove bones requirement from cairn : suppression de la condition os pour la finalisation du Cairn (rare sur petites iles entierement explorees, blocage de fin d age I).

---

## 2026-05-04 : Lot B, fusion auto retiree au profit d un upgrade explicite Cabane vers Grosse maison

La fusion automatique de 4 cabanes en manoir 2x2 etait buguee (declenchee des le placement, sans attendre la construction), bloquant les colons en BUILDER. Elle a ete entierement retiree.

Elle est remplacee par un upgrade explicite Cabane -> Grosse maison (4x4) declenche depuis le bouton du panneau bâtiment (UI deja en place). La progression suit le meme moteur que la construction : un constructeur prend le chantier (`isUnderUpgrade === true`) et fait monter `upgradeProgress` jusqu a 1, puis la cabane est swappee en Grosse maison construite.

### Cote moteur (`placements.js`)

- Suppression de `checkManorMerge` et `isPlainHouseOn`.
- Suppression des appels `checkManorMerge` dans `interaction.js` (apres pose d une cabane).
- Ajout de `upgradeBuilding(building, targetType)` : verifie le type source, le footprint cible (4x4 libre autour de la cabane), debite les ressources `upgradeFrom.cost` (lecture `buildings.json`), pose les flags `isUnderUpgrade`, `upgradeProgress`, `upgradeTargetType`, `upgradeBuildTime`. Toast d erreur en cas d emplacement insuffisant ou de ressources insuffisantes.
- Ajout de `completeUpgrade(sourceBuilding)` : retire la cabane source, place une Grosse maison deja construite (4x4) au meme emplacement, transfere les residents.
- Helper `canUpgradeTo(fromType, toType)` : prefere `upgradeFrom.from` du JSON, fallback sur `HARDCODED_UPGRADES = { 'big-house': ['cabane'] }` au cas ou.

### Cote tick constructeur (`colonist.js`)

- `pickConstructionSite` selectionne aussi les batiments `isUnderUpgrade === true`.
- L etat `BUILDING` distingue construction et upgrade : si `site.isUnderUpgrade`, on incremente `upgradeProgress` au lieu de `constructionProgress`. A l achevement, appel a `completeUpgrade` puis liberation de tous les constructeurs qui visaient le site (la cabane disparait).
- `_hasNoTaskForProfession` du constructeur compte aussi les chantiers en upgrade (pas d idle si une cabane upgrade est en cours).

### Persistence

- `serializeSnapshot` sauvegarde `isUnderUpgrade`, `upgradeProgress`, `upgradeTargetType`, `upgradeBuildTime` par cabane.
- `applySnapshot` restaure ces flags : un upgrade interrompu reprend a la progression sauvegardee.

### Tests mentaux valides

1. Poser 4 cabanes cote a cote, attendre constructions : restent 4 cabanes distinctes (plus aucune fusion auto).
2. Sur une cabane terminee, cliquer "Améliorer en grosse maison" : ressources debitees, etat upgrade, le constructeur vient travailler, big-house en place apres `upgradeFrom.buildTime` secondes.
3. Emplacement 4x4 insuffisant : toast d erreur, rien ne se passe.
4. Save en cours d upgrade puis reload : reprise propre a la progression sauvegardee.

---

## 2026-05-04 : Lot B, comportement du fermier (1 par champ, production de ble)

Implementation du metier `agriculteur` (Lot A) cote moteur. Un colon assigne fermier va le jour vers le champ de ble libre le plus proche, s y stationne (etat FARMING) et le champ produit du grain au rate `provides.grain_per_tick` lu dans buildings.json. Capacite stricte 1 fermier par champ. Sans fermier en FARMING, un champ ne produit plus rien (la production automatique precedente est retiree).

### Comportement

- `placements.js` : `addWheatField` attribue desormais un `id` stable et `assignedColonistIds: []` a chaque champ. Helpers `findWheatFieldById(id)` et `releaseFromWheatFields(colonistId)` exposes pour le moteur.
- `state.js` : ajout de `wheatFieldNextId` (compteur d ids stables, comme researchBuildingNextId).
- `colonist.js` : nouveau champ `assignedFieldId` par colon, persiste a la save. Etat `FARMING` (similaire a RESEARCHING). En IDLE, si profession `agriculteur` + assignedJob `farmer` + jour + tech `wheat-field` debloquee, le colon trouve un champ libre, s y rend, bascule en FARMING. La nuit ou changement de metier, il libere le champ et revient IDLE. Le champ reste assigne entre deux journees pour qu il y revienne le lendemain. `dispose()` libere aussi le champ. `_hasNoTaskForProfession` etendu a agriculteur (idle bubble si tous champs occupes).
- `main.js` : production de grain conditionnee a la presence d un fermier reellement en FARMING sur le champ. Rate `0.08/tick` (2s) lu dynamiquement dans `buildings.json` via `BUILDINGS_DATA`.
- `persistence.js` : serialisation/restauration de `id`, `assignedColonistIds` par champ, `wheatFieldNextId` global, `assignedJob` et `assignedFieldId` par colon. Reset propre dans `clearEverything`.
- `ui/population-modal.js` : ajout de l entree `agriculteur` dans `JOB_DEFS` avec `techGate: 'wheat-field'`. Le metier reste invisible tant que la tech n est pas debloquee. Mapping `agriculteur` -> `farmer` ajoute dans `PROFESSION_TO_ASSIGNED_JOB`.

### Tests mentaux valides

- Passer en age 2, debloquer `wheat-field`, construire un champ, assigner un fermier : le colon part au champ, du blé est credite.
- 2e fermier avec un seul champ : reste IDLE (capacite 1 stricte).
- 2e champ construit : 2e fermier y va.
- Reload mi-FARMING : la save retient `assignedFieldId` et `assignedColonistIds`. Au boot, le colon redemarre en IDLE et retourne au champ assigne.

---

## 2026-05-04 : Lot B, recompenses de quete diversifiees (resource, boost, colonist)

Le schema `rewards` (Lot A v1) supporte desormais quatre types de recompenses (`research`, `resource`, `speedBoost`, `colonist`). Le moteur applique ces recompenses a la completion d une quete et notifie le joueur via toast HUD.

### Comportement

- `quests.js` : ajout de `applyRewards` / `applySingleReward` qui parcourent le tableau `rewards[]` et creditent les ressources via `state.resources[id]`, ajoutent les points de recherche, posent un boost de vitesse global temporaire (`state.speedBoost = { factor, expiresAt }`) ou spawnent N colons au Cairn ou pres de la premiere maison via `spawnColonsAroundHouse`.
- `quests.js` : `normalizeRewards` convertit l ancien objet `reward { researchPoints, wood, ... }` en tableau Lot A v1, retro compatibilite preservee pour les quetes legacy non encore migrees.
- `quests.js` : toast HUD a la completion listant titres et recompenses (ex : "Quete reussie : Recolte de baies (+30 recherche, +30 baies, +20% vitesse 60s)").
- `quests.js` : tick `tickSpeedBoost` decrémente le boost et le supprime a expiration. Toast d annonce de fin. Badge HUD vert pendant la duree active (mis a jour chaque frame avec compte a rebours).
- `state.js` : nouveau champ `state.speedBoost = null`.
- `productivity.js` : helper `getGlobalSpeedFactor(state)` exporte ; `computeJobProductivity` multiplie le resultat par ce facteur (s applique a la recherche).
- `colonist.js` : la progression de chantier multiplie aussi par `getGlobalSpeedFactor(state)`, le boost accelere donc construction comme recherche.

### Quetes catalogue migrees

Trois quetes hardcodees passees en `rewards[]` pour exposer les nouveaux types :

- `berries-75` : research 30 + resource berries 30 + speedBoost 60s a +20%.
- `houses-3` : research 20 + resource wood 10.
- `colons-8` : research 25 + colonist 1.

Les autres quetes restent en format `reward` legacy, normalisees a la volee.

---

## 2026-05-04 : Lot B, fix trajet chercheur vers le promontoire la nuit

Suite aux fix precedents, le compteur `nightPoints` ne progressait toujours pas en pratique : le chercheur, libere de la Hutte du sage a la tombee de la nuit, ne se deplacait pas visiblement vers le Promontoire. Cause racine : `pickObservatory` posait `isWandering = true`, ce qui declenchait l annulation immediate du trajet dans la branche MOVING des qu un job apparaissait (`state.jobs.size > 0`). En presence quasi-permanente de jobs joueurs, le chercheur n atteignait jamais le promontoire.

### Comportement

- `colonist.js` : nouveau flag `observatoryTarget` (par colon). Pose par `pickObservatory` quand le path est valide, coupe par MOVING en fin de path (passage propre en IDLE) ou si le jour se leve en cours de trajet (rebascule IDLE pour aller a la Hutte du sage).
- `colonist.js` : `pickObservatory` n active plus `isWandering`. Le path n est donc plus vulnerable a la cancellation par `state.jobs.size > 0`.
- `colonist.js` : `pickObservatory` retombe sur `findApproach` si `aStar` echoue (palier trop haut sur la cellule du promontoire), pour deposer le chercheur sur une cellule voisine atteignable, coherent avec la tolerance Manhattan <= 1 de `isObservatoryOn` et `isColonistOnObservatory`.

---

## 2026-05-04 : Lot B, fix production night points au promontoire

Apres la migration astronome -> chercheur (commit f73b67d), le compteur `nightPoints` ne progressait plus la nuit meme avec un chercheur visiblement present au promontoire. Cause : le pathfinding deposait souvent le colon sur une cellule adjacente au promontoire (palier de hauteur trop important pour atteindre la cellule exacte), or `isColonistOnObservatory` exigeait une egalite stricte sur (x, z).

### Comportement

- `daynight.js` : `isColonistOnObservatory` accepte desormais Manhattan <= 1 autour de la cellule du promontoire (cellule meme + 4 voisins).
- `placements.js` : `isObservatoryOn` aligne sur la meme tolerance, pour rester coherent avec `pickObservatory` (le colon ne reesssaiera pas un trajet s il est deja dans le voisinage) et avec `stayingOnObservatory` (le chercheur reste IDLE au promontoire la nuit, ne part pas au campfire).

---

## 2026-05-03 : Lot B, refonte recherche nocturne (option A)

Les points nocturnes deviennent une ressource accumulee par le temps passe en mode nuit avec un astronome assigne sur un promontoire. Une fois accumules, ils peuvent etre depenses a tout moment (jour ou nuit) pour debloquer des techs avec `cost.night > 0`.

### Comportement

- `daynight.js` : production basee sur `computeJobProductivity` agregee sur les astronomes sur promontoire. Flux continu (par seconde, plus par paliers de 5 s). Conditionnee a `state.isNight === true`. Pas de plafond. Synchro `state.nightPoints` (int) avec un accumulateur float interne.
- `tech.js` : `queueTech` ne bloque plus une tech `cost.night > 0` en mode jour. Les points nocturnes sont consommes a la completion via `unlockTech`. Si stocks insuffisants : retour false, la recherche reste plafonnee a 100 % et reessaiera chaque tick.
- `main.js` : deja en place, plafonne `activeResearch.progress` quand `unlockTech` echoue et reessaie au tick suivant.
- `ui/techtree-panel.js` : suppression du bouton "Disponible uniquement la nuit". Affichage du cout night dans la fiche. Bouton "Ajouter a la file" affiche le cout night, tooltip explicatif si stocks insuffisants.
- `ui/techtree-node.js` : cout night affiche dans la card.

### Bug Astronomie I

La tech Astronomie I est desormais debloquable de maniere coherente : mise en file de jour, progression normale, completion au moment ou les stocks de points nocturnes suffisent.

### TODO

- Tutoriel premier deblocage tech nocturne (Lot E).

---

## 2026-04-23 (session 18) : Lot A -- corrections conformite pilotage v0.3

### Conformite verifee

Tous les JSON et gamedata.js ont ete relus et compares au pilotage v0.4 (age-pierre-pilotage-v0.3.html).

### Corrections apportees dans techtree.json

- `spear-wood` renomme de "Arc" (icone fleche) en "Lance en bois" (icone boomerang). Le pilotage v0.3 Checklist branche Outils nomme explicitement "Lance en bois".
- `pick-stone` : ajout de `"copper"` et `"coal"` dans `unlocks.resources`, conformement a l'onglet Contrat du pilotage qui montre ces filons "visibles mais non exploitables age I".
- Description de `pick-stone` mise a jour pour mentionner la visibilite des filons Bronze.

### Fichiers conformes (aucune modification)

- `data/buildings.json` : conforme, tous les batiments age I presents (Foyer, Abri, Cabane, Longhouse, Hutte du sage, Champ, Buisson, Potager, Promontoire, Totem, Cairn).
- `data/jobs.json` : conforme, 8 metiers ages I (Cueilleur, Bucheron, Mineur, Chasseur, Chercheur, Astronome, Terrassier, Explorateur).
- `data/needs.json` : conforme, 3 besoins ages I (Faim, Sans-abri, Blesse).
- `data/resources.json` : conforme, 13 ressources dont 2 stubs age II (Cuivre, Charbon).
- `modules/gamedata.js` : conforme, 5 accesseurs exposes (getTechsForAge, getBuildingById, getJobsRequiringTech, getResourceById, getNeedsForAge), linter croise actif, 7 tests unitaires purs.

### Linter au boot

Simulation Node.js du linter : 0 erreur de reference croisee sur les 5 JSON.

### Fichiers modifies

- `public/strates/editor/data/techtree.json`

---

## 2026-04-23 (session 17) : Lot C -- pulse visuel tech en cours de recherche

### Feature 2 de la maquette v2
- `techtree-node.js` ajoute la classe `ttp-research` sur les nodes dont le status est `researching`, en plus de la classe `researching`.
- `techtree.css` ajoute un pseudo-element `::before` sur `.ttp-tech.ttp-research` (inset -4px, border 1px couleur de branche, border-radius 8px), animé par `@keyframes ttp-pulse` (2.4s ease-in-out infinite, opacity 0.6 -> 0 et scale 1 -> 1.04). Le glow `--vc` sur la card est reconfirme pour que la couleur de branche reste visible.
- Les Features 1 (branch header hexagonal) et 3 (vue constellation globale) etaient deja implementees dans les sessions precedentes.

### Fichiers modifies
- `public/strates/editor/modules/ui/techtree-node.js`
- `public/strates/editor/styles/techtree.css`

---

## 2026-04-23 (session 16) : Lot C -- hover highlight prerequis, fiche droite, rail file de recherche

### Hover highlight des prerequis
- Survol d'une tech locked / available / ready : les prerequis passent en `.req-highlight` (halo pulsed or, animation `ttp-reqpulse`), les liens SVG correspondants en `.req-hi` (stroke or, glow), les autres techs en `.faded` (opacity 0.15, saturate 0.3).
- Handlers `mouseenter` / `mouseleave` branchés sur chaque node lors de `renderBranchDetail`. Les `path` SVG exposent `data-from` / `data-to` pour le ciblage.

### Fiche droite (340px)
- Nouvel `aside.ttp-fiche` dans `.ttp-detail-view`, à droite du canvas. Header avec icone 32px, nom serif 20px, nom de branche coloré. Sections Cout, Description, Murmure (citation italique avec bordure gauche dorée), Prerequis (mini-cartes cliquables pour naviguer), Debloque (jobs / batiments / ressources / outils depuis `tech.unlocks`).
- Pied de fiche : bouton contextuel (Debloque / Annuler la recherche / Retirer de la file / Ajouter a la file / Mettre le chemin en file).
- Ouverture de branche auto-selectionne la première tech interessante (active > ready > first).

### Rail file de recherche
- Nouveau `div.ttp-queue` positionne en bas à droite (right: 360px pour cohabiter avec la fiche), visible uniquement en mode detail. Capacite 5 slots : tete = tech active (64px, bord doré, anneau SVG de progression), suivants = queue (54px bulles circulaires). Bouton × au hover pour retirer (via `cancelResearch`). Placeholders pointillés `+` pour slots vides. Click sur un slot sélectionne la tech correspondante.
- "Mettre le chemin en file" : calcule recursivement l'ordre topologique des prerequis non debloqués et enfile jusqu'a QUEUE_MAX = 5.

### Fichiers modifies
- `public/strates/editor/modules/ui/techtree-panel.js`
- `public/strates/editor/styles/techtree.css`

---

## 2026-04-23 (session 15) : Lot C -- UI file de recherche (boutons etat, barre progression, popup completion)

### Nouveaux etats de cards
- `techtree-node.js` : bouton "Mettre en file &rarr;" pour les techs `ready` / `available`, disabled "En cours..." pour `researching` (+ barre de progression `.ttp-tech-bar` en bas de card), disabled "En file (N)" pour `queued`, disabled "Verrouille" pour `locked`, badge doré "&check; Acquis" pour `done`. Cost row affiche `progress/cost` en chiffres quand recherche active.
- `techtree-panel.js` : `techStatus()` reconnait `researching` (tech == `state.activeResearch.id`) et `queued` (tech dans `state.researchQueue`). Helpers `activeResearchId`, `activeResearchProgress`, `queuePositionOf`. `queueLocal(id)` remplace `unlockLocal` et appelle `queueTech(id)` importee de `tech.js`.
- `techtree.css` : styles pour `.ttp-tech.researching` (glow bleu, barre `.ttp-tech-bar` animee), `.ttp-tech.queued` (bordure dashed doree), bouton disabled, badge `.ttp-tech-acquis`.

### Refresh dynamique
- Ecoute des events `strates:researchStarted`, `strates:queueChanged`, `strates:techComplete` pour redessiner immediatement le tree.
- Timer 2Hz (`setInterval 500ms`) quand le panneau est ouvert et qu une recherche est en cours, pour animer la barre sans refresh total permanent.
- `renderConstellation()` ajoute la progression partielle de `activeResearch` dans la `.bar` de la branche concernee (done + fraction progress/cost).

### Popup de completion
- Nouveau module `modules/ui/research-popup.js`. Injecte (une seule fois) un element `#tech-complete-popup` + styles inline dans le head. Ecoute `strates:techComplete` et affiche un toast en bas au centre pendant 4s avec icone, nom, et liste des unlocks (jobs / buildings). Transitions fade-in/out 300ms, backdrop-filter blur, cohérent palette `--gold --panel --ink`. Installe automatiquement par `initTechTreePanel()`.

### Fichiers modifies
- `public/strates/editor/modules/ui/techtree-node.js`
- `public/strates/editor/modules/ui/techtree-panel.js`
- `public/strates/editor/styles/techtree.css`
- `public/strates/editor/modules/ui/research-popup.js` (nouveau)

---

## 2026-04-23 (session 15) : Lot B -- file de recherche (queueTech, activeResearch)

### Mecanique
- Les techs ne se debloquent plus instantanement quand `researchPoints` atteint le cout. Le joueur enfile une tech via `queueTech(id)`, la tech passe en `state.activeResearch = { id, progress }`, la progression monte de `n` (nombre de chercheurs actifs) toutes les `RESEARCH_TICK` secondes. A `progress >= cost`, `unlockTech` est appelee automatiquement et la file avance.
- `state.researchQueue` (Array<string>) est FIFO, `state.activeResearch` est `null` quand rien n est en cours.

### Fichiers
- `modules/state.js` : ajout de `researchQueue: []` et `activeResearch: null`.
- `modules/tech.js` : nouvelle fonction exportee `queueTech(id)` qui enfile ou demarre la recherche, `cancelResearch(id)` qui retire de la file ou annule l active. `unlockTech` accepte desormais un 3e arg `opts.alreadyPaid` pour que le chemin "completion depuis le tick moteur" ne rededuise pas le cout en points. Log des effets `unlocks.jobs` / `unlocks.buildings` (cablage reel dans un ticket dedie).
- `main.js` : le tick `RESEARCH_TICK` incremente `state.activeResearch.progress` au lieu de `state.researchPoints`. A la completion, `unlockTech(id, refreshTechsPanel, { alreadyPaid: true })` + event `strates:techComplete`, puis avancement auto de la queue (`strates:researchStarted`). HUD `rPointsEl` affiche `progress / cost` tant qu une tech est active. Exposition `window.StratesResearch = { queue, unlock }` pour consommation externe.
- `modules/colonist.js` : en `IDLE`, si `state.activeResearch != null`, que le colon `isChief` n a pas de `researchBuildingId` et qu une hutte du sage existe, il s auto-assigne a `state.researchHouses[0].id` et part en `MOVING` vers le batiment. Indispensable en debut de partie ou le chef est le seul colon disponible.
- `modules/persistence.js` : serialisation et restauration de `researchQueue` et `activeResearch`, reset dans `clearEverything`.

### Contrat API pour Lot C (UI tech tree XXL)
- `window.dispatchEvent` de 3 events : `strates:queueChanged`, `strates:researchStarted { detail: { id } }`, `strates:techComplete { detail: { id, tech } }`.
- `techtree-panel.js` importe deja `queueTech, cancelResearch` depuis `../tech.js` (session precedente Lot C) et lit `state.activeResearch`, `state.researchQueue` pour l affichage status (`researching`, `queued`).

---

## 2026-04-23 (session 15) : Lot C -- B8bis, B14, B15, B16

### B8bis -- suppression panneau save/load haut écran
- `index.html` : suppression complete du bloc `#save-controls` (boutons Sauver / Charger / Nouvelle) en haut de l'écran. Faisait doublon avec le menu Échap. Le bouton disquette rapide `#btn-quicksave` (U8) reste.

### B14/B15 -- fix TypeError classList null + bouton ? aide
- `index.html` : correction des deux sélecteurs null-sûrs qui déclenchaient `TypeError: Cannot read classList of null` au chargement (ligne 1532) et au clic sur le bouton `?` (ligne 1514). Guard null ajouté avant chaque accès `.classList`. Le bouton `?` en bas à droite ouvre désormais l'aide correctement.

### B16 -- son été synthétique via Web Audio API
- `modules/audio.js` : son synthétique saison Été généré par Web Audio API (même approche que la fanfare Bronze). Remplace la référence manquante `audio/ete.mp3` (404). Cohérence avec les autres sons synthétiques du projet.

---

## 2026-04-23 (session 15) : Lot B -- REVERT B10 + B17 + B18 + B19

### REVERT B10 -- desactivation auto-collecte colons
- `modules/colonist.js` : `pickAutoCollect()` et son call site dans la machine a etat IDLE sont commentes avec la mention `desactive - remplace par systeme 3 boutons (pioche/hache/baie)`. Le code est conserve pour reprise ulterieure. Les colons IDLE ne collectent plus de ressources tout seuls, ils restent au repos ou flanent.

### B17 -- protection fondation batiments contre minage
- `modules/placements.js` : `isMineBlocked(x, z)` etend la protection au-dela de `isHouseOn` (qui couvrait deja houses, manors, researchHouses). Ajout de la verification sur `state.observatories` et `state.cairns` pour qu aucune fondation de batiment pose ne puisse etre minee. Les appels existants dans `interaction.js` (`toolAllowedOnCell`, `applyToolAtCell`, `applyToolToStrata`) rejettent deja le clic de minage quand `isMineBlocked` retourne true, ce qui assure le feedback visuel existant (curseur not-allowed).

### B18 -- arbres animation recolte resolue par revert B10
- Aucun code ne declenchait d animation de branches d arbre hors du chemin `pickAutoCollect` desactive. Seule la pousse progressive via `tickTreeGrowth` subsiste (growth < 1 sur 12 s). Commit de constat, bug resolu par le revert B10.

### B19 -- condition Cairn sur total cumule depense
- `modules/state.js` : nouveau champ `totalResearchSpent` (init 0, jamais decremente).
- `modules/tech.js` (`unlockTech`) et `modules/ui/techtree-panel.js` (`unlockLocal`) : chaque deblocage incremente `state.totalResearchSpent += cost` en plus de decrementer le solde.
- `modules/age-transitions.js` : `canBuildCairn`, `getCairnProgress` et le tooltip conditions lisent desormais `state.totalResearchSpent` au lieu du solde courant `state.researchPoints`. Le label devient "100 pts recherche depenses". Cause racine : B11 gele l accumulation quand toutes les techs dispo sont prises, le solde pouvait donc rester inferieur a 100 meme apres avoir depense plus de 100 pts.
- `modules/persistence.js` : serialisation et restauration de `totalResearchSpent`, reset dans `clearEverything`.
- `modules/worldgen.js` : reset de `totalResearchSpent` dans le reset monde.

---

## 2026-04-23 (session 15) : Lot C -- U7 palette vignette grisee batiment unique

### U7 -- styles CSS + refresh HUD pour batiment unique deja pose
- `index.html` : nouvelle classe `.tool.disabled-unique` (opacity 0.4, cursor not-allowed, filter grayscale, suppression des effets hover et active). Appliquee sur les boutons data-tool de la palette actionbar.
- `modules/hud.js` : nouvelle fonction exportee `refreshUniqueBuildingsPalette()` appelee depuis `refreshHUD()`. Mapping `TOOL_TO_BUILDING_ID` (research -> hutte-du-sage, cairn -> cairn-pierre) et `INSTANCE_CHECKS` (lectures dediees de state.researchHouses et state.cairns). Helper `buildingIsUnique(id)` lit `BUILDINGS_DATA` pour valider le flag unique. Cohabite proprement avec la logique Lot B (placements.checkUniqueBuildingButtons) qui applique la meme classe depuis un tick lent.
- Scope UI respecte : aucune modification de placements.js, interaction.js, data/*.json.

---

## 2026-04-23 (session 14) : Lot B -- B10, B11

### B10 -- auto-collecte colons au repos (revert en session 15)
- `modules/colonist.js` : ajout de `pickAutoCollect()` (rayon Manhattan 8, priorité LEISURE, jour uniquement). Les colons IDLE ciblaient rochers puis arbres. Désactivé en session 15 (voir REVERT B10) au profit du système 3 boutons (pioche/hache/baie) à venir.

### B11 -- gel points de recherche si toutes techs débloquées
- `modules/tech.js` : nouvelle fonction `hasPendingResearchableTech()`, filtre les techs de l'âge courant non débloquées dont les prérequis sont remplis.
- `main.js` : accumulation des points de recherche gelée si `hasPendingResearchableTech()` retourne false.

---

## 2026-04-23 (session 14) : Lot B -- U7 consommation flag unique batiment

### U7 -- bouton de pose grise pour batiment unique deja pose
- `modules/placements.js` : nouvelles fonctions `countBuildingInstances(id)`, `isBuildingUniqueAndPlaced(id)` et `checkUniqueBuildingButtons()`. La premiere lit la map interne `UNIQUE_STATE_ARRAY_BY_BUILDING` (hutte-du-sage -> researchHouses, cairn-pierre -> cairns). La deuxieme combine `getBuildingById(id).unique === true` avec le comptage d instances dans state. La troisieme parcourt la map `UNIQUE_TOOL_TO_BUILDING` et applique la classe `disabled-unique` + `disabled=true` + pointer-events none sur le bouton correspondant quand le batiment est pose.
- `modules/interaction.js` : guard `isBuildingUniqueAndPlaced('hutte-du-sage')` avant placement dans les deux branches `case 'research'` (pose simple et pose strata). Empeche la double pose meme si le bouton n est pas encore grise au moment du clic.
- `main.js` : appel de `checkUniqueBuildingButtons()` a chaque tick lent (~1s), a cote de `checkCairnOverlay()`. Import ajoute depuis placements.js.
- Scope respecte : aucune modification de `data/*.json`, ni de `modules/ui/*`, ni de `hud.js`. Le bouton Cairn garde son traitement propre dans `age-transitions.js` (cinematique + conditions cumulatives).

---

## 2026-04-23 (session 14) : Lot C -- B8 B9 B12 B13 + U5 U8

### B8 -- save/load sans chevauchement panneau quetes
- `index.html` : `#save-controls` repositionne a `top: 16px; right: 312px` (decale de la largeur du panneau #quests + marge) pour eviter la superposition en haut a droite.

### B9 -- aide sans references editeur terrain
- `index.html` : suppression complete de l'ancien `#help-panel` (et de `#help-hint`, classes `.help-body`, `.help-header`) qui documentait les outils godmod editeur (Foret, Rocher, Filon, Champ, Baies, cadre bleu). L'aide active reste `#help-overlay` style Clair Obscur, deja centree sur le mode jeu.

### B12 -- liens SVG tech tree alignes sur bords cards
- `modules/ui/techtree-panel.js` : refonte du calcul des paths Bezier. Sortie au milieu du bord droit de la card source, entree au milieu du bord gauche de la cible. Tangentes horizontales proportionnelles a la distance (tension 0.5) au lieu de `midX` systematique. Cas particulier meme colonne (prereq vertical) : ancrage haut/bas avec tangentes verticales.

### B13 -- filtres branches tech tree operationnels
- `modules/ui/techtree-panel.js` : logique inversee. `filter.branches` est desormais l'ensemble des branches SURBRILLANCE (cliquees). `null` = aucun filtre actif, toutes visibles. Clic sur un filtre ajoute/retire la branche de l'ensemble. Ensemble vide = retour a null.
- `styles/techtree.css` : nouvelle classe `.ttp-node--faded` (opacity 0.2, grayscale 0.6, pointer-events none) appliquee aux cards hors branche filtree. Remplace `ttp-node--hidden` (display:none) qui masquait totalement et cassait la lisibilite structurelle du tree.

### U5 -- renommer ordre Placer en Placer bloc
- `index.html` : le bouton `data-tool="build"` dans la barre `ordres` affiche desormais `Placer bloc` au lieu de `Placer`, avec tooltip clarifiant qu'il s'agit de poser un bloc puise dans les stocks (terre ou pierre). Le raccourci `3` est inchange.

### U8 -- bouton disquette sauvegarde rapide bas droite
- `index.html` : nouveau bouton circulaire flottant `#btn-quicksave` (48x48 px, position fixed bottom:16 right:16). Au clic, appelle `saveGame('auto')` via un petit module inline qui importe `modules/persistence.js`. Feedback visuel : le bouton passe en vert 1.4 s avec toast "Partie sauvegardee". Placeholder UI en attendant la refonte complete.

---

## 2026-04-23 (session 14) : Lot A -- U6 U7 hutte du sage flag unique

### U6 U7 - Champs unique et _note sur la Hutte du sage
- `buildings.json` : ajout de `"unique": true` et `"_note": "flag unique consomme par Lot B"` sur le batiment `hutte-du-sage`.
- L'id `hutte-du-sage` etait deja correct depuis la session 11 (renommage precedemment fait). Aucune reference residuelle a un id `recherche` dans techtree.json, jobs.json ni gamedata.js.
- Linter cross-fichiers non impacte : toutes les references croisees restent valides.

---

## 2026-04-21 (session 13) : Lot C -- corrections bugs B4, B6, B7 + quick wins U1 U2 U3 U4

### B4 - Tech tree age II placeholder apres transition Bronze
- `techtree-panel.js` : `techStatus()` et `matchesQuery()` utilisent desormais `state.currentAge` comme source de verite (au lieu de la valeur statique `age >= 2`). Les colonnes d'ages inferieurs ou egaux a l'age courant ne sont plus floutees.
- Aucune tech n'etant encore definie pour l'age 2 dans `techtree.json`, un placeholder "Techs Bronze, a venir dans une prochaine session" s'affiche dans la colonne de l'age debloque mais sans tech.
- Les classes visuelles `ttp-age-head--locked` et `ttp-col--locked` sont desormais calculees par comparaison `ageNum > state.currentAge`.

### B6 - Filtres branche fonctionnels
- `techtree-panel.js` : les liens SVG entre prerequis sont masques si au moins un des deux noeuds appartient a une branche cachee (ajout de `branchId` dans la cartographie `nodePos`). La logique des toggles sur les boutons etait correcte mais les liens n'etaient pas filtres et le feedback visuel etait faible.
- `styles/techtree.css` : les boutons de filtre inactifs (branches masquees) ont maintenant un style barre (line-through), couleur attenuee, dot diminue. Contraste fort avec les boutons actifs.

### B7 - Escape ferme panneau sans ouvrir le menu pause
- `modules/interaction.js` : le listener Echap verifie desormais l'etat de trois panneaux plein ecran (`#ttp-root.open`, `#char-panel.open`, `#help-overlay.open`) avant de traiter le menu pause. Si un panneau est ouvert, l'evenement est ignore et le panneau gere sa fermeture via son propre listener. Le menu pause ne s'ouvre plus que lorsqu'aucun panneau n'est visible.

### U1 - Suppression de la fenetre Tech flottante obsolete
- `index.html` : retrait complet du bloc `#techs` (mini panel en haut a droite) et de son CSS (~80 lignes). Ajout d'un bouton flottant `#btn-techtree-float` (icone diagramme) sous `#btn-audio` pour ouvrir l'arbre XXL.
- `main.js` : cablage du nouveau bouton, compatibilite avec l'ancien id preservee.
- `hud.js` : `refreshTechsPanel()` devient silencieuse (early return si `techsBodyEl` absent).

### U2 - Boutons save/load/nouvelle partie deplaces
- `index.html` : retrait des 3 boutons depuis la barre `#actionbar > .group.controls`. Creation d'une zone dediee flottante `#save-controls` en haut a droite (pill avec blur, icones disquette/dossier/recycle, bouton Nouvelle en rouge pour clarte destructive). L'actionbar ne contient plus que des outils.

### U3 - Compteur temperature dans HUD meteo
- `index.html` : ajout d'un span `#season-temp` dans `#season-pill`.
- `main.js` : valeurs indicatives fixes par saison (Printemps 12°, Ete 22°, Automne 10°, Hiver -2°) mises a jour a chaque tick HUD saison.

### U4 - Page aide version courte par defaut + Voir tout
- `index.html` : nouvelle section `.ho-essentiel` en haut du `.ho-body` avec 5 lignes (deplacement ZQSD + souris, miner 2, placer 3, tech tree T, Echap pour sauvegarder). Wrapping `#ho-full-sections` (attribut `hidden`) autour des anciennes sections Camera, Outils, Actions, Menus. Bouton `#help-toggle-full` style dore.
- `help-overlay.js` : gere le toggle du bouton (texte "Voir tout" / "Masquer le detail", bascule l'attribut `hidden`).

---

## 2026-04-21 (session 13) : Lot D -- corrections bugs B2, B3, B5

### B2 - Son fanfare retravaille
- `modules/cinematics.js` : la fanfare synthetique utilise desormais 3 oscillateurs `sine` en accord Do majeur (Do4 261.63 Hz, Mi4 329.63 Hz, Sol4 392.00 Hz) avec enveloppe ADSR douce (attaque 0.05s, gain max 0.15, decay progressif sur 1.5s). Suppression des ondes `square`, du bruit impulsionnel et du filtre lowpass agressifs.

### B3 - Rendu voxel Cairn
- `modules/placements.js` : nouvelle fonction `makeCairn()` (colonne de 4 blocs BoxGeometry pierre grise empiles, scales decroissants, etoile OctahedronGeometry doree au sommet), `addCairn(gx, gz)` qui place le Group Three.js dans la scene et pousse dans `state.cairns`, `findFreeCellNear(cx, cz, maxRadius)` pour trouver une cellule libre en spirale autour du spawn.
- `modules/age-transitions.js` : `_onCairnClick` appelle `findFreeCellNear` puis `addCairn` avant de declencher la cinematique (delai 200ms pour laisser le mesh apparaitre).
- `modules/persistence.js` : serialisation `cairns[]`, restauration et reset dans `clearEverything`.
- `modules/state.js` : champ `cairns: []` ajoute dans Lot D.

### B5 - Bouton Cairn unique
- `modules/age-transitions.js` : `_cairnAlreadyBuilt()` detecte si `state.cairns.length > 0` ou `state.currentAge >= 2`. `checkCairnOverlay()` grise le bouton (opacity 0.4, pointer-events none, cursor not-allowed) quand le Cairn est deja pose. `initAgeTransitions()` appelle `checkCairnOverlay()` au boot pour gerer le reload apres passage en Bronze.

---

## 2026-04-21 (session 12) : Lot C -- hook refreshTechTreeAfterAgeChange pour Lot D

- Nouvelle fonction exportee `refreshTechTreeAfterAgeChange(age)` dans `modules/ui/techtree-panel.js`, egalement exposee sur `window` pour consommation par `age-transitions.js` (Lot D) sans import direct.
- Si le panneau est ouvert au moment de l'appel, re-render immediat (les techs nouvellement debloquees passent de teased a available/ready). Sinon, flag `dirty` consomme au prochain `openTechTreePanel()`.
- Source de verite inchangee : `TECH_TREE_DATA.ages[].unlocked` (SPEC v1). La fonction force uniquement le re-render DOM.

---

## 2026-04-21 (session 12) : Lot C -- UI Tech tree XXL (pan, zoom, filtres, anti-spoiler)

- Nouveau panneau plein ecran `modules/ui/techtree-panel.js` + noeuds `modules/ui/techtree-node.js`, feuille de style dediee `styles/techtree.css`.
- Ouverture via touche **T** ou bouton HUD (cablages existants dans `main.js`, non modifies). Fermeture via **Echap**, clic backdrop, ou bouton Fermer.
- Grille 7 ages x 6 branches, lecture directe de `TECH_TREE_DATA` (SPEC v1). `ROW_H` dynamique selon empilage max de techs dans la ligne (utile pour la branche outils age I, 4 techs).
- Etats visuels des noeuds : locked (opacite 0.3), available (bordure neutre), ready (glow bleu + bouton Rechercher), researching (progress bar, reserve), done (glow dore), teased (flou + `?????`). Les teased sortent leur `tech.id`, `branch` et cout du DOM pour prevenir toute lecture via devtools sur les ages 2+.
- Liens SVG Bezier entre prerequis, stroke dore plein si prereq debloque, pointille gris sinon. Les teased ne recoivent ni n'emettent de lien.
- Pan : drag souris sur le stage (cursor grab/grabbing). Zoom : molette de 0.5x a 2x, centre sur la position du curseur. Une seule transform CSS translate+scale, perf OK pour 48x48x8+.
- Filtres par branche : toggle par branche en haut, bouton `Toutes` pour reset. Recherche texte : filtre en opacity 0.18 les noeuds dont le nom ou l'id ne contient pas la query. Les teased ne matchent jamais (preserve la surprise).
- Deblocage : `unlockLocal` puise dans `state.researchPoints`, ecrit `state.techs[id].unlocked = true`, appelle `refreshTechsPanel` puis re-render. Pas de modification de `data/*.json`, pas de modification de `tech.js`, `jobs.js`, `needs.js` (scope Lot C respecte).
- `techtree-ui.js` devient un shim qui delegue au nouveau panel, ce qui evite de toucher a `main.js`.

---

## 2026-04-21 (session 12) : Lot B -- moteur comportemental, besoins Faim + Sans-abri

- **Pre-fix SPEC v1** (commit `lot-B: pre-fix SPEC v1`) : `main.js` injecte les techs du JSON gele en normalisant `cost: { research: N }` vers number et `requires: []` vers le champ plat `req`, le champ `requires[]` etant conserve a cote. `tech.js/unlockTech` accepte un tableau de prerequis (iteration sur `t.requires`) en plus du `t.req` legacy.
- Nouveau module **`modules/needs.js`** : lecture `needs.json` via `gamedata.js`, initialisation `c.needs` Map par colon, tick des jauges (hunger monte a `need.rate * 100% /s`), evaluation des regles (shelter via `assignedBuildingId`), calcul `productivityMul` compose en parsant `effects.productivity_N%`. Seuils `THRESHOLD_LOW = 50%`, `THRESHOLD_CRITICAL = 80%`.
- Nouveau module **`modules/tasks.js`** : scheduler de taches par colon. Constantes `PRIORITY` (SURVIVAL 100, WORK 60, LEISURE 30, IDLE 10) et `TASK_KIND`. Fonctions `enqueueTask`, `peekTask`, `popTask`, `hasTaskOfKind`, `clearLowPriorityTasks`, `canPreempt`. Renomme depuis `jobs.js` pour eviter collision avec les marqueurs de minage du joueur et `data/jobs.json` (metiers).
- **`state.js`** : champs `needsTickAccum`, `needsBuckets` (cache d index needs.json).
- **`colonist.js`** :
  - instance recoit `needs` (Map), `jobQueue` (Array), `currentTask`, `assignedBuildingId`, `productivityMul`, `wasAttacked`.
  - `initColonistNeeds(this)` au constructeur.
  - En IDLE, si `isNeedCritical(this, 'hunger')`, le colon abandonne tout et appelle `pickHarvest` en priorite SURVIVAL (jour et nuit).
  - Fin de WORKING sur un buisson : si `currentTask.kind === EAT_SEEK_FOOD`, les baies sont mangees sur place (baisse de hunger data-driven via `satisfied_by[berries].amount / 20` par baie), sinon elles vont au stock (cueillette leisure).
  - `spawnColonsAroundHouse` attribue `assignedBuildingId = 'cabane'` a chaque colon, fixant le besoin shelter.
  - Restauration de save : `assignedBuildingId` lu depuis la save si present, sinon attribue 'cabane' par defaut tant qu une maison existe.
- **`main.js`** : `tickAllNeeds(dt)` appele a chaque frame avant la MAJ des colons.
- `productivityMul` est expose sur chaque colon. Le cablage avec les vitesses de production (placements.js, tech.js) est un ticket separe post-Lot-B.
- Scope respecte : pas de modification de `data/*.json`, `ui/*`, `hud.js`, `placements.js`, `techtree-ui.js`.

---

## 2026-04-21 (session 12) : Lot D -- Monument Cairn, conditions Bronze, cinematique de passage

### Nouveaux fichiers
- `modules/age-transitions.js` : logique complete du passage Age de Pierre vers Age du Bronze.
  - `canBuildCairn(state)` : verifie les 7 conditions cumulatives (population, stocks bois/pierre/nourriture, hutte du sage, chercheur, points de recherche). Retourne `{ ok, missing }`.
  - `getCairnProgress(state)` : ratio 0-1 de progression (pour le badge "Monument proche").
  - `triggerAgeTransitionBronze()` : declenche la cinematique puis applique la bascule d'age.
  - `initAgeTransitions()` : injecte le bouton Cairn dans le groupe "Monument" de l'actionbar.
  - `checkCairnOverlay()` : appele en tick lent (1s), met a jour le badge et l'etat visuel du bouton.
  - Flag `DEV_SKIP_BONES = true` : bypass la condition "os" tant que Lot B (Chasseur) n'est pas livre.
- `modules/cinematics.js` : cinematique generique `playCinematic({ title, subtitle, onEnd })`.
  - Fanfare synthetique Web Audio API (aucun fichier MP3).
  - Sequence : fade noir 1s, titre "AGE DU BRONZE" 2s, son fanfare 0.5s, fade retour 1s.
- `styles/cinematic.css` : overlay noir, titre epique, badge "Monument proche", tooltip conditions Cairn.

### Modifications
- `modules/state.js` : ajout `currentAge = 1`, `ageUnlockedAt`, `achievements`.
- `modules/persistence.js` : serialisation et restauration de ces trois champs. Reinitialisation dans `clearEverything()`.
- `modules/gamedata.js` : ajout `getBuildingsForAge(n)` et `getTotalFood(state)`.
- `index.html` : `<link>` vers `cinematic.css`, trois divs Lot D (`#cinematic-overlay`, `#cairn-overlay-badge`, `#cairn-conditions-tooltip`).
- `main.js` : import et appel de `initAgeTransitions()` au boot, `checkCairnOverlay()` dans le tick lent.

### Definition of Done partielle
- Conditions verifiees, bouton Cairn grise (visuel) si conditions non reunies, tooltip au survol.
- Badge "Monument proche" apparait quand progression > 80%.
- Cinematique : fade noir + titre "AGE DU BRONZE" + fanfare + fade retour.
- `state.currentAge = 2`, `state.achievements` enregistre l'evenement, sauvegarde checkpoint auto.
- Persistance : reload apres passage confirme `state.currentAge === 2`.

### Ticket ouvert pour Lot C
- `techtree-panel.js` doit tenir compte de `state.currentAge` dans `techStatus()` pour que les techs Bronze deviennent "recherchables" (et non "teased") apres la transition. La condition actuelle `(tech.age >= 2) => 'teased'` ne lit pas `state.currentAge`. Lot D appelle deja `refreshTechTreeAfterAgeChange(2)` en import dynamique -- Lot C doit exposer cette fonction.

---

## 2026-04-21 (session 11) : Lot A -- SPEC v1 gelee, JSON data-driven age I complet

- **BREAKING** : `data/techtree.json` et `data/buildings.json` protos remplacés par les versions SPEC v1 gelées.
- Nouveau `data/resources.json` (13 entrees) : toutes les ressources age I + stubs cuivre/charbon age II.
- `data/techtree.json` reécrit (SPEC v1) : 7 ages (1 actif, 2-7 stubs), 6 branches, 13 techs age I exhaustives.
- `data/buildings.json` reécrit (SPEC v1) : 11 batiments age I (habitation, production, recherche, alimentation, nocturne, monument). Cairn avec `onBuild: trigger_age_transition_bronze`.
- Nouveau `data/jobs.json` (8 metiers age I) : Cueilleur, Bucheron, Mineur, Chasseur, Chercheur, Astronome, Terrassier, Explorateur.
- Nouveau `data/needs.json` (3 besoins age I) : Faim, Sans-abri, Blesse.
- `modules/gamedata.js` etendu : charge les 5 nouveaux JSON, expose 5 accesseurs (`getTechsForAge`, `getBuildingById`, `getJobsRequiringTech`, `getNeedsForAge`, `getResourceById`), linter cross-fichiers au boot, 7 tests unitaires purs (`runUnitTests()`).
- Schema SPEC v1 gele -- tout changement de schema necessite un bump vers v2 avec validation utilisateur.
- Note pour Lot B/C : `modules/tech.js` et `modules/techtree-ui.js` sont a adapter pour lire les nouveaux JSON au lieu des donnees hardcodees.

---

## 2026-04-20 (session 10) : MVP cycle jour/nuit (axe 4.2)

- Nouveau module `modules/daynight.js` : toggle manuel via touche **N** ou icône HUD soleil/lune, transition d'ambiance lissée (~1.5s) sur la couleur de fond, fog, directional light (intensité 2.4 le jour, 0.35 la nuit, teinte lunaire bleutée), hemisphere light et uniforms du Sky.
- Nouvelle ressource `state.nightPoints` (int) et `state.isNight` (bool), sérialisées dans les sauvegardes.
- Nouveau placement "Promontoire d'observation" (touche **P**, bouton dans la barre Construire) : tour simple en pierre et bois avec une étoile dorée au sommet. Quand un colon IDLE y stationne la nuit, +1 point nocturne toutes les 5 secondes.
- HUD : pastille soleil/lune (clic pour basculer) à côté de la pastille saison, nouvelle ligne "Points nocturnes" dans le panneau Ressources.
- Colons : la nuit, attirance vers le foyer le plus proche (feu de camp social) depuis l'état IDLE, moral nocturne cumulé tant qu'ils sont proches d'une maison ou d'un manoir. La cueillette de baies (`pickHarvest`) est désactivée la nuit (activité exclusive jour).
- Nouvelle chaîne de bâtiments "Astronomie" dans `data/buildings.json` : Promontoire, Observatoire, Grand télescope, Radio-télescope.
- Overlay d'aide (touche H) et guide texte mis à jour avec les touches **N** (jour/nuit) et **P** (promontoire).

---

## 2026-04-20 (session 9) : Data-driven configs JSON (axe 1.5)

- Nouveau dossier `data/` avec trois fichiers JSON : `speech.json` (phrases, dialogues, bulles contextuelles), `colonists.json` (prénoms M/F), `quests.json` (définitions des quêtes).
- Nouveau module `gamedata.js` : charge les trois fichiers en `Promise.all` au démarrage, exports en live bindings ES6.
- `constants.js` allégé de ~200 lignes : ne contient plus que des constantes numériques et `THREE.Color`.
- `colonist.js`, `speech.js`, `tech.js`, `quests.js` importent depuis `gamedata.js` au lieu de `constants.js`.
- `quests.js` : `QUEST_DEFS` devient un `let` initialisé par `initQuestDefs()` après chargement des données.
- `main.js` : `await loadGameData()` + `initQuestDefs()` avant `buildTerrain()`.
- Ajouter une phrase ou une quête ne nécessite plus de toucher au code JS.

---

## 2026-04-20 (session 8) : Landing enrichie, menu pause, navigation accueil

### Landing page (`/strates/index.html`)
- Section "Mécaniques" (4 cartes : colons nommés, saisons, ressources, recherche) avec icônes SVG.
- Section "Moments de jeu" (3 vignettes CSS animées : premier hiver avec flocons, minage d'un filon avec étincelle, recherche active avec labo).
- Section "Origine FDA" : logo Forge des Âges, texte de filiation, lien vers `jeux.fmenguy.fr/fda/`.
- Bulles rotatives dans la scène héros : cycle toutes les 7 s sur les vraies phrases du jeu.
- Panneau "Charger une partie" depuis l'accueil : lit le localStorage, affiche les 5 slots manuels + slot auto avec métadonnées (date, nb colons, cycle). Bouton "Charger" grisé si slot vide.
- Menu contextuel "Continuer / Nouvelle partie" : si une sauvegarde existe, le bouton 01 devient "Continuer" et un bouton "Nouvelle partie" apparaît. La vraie nouvelle partie passe un flag `strates-new-game` et ignore les saves existantes.

### Jeu (`editor/`)
- Menu pause (Échap) dans le style du jeu : Continuer, Sauvegardes, Retour à l'accueil.
- `main.js` : lecture de `strates-pending-load` (charger un slot spécifique) et `strates-new-game` (ignorer les saves) au démarrage.
- Mini-map retirée (non fonctionnelle, à réintroduire plus tard).

### Roadmap
- Axe 1.5 coché, axes 2.1 et 5.4 cochés, cases détaillées mises à jour.

---

## 2026-04-19 (session 7) : Abattage d'arbres et hache en pierre (axe 3.2 MVP)

### Nouvelle tech
- `axe-stone` (Hache en pierre), coût 4 pts, âge de pierre, sans prérequis. Débloque l'abattage des arbres.

### Abattage
- L'outil **Miner (2)** détecte désormais si la tuile contient un arbre.
  - **Arbre présent** : le colon abat l'arbre, remplit `resources.wood`, l'arbre est retiré du mesh. Le voxel sous reste en place.
  - **Filon** : extraction (session 6).
  - **Sinon** : minage classique.
- `canMineCell` requiert `axe-stone` pour les tuiles à arbre. Sans la tech, bulle indice bleue "Il nous faudrait une hache pour cet arbre".
- Nouveau helper `isTreeOn(x, z)` et `chopTreeAt(x, z)` dans `placements.js`.

### Audio playlist par âge
- Refactor `modules/audio.js` : lecteur `<audio>` HTML5 avec crossfade 2,5 s.
- Mapping âge → fichier dans `public/strates/editor/audio/stone.mp3`, `bronze.mp3`, `iron.mp3`, `gold.mp3`.
- README dans `public/strates/editor/audio/` avec sources suggérées (Pixabay, FMA, OpenGameArt, Incompetech).
- Âge courant déduit automatiquement des pioches débloquées.

---

## 2026-04-19 (session 6) : Extraction des filons (axe 3.1)

### Extraction
- Les filons sont désormais récoltables via l'outil **Miner (2)**.
- Le colon se rend sur la tuile du filon, anime le minage, puis :
  - **si cellule avec filon** : retire le filon, incrémente le stock correspondant (`copper`, `iron`, `coal`, `silver`, `gold`, `amethyst`), laisse le voxel sous intact.
  - **sinon** : minage normal, retire le voxel top, incrémente `stone` ou `dirt`.
- `extractOreAt(x, z)` dans `placements.js` retire proprement le filon et renvoie son type.
- `isMineBlocked` allégé : ne bloque plus sur filon, seulement maison et buisson.

### Gating tech côté joueur
- `applyToolAtCell` et `applyToolToStrata` appellent désormais `canMineCell` avant `addJob` et enregistrent `lastBlockedMineTech` si la tech manque, ce qui déclenche la bulle indice bleue.
- Le minerai suit le mapping `ORE_TECH` existant : cuivre/charbon → `pick-bronze`, fer/argent → `pick-iron`, or/améthyste → `pick-gold`.

### Doc
- Panneau d'aide mis à jour : section dédiée à l'extraction des filons.

---

## 2026-04-19 (session 5) : Saisons, audio lofi, décorations végétales

### Cycle de saisons
- Nouveau module `seasons.js` : 4 saisons (printemps, été, automne, hiver), 120 s chacune, 8 min par cycle complet.
- Transition linéaire sur les 20 dernières secondes de chaque saison.
- Palette de tints multiplicatifs par biome (grass, forest, snow, sand) + champs, appliquée sur les voxels top toutes les 2 s.
- Printemps : herbe vive, fleurs. Été : vert saturé, champs dorés. Automne : feuillage roux/bronze. Hiver : palette ternie, champs au repos.
- Sauvegarde de l'état saison dans le snapshot (idx, elapsed, cyclesDone).
- Pastille HUD en haut centre avec icône emoji et nom de saison.

### Décorations végétales
- Nouveau module `vegetation.js` : 3 InstancedMesh (brins d'herbe, fleurs, épis de blé).
- Brins d'herbe : dispersés sur biomes grass (dense) et forest (épars), 2 à 6 brins par tuile concernée.
- Fleurs : 5 couleurs (rose, jaune, lavande, corail, blanc), clairsemées sur herbe (~7% de densité).
- Épis de blé : 10 à 18 par tuile `field`, petites barres verticales dorées.
- `buildVegetation()` reconstruit tout à partir de `cellBiome` / `cellSurface`, appelé après `populateDefaultScene`, après `loadGame` et dans `resetWorld`.
- `clearVegetation()` vidage propre lors des resets.

### Audio lofi procédural
- Nouveau module `audio.js`, Web Audio API, aucun fichier externe.
- Drone bas deux oscillateurs détunés (La1/Mi2), filtre lowpass, vibrato LFO lent.
- Arpège aléatoire pentatonique, notes 2-5 s espacées, filtre résonant.
- Noise bandpass 800 Hz très discret pour texture cassette.
- Bouton HUD flottant `♪` qui toggle mute. État muté par défaut (respect autoplay policies), mémorisé en localStorage.
- Démarrage au premier geste utilisateur, fondu doux.

### Plus
- Correction persistance : sauvegarde/restauration de l'état saison (idx, elapsed, cyclesDone).

---

## 2026-04-19 (session 4) : Modularisation ES6 et persistance localStorage

### Modularisation (axe technique 1.1)
- Découpage de `main.js` (3533 lignes) en 18 modules ES6 natifs dans `public/strates/editor/modules/` : `constants`, `state`, `rng`, `scene`, `terrain`, `placements`, `stocks`, `tech`, `pathfind`, `jobs`, `bubbles`, `speech`, `colonist`, `quests`, `worldgen`, `interaction`, `camera-pan`, `hud`.
- `main.js` devient un bootstrap de 25 lignes qui importe et démarre la tick loop.
- Pas de bundler, imports ES6 natifs relatifs, importmap Three.js inchangée.
- Etat mutable partagé via un objet container `state` exporté par `state.js` (contourne les limites des `let` exportés).
- PRNG réassignable via container `prng` pour permettre à worldgen de changer le seed.
- Aucune régression fonctionnelle (terrain, colons, pathfind, bulles, jobs, tech tree, Shift+strate, ZQSD, quêtes).

### Persistance localStorage (axe technique 1.2)
- Nouveau module `persistence.js` avec `saveGame`, `loadGame`, `hasSave`, `deleteSave`, `startAutoSave`.
- Format JSON versionné (v1), clé `strates-save-auto`.
- Sauvegarde complète du terrain (heightmap, biomeNoise, cellTop, cellBiome, cellSurface, cellOre), des entités (arbres, rochers, filons, buissons, maisons, labo), des colons (id, nom, genre, chef, position, état, labo assigné), des jobs, stocks, techs, ressources, stats, quêtes.
- Sauvegarde auto toutes les 30 s, au `beforeunload` et au passage en onglet caché.
- Au démarrage, si une save existe elle est chargée automatiquement, sinon `populateDefaultScene` génère un monde neuf.
- Nouveaux boutons HUD : "Sauver" (manuel), "Charger" (recharge la save auto), "Nouvelle" (confirme puis efface la save et regénère).
- Reconstruction du terrain via nouvelle fonction `rebuildTerrainFromState()` dans `terrain.js` qui recrée l'InstancedMesh sans régénérer le Perlin.
- `Colonist` accepte désormais une option `restore` pour forcer nom, genre, chef, ty, state, researchBuildingId.
- `addBush` retourne désormais le bush créé (au lieu de `true`) pour permettre la restauration des baies et regenTimer.

---

## 2026-04-19 (session 3) : Colons vivants, hints, tech tree visuel, monde peuplé

### Colons enrichis
- Silhouettes retravaillées : torse + jambes + bras + tête + cheveux différenciés M/F.
- François porte une couronne dorée voxel (base + 4 pointes) à la place de la simple étoile de bandeau.
- Animation de marche : swing jambes et bras en opposition, bob vertical calé sur le pas.
- Retour au repos progressif (lerp) quand le colon passe en IDLE, WORKING ou RESEARCHING.

### Noms permanents au-dessus de la tête
- Étiquette nom + genre (+ étoile chef) affichée en permanence au-dessus de chaque colon (auparavant seulement au survol).
- Bulle de dialogue remontée à y=2.75 pour ne pas chevaucher l'étiquette.
- Suppression du toggle HUD "Afficher les noms dans les bulles". Les bulles ne portent plus jamais le nom (pensée intérieure du colon).

### Bulles indice bleues
- Nouvelle variante `sayHint(line)` dessinant une bulle bleu pâle cerclée de bleu vif avec une pastille jaune style ampoule.
- Utilisée automatiquement pour les situations pédagogiques : minage bloqué par manque de tech, champs posés sans labo, labo sans chercheur.
- Durée d'affichage rallongée (6 s vs 4 s) pour laisser le joueur lire.

### Monde peuplé au spawn
- Forêts denses en bosquets de 3 à 6 arbres (~55 arbres en zone forêt), plus 15 arbres isolés sur herbe à distance du hameau.
- 30 rochers répartis (majorité montagne, quelques-uns épars sur herbe).
- 10 filons initiaux (cuivre, fer, charbon, argent, or) en montagne.
- 14 buissons de baies distribués sur herbe et forêt.
- 3 parcelles de champs cultivés pré-posées autour du hameau.

### Tech tree visuel
- Panneau `#techs` refait : cards avec pastille colorée (pierre grise, bronze, fer, or), nom, âge, barre de progression remplie par les points de recherche accumulés.
- Connecteurs verticaux entre techs, colorés quand la tech précédente est débloquée.
- États visuels : locked, available, ready (glow bleu), done (glow doré).
- Bouton de recherche stylisé (gradient, hover lift).

---

## 2026-04-19 (session 2) : Stocks, Placer, Tech tree, Bords eau, Shift-sélection

### Stocks de ressources
- Objet `stocks` avec 8 types : `stone, dirt, copper, silver, iron, coal, gold, amethyst`.
- Incrément automatique au minage selon le biome (`incrStockForBiome`).
- Affichage HUD compact sous "Ressources", types vides masqués.

### Outil Placer (raccourci 3)
- Nouveau job `buildJobs` séparé de `jobs`.
- Marker vert clair semi-transparent sur la tile cible.
- Contraintes : tile libre, hors eau, hauteur max, portée verticale colon <= 3.
- Exécution : A\*, animation bounce 1,5 s, voxel ajouté, biome conservé, stock consommé.
- Clic droit bref annule le job.
- `InstancedMesh` sur-alloué (GRID x GRID slots) pour absorber les voxels posés.

### Tech tree et gate minage
- 4 techs : `pick-stone` (5 pts) → `pick-bronze` (15) → `pick-iron` (30) → `pick-gold` (60).
- `canMineCell` : roche/neige gate par `pick-stone`, filons gate par `ORE_TECH`.
- Jobs refusés declenchent bulle contextuelle (cooldown 60 s par tech).
- Panneau HUD "Tech" avec bouton "Rechercher" et flash doré au déblocage.

### Bâtiment de recherche et points de recherche
- Outil Recherche (raccourci 0), toit bleu (`#3c7fb8`).
- Attribution automatique du colon IDLE le plus proche au placement.
- Etat `RESEARCHING` : 1 pt toutes les 3 s, bob lent, orienté vers le bâtiment.
- Effacer un labo : colons attribués repassent en IDLE proprement.
- Bulles contextuelles : `field-no-research` et `empty-lab`.

### Bords de carte insulaire
- Falloff `smoothstep` sur la heightmap : ring extérieur 3 tiles forcé à eau profonde, ring 2 tiles intermédiaires à eau peu profonde.
- A\* : eau profonde bloquante, eau peu profonde traversable.

### Shift + sélection de strate
- Shift + clic gauche lance un BFS : sélectionne toutes les tiles du même biome à la même hauteur, max 200.
- Applique l'outil actif sur toute la sélection en une opération.

### Correctifs divers
- Pinceau default corrigé de 3 à 1 (moins surprenant au minage).
- Q/D inversés corrigés (vecteur right recalculé).
- Champs et baies contraints à biome herbe ou forêt.
- Filons contraints à biome roche ou neige.
- Toggle affichage prénoms colons (bouton HUD).
- Prénoms absents des bulles par défaut.

---

## 2026-04-19 (session 1) : Fusion proto1-5 en éditeur consolidé

### Proto1 (référence)
- Terrain Perlin FBM avec biomes 5 types.
- Rendu Three.js, face culling, chunks 16x16.
- Caméra : clic gauche rotation, clic droit pan, molette zoom (style que l'utilisateur préfère).
- Eau double plan avec shader ondulations.
- Sky shader + EffectComposer (UnrealBloom + vignette).

### Proto2 (abandon)
- Pinceau de sculpt terrain direct (élever/abaisser/niveler).
- Bonne idée conservée en concept : l'outil de sculpt existe comme outil in-game pour les colons, pas comme pouvoir divin.

### Proto3 (référence visuelle)
- Style Dorfromantik confirmé (palettes désaturées, post-process léger).
- Minage par désignation de zone, premier proof-of-concept colons.
- Filons cyclables 6 types (cuivre, argent, fer, charbon, or, améthyste).

### Proto4 (référence gameplay)
- Colons avec identité (nom, genre), bulles de dialogue.
- Machine à états : IDLE / MOVING / WORKING / wander.
- A\* pathfinding avec gravité (tombe si sol retiré).
- Barre de placement : arbres, rochers, filons, maisons, champs.
- Spawn 2 colons par maison. François = chef (étoile dorée).
- Colons contraints au biome (champs sur herbe, filons sur roche).

### Proto5 (partiel, fusionné)
- Baies, bâtiment de recherche (concept initial).
- Quêtes basiques.

### Éditeur consolidé
- Fusion en un seul fichier `main.js` (~2500 lignes).
- Anciens protos supprimés.
- ZQSD pour panner la caméra (ajout confirmé).
- Sélection Shift + BFS strate.
- Hameau par défaut enrichi avec bâtiment de recherche et colon attribué.
- `InstancedMesh frustumCulled = false` pour arbres/rochers (fix bug ombres visibles mais mesh absent).
