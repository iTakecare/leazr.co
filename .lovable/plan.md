

# Suppression vue Kanban + Correction export montants

## 1. Supprimer la vue Kanban dans `src/pages/Offers.tsx`
- Retirer le sélecteur de vue (boutons List/Grid) et tout le code lié au Kanban (state `viewMode`, `scrollContainer`, `scrollLeft`/`scrollRight`, les boutons de navigation, le composant `OffersKanban`, les imports `Grid`, `ChevronLeft`, `ChevronRight`)
- Afficher uniquement `OffersTable` en permanence

## 2. Corriger les montants dans `src/services/offersExportService.ts`
Le problème : le service recalcule les montants depuis `offer_equipment` avec une logique qui diverge de celle de `useFetchOffers`. Les offres passées à l'export ont **déjà** les bons montants calculés (`total_purchase_price`, `financed_amount`, `monthly_payment`, `margin_percentage`).

Correction :
- **Montant achat** : utiliser `offer.total_purchase_price` directement (déjà calculé par `useFetchOffers`)
- **CA potentiel** : utiliser `offer.financed_amount` directement
- **Marge %** : utiliser `offer.margin_percentage` directement
- **Marge €** : calculer `financed_amount - total_purchase_price`
- **Mensualité** : utiliser `offer.monthly_payment` (déjà corrigé pour is_purchase)

Supprimer les fonctions de recalcul devenues inutiles (`calculatePurchasePriceFromEquipment`, `calculateSellingPriceFromEquipment`, `calculateFinancedAmountForExcel`, `calculateMarginPercentageForExcel`, `calculateMarginAmountForExcel`).

