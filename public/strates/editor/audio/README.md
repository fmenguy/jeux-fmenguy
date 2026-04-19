# Pistes audio Strates

Déposez ici les fichiers audio du jeu, un par âge. Le code `modules/audio.js` les charge via `<audio>` HTML5 et fait un crossfade de 2,5 s quand l'âge change.

## Fichiers attendus

| Fichier | Âge | Ambiance suggérée |
|---|---|---|
| `stone.mp3`  | âge de pierre  | ambient primitif, percussions sourdes, flûte, didgeridoo, nature |
| `bronze.mp3` | âge du bronze  | tribal chaleureux, harpe, cordes douces |
| `iron.mp3`   | âge du fer     | médiéval lyrique, luth, violon, chants choraux doux |
| `gold.mp3`   | âge de l'or    | fastueux, piano, cordes solennelles |

Ajoutez plus tard `industrial.mp3`, `modern.mp3`, `atomic.mp3`, `space.mp3` à mesure que les âges futurs s'implémentent (ajouter le mapping dans `TRACKS` côté `audio.js`).

## Où trouver des musiques libres

- **Pixabay Music** : <https://pixabay.com/fr/music/> — licence Pixabay (usage commercial autorisé, attribution non requise mais bienvenue).
- **Free Music Archive** : <https://freemusicarchive.org/> — vérifier la licence CC par piste.
- **OpenGameArt** : <https://opengameart.org/art-search-advanced?field_art_type_tid%5B%5D=12> — tag "Music".
- **Kevin MacLeod** : <https://incompetech.com/music/> — CC-BY 4.0, attribution requise.

## Format conseillé

- MP3 ou OGG (les deux fonctionnent en navigateur moderne).
- Mono ou stéréo, 128 à 192 kbps suffit (cohérent avec un jeu web léger).
- **Boucle propre** : préférer des pistes qui bouclent sans coupure audible (le lecteur met `loop = true`).
- Durée 2 à 5 minutes idéale (plus court = répétition perceptible, plus long = gourmand à télécharger).

## Attribution

Si la licence l'exige, créditer les auteurs dans `docs/strates-credits.md` (à créer).
