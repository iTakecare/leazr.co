

# Fix: Déduire les notes de crédit du CA quand la case est cochée

## Diagnostic
Dans `CompanyDashboard.tsx`, quand `includeCreditNotes` est activé :
- **Marge** : correctement ajustée (ligne 323)
- **CA total, CA Leasing** : jamais ajustés (lignes 315-316, 344-345)
- **KPI cards en haut** : `totals.ca` jamais ajusté (ligne 211)

Les notes de crédit proviennent de factures leasing, donc elles doivent réduire le CA Leasing (et par conséquent le CA total).

## Solution — fichier unique : `src/components/dashboard/CompanyDashboard.tsx`

1. **Totals** (lignes 79-87) : quand `includeCreditNotes`, soustraire les credit notes du `ca` et du `caLeasing`
```typescript
const totals = {
  ca: monthlyData.reduce((sum, m) => sum + m.ca, 0) - (includeCreditNotes ? totalCreditNotes : 0),
  caLeasing: monthlyData.reduce((sum, m) => sum + m.caLeasing, 0) - (includeCreditNotes ? totalCreditNotes : 0),
  // ... reste inchangé
};
```

2. **Lignes mensuelles** (lignes 315-316) : appliquer la déduction par mois
```tsx
<TableCell>{formatCurrency(includeCreditNotes ? month.ca - month.creditNotes : month.ca)}</TableCell>
<TableCell>{formatCurrency(includeCreditNotes ? month.caLeasing - month.creditNotes : month.caLeasing)}</TableCell>
```

3. **Moyennes** : déjà calculées depuis `totals`, donc automatiquement corrigées.

4. **KPI card CA Total** (ligne 211) : utilise déjà `totals.ca`, donc automatiquement corrigé.

