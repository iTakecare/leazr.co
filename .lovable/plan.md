
# Ajout de la creation de fournisseur dans le formulaire de stock

## Contexte
Le formulaire d'ajout/edition d'article de stock (`StockItemForm.tsx`) utilise un simple `Select` pour choisir un fournisseur, sans possibilite d'en creer un nouveau. Le composant `SupplierSelectOrCreate` existe deja et est utilise dans les commandes fournisseurs -- il inclut une modale de creation avec nom, email, telephone et type (Belge/EU).

## Modification

| Fichier | Changement |
|---|---|
| `src/components/stock/StockItemForm.tsx` | Remplacer le `Select` fournisseur par le composant `SupplierSelectOrCreate` |

## Detail technique

1. Importer `SupplierSelectOrCreate` depuis `@/components/equipment/SupplierSelectOrCreate`
2. Remplacer le bloc `Select` (lignes 284-292) par `SupplierSelectOrCreate` avec :
   - `suppliers` : la liste deja chargee dans le composant
   - `value` : `form.supplier_id || null`
   - `onValueChange` : met a jour `form.supplier_id`
   - `onSupplierCreated` : ajoute le nouveau fournisseur a la liste locale `suppliers`
3. Ajouter un state local pour gerer la liste de fournisseurs mise a jour apres creation (ou utiliser le state existant si deja present)

Le composant `SupplierSelectOrCreate` gere deja :
- La recherche dans la liste existante
- L'ouverture d'une modale de creation identique a celle des commandes
- Le callback apres creation pour rafraichir la liste
