

# Corriger la redistribution des P.V. quand tous les equipements ont un selling_price

## Probleme

Dans `calculateAllSellingPrices`, quand **tous** les equipements ont un `selling_price > 0`, la fonction retourne directement les valeurs stockees en base (ligne 351-353) sans verifier si leur somme correspond au montant finance cible (formule Grenke).

Exemple concret sur l'offre actuelle :
- iPhone 16 Pro Max : selling_price unitaire 1471.68 x 2 = 2943.36
- iPhone 17 Pro Max : selling_price unitaire 1641.70 x 2 = 3283.39
- **Somme des lignes = 6226.76**
- **Montant finance Grenke = (219.80 x 100) / 3.16 = 6955.70**

Les lignes ne s'additionnent pas pour donner le total car les selling_prices stockes en base sont desynchonises du calcul Grenke global.

## Solution

Modifier `calculateAllSellingPrices` dans `NewEquipmentSection.tsx` pour ajouter un controle supplementaire : quand tous les equipements ont un selling_price fixe mais que leur somme ne correspond pas au montant cible (`effectiveFinancedAmount`), redistribuer proportionnellement **toutes** les lignes pour que la somme colle au total Grenke.

## Fichier modifie

`src/components/offers/detail/NewEquipmentSection.tsx`

## Changement

### Modifier `calculateAllSellingPrices` (lignes 350-353)

Apres le bloc qui detecte que toutes les lignes sont "fixed" (`itemsWithoutFixedPrice.length === 0`), au lieu de retourner directement, verifier si `fixedTotal` correspond a `totalSellingPrice` (le montant cible passe en parametre). Si l'ecart depasse 0.01 euro :

1. Calculer un ratio d'ajustement : `ratio = totalSellingPrice / fixedTotal`
2. Multiplier chaque prix fixe par ce ratio
3. Appliquer la methode Largest Remainder pour corriger les centimes
4. Retourner les prix ajustes

```text
Avant (lignes 350-353) :
  if (itemsWithoutFixedPrice.length === 0) {
    return adjustedPrices;  // <-- retourne sans verifier la coherence
  }

Apres :
  if (itemsWithoutFixedPrice.length === 0) {
    // Verifier si la somme des prix fixes correspond au montant cible
    if (Math.abs(fixedTotal - totalSellingPrice) > 0.01) {
      // Redistribuer proportionnellement pour coller au montant cible
      const ratio = totalSellingPrice / fixedTotal;
      ... appliquer ratio + Largest Remainder ...
    }
    return adjustedPrices;
  }
```

Cette correction garantit que la somme des P.V. par ligne sera toujours egale au P.V. total affiche dans la ligne TOTAUX, quel que soit l'etat des selling_prices en base.

