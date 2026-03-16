

## Plan : Exclure les factures créditées du comptage "Contrats Réalisés" et "Ventes Directes"

### Problème

Dans `useCompanyDashboard.ts`, les requêtes pour les statistiques **"Contrats Réalisés"** (ligne 181) et **"Ventes Directes"** (ligne 331) récupèrent **toutes** les factures sans exclure celles ayant reçu une note de crédit. Quand une facture est créditée puis qu'une nouvelle facture est émise pour la remplacer, les deux sont comptées — d'où un double comptage en nombre et en CA.

### Solution

Ajouter un filtre `.is('credit_note_id', null)` sur les deux requêtes de factures dans `useCompanyDashboard.ts` pour exclure les factures qui ont été créditées (celles ayant un `credit_note_id` renseigné).

### Fichier modifié

**`src/hooks/useCompanyDashboard.ts`** — 2 modifications :

1. **Requête "Contrats Réalisés"** (~ligne 181-187) : ajouter `.is('credit_note_id', null)` après le filtre `invoice_type = 'leasing'`

2. **Requête "Ventes Directes"** (~ligne 331-337) : ajouter `.is('credit_note_id', null)` après le filtre `invoice_type = 'purchase'`

Cela garantit que seules les factures non-créditées sont comptabilisées dans le nombre de contrats et le CA. La fonction SQL `get_monthly_financial_data` n'a pas besoin de changement car elle gère déjà les notes de crédit séparément dans sa CTE `credit_notes_cte`.

