
# Synchronisation des prix entre la carte Suivi des achats et les Commandes fournisseurs

## Probleme

Les deux vues utilisent des champs differents pour le prix reel d'achat :
- **Carte Suivi des achats** (ContractPurchaseTracking) : ecrit dans `actual_purchase_price`
- **Commandes fournisseurs** (EquipmentOrders) : lit/ecrit dans `supplier_price`

Quand on met a jour un prix dans une vue, l'autre vue ne le reflete pas car ce sont deux colonnes distinctes dans `contract_equipment`.

## Solution

Synchroniser les deux champs a chaque mise a jour de prix, dans les deux sens :

### 1. ContractPurchaseTracking - handleSavePurchase

Quand l'utilisateur enregistre un `actual_purchase_price`, mettre a jour aussi `supplier_price` avec la meme valeur.

### 2. EquipmentOrders - handleSupplierChange / prix unitaire

Quand un `supplier_price` est mis a jour (via les unites ou directement), synchroniser aussi `actual_purchase_price` sur le `contract_equipment` parent.

### 3. Unites (equipment_order_units)

Quand un prix unitaire est modifie sur une unite, recalculer le prix moyen ou total et mettre a jour `supplier_price` et `actual_purchase_price` sur l'equipement parent.

## Fichiers a modifier

| Fichier | Modification |
|---------|-------------|
| `src/components/contracts/ContractPurchaseTracking.tsx` | Dans `handleSavePurchase` : ajouter `supplier_price: actualPrice` a l'update |
| `src/services/equipmentOrderService.ts` | Ajouter une fonction `syncEquipmentPrices(sourceType, equipmentId)` qui recalcule et synchronise `supplier_price` et `actual_purchase_price` depuis les unites |
| `src/pages/admin/EquipmentOrders.tsx` | Apres mise a jour d'un prix dans les unites ou sur la ligne principale, appeler la synchronisation vers `actual_purchase_price` |

## Details techniques

### handleSavePurchase (ContractPurchaseTracking)

Ajouter `supplier_price: actualPrice` dans l'objet `updateData` pour que le prix soit visible dans les deux vues.

### Synchronisation depuis les unites

Quand un `supplier_price` est mis a jour sur une unite, calculer la moyenne ou somme des prix des unites et mettre a jour les champs `supplier_price` et `actual_purchase_price` de l'equipement parent (`contract_equipment` ou `offer_equipment`).

### Mise a jour directe depuis EquipmentOrders

Quand le `supplier_price` est modifie directement sur un equipement de type `contract`, aussi mettre a jour `actual_purchase_price` avec la meme valeur pour rester synchronise.
