# Pistes audio Strates

Déposez ici les fichiers audio du jeu, **un par saison**. Le code `modules/audio.js` les charge via `<audio>` HTML5 et fait un crossfade de 2,5 s quand la saison change.

## Fichiers attendus

| Fichier | Saison | Ambiance suggérée |
|---|---|---|
| `printemps.mp3` | printemps | frais, flûte/piano doux, chant d'oiseaux léger |
| `ete.mp3`       | été      | lumineux, cordes chaleureuses, guitare acoustique |
| `automne.mp3`   | automne  | mélancolique, piano feutré, hautbois, harpe |
| `hiver.mp3`     | hiver    | feutré, clochettes, cordes graves, silence habité |

Les saisons changent toutes les 2 minutes (8 min par cycle complet). Le lecteur crossfade entre pistes sur 2,5 s, donc les débuts/fins abrupts sont atténués naturellement.

## Où trouver des musiques libres

- **Pixabay Music** : <https://pixabay.com/fr/music/> — licence Pixabay (usage commercial autorisé).
- **Free Music Archive** : <https://freemusicarchive.org/> — vérifier la licence CC par piste.
- **OpenGameArt** : <https://opengameart.org/art-search-advanced?field_art_type_tid%5B%5D=12> — tag "Music".
- **Kevin MacLeod** : <https://incompetech.com/music/> — CC-BY 4.0, attribution requise.

## Format conseillé

- MP3 ou OGG (les deux fonctionnent en navigateur moderne).
- Mono ou stéréo, 128 à 192 kbps suffit.
- **Boucle propre** : préférer des pistes qui bouclent sans coupure audible (le lecteur met `loop = true`).
- Durée **2 à 4 minutes** idéale, taille cible **2 à 4 Mo** par fichier, max 5 Mo.

## Attribution

Si la licence l'exige, créditer les auteurs dans `docs/strates/credits.md` (à créer).
