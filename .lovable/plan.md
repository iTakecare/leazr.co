

## Plan : Ajouter un tooltip de décomposition sur la carte "Contrats Réalisés"

### Modifications

**1. `src/hooks/useCompanyDashboard.ts`** (~ligne 309-315)

Ajouter les sous-compteurs dans l'objet retourné par la query `realizedStats` :

```typescript
return {
  status: 'realized',
  count: totalCount,
  leasing_count: invoices?.length || 0,      // NEW
  self_leasing_count: selfLeasingCount,       // NEW
  total_revenue: totalRevenue,
  total_purchases: totalPurchases,
  total_margin: totalRevenue - totalPurchases
};
```

Mettre à jour l'interface `ContractStatistics` pour inclure `leasing_count?: number` et `self_leasing_count?: number`.

**2. `src/components/dashboard/CompanyDashboard.tsx`** (~ligne 414-426)

Envelopper la cellule "Nombre" dans un `Tooltip` (déjà disponible via `@/components/ui/tooltip`) qui affiche au survol la décomposition :

- `{realizedStats.leasing_count} factures leasing`
- `{realizedStats.self_leasing_count} contrats self-leasing`

Le tooltip apparaîtra au survol du bloc "Nombre" avec le total.

