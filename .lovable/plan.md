
# Correction des faux doublons : nettoyage des numeros de serie

## Probleme identifie

La base de donnees contient des articles avec `serial_number = "/"` et `serial_number = "N/A"`. Le fichier CSV contient de nombreux articles avec `S/N` = `/` ou `N/A`. Le code traite ces valeurs comme de vrais numeros de serie uniques, ce qui provoque la detection de doublons pour TOUS les articles du fichier qui ont ces memes valeurs non significatives.

Concretement :
- L'article existant avec SN "/" est charge dans `existingSerials` sous la cle "" (apres normalisation)
- Chaque article du CSV avec SN "/" est normalise en "" aussi, et donc detecte comme doublon
- Meme chose pour "N/A" normalise en "na"

## Solution

Ajouter une liste de valeurs non significatives a ignorer pour le champ numero de serie. Les valeurs comme "/", "N/A", "-", "n/a", "none", "aucun", "nc", "na" doivent etre traitees comme null (pas de numero de serie).

## Fichier modifie

| Fichier | Changement |
|---|---|
| `src/services/stockImportService.ts` | Ajouter une fonction de nettoyage des numeros de serie et l'appliquer a deux endroits |

## Detail technique

### 1. Ajouter une fonction `sanitizeSerialNumber` (apres la fonction `normalize`, vers ligne 78)

```typescript
function sanitizeSerialNumber(value: string | null | undefined): string | null {
  const raw = String(value || '').trim();
  if (!raw) return null;
  const IGNORED = ['/', '-', 'n/a', 'na', 'none', 'aucun', 'nc', 'neant', '//', '---', '.'];
  if (IGNORED.includes(raw.toLowerCase())) return null;
  return raw;
}
```

### 2. Appliquer au chargement des existants (ligne 388)

Remplacer :
```typescript
const sn = String(item.serial_number || '').trim();
if (sn) existingSerials.add(normalize(sn));
```
Par :
```typescript
const sn = sanitizeSerialNumber(item.serial_number);
if (sn) existingSerials.add(normalize(sn));
```

### 3. Appliquer a la lecture du CSV (ligne 413)

Remplacer :
```typescript
const serialNumber = String(parsed.serial_number || '').trim() || null;
```
Par :
```typescript
const serialNumber = sanitizeSerialNumber(parsed.serial_number);
```

### 4. Appliquer aussi a l'insertion (ligne 459-460)

S'assurer que les valeurs nettoyees sont utilisees pour `serial_number` et `serial_numbers` dans `itemData`, evitant ainsi de stocker de nouvelles valeurs "/" ou "N/A" en base.

## Resultat attendu

- Les articles avec S/N = "/", "N/A", "-", etc. sont traites comme s'ils n'avaient pas de numero de serie
- Ils ne sont plus detectes comme doublons
- Les vrais numeros de serie continuent d'etre correctement dedupliques
- Les nouvelles insertions n'ajouteront plus de faux numeros de serie en base
