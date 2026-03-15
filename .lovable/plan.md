

## Normalisation des numéros TVA/entreprise à l'import

### Problème
Les numéros arrivent du Google Sheet dans des formats variés :
- `1035.122.335` (avec points)
- `BE:1008-527-905` (avec préfixe et tirets)
- `BE0733802129` (déjà propre)
- `1054.887.654` (avec points, sans préfixe)
- `0567836416` (brut sans préfixe)

Actuellement, ils sont stockés tels quels sans nettoyage.

### Solution
Ajouter une fonction `normalizeVatNumber()` dans l'Edge Function `import-meta-leads` qui :

1. Supprime tous les séparateurs (points, tirets, espaces, deux-points)
2. Extrait le préfixe pays s'il existe (ex: `BE`)
3. Ajoute automatiquement le préfixe `BE` si absent (contexte belge)
4. Résultat : format uniforme `BE0123456789`

### Fichier modifié
**`supabase/functions/import-meta-leads/index.ts`**

Ajouter une fonction utilitaire (vers ligne 30) :
```typescript
function normalizeVatNumber(raw: string): string {
  if (!raw) return '';
  // Remove all separators: dots, dashes, spaces, colons
  let cleaned = raw.replace(/[\s.\-:]/g, '').toUpperCase();
  // Extract country prefix if present (2 letters)
  let prefix = '';
  const match = cleaned.match(/^([A-Z]{2})(\d+)$/);
  if (match) {
    prefix = match[1];
    cleaned = match[2];
  }
  // Default to BE if no prefix
  if (!prefix) prefix = 'BE';
  // Pad with leading zero if needed (Belgian numbers are 10 digits)
  if (prefix === 'BE' && cleaned.length === 9) {
    cleaned = '0' + cleaned;
  }
  return `${prefix}${cleaned}`;
}
```

Appliquer la normalisation aux 2 endroits où `vat_number` est utilisé :
- **Ligne 970** (enrichissement client existant) : `updates.vat_number = normalizeVatNumber(lead.vat_number)`
- **Ligne 1020** (création nouveau client) : `vat_number: lead.vat_number ? normalizeVatNumber(lead.vat_number) : null`

### Migration de correction des données existantes
Une requête SQL pour normaliser les `vat_number` déjà stockés avec des formats incorrects dans la table `clients`.

