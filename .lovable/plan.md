

# Utiliser le prix d'achat réel dans tous les calculs d'achats

## Probleme
Trois endroits utilisent encore `purchase_price` au lieu de `COALESCE(actual_purchase_price, purchase_price)` :

1. **Frontend `useCompanyDashboard.ts`** (self-leasing) — ligne 259 : le `select` ne récupère pas `actual_purchase_price`, et ligne 294 utilise uniquement `e.purchase_price`
2. **RPC no-args `get_monthly_financial_data`** (ligne 34) — utilise `ce.purchase_price * ce.quantity` sans fallback sur `actual_purchase_price`

La version `p_year` de la RPC (utilisée principalement) est déjà correcte.

## Corrections

### 1. `src/hooks/useCompanyDashboard.ts`
- Ligne 259 : ajouter `actual_purchase_price` au select de `contract_equipment`
- Ligne 294 : remplacer `e.purchase_price` par `(e.actual_purchase_price || e.purchase_price || 0)`

### 2. Migration SQL — corriger le no-args overload
- Remplacer `ce.purchase_price * ce.quantity` par `COALESCE(ce.actual_purchase_price, ce.purchase_price) * ce.quantity` dans la sous-requête `invoice_financials`

## Fichiers impactés

| Fichier | Modification |
|---|---|
| `src/hooks/useCompanyDashboard.ts` | Ajouter `actual_purchase_price` au select et l'utiliser en priorité pour le calcul self-leasing |
| `supabase/migrations/[new].sql` | Recréer le no-args overload avec `COALESCE(actual_purchase_price, purchase_price)` |

