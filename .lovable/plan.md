

# Plan : Corriger l'affichage de la marge globale

## Probleme identifie

La marge globale affichee (25.3%) ne correspond pas a la marge individuelle des equipements (20%) car :

1. **Calcul actuel** : La fonction `calculateFinancedAmount()` utilise la formule inverse Grenke en priorite :
   ```
   Montant finance = (Mensualite totale × 100) / Coefficient
   ```

2. **Resultat** : Cela donne un montant finance de **2 402.45 EUR** (base sur les mensualites), alors que la somme des prix de vente individuels est de **2 301.60 EUR** (base sur la marge de 20%).

3. **Consequence** : La marge affichee est calculee sur le montant Grenke (plus eleve), ce qui donne 25.3% au lieu de 20%.

## Solution

Modifier la logique pour que la marge globale affichee soit basee sur la **somme des prix de vente individuels** (`totalSellingPrice`) plutot que sur le montant calcule via la formule inverse Grenke.

## Modifications a effectuer

### Fichier : `src/components/offers/detail/FinancialSection.tsx`

**Changement de la fonction `calculateFinancedAmount()`** (lignes 207-236) :

Avant (formule Grenke en priorite) :
```typescript
const calculateFinancedAmount = () => {
  // MODE LEASING: Priorité 1 - Formule inverse Grenke
  if (totals.totalMonthlyPayment > 0 && offer.coefficient > 0) {
    return (totals.totalMonthlyPayment * 100) / offer.coefficient;
  }
  // ...
};
```

Apres (prix de vente en priorite) :
```typescript
const calculateFinancedAmount = () => {
  // MODE ACHAT ou LEASING: Priorité 1 - Somme des prix de vente individuels
  if (totals.totalSellingPrice > 0) {
    return totals.totalSellingPrice;
  }
  // Fallback: formule inverse Grenke si pas de prix de vente
  if (totals.totalMonthlyPayment > 0 && offer.coefficient > 0) {
    return (totals.totalMonthlyPayment * 100) / offer.coefficient;
  }
  // ...
};
```

### Fichier : `src/utils/marginCalculations.ts`

**Changement de la fonction `getEffectiveFinancedAmount()`** (lignes 73-95) :

Inverser les priorites pour utiliser `totalSellingPrice` en premier :

```typescript
export const getEffectiveFinancedAmount = (offer: OfferFinancialData, equipmentItems?: any[]): number => {
  const totals = calculateEquipmentTotals(offer, equipmentItems);
  
  // Priorité 1: totalSellingPrice depuis les équipements (somme des prix de vente)
  if (totals.totalSellingPrice > 0) {
    return totals.totalSellingPrice;
  }
  
  // Priorité 2: CALCUL INVERSE GRENKE (fallback si pas de prix de vente)
  if ((offer.coefficient || 0) > 0 && totals.totalMonthlyPayment > 0) {
    const computed = (totals.totalMonthlyPayment * 100) / (offer.coefficient as number);
    return Math.round(computed * 100) / 100;
  }
  
  // Priorité 3: financed_amount depuis l'offre
  if (offer.financed_amount && offer.financed_amount > 0) {
    return offer.financed_amount;
  }
  
  // Priorité 4: Fallback sur offer.amount
  return offer.amount || 0;
};
```

## Resultat attendu

| Avant | Apres |
|-------|-------|
| Marge globale : 25.3% | Marge globale : 20% |
| Base sur formule Grenke | Base sur somme des prix de vente |
| Incoherence avec marges individuelles | Coherence avec marges individuelles |

## Impact

- La marge globale affichee correspondra exactement a la moyenne ponderee des marges individuelles des equipements
- Le "Montant finance" affiche sera la somme des prix de vente (2 301.60 EUR)
- La formule Grenke reste utilisee comme fallback si aucun prix de vente n'est disponible

