

## Fix: "Contrat non trouvé" pour tous les contrats

### Cause racine
Dans `src/services/contractService.ts`, ligne 145-149, la requête `getContractById` utilise :
- `offers!inner(...)` — jointure **interne** qui exclut tout contrat dont l'offre liée n'est pas accessible (RLS, offre supprimée, ou pas d'offre)
- `.single()` — qui lance une erreur si 0 lignes reviennent

Résultat : si un seul contrat n'a pas d'offre accessible, la requête échoue et retourne `null` → "Contrat non trouvé".

### Correction

**Fichier : `src/services/contractService.ts`** (fonction `getContractById`, lignes 140-149)

Remplacer :
```typescript
offers!inner(dossier_number, down_payment, coefficient, financed_amount),
```
par :
```typescript
offers(dossier_number, down_payment, coefficient, financed_amount),
```

Et remplacer `.single()` par `.maybeSingle()`.

Le reste du code gère déjà `data.offers?.xxx` avec des fallbacks `|| 0`, donc aucun autre changement nécessaire.

### Impact
- 1 fichier modifié, 2 lignes changées
- Aucun changement DB/migration
- Les contrats sans offre liée s'afficheront correctement (avec valeurs financières à 0)

