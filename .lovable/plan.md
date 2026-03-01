
# Corriger l'affichage du CA Self-Leasing dans le dashboard

## Probleme identifie

Les factures self-leasing generees depuis Mollie ont `invoice_type = 'leasing'` et `billing_data->>'type' = 'self_leasing_monthly'`. La fonction SQL les compte dans la colonne "CA Leasing" au lieu de "CA Self-Leasing" car :

- Le CTE `leasing_revenue` selectionne toutes les factures `invoice_type = 'leasing'` sans distinction
- Le CTE `self_leasing_by_month` exclut les mois ou une facture existe deja (via `NOT EXISTS`), ce qui est correct pour eviter le double comptage, mais le revenu atterrit dans la mauvaise colonne

## Solution

Modifier la fonction SQL `get_monthly_financial_data` dans une nouvelle migration :

1. **Exclure les factures self-leasing du CTE `leasing_revenue`** en ajoutant la condition :
   ```sql
   AND (i.billing_data->>'type' IS DISTINCT FROM 'self_leasing_monthly')
   ```

2. **Ajouter un nouveau CTE `self_leasing_invoices`** qui comptabilise les factures self-leasing reelles :
   ```sql
   self_leasing_invoices AS (
     SELECT
       EXTRACT(MONTH FROM i.invoice_date)::integer as month,
       SUM(i.amount) as total_invoiced
     FROM invoices i
     WHERE i.company_id = user_company_id
       AND i.billing_data->>'type' = 'self_leasing_monthly'
       AND EXTRACT(YEAR FROM i.invoice_date) = target_year
     GROUP BY 1
   )
   ```

3. **Combiner les deux sources** dans la colonne `self_leasing_revenue` :
   ```sql
   (COALESCE(sl.sl_revenue, 0) + COALESCE(sli.total_invoiced, 0))::numeric as self_leasing_revenue
   ```

Ainsi, le CA self-leasing comprendra a la fois les montants calcules automatiquement (mois sans facture) et les factures reellement generees, sans jamais compter deux fois le meme mois.

## Fichier concerne

- Nouvelle migration SQL modifiant `get_monthly_financial_data`
