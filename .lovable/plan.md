

# Corriger la saisie de prix réel et date d'achat par unité

## Problème

Quand un équipement est éclaté en unités (qty > 1 + "Gérer par unité"), les sous-lignes n'affichent que le fournisseur et le statut. Il est impossible de saisir un **prix réel** ni une **date d'achat** par unité — ces champs n'existent que pour les lignes parentes sans unités.

## Solution

### Fichier : `src/components/contracts/ContractPurchaseTracking.tsx`

1. **Ajouter des états d'édition par unité** : `editingUnitPrices`, `editingUnitDates`, `editingUnitNotes` (même pattern que les états existants `editingPrices` etc. mais avec clé = `unit.id`)

2. **Ajouter `handleSaveUnitPurchase`** : sauvegarde le prix, la date et les notes sur l'unité via `updateEquipmentUnit`, puis synchronise le prix moyen vers le parent via `syncUnitPricesToParent`

3. **Modifier les sous-lignes d'unités** (lignes 494-549) : remplacer les cellules vides par des champs de saisie identiques à ceux de la ligne parente :
   - Colonne "Prix réel" : Input prix unitaire + Input date + Input notes (ou affichage si déjà saisi)
   - Colonne "Économie" : calcul unitaire (purchase_price parent - supplier_price unité)
   - Colonne actions : bouton Save / bouton Modifier

4. **Ligne parente avec unités** : afficher le total agrégé des prix réels des unités dans la colonne "Prix réel" (somme des `supplier_price` des unités)

### Détail technique

- `updateEquipmentUnit` existe déjà dans `equipmentOrderService.ts`
- `syncUnitPricesToParent` existe déjà — il calcule la moyenne des `supplier_price` et la reporte sur le parent
- Les champs `supplier_price`, `order_date`, `reception_date` existent déjà sur la table `equipment_order_units`
- Pas de migration nécessaire

