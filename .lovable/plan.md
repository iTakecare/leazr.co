
# Ajouter un bouton "Ajouter au stock" sur la page des commandes fournisseurs

## Objectif

Quand un equipement a le statut "recu" (`received`), afficher un bouton "Ajouter au stock" dans la derniere colonne du tableau. Ce bouton cree automatiquement un `stock_item` a partir des informations de la commande.

## Modifications

### 1. `src/pages/admin/EquipmentOrders.tsx`

- Importer `receiveToStock` depuis `stockService` et `useAuth` pour obtenir le `user.id`, ainsi que l'icone `Package` de lucide-react
- Ajouter une fonction `handleAddToStock(item)` qui :
  - Appelle `receiveToStock(companyId, {...}, userId)` avec les donnees de l'equipement (titre, prix, fournisseur, reference commande, date de reception, product_id, contract lien)
  - Affiche un toast de succes avec lien vers la page stock
  - Marque l'item visuellement comme "deja ajoute" (en stockant les IDs ajoutes dans un state local `addedToStock`)
- Dans le tableau, colonne actions (derniere colonne, a cote du bouton ExternalLink) :
  - Si `item.order_status === 'received'` et pas encore ajoute : afficher un bouton avec icone `Package` + tooltip "Ajouter au stock"
  - Si deja ajoute : afficher une icone `Check` grisee
- Meme logique pour les lignes d'unites (`renderUnitRow`) quand une unite individuelle est au statut `received`

### 2. Donnees transmises au stock

Le `stock_item` cree reprendra :
- `title` : titre de l'equipement
- `purchase_price` : prix fournisseur ou prix d'achat
- `supplier_id` : fournisseur assigne
- `order_reference` : reference de commande
- `reception_date` : date de reception
- `current_contract_id` : ID du contrat source (si source_type = contract)
- `current_contract_equipment_id` : ID de l'equipement contrat
- `status` : `in_stock`
- `condition` : `new`

### Aucune modification de base de donnees necessaire

Les tables `stock_items` et `stock_movements` existent deja avec tous les champs requis. La fonction `receiveToStock` du service stock gere la creation de l'item et du mouvement de reception.
