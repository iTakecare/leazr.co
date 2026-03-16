

## Diagnostic : Erreur de chargement des contrats

### Cause identifiée

Dans `src/services/contractService.ts` (ligne 547), la requête utilise un **INNER JOIN** sur la table `offers` :

```typescript
offers!inner(dossier_number, down_payment, coefficient, financed_amount)
```

Le `!inner` exclut tous les contrats qui n'ont pas d'offre associée et peut provoquer une erreur PostgREST si la relation est ambiguë ou si aucun contrat n'a d'offre. Cela explique l'erreur "Erreur lors du chargement des contrats" visible en bas à droite de l'écran.

### Correction

**Fichier : `src/services/contractService.ts`** (ligne 547)

Remplacer `offers!inner(...)` par `offers(...)` (LEFT JOIN) pour que les contrats sans offre soient aussi retournés, avec des valeurs `null` pour les champs offre.

Le code de calcul aux lignes 562-577 gère déjà les valeurs nulles avec `Number(...) || 0`, donc aucun autre changement n'est nécessaire.

### Impact
- Un seul caractère de changement (`!inner` → rien)
- Les contrats sans offre associée seront affichés avec des valeurs par défaut (0) pour les champs financiers

