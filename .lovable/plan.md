
# Plan : Corriger le calcul des prix de vente individuels avec le coefficient correct

## Diagnostic du problème

### Données actuelles en base de données
| Équipement | P.A. | selling_price stocké | monthly_payment |
|------------|------|---------------------|-----------------|
| iPad Air 13 Pouces | 870 € | 1536,86 € | 54,25 € |
| Magic Keyboard | 232 € | 301,69 € | 10,65 € |
| iPad 10,9 | 260,64 € | 650,14 € | 22,95 € |
| Neomounts Support | 45,45 € | 83,57 € | 2,95 € |
| **TOTAL** | 1408,09 € | **2572,26 €** | 90,80 € |

### Calcul du total affiché
- Coefficient de l'offre : **3.24**
- Formule Grenke : Montant financé = Mensualité × 100 / Coefficient
- **2802,47 €** = 90,80 × 100 / 3.24 ✓

### Le problème identifié
1. **Le total P.V. (2802,47 €)** est calculé correctement via la formule Grenke
2. **Les P.V. individuels** utilisent les `selling_price` stockés en BD (total 2572,26 €)
3. **Incohérence** : La somme des prix individuels (2572,26 €) ≠ Total affiché (2802,47 €)

### Cause racine
Dans `NewEquipmentSection.tsx`, ligne 563 :
```typescript
const adjustedSellingPrices = calculateAllSellingPrices(
  equipment, 
  totals.totalPrice, 
  totals.totalSellingPrice  // ← Utilise la somme des selling_price stockés
);
```

Mais `totals.effectiveFinancedAmount` (calculé via Grenke) devrait être utilisé en mode leasing.

De plus, la fonction `calculateAllSellingPrices` (lignes 290-299) utilise directement les `selling_price` stockés s'ils existent, sans les recalculer proportionnellement au total Grenke.

## Solution proposée

### Modification 1 : Utiliser le montant financé Grenke comme base de répartition

**Fichier** : `src/components/offers/detail/NewEquipmentSection.tsx`

**Ligne 563** : Changer le paramètre passé à `calculateAllSellingPrices`

```typescript
// AVANT
const adjustedSellingPrices = calculateAllSellingPrices(equipment, totals.totalPrice, totals.totalSellingPrice);

// APRÈS - En mode leasing, utiliser le montant financé Grenke
const adjustedSellingPrices = calculateAllSellingPrices(
  equipment, 
  totals.totalPrice, 
  isPurchase ? totals.totalSellingPrice : totals.effectiveFinancedAmount
);
```

### Modification 2 : Répartir proportionnellement en mode leasing

Modifier `calculateAllSellingPrices` pour qu'en mode leasing, les prix soient **toujours** répartis proportionnellement au total Grenke, en ignorant les `selling_price` stockés (sauf s'ils ont été explicitement définis manuellement).

Selon la memory `equipment-manual-selling-price-preservation`, un prix est considéré comme "manuel" si l'écart avec le prix proportionnel est > 1 €.

**Nouvelle logique pour le mode leasing** (lignes 285-340) :

```typescript
// MODE LEASING: Toujours répartir proportionnellement pour équilibrer avec le total Grenke
// Sauf pour les équipements avec un selling_price manuellement défini (écart > 1€)

// Étape 1: Calculer le prix proportionnel attendu pour chaque équipement
const proportionalPrices: Record<string, number> = {};
equipmentList.forEach(item => {
  const equipmentTotal = item.purchase_price * item.quantity;
  const proportion = equipmentTotal / totalPurchasePrice;
  proportionalPrices[item.id] = totalSellingPrice * proportion; // totalSellingPrice = effectiveFinancedAmount
});

// Étape 2: Identifier les équipements avec un prix manuellement défini (écart > 1€)
let totalManualSellingPrice = 0;
let totalManualPurchasePrice = 0;

equipmentList.forEach(item => {
  const equipmentPurchaseTotal = item.purchase_price * item.quantity;
  const proportionalPrice = proportionalPrices[item.id];
  
  if (item.selling_price !== null && item.selling_price !== undefined && item.selling_price > 0) {
    const storedTotal = item.selling_price * item.quantity;
    const difference = Math.abs(storedTotal - proportionalPrice);
    
    // Si l'écart est > 1€, considérer comme prix manuel à préserver
    if (difference > 1) {
      adjustedPrices[item.id] = Math.round(storedTotal * 100) / 100;
      totalManualSellingPrice += storedTotal;
      totalManualPurchasePrice += equipmentPurchaseTotal;
    }
  }
});

// Étape 3: Répartir le reste avec Largest Remainder
// (même logique existante pour les items non manuels)
```

## Résumé des fichiers à modifier

| Fichier | Modification |
|---------|-------------|
| `src/components/offers/detail/NewEquipmentSection.tsx` | Utiliser `effectiveFinancedAmount` et répartir proportionnellement |

## Résultat attendu

### Avant correction
| Équipement | P.V. unitaire affiché | P.V. total affiché |
|------------|----------------------|-------------------|
| iPad Air 13 Pouces | 1536,86 € | 1536,86 € |
| Magic Keyboard | 301,69 € | 301,69 € |
| iPad 10,9 | 650,14 € | 650,14 € |
| Neomounts Support | 83,57 € | 83,57 € |
| **TOTAL** | — | **2572,26 €** ≠ 2802,47 € |

### Après correction
Les prix de vente individuels seront recalculés proportionnellement pour que leur somme = 2802,47 € (total Grenke)

| Équipement | Proportion | P.V. total recalculé |
|------------|------------|---------------------|
| iPad Air 13 Pouces | 61.77% | ~1731,46 € |
| Magic Keyboard | 16.47% | ~461,53 € |
| iPad 10,9 | 18.51% | ~518,67 € |
| Neomounts Support | 3.23% | ~90,49 € |
| **TOTAL** | 100% | **2802,47 €** ✓ |

## Notes techniques

- Cette modification respecte la memory `calcul-marge-grenke` : le montant financé total est calculé avec la formule Grenke
- Elle respecte aussi `equipment-manual-selling-price-preservation` : les prix manuellement modifiés (écart > 1€) sont préservés
- En mode achat (`is_purchase = true`), le comportement existant est conservé (pas de formule Grenke)
