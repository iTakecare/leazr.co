

# Correction Self-Leasing : utiliser la date de premier prélèvement au lieu de la date de début de contrat

## Problème

La fonction `get_monthly_financial_data` utilise `contract_start_date` pour déterminer à partir de quel mois un contrat self-leasing génère du CA. Or, certains prélèvements ont été avancés :

| Client | contract_start_date | 1er prélèvement réel | Conséquence actuelle |
|---|---|---|---|
| Bernard Lux | 01/04/2026 | avancé au 08/03 | Exclu de mars (incorrect) |
| Naci-Prosper | 02/03/2026 | avancé au 08/03 | Inclus dans mars (OK après fix précédent) |

Bernard Lux a un `contract_start_date` au 1er avril, mais le premier prélèvement a été avancé au 8 mars via `mollie_sepa_changes`. Il devrait donc compter dans le CA de mars.

## Solution

Modifier le CTE `self_leasing_contracts` dans `get_monthly_financial_data` pour utiliser comme date de référence la **date effective du premier prélèvement** au lieu de `contract_start_date`.

La date effective sera calculée comme le minimum entre :
1. La première date de paiement réel (`mollie_payment_events` avec status = 'paid')
2. La date de prélèvement avancée (`mollie_sepa_changes` avec `change_type = 'next_date'`, la plus ancienne `new_value`)
3. Fallback : `contract_start_date`

### Modification SQL dans `self_leasing_contracts` CTE

```sql
self_leasing_contracts AS (
  SELECT
    c.id,
    c.monthly_payment,
    COALESCE(c.contract_duration, 36) as duration,
    -- Date effective = MIN entre premier paiement, date avancée, et start_date
    LEAST(
      COALESCE(c.contract_start_date, c.created_at::date),
      COALESCE(
        (SELECT MIN(mpe.created_at)::date FROM mollie_payment_events mpe 
         WHERE mpe.contract_id = c.id AND mpe.status = 'paid' 
         AND mpe.amount > 1), -- exclure les micro-paiements de mandat
        '9999-12-31'::date
      ),
      COALESCE(
        (SELECT MIN(msc.new_value::date) FROM mollie_sepa_changes msc 
         WHERE msc.contract_id = c.id AND msc.change_type = 'next_date'),
        '9999-12-31'::date
      )
    ) as start_date,
    c.contract_end_date as end_date,
    (SELECT COALESCE(SUM(...), 0) FROM contract_equipment ce WHERE ce.contract_id = c.id) as total_equipment_cost
  FROM contracts c
  WHERE c.company_id = user_company_id
    AND c.is_self_leasing = true
    AND c.status IN ('signed', 'active', 'delivered', 'completed')
)
```

### Résultat attendu pour mars 2026

| Client | Mensualité | Date effective | Inclus en mars |
|---|---|---|---|
| Patrick Grasseels | 131,85 € | 01/02 (1er paiement fév) | Oui |
| Frederic Veillard | 55,95 € | 01/02 (1er paiement fév) | Oui |
| Jennifer Meremans | 66,72 € | 01/03 (start_date) | Oui |
| Naci-Prosper | 177,78 € | 08/03 (next_date avancé) | Oui |
| Bernard Lux | 33,95 € | 08/03 (next_date avancé) | **Oui** (avant: non) |

**CA Self-Leasing mars** : 131,85 + 55,95 + 66,72 + 177,78 + 33,95 = **466,25 €**

## Fichier modifié

1. **Migration SQL** — `CREATE OR REPLACE FUNCTION get_monthly_financial_data(p_year integer)` avec le calcul de date effective de premier prélèvement

