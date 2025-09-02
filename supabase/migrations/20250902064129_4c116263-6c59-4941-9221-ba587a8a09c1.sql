-- Nettoyer les doublons de collaborateurs principaux existants
-- Garder le collaborateur principal le plus ancien pour chaque client
WITH duplicate_primaries AS (
  SELECT 
    client_id,
    MIN(created_at) as oldest_date
  FROM public.collaborators 
  WHERE is_primary = true 
  GROUP BY client_id 
  HAVING COUNT(*) > 1
),
keep_records AS (
  SELECT DISTINCT ON (c.client_id) c.id
  FROM public.collaborators c
  INNER JOIN duplicate_primaries dp ON c.client_id = dp.client_id
  WHERE c.is_primary = true 
  AND c.created_at = dp.oldest_date
  ORDER BY c.client_id, c.created_at
),
to_delete AS (
  SELECT c.id
  FROM public.collaborators c
  INNER JOIN duplicate_primaries dp ON c.client_id = dp.client_id
  LEFT JOIN keep_records kr ON c.id = kr.id
  WHERE c.is_primary = true 
  AND kr.id IS NULL
)
DELETE FROM public.collaborators 
WHERE id IN (SELECT id FROM to_delete);

-- Ajouter une contrainte unique pour empêcher plusieurs collaborateurs principaux par client
-- (sans CONCURRENTLY pour éviter le problème de transaction)
CREATE UNIQUE INDEX IF NOT EXISTS idx_collaborators_unique_primary_per_client 
ON public.collaborators (client_id) 
WHERE is_primary = true;