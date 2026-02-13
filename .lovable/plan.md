
# Afficher le prix réel dans les Commandes fournisseurs

## Problème

Dans la page Commandes fournisseurs, le prix affiché (colonne "Prix HTVA") utilise `supplier_price || purchase_price`. Or pour Christine Boucher, le prix réel (819 EUR) est stocké dans `actual_purchase_price` mais `supplier_price` est resté vide. Le système retombe donc sur `purchase_price` (915 EUR, le prix estimé).

## Solution

Deux corrections dans `src/services/equipmentOrderService.ts` :

### 1. Inclure `actual_purchase_price` dans la requête

Ajouter `actual_purchase_price` au SELECT de `contract_equipment` dans `fetchAllEquipmentOrders`.

### 2. Utiliser le bon ordre de priorité pour le prix

Dans le mapping des résultats, définir `supplier_price` avec la logique :
`supplier_price ?? actual_purchase_price ?? null`

Ainsi, si un prix réel a été saisi dans la carte Suivi des achats mais que `supplier_price` n'a pas encore été rempli, le prix réel sera quand même visible dans les commandes fournisseurs.

## Fichier modifié

| Fichier | Modification |
|---------|-------------|
| `src/services/equipmentOrderService.ts` | Ajouter `actual_purchase_price` au SELECT de contract_equipment et l'utiliser comme fallback pour `supplier_price` |

Aucun autre fichier n'est modifié. La logique d'affichage dans `EquipmentOrders.tsx` utilise déjà `supplier_price || purchase_price`, donc en corrigeant la source de données, tout se met à jour automatiquement.
