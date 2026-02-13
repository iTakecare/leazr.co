
# Fix : Erreur "column contract_equipment.product_id does not exist"

## Probleme

La page "Commandes fournisseurs" affiche "Erreur lors du chargement des commandes" car la requete dans `fetchAllEquipmentOrders` selectionne `product_id` sur la table `contract_equipment`, mais cette colonne n'existe pas dans cette table (contrairement a `offer_equipment` qui l'a).

## Solution

Retirer `product_id` de la requete SELECT sur `contract_equipment` dans le service `equipmentOrderService.ts`. Le champ `product_id` sera `undefined` pour les equipements de contrats, ce qui est acceptable car le pre-remplissage fournisseur se fait surtout au moment de l'ajout (depuis les offres).

## Modification

### `src/services/equipmentOrderService.ts`

Dans la fonction `fetchAllEquipmentOrders`, ligne de la requete `contract_equipment` :

**Avant :**
```
id, title, quantity, purchase_price, product_id,
```

**Apres :**
```
id, title, quantity, purchase_price,
```

Et dans le mapping des resultats contract, retirer `product_id: eq.product_id` ou le mettre a `null`.

## Fichier concerne

| Fichier | Modification |
|---------|-------------|
| `src/services/equipmentOrderService.ts` | Retirer `product_id` de la requete contract_equipment |
