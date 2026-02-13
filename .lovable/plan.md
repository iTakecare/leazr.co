
# Afficher le statut de commande fournisseur dans le Suivi des achats

## Objectif

Ajouter le statut de commande fournisseur (A commander, Commande, Recu, Annule) dans chaque ligne du tableau "Suivi des achats" du detail contrat, pour synchroniser visuellement les deux systemes.

## Modification

### Fichier : `src/components/contracts/ContractPurchaseTracking.tsx`

1. **Etendre la requete de donnees** (ligne 49) : ajouter `order_status` dans le SELECT de `contract_equipment`
2. **Mettre a jour l'interface** `ContractEquipment` (ligne 15) : ajouter le champ `order_status`
3. **Afficher un badge de statut** dans la colonne Equipement de chaque ligne, en utilisant les couleurs et labels deja definis dans `ORDER_STATUS_CONFIG` (importe depuis `equipmentOrderService`)

### Rendu visuel

Chaque ligne du tableau affichera, sous le nom de l'equipement, un petit badge colore indiquant le statut :
- Rouge : "A commander"
- Orange : "Commande"
- Vert : "Recu"
- Gris : "Annule"

### Details techniques

| Etape | Detail |
|-------|--------|
| Import | Ajouter `ORDER_STATUS_CONFIG` et `OrderStatus` depuis `equipmentOrderService` |
| Interface | Ajouter `order_status: string / null` a `ContractEquipment` |
| Query | Ajouter `order_status` dans la requete Supabase (ligne 49) |
| UI | Ajouter un `span` avec les classes de `ORDER_STATUS_CONFIG` sous le titre de chaque equipement |

Aucun autre fichier n'est modifie.
