# assets/heroes/

Dossier pour les images de héros générées.

## Format recommandé
- **Dimensions** : 300×400px minimum (ratio 3:4, portrait)
- **Format** : PNG ou JPEG
- **Cadrage** : Buste ou mi-corps, fond neutre ou transparent
- **Style** : Cohérent avec l'univers medieval-fantasy

## Nommage des fichiers
Utilise l'**id** du héros correspondant dans `js/data.js` :

| Fichier           | Héros              | Classe          |
|-------------------|--------------------|-----------------|
| `dain.png`        | Daïn Piedlor       | Guerrier Nain   |
| `aeris.png`       | Aeris Ventpâle     | Archère Elfe    |
| `sylva.png`       | Sylvara Brasier    | Mage Offensif   |
| `borin.png`       | Borin Rempart      | Protecteur      |
| `rogue.png`       | Lirien l'Ombre     | Espion          |
| `healer.png`      | Elara Lumisoin     | Soigneur        |
| `guard2.png`      | Throk Roc          | Protecteur Nain |
| `zorah.png`       | Zorah Cendres      | Mage Légendaire |
| `ranger.png`      | Sylwen Arc-d'Argent| Explorateur     |
| `bard.png`        | Orren Voix-d'Or    | Barde           |
| `witch.png`       | Mara Lunaire       | Entraveur       |
| `monk.png`        | Solan Poing-Sacré  | Moine           |

## Intégration dans le code
Dans `js/data.js`, modifier le champ `imagePath` du héros concerné :
```js
{
  id: 'dain',
  imagePath: 'assets/heroes/dain.png', // était null
  ...
}
```

## Prompts Flux.dev suggérés

### Daïn Piedlor (Guerrier Nain)
```
dwarf male warrior, medieval fantasy, battle axe, full plate armor, 
dark stone dungeon background, dramatic rim lighting, portrait, 
3/4 view bust shot, photorealistic digital art, dark fantasy style
```

### Aeris Ventpâle (Archère Elfe)
```
female elf archer, long bow, stone-tipped arrows quiver, leather armor,
forest ruins background, silver white hair, pointed ears, 
portrait 3/4 view, soft lighting, photorealistic dark fantasy
```

### Sylvara Brasier (Mage Offensive)
```
female elf mage, red fire staff glowing, red robes, flames around hands,
dark cave background, fiery eyes, elven features, fantasy portrait,
dramatic fire lighting, photorealistic digital art
```

### Borin Rempart (Protecteur Humain)
```
human male warrior tank, large shield, one hand sword, heavy plate armor,
shield glowing with holy light, stoic expression, dungeon background,
portrait 3/4 view, photorealistic dark fantasy
```
