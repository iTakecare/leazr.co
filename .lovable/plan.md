

# Eviter le double comptage Self-Leasing / Factures Billit

## Probleme identifie

La fonction SQL `get_monthly_financial_data` calcule le CA de deux facons pour les contrats self-leasing :

1. **Via les factures** (`leasing_revenue` CTE) : somme de toutes les factures de type `leasing`
2. **Via les contrats** (`self_leasing_by_month` CTE) : `monthly_payment` calcule a partir du contrat

Quand les factures Billit self-leasing sont importees et matchees aux contrats, le meme montant est compte deux fois.

## Solution

Modifier la fonction SQL `get_monthly_financial_data` pour que le CTE `self_leasing_by_month` exclue les mois ou un contrat self-leasing a deja une facture enregistree. Ainsi :

- Si une facture existe pour un contrat self-leasing a un mois donne --> le CA vient de la facture (via `leasing_revenue`)
- Si aucune facture n'existe pour ce mois --> le CA vient du calcul du contrat (via `self_leasing_by_month`)

## Changement technique

**Migration SQL** : Mise a jour de `get_monthly_financial_data`

Dans le CTE `self_leasing_by_month`, ajouter une condition qui verifie l'absence de facture pour ce contrat et ce mois :

```text
self_leasing_by_month AS (
  SELECT
    m.month_num as month,
    SUM(
      CASE 
        WHEN [contrat actif ce mois]
             AND NOT EXISTS (
               SELECT 1 FROM invoices inv 
               WHERE inv.contract_id = slc.id 
                 AND EXTRACT(MONTH FROM inv.invoice_date) = m.month_num
                 AND EXTRACT(YEAR FROM inv.invoice_date) = target_year
             )
        THEN slc.monthly_payment 
        ELSE 0 
      END
    ) as sl_revenue,
    SUM(
      CASE 
        WHEN [contrat actif ce mois]
             AND NOT EXISTS (...)
        THEN slc.total_equipment_cost / NULLIF(slc.duration, 0)
        ELSE 0 
      END
    ) as sl_purchase
  FROM months m
  CROSS JOIN self_leasing_contracts slc
  GROUP BY m.month_num
)
```

Meme logique pour `sl_purchase` (amortissement) : si une facture existe, l'achat est deja couvert par `equipment_purchases_by_month` (qui exclut le self-leasing actuellement, mais cela peut etre ajuste si necessaire).

Cette approche est retrocompatible : tant qu'il n'y a pas de factures matchees, le comportement reste identique. Des qu'une facture est importee et matchee, elle prend le relais.

