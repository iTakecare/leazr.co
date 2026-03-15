

## Suppression des doublons d'importation

### Constat
- **72 demandes (offers)** créées après Collard Yohan (après le 15 mars 13:16:42), toutes importées en rafale entre 15:06 et 15:07 — ce sont des doublons d'une resynchronisation.
- Seulement **4 clients** créés après cette date (les doublons ont été rattachés aux clients existants).

### Actions à effectuer

1. **Supprimer les 72 offers en doublon** — toutes les entrées dans `offers` avec `created_at > '2026-03-15 13:16:42.339094+00'`
2. **Vérifier et supprimer les 4 clients en doublon** créés après cette date, s'ils sont effectivement des doublons (pas de données propres rattachées)

### Requêtes SQL (via l'outil insert/update)

```sql
-- 1. Supprimer les offers en doublon
DELETE FROM offers 
WHERE created_at > '2026-03-15 13:16:42.339094+00';

-- 2. Supprimer les clients en doublon (après vérification)
DELETE FROM clients 
WHERE created_at > '2026-03-15 13:16:42+00'
AND id NOT IN (SELECT DISTINCT client_id FROM offers WHERE client_id IS NOT NULL);
```

Aucune modification de code nécessaire — uniquement du nettoyage de données.

