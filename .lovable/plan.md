

# Fix: Export Excel utilise les mauvais montants

## Diagnostic
Le tableau `OffersTable` recalcule les montants à l'affichage (lignes 228-254) en utilisant la formule Grenke (`mensualité × 100 / coefficient`) via `getEffectiveFinancedAmount()`. C'est la **source de vérité**.

L'export Excel utilise `offer.financed_amount` (valeur brute en DB) et `offer.total_purchase_price` / `offer.margin_percentage` (pré-calculés par `useFetchOffers`), qui divergent des valeurs affichées.

Exemple Talentsquare : le tableau affiche 4 655,86 € mais l'export sort 4 273,37 € car il utilise `financed_amount` en DB au lieu du calcul Grenke.

## Solution
Modifier `src/services/offersExportService.ts` pour utiliser les mêmes fonctions de calcul que `OffersTable` :

1. Importer `getEffectiveFinancedAmount`, `calculateEquipmentTotals`, `calculateOfferMarginAmount`, `calculateOfferMargin` depuis `@/utils/marginCalculations`
2. Pour chaque offre, calculer :
   - `effectiveFinancedAmount` = `getEffectiveFinancedAmount(offer, offer.offer_equipment)` moins `down_payment`
   - `totalPurchasePrice` = `calculateEquipmentTotals(offer, offer.offer_equipment).totalPurchasePrice`
   - `marginPercent` = `calculateOfferMargin(offer, offer.offer_equipment)`
   - `marginEuros` = `effectiveFinancedAmount - totalPurchasePrice`
   - `monthlyPayment` = recalculé si acompte, sinon `offer.monthly_payment`

Cela reproduit exactement la logique des lignes 228-260 de `OffersTable.tsx`.

Seul fichier modifié : `src/services/offersExportService.ts`.

