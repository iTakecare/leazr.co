
# Plan : Corriger le calcul de la mensualité après acompte dans la vue d'ensemble

## Problème identifié

Dans la carte "Acompte versé" de la vue d'ensemble :
- **Affiche** : Mensualité après acompte = **170,53 €** 
- **Attendu** : Mensualité après acompte = **204,47 €** (comme dans le calculateur)

### Cause racine

Le calcul utilise la **somme des prix de vente des équipements** (8 454,94 €) au lieu du **montant financé Grenke** (9 676,99 €).

| Calcul | Vue d'ensemble (incorrect) | Calculateur (correct) |
|--------|---------------------------|----------------------|
| Base | totalSellingPrice = 8 454,94 € | Grenke = 268,73 × 100 / 2.777 = 9 676,99 € |
| Après acompte | 8 454,94 - 2 314,04 = 6 140,90 € | 9 676,99 - 2 314,04 = 7 362,95 € |
| Mensualité | 6 140,90 × 2.777% = **170,53 €** | 7 362,95 × 2.777% = **204,47 €** |

### Logique métier correcte

En mode leasing (location propre ou via bailleur), le "montant total financé" est déterminé par la **formule Grenke inverse** :

```text
Montant financé = Mensualité totale × 100 / Coefficient
```

L'acompte doit réduire ce montant financé (pas le P.V. total des équipements).

## Solution

Modifier `NewEquipmentSection.tsx` pour utiliser la **formule Grenke** comme base du calcul d'acompte au lieu de `totalSellingPrice`.

## Modification à effectuer

### Fichier : `src/components/offers/detail/NewEquipmentSection.tsx`

**Lignes 246-251** - Changer le calcul de `financedAfterDownPayment` :

```typescript
// Calculs avec acompte (seulement en mode leasing)
const downPayment = isPurchase ? 0 : (offer.down_payment || 0);

// Pour l'acompte, utiliser le montant financé Grenke (pas le P.V. total)
// Grenke = Mensualité × 100 / Coefficient
const grenkeFinancedAmount = coefficient > 0 && totalMonthlyPayment > 0
  ? (totalMonthlyPayment * 100) / coefficient
  : effectiveFinancedAmount;

const financedAfterDownPayment = Math.max(0, grenkeFinancedAmount - downPayment);
const adjustedMonthlyPayment = !isPurchase && downPayment > 0 && coefficient > 0
  ? (financedAfterDownPayment * coefficient) / 100
  : totalMonthlyPayment;
```

## Résultat attendu

| Élément | Avant | Après |
|---------|-------|-------|
| Base pour l'acompte | 8 454,94 € (P.V. total) | 9 676,99 € (Grenke) |
| Montant financé après acompte | 6 140,90 € | 7 362,95 € |
| Mensualité après acompte | 170,53 € | **204,47 €** |

La mensualité après acompte sera cohérente entre le calculateur et la vue d'ensemble.

## Fichier modifié

| Fichier | Modification |
|---------|-------------|
| `src/components/offers/detail/NewEquipmentSection.tsx` | Utiliser Grenke pour le calcul d'acompte |
