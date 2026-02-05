
# Plan : Harmoniser les calculs de marge sur toute l'application

## Diagnostic

Apres analyse du code, j'ai identifie plusieurs incoherences dans les calculs de marge et de mensualite a travers l'application :

### Probleme principal : Double multiplication des mensualites

La convention etablie est que `monthly_payment` en base de donnees represente le **total de la ligne** (toutes quantites confondues), et non un cout unitaire. Cependant, plusieurs composants multiplient cette valeur par `quantity`, causant une inflation artificielle des totaux.

### Fichiers impactes

| Fichier | Probleme |
|---------|----------|
| `RecalculateFinancialsButton.tsx` | Multiplie `monthlyPayment * quantity` (ligne 42) alors que la valeur est deja totale |
| `CompactEquipmentSection.tsx` | Multiplie `monthly * qty` (ligne 84) - meme erreur |
| `offersExportService.ts` | Utilise `offer.financed_amount` sans recalculer depuis les equipements |
| `invoiceService.ts` | Multiplie `monthly_payment * quantity` (lignes 368, 381, 1079, 1086) |

## Modifications a effectuer

### 1. `src/components/offers/detail/RecalculateFinancialsButton.tsx`

**Avant (ligne 42):**
```typescript
totalMonthlyPayment: acc.totalMonthlyPayment + (monthlyPayment * quantity),
```

**Apres:**
```typescript
// monthly_payment en BD est DEJA le total pour cet equipement (pas unitaire)
totalMonthlyPayment: acc.totalMonthlyPayment + monthlyPayment,
```

---

### 2. `src/components/offers/detail/CompactEquipmentSection.tsx`

**Avant (lignes 80-87):**
```typescript
const calculateTotalMonthly = () => {
  const total = equipmentItems.reduce((total: number, item: any) => {
    const monthly = parseFloat(item.monthlyPayment) || 0;
    const qty = parseInt(item.quantity) || 1;
    return total + (monthly * qty);
  }, 0);
  return Math.round(total * 100) / 100;
};
```

**Apres:**
```typescript
const calculateTotalMonthly = () => {
  // monthly_payment en BD est DEJA le total pour cet equipement (pas unitaire)
  const total = equipmentItems.reduce((total: number, item: any) => {
    const monthly = parseFloat(item.monthlyPayment || item.monthly_payment) || 0;
    return total + monthly;
  }, 0);
  return Math.round(total * 100) / 100;
};
```

---

### 3. `src/services/offersExportService.ts`

Modifier `calculateFinancedAmountForExcel` pour utiliser la somme des prix de vente en priorite (coherent avec le reste de l'app) :

**Avant (lignes 100-104):**
```typescript
const calculateFinancedAmountForExcel = (offer: any): number => {
  return offer.financed_amount || offer.amount || calculateSellingPriceFromEquipment(offer) || 0;
};
```

**Apres:**
```typescript
const calculateFinancedAmountForExcel = (offer: any): number => {
  // Priorite 1: Somme des prix de vente depuis les equipements
  const sellingPriceFromEquipment = calculateSellingPriceFromEquipment(offer);
  if (sellingPriceFromEquipment > 0) {
    return sellingPriceFromEquipment;
  }
  // Fallback: financed_amount ou amount stocke en base
  return offer.financed_amount || offer.amount || 0;
};
```

Et ajouter une fonction pour calculer le pourcentage de marge dans l'export :

```typescript
const calculateMarginPercentageForExcel = (offer: any): number => {
  const financedAmount = calculateFinancedAmountForExcel(offer);
  const purchasePrice = calculatePurchasePriceFromEquipment(offer);
  if (purchasePrice <= 0) return 0;
  return ((financedAmount - purchasePrice) / purchasePrice) * 100;
};
```

Puis utiliser cette fonction au lieu de `offer.margin_percentage` dans l'export.

---

### 4. `src/services/invoiceService.ts`

Corriger les calculs de mensualite totale pour ne pas multiplier par quantity :

**Lignes 366-368 - Avant:**
```typescript
const totalMonthlyPayment = equipment.reduce(
  (sum, item) => sum + ((item.monthly_payment || 0) * (item.quantity || 1)), 0
);
```

**Apres:**
```typescript
// monthly_payment en BD est DEJA le total pour cet equipement (pas unitaire)
const totalMonthlyPayment = equipment.reduce(
  (sum, item) => sum + (item.monthly_payment || 0), 0
);
```

**Lignes 379-382 - Avant:**
```typescript
const itemTotalMonthly = (offerItem.monthly_payment || 0) * (offerItem.quantity || 1);
```

**Apres:**
```typescript
// monthly_payment est deja le total de la ligne
const itemTotalMonthly = offerItem.monthly_payment || 0;
```

**Memes corrections pour les lignes 1077-1080 et 1084-1087.**

---

### 5. `src/services/commercialOfferPdfService.tsx`

Ajouter le calcul du prix de vente en tenant compte des quantites :

**Avant (lignes 121-124):**
```typescript
const totalSellingPrice = equipmentData.reduce(
  (sum, eq) => sum + (Number((eq as any).selling_price) || 0),
  0
);
```

**Apres:**
```typescript
// selling_price est le prix unitaire - multiplier par quantity
const totalSellingPrice = equipmentData.reduce(
  (sum, eq) => {
    const sellingPrice = Number((eq as any).selling_price) || 0;
    const quantity = Number(eq.quantity) || 1;
    return sum + (sellingPrice * quantity);
  },
  0
);
```

---

## Resume des corrections

| Fichier | Type de correction |
|---------|-------------------|
| `RecalculateFinancialsButton.tsx` | Supprimer multiplication `* quantity` pour monthly_payment |
| `CompactEquipmentSection.tsx` | Supprimer multiplication `* qty` pour monthly |
| `offersExportService.ts` | Priorite aux equipements pour calcul CA + recalcul marge % |
| `invoiceService.ts` (4 endroits) | Supprimer multiplication `* quantity` pour monthly_payment |
| `commercialOfferPdfService.tsx` | Ajouter multiplication `* quantity` pour selling_price |

## Resultat attendu

- Toutes les vues (detail, table, export Excel, PDF) afficheront la meme marge
- Les mensualites ne seront plus gonflees artificiellement
- Le calcul de marge sera coherent : `(Prix de vente total - Prix d'achat total) / Prix d'achat total * 100`
- Compatible avec tous les statuts de demande (brouillon, acceptee, sous contrat, etc.)
- Compatible avec tous les bailleurs
