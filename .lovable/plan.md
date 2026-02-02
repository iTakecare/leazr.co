
# Plan : Corriger la répartition des prix de vente - Forcer le recalcul proportionnel

## Problème identifié

La logique de détection de "prix manuel" (écart > 1€) ne fonctionne pas dans ce cas car **tous** les prix stockés en BD ont été calculés avec un ancien coefficient, créant un écart significatif avec les prix proportionnels attendus avec le nouveau coefficient.

Résultat : **Tous** les équipements sont considérés comme "manuels" et leurs prix sont préservés au lieu d'être recalculés.

## Solution

En mode leasing, **toujours** recalculer les prix proportionnellement au total Grenke, sans tenir compte des `selling_price` stockés. La préservation des prix manuels ne doit s'appliquer qu'en mode achat.

### Modification du fichier

**Fichier** : `src/components/offers/detail/NewEquipmentSection.tsx`

**Lignes 285-350** : Simplifier la logique pour le mode leasing

```typescript
// MODE LEASING: Répartition proportionnelle basée sur le total Grenke
// En mode leasing, on recalcule TOUJOURS les prix proportionnellement
// car le total doit correspondre à la formule Grenke (Mensualité × 100 / Coefficient)

// Répartir proportionnellement avec la méthode Largest Remainder
const rawPrices = equipmentList.map(item => {
  const equipmentTotal = item.purchase_price * item.quantity;
  const proportion = equipmentTotal / totalPurchasePrice;
  const rawSellingPrice = totalSellingPrice * proportion;
  const roundedPrice = Math.round(rawSellingPrice * 100) / 100;
  return {
    id: item.id,
    rawPrice: rawSellingPrice,
    roundedPrice: roundedPrice,
    remainder: rawSellingPrice - roundedPrice
  };
});

// Correction des centimes avec Largest Remainder
const sumRounded = rawPrices.reduce((sum, p) => sum + p.roundedPrice, 0);
let differenceInCents = Math.round((totalSellingPrice - sumRounded) * 100);
const sortedByRemainder = [...rawPrices].sort((a, b) => Math.abs(b.remainder) - Math.abs(a.remainder));

rawPrices.forEach(p => {
  adjustedPrices[p.id] = p.roundedPrice;
});

for (let i = 0; i < Math.abs(differenceInCents) && i < sortedByRemainder.length; i++) {
  const id = sortedByRemainder[i].id;
  adjustedPrices[id] += differenceInCents > 0 ? 0.01 : -0.01;
  adjustedPrices[id] = Math.round(adjustedPrices[id] * 100) / 100;
}

return adjustedPrices;
```

## Résultat attendu

Les prix de vente individuels seront recalculés proportionnellement :

| Équipement | Proportion | P.V. total recalculé |
|------------|------------|---------------------|
| iPad Air 13 Pouces | 61.77% | ~1731,46 € |
| Magic Keyboard | 16.47% | ~461,53 € |
| iPad 10,9 | 18.51% | ~518,67 € |
| Neomounts Support | 3.23% | ~90,49 € |
| **TOTAL** | 100% | **2802,47 €** ✓ |

## Note technique

La préservation des prix manuels (memory `equipment-manual-selling-price-preservation`) reste pertinente uniquement lors de l'édition interactive des équipements, pas lors de l'affichage où le total Grenke doit être respecté.
