
# Plan : Migration des Offres "Score C > Plus de nouvelles" vers "Sans Suite"

## Résumé

Migration de **48 offres** actuellement en statut "rejected" avec raison "Sans suite" ou "Plus de nouvelles" vers le nouveau système Score D / `without_follow_up`.

---

## Données à Migrer

| Statut actuel | Score | Nombre d'offres |
|---------------|-------|-----------------|
| `internal_rejected` | C (interne) | 47 |
| `leaser_rejected` | C (leaser) | 1 |
| **Total** | | **48** |

### Raisons concernées
- "Sans suite - Plus de nouvelles"
- "Sans suite - Ne souhaite plus de leasing"
- "Plus de nouvelles"
- Et leurs variantes avec compléments

---

## Requêtes SQL de Migration

### 1. Mise à jour des offres (workflow_status + score)

```sql
-- Migrer les offres avec Score C "Sans suite/Plus de nouvelles" vers without_follow_up + Score D
UPDATE offers
SET 
  workflow_status = 'without_follow_up',
  internal_score = CASE 
    WHEN internal_score = 'C' THEN 'D' 
    ELSE internal_score 
  END,
  leaser_score = CASE 
    WHEN leaser_score = 'C' AND internal_score != 'C' THEN 'D'
    ELSE leaser_score 
  END,
  updated_at = NOW()
WHERE workflow_status IN ('internal_rejected', 'leaser_rejected')
  AND (internal_score = 'C' OR leaser_score = 'C')
  AND id IN (
    SELECT DISTINCT offer_id 
    FROM offer_workflow_logs 
    WHERE reason ILIKE '%Sans suite%' 
       OR reason ILIKE '%Plus de nouvelles%'
       OR reason ILIKE '%Ne souhaite plus%'
  );
```

### 2. Mise à jour des logs de workflow (sub_reason)

```sql
-- Ajouter la sub_reason appropriée aux logs concernés
UPDATE offer_workflow_logs
SET sub_reason = CASE
  WHEN reason ILIKE '%Plus de nouvelles%' THEN 'no_response'
  WHEN reason ILIKE '%Ne souhaite plus%' THEN 'project_cancelled'
  ELSE 'other'
END
WHERE offer_id IN (
  SELECT id FROM offers WHERE workflow_status = 'without_follow_up'
)
AND (reason ILIKE '%Sans suite%' OR reason ILIKE '%Plus de nouvelles%' OR reason ILIKE '%Ne souhaite plus%')
AND sub_reason IS NULL;
```

### 3. Créer un log de migration (traçabilité)

```sql
-- Enregistrer la migration dans les logs
INSERT INTO offer_workflow_logs (offer_id, user_id, previous_status, new_status, reason, sub_reason, created_at)
SELECT 
  id,
  user_id,
  workflow_status,
  'without_follow_up',
  'Migration automatique : Score C "Sans suite" vers Score D',
  'no_response',
  NOW()
FROM offers
WHERE workflow_status = 'without_follow_up'
  AND updated_at >= NOW() - INTERVAL '1 minute';
```

---

## Impact de la Migration

### Avant
| Statut | Score | Signification |
|--------|-------|---------------|
| `internal_rejected` | C | Refusé (mélange rejets et inactivité) |
| `leaser_rejected` | C | Refusé leaser |

### Après
| Statut | Score | Signification |
|--------|-------|---------------|
| `without_follow_up` | D | Sans suite (client injoignable) |
| `internal_rejected` | C | Refusé qualifié (fraude, etc.) |
| `leaser_rejected` | C | Refusé leaser qualifié |

---

## Vérification Post-Migration

```sql
-- Vérifier la migration
SELECT 
  workflow_status,
  internal_score,
  leaser_score,
  COUNT(*) as count
FROM offers
WHERE workflow_status = 'without_follow_up'
   OR id IN (
     SELECT DISTINCT offer_id 
     FROM offer_workflow_logs 
     WHERE reason ILIKE '%Sans suite%'
   )
GROUP BY workflow_status, internal_score, leaser_score
ORDER BY workflow_status;
```

---

## Exécution

Cette migration sera effectuée via l'outil d'insertion SQL de Supabase :
1. Exécuter la requête de mise à jour des offres
2. Exécuter la mise à jour des sub_reason dans les logs
3. (Optionnel) Créer les logs de traçabilité
4. Vérifier le résultat

---

## Rollback (si nécessaire)

En cas de problème, voici la requête de rollback :

```sql
-- Annuler la migration (si besoin)
UPDATE offers
SET 
  workflow_status = 'internal_rejected',
  internal_score = 'C',
  updated_at = NOW()
WHERE workflow_status = 'without_follow_up'
  AND updated_at >= '2026-01-26';
```
