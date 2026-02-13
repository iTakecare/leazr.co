

# Correction de l'erreur sur la page Commandes fournisseurs

## Probleme

L'erreur "Cannot access 'getSupplierType' before initialization" survient car la fonction `calcTVAC` (ligne 103) utilise `getSupplierType` qui est declaree plus bas (ligne 143). Avec `const`, il n'y a pas de hoisting.

## Correction

### Fichier : `src/pages/admin/EquipmentOrders.tsx`

Deplacer la fonction `getSupplierType` (lignes 143-146) avant `calcTVAC` (ligne 103), c'est-a-dire juste apres la ligne 101 (apres les totaux HTVA).

Aucune autre modification necessaire. Aucun autre fichier concerne.

