
# Ajout du montant TVAC dans les cartes resumees

## Modification

Dans le fichier `src/pages/admin/EquipmentOrders.tsx`, ajouter sous chaque montant HTVA des trois cartes (A commander, Commande, Recu) le montant TVAC correspondant.

## Calcul

Pour chaque carte, calculer le total TVAC en parcourant les items du statut concerne :
- Si le fournisseur est `belgian` : prix TVAC = prix HTVA + (prix HTVA x 0.21)
- Si le fournisseur est `eu` ou pas de fournisseur : prix TVAC = prix HTVA

## Code concerne (lignes 99-101)

Ajouter trois nouveaux totaux TVAC apres les totaux HTVA existants :

```typescript
const calcTVAC = (itemsList: EquipmentOrderItem[]) => 
  itemsList.reduce((s, i) => {
    const priceHT = (i.supplier_price || i.purchase_price) * i.quantity;
    const supplierType = getSupplierType(i.supplier_id);
    const tva = supplierType === 'belgian' ? priceHT * 0.21 : 0;
    return s + priceHT + tva;
  }, 0);

const totalToOrderTVAC = calcTVAC(items.filter(i => i.order_status === 'to_order'));
const totalOrderedTVAC = calcTVAC(items.filter(i => i.order_status === 'ordered'));
const totalReceivedTVAC = calcTVAC(items.filter(i => i.order_status === 'received'));
```

## Affichage dans les cartes (lignes 246-267)

Ajouter une ligne sous le montant HTVA dans chaque carte, par exemple :

```
A commander (HTVA)
1 000,00 EUR
TVAC : 1 210,00 EUR
3 equipement(s)
```

### Fichier concerne

| Fichier | Modification |
|---------|-------------|
| `src/pages/admin/EquipmentOrders.tsx` | Ajouter calcul TVAC + affichage sous le montant HTVA dans les 3 cartes |
