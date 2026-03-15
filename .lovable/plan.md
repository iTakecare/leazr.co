

## Problème

Deux bugs identifiés dans la Edge Function `create-product-request` :

### 1. Mensualité incorrecte (270,70€ au lieu de 182,80€)
Les `unit_price` envoyés par iTakecare sont incohérents : certains produits du pack ont `pack_discount_percentage: 15` (prix déjà remisé), d'autres ont `pack_discount_percentage: 0` (prix plein). La somme des `unit_price` donne 270,70€ alors qu'iTakecare affiche 182,80€.

**Solution** : Utiliser `data.total` (207,70€) moins la somme des services externes (24,90€) = 182,80€ comme mensualité totale de l'offre. Redistribuer proportionnellement les mensualités sur chaque ligne d'équipement pour que tout soit cohérent.

### 2. Numéro de dossier différent
Le site génère un numéro `REQ-263C30D2` mais Leazr crée son propre `ITC-2026-OFF-XXXX`. Pas de lien entre les deux.

**Solution** : Accepter un champ `reference_number` dans le payload et l'utiliser comme `dossier_number`. Fallback sur le format auto-généré si absent.

---

## Modifications

### Fichier : `supabase/functions/_shared/validationSchemas.ts`
- Ajouter `reference_number: z.string().trim().max(50).optional()` au schéma `createProductRequestSchema`

### Fichier : `supabase/functions/create-product-request/index.ts`

**Correction mensualité (après ligne 318, avant le calcul du coefficient)** :
- Si `data.total` est fourni :
  - Calculer `externalServicesTotal` = somme des `price_htva × quantity` des `data.external_services`
  - `correctMonthlyTotal` = `data.total - externalServicesTotal`
  - Si `correctMonthlyTotal` diffère de `totalMonthlyPayment` (la somme des unit_prices) :
    - Calculer un ratio de correction = `correctMonthlyTotal / totalMonthlyPayment`
    - Appliquer ce ratio à chaque `equipmentCalculations[i].monthlyPrice` pour corriger les mensualités par ligne
    - Remplacer `totalMonthlyPayment` par `correctMonthlyTotal`
    - Logger la correction

**Numéro de dossier (ligne 366-368)** :
- Remplacer la génération automatique par : `const dossierNumber = data.reference_number || \`ITC-${year}-OFF-${timestamp}\`;`

Ces corrections impactent en cascade le coefficient, le montant financé, la marge et les données insérées en DB — tous basés sur `totalMonthlyPayment` qui sera désormais correct.

