
# Plan : Corriger le comportement de la checkbox "Déduire"

## Problème Identifié

La checkbox "Déduire" a un comportement **inversé** et les totaux/moyennes ne se mettent pas à jour correctement.

### Contexte SQL
La fonction `get_monthly_financial_data` calcule :
- `margin` = CA - Notes de crédit - Achats → **Les NC sont déjà déduites**
- `credit_notes_amount` = valeur positive des NC

### Problème dans CompanyDashboard.tsx
```tsx
// Ligne 311 - Comportement actuel INVERSÉ
{formatCurrency(month.marge + (includeCreditNotes ? month.creditNotes : 0))}
```

Quand `includeCreditNotes = true` (coché), on **ajoute** les NC à la marge...
Mais la marge SQL a **déjà** les NC déduites !

**Résultat** : Cocher "Déduire" fait l'inverse → annule la déduction.

## Solution

### 1. Inverser la logique de la checkbox

La checkbox cochée = afficher avec déduction (comportement SQL par défaut)
La checkbox décochée = afficher sans déduction (ajouter les NC pour les "annuler")

```tsx
// AVANT (bugué)
month.marge + (includeCreditNotes ? month.creditNotes : 0)

// APRÈS (corrigé)
includeCreditNotes ? month.marge : month.marge + month.creditNotes
```

### 2. Corriger les totaux et moyennes

Les objets `totals` et `moyennes` doivent aussi tenir compte de la checkbox.

## Fichier à Modifier

| Fichier | Modification |
|---------|--------------|
| `src/components/dashboard/CompanyDashboard.tsx` | Inverser la logique et corriger les totaux |

## Modifications Détaillées

### A. Inverser le calcul dans les lignes mensuelles (lignes 310-317)

**Avant** :
```tsx
<TableCell className="text-right font-medium text-emerald-700">
  {formatCurrency(month.marge + (includeCreditNotes ? month.creditNotes : 0))}
</TableCell>
<TableCell className="text-right font-medium text-emerald-700">
  {month.ca > 0 
    ? (((month.marge + (includeCreditNotes ? month.creditNotes : 0)) / month.ca) * 100).toFixed(1)
    : '0.0'}%
</TableCell>
```

**Après** :
```tsx
<TableCell className="text-right font-medium text-emerald-700">
  {formatCurrency(includeCreditNotes ? month.marge : month.marge + month.creditNotes)}
</TableCell>
<TableCell className="text-right font-medium text-emerald-700">
  {month.ca > 0 
    ? ((includeCreditNotes ? month.marge : month.marge + month.creditNotes) / month.ca * 100).toFixed(1)
    : '0.0'}%
</TableCell>
```

### B. Corriger le calcul des totaux (lignes 75-81)

**Avant** :
```tsx
const totals = {
  ca: monthlyData.reduce((sum, month) => sum + month.ca, 0),
  directSales: monthlyData.reduce((sum, month) => sum + month.directSales, 0),
  achats: monthlyData.reduce((sum, month) => sum + month.achats, 0),
  marge: monthlyData.reduce((sum, month) => sum + month.marge, 0) + (includeCreditNotes ? totalCreditNotes : 0),
  creditNotes: totalCreditNotes,
};
```

**Après** :
```tsx
const margeBase = monthlyData.reduce((sum, month) => sum + month.marge, 0);
const totals = {
  ca: monthlyData.reduce((sum, month) => sum + month.ca, 0),
  directSales: monthlyData.reduce((sum, month) => sum + month.directSales, 0),
  achats: monthlyData.reduce((sum, month) => sum + month.achats, 0),
  marge: includeCreditNotes ? margeBase : margeBase + totalCreditNotes,
  creditNotes: totalCreditNotes,
};
```

### C. Corriger le calcul des moyennes (lignes 83-89)

Le calcul du `margePercent` dans moyennes dépend de `totals.marge` qui est maintenant correct, mais on doit s'assurer que le calcul est bien réactif.

**Après** (inchangé car dépend de totals.marge) :
```tsx
const moyennes = {
  ca: monthlyData.length ? totals.ca / monthlyData.length : 0,
  directSales: monthlyData.length ? totals.directSales / monthlyData.length : 0,
  achats: monthlyData.length ? totals.achats / monthlyData.length : 0,
  marge: monthlyData.length ? totals.marge / monthlyData.length : 0,
  margePercent: totals.ca > 0 ? (totals.marge / totals.ca) * 100 : 0
};
```

### D. Vérifier que les lignes TOTAL et MOYENNE utilisent les bons objets

Les lignes 338-348 affichent `totals.achats`, `totals.marge`, et `moyennes.margePercent` - ces valeurs seront maintenant correctement mises à jour quand la checkbox change.

## Résumé des Changements

| Élément | Avant (bugué) | Après (corrigé) |
|---------|---------------|-----------------|
| Marge ligne | `marge + (checked ? NC : 0)` | `checked ? marge : marge + NC` |
| % ligne | `(marge + NC) / CA` | `(checked ? marge : marge+NC) / CA` |
| Total marge | `sum(marge) + (checked ? totalNC : 0)` | `checked ? sum(marge) : sum(marge)+totalNC` |
| Moyenne % | Calculé depuis totals.marge | Reste inchangé, sera réactif |

## Comportement Attendu

| Checkbox | Marge affichée | Explication |
|----------|----------------|-------------|
| ☑️ Déduire | Marge SQL (NC déjà déduites) | Affiche la marge nette |
| ☐ Déduire | Marge + NC (annule la déduction) | Affiche la marge brute |

Pour Janvier avec NC = -10 460,4€ :
- ☑️ Coché : Marge = 18 780,5€ (comme dans votre capture)
- ☐ Décoché : Marge = 18 780,5€ + 10 460,4€ = **29 240,9€**
