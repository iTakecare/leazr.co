
# Plan : Corriger l'édition et l'affichage du prix de vente unitaire

## Problème identifié

Quand vous modifiez le prix de vente unitaire en mode édition et cliquez sur "Enregistrer" :

1. La valeur est correctement sauvegardée en base de données (le RPC fonctionne)
2. **Mais l'affichage ignore cette valeur** car en mode leasing, le système force une répartition proportionnelle des prix de vente basée sur la formule Grenke
3. Le code dit explicitement (ligne 292-293) : "Les selling_price stockés en BD sont ignorés pour l'affichage"

**En résumé** : la sauvegarde fonctionne, mais l'affichage est écrasé par un recalcul automatique.

## Solution proposée

Modifier la logique de `calculateAllSellingPrices` en mode leasing pour **respecter les prix de vente manuellement définis** (comme c'est déjà fait en mode achat) tout en gardant la répartition proportionnelle uniquement pour les équipements sans prix de vente explicite.

## Modifications à effectuer

### Fichier : `src/components/offers/detail/NewEquipmentSection.tsx`

**Changement de la fonction `calculateAllSellingPrices`** (lignes 264-325) :

```typescript
const calculateAllSellingPrices = (equipmentList: any[], totalPurchasePrice: number, totalSellingPrice: number): Record<string, number> => {
  if (equipmentList.length === 0 || totalPurchasePrice === 0) {
    return {};
  }

  const adjustedPrices: Record<string, number> = {};
  
  // MODE ACHAT ou LEASING : Respecter les prix de vente stockés en BD
  // et ne redistribuer que le reste aux équipements sans prix explicite
  
  let manualTotal = 0;
  let manualPurchaseTotal = 0;
  const itemsWithManualPrice: string[] = [];
  const itemsWithoutManualPrice: any[] = [];
  
  // Étape 1: Identifier les équipements avec un selling_price manuel
  equipmentList.forEach(item => {
    const storedSellingPrice = item.selling_price;
    const calculatedFromMargin = item.purchase_price * (1 + (item.margin || 0) / 100);
    
    // Un prix est considéré "manuel" s'il diffère de plus de 1€ du calcul par marge
    const isManualOverride = storedSellingPrice != null && 
      storedSellingPrice > 0 && 
      Math.abs(storedSellingPrice - calculatedFromMargin) > 1;
    
    if (isManualOverride) {
      // Prix manuel : utiliser directement
      const priceTotal = Math.round(storedSellingPrice * item.quantity * 100) / 100;
      adjustedPrices[item.id] = priceTotal;
      manualTotal += priceTotal;
      manualPurchaseTotal += item.purchase_price * item.quantity;
      itemsWithManualPrice.push(item.id);
    } else {
      itemsWithoutManualPrice.push(item);
    }
  });
  
  // Étape 2: Calculer le montant restant à répartir
  const remainingTotal = totalSellingPrice - manualTotal;
  const remainingPurchaseTotal = totalPurchasePrice - manualPurchaseTotal;
  
  // Étape 3: Répartir proportionnellement parmi les équipements sans prix manuel
  if (itemsWithoutManualPrice.length > 0 && remainingPurchaseTotal > 0) {
    const rawPrices = itemsWithoutManualPrice.map(item => {
      const equipmentTotal = item.purchase_price * item.quantity;
      const proportion = equipmentTotal / remainingPurchaseTotal;
      const rawSellingPrice = remainingTotal * proportion;
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
    let differenceInCents = Math.round((remainingTotal - sumRounded) * 100);
    const sortedByRemainder = [...rawPrices].sort((a, b) => Math.abs(b.remainder) - Math.abs(a.remainder));

    rawPrices.forEach(p => {
      adjustedPrices[p.id] = p.roundedPrice;
    });

    for (let i = 0; i < Math.abs(differenceInCents) && i < sortedByRemainder.length; i++) {
      const id = sortedByRemainder[i].id;
      adjustedPrices[id] += differenceInCents > 0 ? 0.01 : -0.01;
      adjustedPrices[id] = Math.round(adjustedPrices[id] * 100) / 100;
    }
  } else if (itemsWithoutManualPrice.length > 0) {
    // Fallback : calculer depuis la marge si pas de total à répartir
    itemsWithoutManualPrice.forEach(item => {
      const marginPercent = item.margin || 0;
      const sellingPriceUnit = item.purchase_price * (1 + marginPercent / 100);
      adjustedPrices[item.id] = Math.round(sellingPriceUnit * item.quantity * 100) / 100;
    });
  }

  return adjustedPrices;
};
```

### Correction supplémentaire : Recalculer la mensualité automatiquement

Quand l'utilisateur modifie le prix de vente, la mensualité devrait également être recalculée. Modifier `handleFieldChange` :

```typescript
const handleFieldChange = (field: string, value: any) => {
  const newValues = { ...editedValues, [field]: value };
  
  // Auto-calculate selling price ONLY when purchase price or margin changes
  if (field === 'purchase_price' || field === 'margin') {
    newValues.selling_price = calculateSellingPrice(
      field === 'purchase_price' ? value : newValues.purchase_price,
      field === 'margin' ? value : newValues.margin
    );
  }
  
  // If user edits selling_price directly, recalculate margin AND monthly payment
  if (field === 'selling_price') {
    const purchasePrice = newValues.purchase_price || 0;
    const quantity = newValues.quantity || 1;
    if (purchasePrice > 0) {
      newValues.margin = ((value / purchasePrice) - 1) * 100;
    }
    // Recalculer la mensualité (Total ligne = P.V. unitaire × quantité × coefficient / 100)
    const coefficient = offer.coefficient || 0;
    if (!isPurchase && coefficient > 0) {
      newValues.monthly_payment = Math.round((value * quantity * coefficient) / 100 * 100) / 100;
    }
  }
  
  // Auto-calculate coefficient when monthly payment or purchase price changes
  if (field === 'monthly_payment' || field === 'purchase_price') {
    newValues.coefficient = calculateCoefficient(
      field === 'monthly_payment' ? value : newValues.monthly_payment,
      field === 'purchase_price' ? value : newValues.purchase_price
    );
  }
  
  setEditedValues(newValues);
};
```

## Résumé des corrections

| Problème | Correction |
|----------|------------|
| Prix de vente ignoré en mode leasing | Respecter les prix manuels (différence > 1€ du calcul par marge) |
| Mensualité non recalculée après changement PV | Ajouter le recalcul dans `handleFieldChange` |
| Affichage incohérent | Le prix stocké en BD sera affiché correctement |

## Résultat attendu

1. Quand vous modifiez le prix de vente à 400€ (au lieu de 621.8€ calculé automatiquement), cette valeur sera :
   - Sauvegardée en BD
   - Affichée correctement après sauvegarde
   - La mensualité sera recalculée automatiquement
   - La marge sera mise à jour en conséquence
