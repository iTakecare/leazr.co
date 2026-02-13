
# Ajout du type de fournisseur (Belge / EU) et colonnes TVA

## 1. Migration base de donnees

Ajouter une colonne `supplier_type` a la table `suppliers` pour distinguer les fournisseurs belges des fournisseurs EU :

```sql
ALTER TABLE suppliers 
ADD COLUMN supplier_type text NOT NULL DEFAULT 'belgian' 
CHECK (supplier_type IN ('belgian', 'eu'));
```

- `belgian` = fournisseur belge, TVA applicable (21%)
- `eu` = fournisseur intracommunautaire, pas de TVA

## 2. Modification du composant `SupplierSelectOrCreate.tsx`

Dans la modale de creation du fournisseur, ajouter un champ **Type de fournisseur** avec deux options (RadioGroup ou Select) :
- **Fournisseur Belge** (defaut) - TVA applicable
- **Fournisseur EU** - Achat intracommunautaire, pas de TVA

Ce champ sera envoye lors de la creation via `createSupplier`.

## 3. Modification du service `supplierService.ts`

Ajouter `supplier_type` dans `CreateSupplierData` et `UpdateSupplierData` pour supporter le nouveau champ.

## 4. Modification du service `equipmentOrderService.ts`

- Ajouter `supplier_type` dans les selects des fournisseurs (`fetchSuppliers`) pour que la page globale connaisse le type de chaque fournisseur.
- Mettre a jour l'interface pour inclure cette info.

## 5. Modification de la page `EquipmentOrders.tsx`

Transformer la colonne **Prix** en trois colonnes :

| Prix HTVA | TVA | Prix TVAC |
|-----------|-----|-----------|
| 1000 EUR  | 210 EUR | 1210 EUR | (fournisseur belge, 21%)
| 500 EUR   | -   | 500 EUR  | (fournisseur EU)

Logique :
- Si le fournisseur est `belgian` : TVA = prix HTVA x 0.21, Prix TVAC = prix HTVA + TVA
- Si le fournisseur est `eu` : TVA = "-", Prix TVAC = Prix HTVA
- Si pas de fournisseur assigne : afficher le prix sans TVA (comme EU par defaut)

Les cartes resumees en haut seront egalement mises a jour pour refleter les totaux HTVA.

## Fichiers concernes

| Fichier | Modification |
|---------|-------------|
| Migration SQL | Ajouter colonne `supplier_type` a `suppliers` |
| `src/services/supplierService.ts` | Ajouter `supplier_type` dans les interfaces |
| `src/services/equipmentOrderService.ts` | Inclure `supplier_type` dans `fetchSuppliers` |
| `src/components/equipment/SupplierSelectOrCreate.tsx` | Ajouter RadioGroup Belge/EU dans la modale |
| `src/pages/admin/EquipmentOrders.tsx` | Remplacer colonne Prix par Prix HTVA / TVA / Prix TVAC |
