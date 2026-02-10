

# Plan : Aligner les calculs financiers sur la formule Grenke

## Probleme

En mode leasing, trois endroits calculent le montant finance et la marge differemment :

| Vue | Methode utilisee | Montant finance | Marge |
|-----|-----------------|-----------------|-------|
| Calculateur (editeur) | Grenke: Mens x 100 / Coeff | 3 358,57 | 1 114,57 (49,65%) |
| Vue d'ensemble | Somme des P.V. | 3 083,59 | 838,59 (37,4%) |
| Onglet Financier | Somme des P.V. | 3 083,59 | 838,59 (37,4%) |

## Cause racine

Dans `NewEquipmentSection.tsx` (lignes 230-238) et `FinancialSection.tsx` (lignes 223-231), la somme des prix de vente individuels (`totalSellingPrice`) est utilisee en priorite. La formule Grenke n'est qu'un fallback.

Or, le calculateur utilise toujours Grenke comme source de verite. L'utilisateur confirme que Grenke doit primer.

## Solution

Inverser la priorite dans les deux fichiers : utiliser la formule Grenke en priorite, la somme des P.V. comme fallback uniquement si la mensualite ou le coefficient ne sont pas disponibles.

## Modifications

### 1. `src/components/offers/detail/NewEquipmentSection.tsx`

Dans la fonction `calculateTotals()` (lignes 222-239), remplacer la logique du mode leasing :

**Avant** :
```typescript
// En mode leasing, on aligne l'affichage marge/montant finance sur la somme des P.V.
if (totalSellingPrice > 0) {
  effectiveFinancedAmount = totalSellingPrice;
} else {
  // Fallback: Montant finance = Mensualite x 100 / Coefficient
  effectiveFinancedAmount = coefficient > 0 && totalMonthlyPayment > 0
    ? (totalMonthlyPayment * 100) / coefficient
    : 0;
}
```

**Apres** :
```typescript
// En mode leasing, la formule Grenke est la source de verite
// Montant finance = Mensualite x 100 / Coefficient
if (coefficient > 0 && totalMonthlyPayment > 0) {
  effectiveFinancedAmount = (totalMonthlyPayment * 100) / coefficient;
} else if (totalSellingPrice > 0) {
  // Fallback: somme des prix de vente
  effectiveFinancedAmount = totalSellingPrice;
} else {
  effectiveFinancedAmount = 0;
}
```

### 2. `src/components/offers/detail/FinancialSection.tsx`

Dans la fonction `calculateFinancedAmount()` (lignes 220-238), meme inversion de priorite :

**Avant** :
```typescript
// MODE LEASING: Priorite 1 - Somme des prix de vente individuels
if (totals.totalSellingPrice > 0) {
  return totals.totalSellingPrice;
}
// Priorite 2: Formule inverse Grenke (fallback)
if (totals.totalMonthlyPayment > 0 && offer.coefficient > 0) {
  return (totals.totalMonthlyPayment * 100) / offer.coefficient;
}
```

**Apres** :
```typescript
// MODE LEASING: Priorite 1 - Formule Grenke (source de verite)
if (totals.totalMonthlyPayment > 0 && offer.coefficient > 0) {
  return (totals.totalMonthlyPayment * 100) / offer.coefficient;
}
// Priorite 2: Somme des prix de vente (fallback)
if (totals.totalSellingPrice > 0) {
  return totals.totalSellingPrice;
}
```

### 3. `src/components/offers/detail/FinancialSection.tsx` - Auto-update

Dans le `useEffect` auto-update (lignes 146-152), meme correction :

**Avant** :
```typescript
newFinancedAmount = currentTotals.totalSellingPrice > 0
  ? currentTotals.totalSellingPrice
  : (currentTotals.totalMonthlyPayment * (offer.coefficient || 3.27));
```

**Apres** :
```typescript
// Grenke: Mensualite x 100 / Coefficient
newFinancedAmount = currentTotals.totalMonthlyPayment > 0 && (offer.coefficient || 0) > 0
  ? (currentTotals.totalMonthlyPayment * 100) / offer.coefficient
  : currentTotals.totalSellingPrice > 0
    ? currentTotals.totalSellingPrice
    : currentTotals.totalPurchasePrice;
```

Note : la formule dans l'auto-update etait aussi incorrecte - elle multipliait par le coefficient au lieu de diviser (Mens x Coeff au lieu de Mens x 100 / Coeff).

## Resume des fichiers

| Fichier | Modification |
|---------|-------------|
| `src/components/offers/detail/NewEquipmentSection.tsx` | Grenke en priorite dans `calculateTotals()` |
| `src/components/offers/detail/FinancialSection.tsx` | Grenke en priorite dans `calculateFinancedAmount()` et auto-update |

## Resultat attendu

Apres correction, les trois vues afficheront les memes valeurs :
- Montant finance : 3 358,57 EUR
- Marge : 1 113,57 EUR (49,6%)
- Mensualite : 108,85 EUR

