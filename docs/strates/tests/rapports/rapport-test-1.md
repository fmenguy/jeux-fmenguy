# Rapport de test Strates

Date : 2026-04-23

## 1. Nouvelle partie

Statut : WIP

Commentaire :
Une erreur en console au chargement : 
gamedata.js:266 [gamedata linter] OK -- toutes les references croisees sont valides.
index.html:1532 Uncaught TypeError: Cannot read properties of null (reading 'classList')
    at index.html:1532:40

bug B8 : enleve totalement l'affichage de ce menu de toutes maniere on l'a déjà dans le bouton echap : sauvegardes donc ça ne sert à rien, ça fait doublon.

les colons vont bien chercher tout seul des baies et de la pierre de base, je remarque que les arbres bouge tout seul au moment de la récolte de ces derniers, je pense qu'il faut enlever le fait que les colons puisse d'eux même récolter les ressources en automatique, car le joueur ne joue pas vraiment, il attends, ça ne vas pas. Je te demande donc de developper les boutons pioche, hache et ramassage de baie que je t'ai donné dans le recap du test 2.

le jeu lag aussi, c'est pas normal, voir l'état image 1 dans les dl

## 2. Construction base

Statut : OK

Commentaire :
Tout est ok mais je peux miner un bloc sous le promontoire, faut pas qu'on puisse miner la fondation d'un batiment.

## 3. Quêtes tutoriel

Statut : OK

Commentaire :
Les quetes sont directement faites par les colons en automatique, faudra revoir cela pour le jeu car le joueur ne fait rien de spécial pour réaliser la quete. Donc faut prévoir une refonte des quetes, avec des objectifs et des récompenses.

## 4. Collecte ressources

Statut : OK

Commentaire :
ça fonctionne mais voir commentaire du test 1, on va changer ce fonctionnement.

## 5. Construction Cairn

Statut : KO

Commentaire :
je ne peux pas valider la condition des 100 points de recherche car j'ai recherché toutes les technologie, d'ailleurs ça va bcp trop vite, il faudrait que les recherche soit pas aussi rapide, de plus on a plein de recherche et on ne sait pas ce qu'elle font, tu n'as pas lu mes commentaires du test 2 ? j'ai demandé des ajouts de texte et de fenettre je vois rien. Le seul truc qui a changé c'est les filtres qui fonctionne bien. les relations de dépendances fonctionne aussi mais vu que toutes les recherches sont sur la même colonne on ne voit rien. Je pense qu'il faut revoir entierement le menu de l'arbre de recherche.

## 6. Transition Bronze

Statut : non testé

## 7. Tech tree (touche T)

Statut : WIP

Commentaire :
dans l'ensemble c'est mieux car les filtres fonctionne mais on voit mal les dépendances car tout en colonne, le bouton t et echap fonctionne comme attendu,

## 8. Aide en jeu (touche H)

Statut : OK

Commentaire :
J'adore ce nouveau menu, il est carrément mieux que l'ancien ! Avec la touche H ça fonctionne mais avec le bouton ? en bas à droite non.
J'ai cette erreur, idem pour le son : 

index.html:1514 Uncaught TypeError: Cannot read properties of null (reading 'classList')
    at HTMLButtonElement.open (index.html:1514:15)
open @ index.html:1514
ete.mp3:1  GET http://localhost:4321/strates/editor/audio/ete.mp3 404 (Not Found)

## 9. Save / Reload

Statut : OK

