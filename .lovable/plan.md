
# Extraction automatique de la marque depuis la description

## Objectif
Quand la colonne "Marque" est absente ou vide dans l'Excel, extraire automatiquement la marque depuis le champ titre/description en la comparant aux marques existantes du catalogue.

## Logique
Apres avoir charge les marques du catalogue (ligne ~292-299), ajouter une fonction `extractBrandFromTitle(title, brandNameMap)` qui :
1. Decoupe le titre en mots
2. Compare chaque mot (normalise) aux noms de marques du catalogue
3. Retourne la premiere marque trouvee, ou `null` si aucune correspondance

## Modification dans `src/services/stockImportService.ts`

### Nouvelle fonction `extractBrandFromTitle`
```text
function extractBrandFromTitle(
  title: string, 
  brandNames: string[]
): string | null {
  const normalizedTitle = normalize(title);
  for (const brand of brandNames) {
    if (normalizedTitle.includes(normalize(brand))) {
      return brand; // Retourne le nom exact du catalogue
    }
  }
  return null;
}
```

### Integration dans `importStockItems`
Apres la resolution de la marque (ligne ~371-372), si `matchedBrand` est toujours `null`, appeler `extractBrandFromTitle` avec le titre :

```text
// Ligne ~372 existante :
const matchedBrand = rawBrand 
  ? (brandNameMap.get(normalize(rawBrand)) || rawBrand) 
  : null;

// Ajout : fallback extraction depuis le titre
const finalBrand = matchedBrand 
  || extractBrandFromTitle(title, Array.from(brandNameMap.values()));
```

Puis utiliser `finalBrand` dans `itemData.brand` a la place de `matchedBrand`.

## Fichier modifie

| Fichier | Action |
|---|---|
| `src/services/stockImportService.ts` | Ajouter `extractBrandFromTitle` + l'appeler en fallback quand la marque est vide |

## Cas geres
- "Lenovo V14 G4" avec "Lenovo" dans le catalogue -> marque = "Lenovo"
- "HP ProBook 450 G8" avec "HP" dans le catalogue -> marque = "HP"
- Marque deja renseignee dans l'Excel -> pas de changement, priorite a la colonne
- Aucune marque reconnue -> reste `null` comme avant
