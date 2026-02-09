

# Correction de la vulnerabilite SQL Injection - `check-column-exists`

## Probleme

L'edge function `supabase/functions/check-column-exists/index.ts` contient une **injection SQL critique** (score 95/100). Les parametres `table_name` et `column_name` sont directement interpoles dans une requete SQL sans aucune validation :

```sql
AND table_name = '${table_name}'
AND column_name = '${column_name}'
```

Un attaquant pourrait injecter du SQL arbitraire via ces parametres.

## Constat

Cette edge function **n'est appelee nulle part** dans le code du projet. Elle est inutilisee.

## Solution recommandee

**Supprimer completement** cette edge function puisqu'elle n'est pas utilisee. Cela elimine la vulnerabilite a la source.

- Suppression du fichier `supabase/functions/check-column-exists/index.ts`
- Suppression de la fonction deployee sur Supabase

Si a l'avenir vous avez besoin de verifier l'existence d'une colonne, une approche securisee serait d'utiliser une liste blanche de noms de tables/colonnes autorises, sans jamais executer de SQL brut.

## Fichier concerne

| Fichier | Action |
|---------|--------|
| `supabase/functions/check-column-exists/index.ts` | Suppression |

