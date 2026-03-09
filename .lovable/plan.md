

# Correction Self-Leasing : utiliser les montants réels Mollie au lieu des montants théoriques du contrat

## Problème identifié

Le dashboard utilise `contracts.monthly_payment` (HTVA) pour le CA Self-Leasing théorique. Or, les montants réellement prélevés via Mollie diffèrent pour certains contrats :

| Client | contract.monthly_payment (HTVA) | Montant réel Mollie | Écart |
|---|---|---|---|
| Patrick Grasseels | 131,85 € | 131,85 € | - |
| Frederic Veillard | 55,95 € | 55,95 € | - |
| Jennifer Meremans | **66,72 €** | **~63,92 €** | **~2,80 €** |
| Naci-Prosper | 177,78 € | 177,78 € | - |
| Bernard Lux | 33,95 € | 33,95 € | - |

**Dashboard actuel** : 466,2 € — **Mollie réel HTVA** : 463,4 €

L'écart vient de Jennifer Meremans dont le contrat a un `monthly_payment` de 66,72 € HTVA alors que Mollie prélève un montant correspondant à ~63,92 € HTVA.

## Solution proposée

Deux corrections :

### 1. Corriger le montant du contrat de Jennifer Meremans
Mettre à jour `contracts.monthly_payment` pour refléter le montant HTVA réel prélevé par Mollie (63,92 €). C'est la source de vérité.

### 2. Modifier la fonction SQL pour prendre en compte les changements Mollie
Dans `self_leasing_contracts`, utiliser le dernier montant modifié via `mollie_sepa_changes` (type `amount`) converti en HTVA (/1.21) au lieu du `contracts.monthly_payment` statique. Cela garantit que si un montant d'abonnement Mollie est modifié (comme Bernard Lux 33,95→41,08 TTC), le dashboard utilise automatiquement le bon HTVA.

```sql
-- Dans self_leasing_contracts CTE :
COALESCE(
  (SELECT msc.new_value::numeric / 1.21
   FROM mollie_sepa_changes msc 
   WHERE msc.contract_id = c.id AND msc.change_type = 'amount'
   ORDER BY msc.created_at DESC LIMIT 1),
  c.monthly_payment
) as monthly_payment
```

### Résultat attendu mars 2026
131,85 + 55,95 + 63,92 + 177,78 + 33,95 = **463,45 €** ≈ 463,4 €

## Fichiers modifiés

1. **Data update** — Correction du `monthly_payment` de Jennifer Meremans
2. **Migration SQL** — `CREATE OR REPLACE FUNCTION get_monthly_financial_data` avec prise en compte des montants Mollie modifiés

