

# Corriger les KPI du dashboard mobile

## Problème
Le dashboard mobile (`MobileDashboardPage`) calcule les totaux KPI uniquement à partir de `m.revenue` (CA leasing), alors que le desktop inclut aussi `direct_sales_revenue` et `self_leasing_revenue`. Les achats et la marge sont aussi potentiellement décalés car la marge RPC ne tient pas compte des mêmes colonnes.

## Comparaison

| KPI | Desktop (CompanyDashboard) | Mobile (MobileDashboardPage) |
|---|---|---|
| CA | `revenue + direct_sales_revenue + self_leasing_revenue` | `revenue` seulement |
| Achats | `purchases` | `purchases` (OK) |
| Marge | `margin` | `margin` (OK si RPC cohérente) |
| Taux marge | `marge / ca * 100` | `totalMargin / totalRevenue * 100` (faux car CA incomplet) |

## Correction

**Fichier** : `src/components/mobile/pages/MobileDashboardPage.tsx`

Modifier le `yearTotals` (lignes 168-189) pour inclure les trois flux de CA, identique au desktop :

```typescript
const yearTotals = React.useMemo(() => {
  if (!monthlyData || monthlyData.length === 0) {
    return { totalRevenue: 0, totalPurchases: 0, totalMargin: 0, marginRate: 0 };
  }

  const totalRevenue = monthlyData.reduce((sum: number, m: any) => 
    sum + (m.revenue || 0) + (m.direct_sales_revenue || 0) + (m.self_leasing_revenue || 0), 0);
  const totalPurchases = monthlyData.reduce((sum: number, m: any) => sum + (m.purchases || 0), 0);
  const totalMargin = totalRevenue - totalPurchases;
  const marginRate = totalRevenue > 0 ? (totalMargin / totalRevenue) * 100 : 0;

  return { totalRevenue, totalPurchases, totalMargin, marginRate };
}, [monthlyData]);
```

Cela aligne exactement le calcul mobile sur le desktop.

