

# Correction du calcul Self-Leasing : prise en compte du mois de début

## Problème

La fonction SQL `get_monthly_financial_data` compare `make_date(target_year, month, 1)` avec `start_date`. Pour Naci-Prosper (start_date = 2 mars), `2026-03-01 < 2026-03-02` → exclu de mars. C'est incorrect : un contrat démarrant le 2 mars doit compter pour mars.

## Contrats self-leasing actuels

| Client | Mensualité HTVA | Début | Attendu en mars |
|---|---|---|---|
| Patrick Grasseels | 131,85 € | 01/02 | Oui |
| Frederic Veillard | 55,95 € | 01/02 | Oui |
| Jennifer Meremans | 66,72 € | 01/03 | Oui |
| Naci-Prosper Ndayishimiye | 177,78 € | 02/03 | Oui (actuellement exclu — bug) |
| Bernard Lux | 33,95 € | 01/04 | Non |

**CA Self-Leasing mars attendu** : 131,85 + 55,95 + 66,72 + 177,78 = **432,30 €**

## Correction

Migration SQL modifiant `get_monthly_financial_data` : remplacer les 2 occurrences de la comparaison de date dans le CTE `self_leasing_by_month` :

```sql
-- Avant (bug)
make_date(target_year, m.month_num, 1) >= slc.start_date

-- Après (comparaison mois/année uniquement)
(target_year * 12 + m.month_num) >= 
  (EXTRACT(YEAR FROM slc.start_date)::integer * 12 + EXTRACT(MONTH FROM slc.start_date)::integer)
```

Cela garantit que tout contrat démarrant dans un mois donné (quel que soit le jour) est inclus dans le CA de ce mois.

## Fichier modifié

1. **Migration SQL** — `CREATE OR REPLACE FUNCTION get_monthly_financial_data` avec la correction des 2 comparaisons de date

## Note sur le build error Dexie

L'erreur TypeScript `dexie.d.ts` est un problème connu de compatibilité TypeScript 5.x avec Dexie, non lié à cette modification. Elle n'affecte pas le fonctionnement de l'application.

