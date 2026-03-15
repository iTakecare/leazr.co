

## Problème

La correction par ratio uniforme (lignes 334-348) multiplie chaque `monthlyPrice` par le même facteur. Comme les `unit_price` du payload sont incohérents (certains déjà remisés, d'autres non), le ratio amplifie les distorsions : 108.7% de marge sur l'iPhone 15 Pro Max, -4.5% sur l'iPhone 16 Pro.

## Solution

Remplacer la redistribution proportionnelle par `monthlyPrice` (ratio uniforme) par une redistribution proportionnelle par `purchasePrice`. Chaque ligne reçoit une part de la mensualité totale proportionnelle à son coût d'achat, ce qui produit une marge homogène sur toutes les lignes (≈ la marge globale de l'offre).

Concrètement pour l'exemple : marge globale ≈ 58.5% → chaque ligne aura ≈ 58.5% au lieu de -4.5% à 108.7%.

### Pourquoi pas des marges par catégorie ?

Redistribuer par catégorie (PC 40-50%, smartphones 35-40%, accessoires 25-30%) nécessiterait de connaître la catégorie de chaque produit dans la Edge Function. C'est faisable (requête DB sur `products.category`), mais ajoute de la complexité et des hypothèses. La redistribution par prix d'achat est plus simple, plus juste mathématiquement, et produit un résultat cohérent sans données supplémentaires.

## Modification

**Fichier** : `supabase/functions/create-product-request/index.ts` (lignes 332-352)

Remplacer le bloc de correction par ratio uniforme :

```typescript
// AVANT : ratio uniforme sur monthlyPrice (distord les marges)
const ratio = correctMonthlyTotal / totalMonthlyPayment;
equipmentCalculations.forEach(item => {
  item.monthlyPrice = Math.round(item.monthlyPrice * ratio * 100) / 100;
});
```

Par une redistribution proportionnelle au prix d'achat :

```typescript
// APRÈS : redistribution par poids du prix d'achat (marges homogènes)
const totalPurchase = equipmentCalculations.reduce(
  (sum, item) => sum + item.purchasePrice * item.quantity, 0
);

if (totalPurchase > 0) {
  let redistributedTotal = 0;
  for (let i = 0; i < equipmentCalculations.length; i++) {
    const item = equipmentCalculations[i];
    const weight = (item.purchasePrice * item.quantity) / totalPurchase;
    // Mensualité unitaire = part proportionnelle du total / quantité
    item.monthlyPrice = Math.round((correctMonthlyTotal * weight / item.quantity) * 100) / 100;
    redistributedTotal += item.monthlyPrice * item.quantity;
  }
  // Ajustement du reste d'arrondi sur la dernière ligne
  const remainder = Math.round((correctMonthlyTotal - redistributedTotal) * 100) / 100;
  if (Math.abs(remainder) > 0 && equipmentCalculations.length > 0) {
    const last = equipmentCalculations[equipmentCalculations.length - 1];
    last.monthlyPrice = Math.round((last.monthlyPrice + remainder / last.quantity) * 100) / 100;
  }
} else {
  // Fallback : répartition égale si pas de prix d'achat
  const equalShare = correctMonthlyTotal / equipmentCalculations.reduce((s, i) => s + i.quantity, 0);
  equipmentCalculations.forEach(item => {
    item.monthlyPrice = Math.round(equalShare * 100) / 100;
  });
}

totalMonthlyPayment = correctMonthlyTotal;
```

Résultat attendu : chaque ligne aura la même marge % (≈ 58.5% dans cet exemple), au lieu de marges allant de -4.5% à 108.7%.

