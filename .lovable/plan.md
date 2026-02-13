

# Ajout fournisseur et changement de statut dans le Suivi des achats

## Modifications sur `src/components/contracts/ContractPurchaseTracking.tsx`

### 1. Donnees supplementaires a recuperer

- Ajouter `supplier_id` et `order_status` dans l'interface `ContractEquipment` (order_status est deja present)
- Ajouter `supplier_id` dans la requete Supabase (ligne 51)
- Charger la liste des fournisseurs via `fetchSuppliers` (comme dans EquipmentOrderTracker)

### 2. Afficher le nom du fournisseur

- Ajouter une colonne "Fournisseur" dans le tableau entre "Equipement" et "Qte"
- Afficher le nom du fournisseur en croisant `supplier_id` avec la liste des fournisseurs

### 3. Permettre de changer le statut de commande

- Remplacer le badge statique actuel par un `Select` (dropdown) identique a celui du EquipmentOrderTracker
- Utiliser `updateContractEquipmentOrder` pour sauvegarder le changement de statut
- Remplir automatiquement `order_date` quand on passe a "commande" et `reception_date` quand on passe a "recu"

### 4. Imports necessaires

- `Select, SelectContent, SelectItem, SelectTrigger, SelectValue` (deja disponible)
- `updateContractEquipmentOrder` depuis `equipmentOrderService`
- `fetchSuppliers` depuis `equipmentOrderService`
- `useMultiTenant` pour obtenir le `companyId`

### Details techniques

| Element | Detail |
|---------|--------|
| Fichier | `src/components/contracts/ContractPurchaseTracking.tsx` uniquement |
| Interface | Ajouter `supplier_id: string / null` |
| Query | Ajouter `supplier_id` dans le SELECT |
| Fournisseurs | Charger via `fetchSuppliers(companyId)` dans le useEffect |
| Colonne Fournisseur | Nouvelle colonne affichant le nom du fournisseur |
| Colonne Statut | Select dropdown avec les 4 statuts, couleurs issues de ORDER_STATUS_CONFIG |
| Sauvegarde statut | Via `updateContractEquipmentOrder` + refresh des donnees |

