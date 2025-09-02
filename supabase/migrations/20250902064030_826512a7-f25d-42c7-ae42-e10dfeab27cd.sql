-- Nettoyer les doublons de collaborateurs principaux existants
-- Garder le plus ancien collaborateur principal pour chaque client
WITH duplicate_primaries AS (
  SELECT 
    client_id,
    MIN(id) as keep_id,
    COUNT(*) as count
  FROM public.collaborators 
  WHERE is_primary = true 
  GROUP BY client_id 
  HAVING COUNT(*) > 1
),
to_delete AS (
  SELECT c.id
  FROM public.collaborators c
  INNER JOIN duplicate_primaries dp ON c.client_id = dp.client_id
  WHERE c.is_primary = true 
  AND c.id != dp.keep_id
)
DELETE FROM public.collaborators 
WHERE id IN (SELECT id FROM to_delete);

-- Ajouter une contrainte unique pour empêcher plusieurs collaborateurs principaux par client
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_collaborators_unique_primary_per_client 
ON public.collaborators (client_id) 
WHERE is_primary = true;

-- Ajouter une contrainte pour s'assurer qu'elle est respectée
ALTER TABLE public.collaborators 
ADD CONSTRAINT collaborators_unique_primary_per_client 
UNIQUE USING INDEX idx_collaborators_unique_primary_per_client;