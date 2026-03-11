

# Corriger le fallback de date d'achat dans le dashboard

## Problème
La CTE `equipment_purchases_by_month` dans `get_monthly_financial_data` utilise `COALESCE(ce.actual_purchase_date, inv.invoice_date)` comme date de référence pour les achats. Si aucune de ces deux dates n'existe (pas de date d'achat manuelle, pas encore de facture), l'achat n'apparaît pas dans le dashboard — c'est le cas pour mars.

## Solution
Ajouter un troisième fallback : la date à laquelle le contrat est passé au statut `equipment_ordered` dans `contract_workflow_logs`. La chaîne de fallback devient :

```text
actual_purchase_date → order_date → date passage "equipment_ordered" → invoice_date
```

## Changement technique

**Migration SQL** — mise à jour de `get_monthly_financial_data` :

Modifier la CTE `equipment_purchases_by_month` pour joindre `contract_workflow_logs` et récupérer la date de passage à `equipment_ordered` comme fallback supplémentaire :

```sql
equipment_purchases_by_month AS (
  SELECT
    EXTRACT(MONTH FROM COALESCE(
      ce.actual_purchase_date,
      ce.order_date,
      (SELECT MIN(cwl.created_at) FROM contract_workflow_logs cwl 
       WHERE cwl.contract_id = c.id AND cwl.new_status = 'equipment_ordered'),
      inv.invoice_date
    ))::integer as month,
    SUM(COALESCE(ce.actual_purchase_price, ce.purchase_price) * COALESCE(ce.quantity, 1)) as total_purchases
  FROM contract_equipment ce
  JOIN contracts c ON c.id = ce.contract_id
  LEFT JOIN invoices inv ON inv.contract_id = c.id
  WHERE c.company_id = user_company_id
    AND COALESCE(c.is_self_leasing, false) = false
    AND COALESCE(ce.actual_purchase_price, ce.purchase_price) > 0
    AND c.status IN ('signed', 'active', 'delivered', 'completed')
    AND EXTRACT(YEAR FROM COALESCE(
      ce.actual_purchase_date,
      ce.order_date,
      (SELECT MIN(cwl.created_at) FROM contract_workflow_logs cwl 
       WHERE cwl.contract_id = c.id AND cwl.new_status = 'equipment_ordered'),
      inv.invoice_date
    )) = target_year
  GROUP BY 1
)
```

Également mettre à jour le même fallback dans `useCompanyDashboard.ts` côté frontend pour cohérence.

## Fichiers impactés

| Fichier | Modification |
|---|---|
| `supabase/migrations/[new].sql` | Recréer `get_monthly_financial_data` avec le nouveau fallback |
| `src/hooks/useCompanyDashboard.ts` | Aligner la logique de date côté client |

