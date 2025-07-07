-- Mise à jour des scores manquants pour les offres avec statuts d'approbation
UPDATE public.offers 
SET internal_score = 'A'
WHERE workflow_status = 'internal_approved' 
AND internal_score IS NULL;

UPDATE public.offers 
SET leaser_score = 'A'
WHERE workflow_status = 'leaser_approved' 
AND leaser_score IS NULL;

UPDATE public.offers 
SET internal_score = 'B'
WHERE workflow_status = 'internal_docs_requested' 
AND internal_score IS NULL;

UPDATE public.offers 
SET leaser_score = 'B'
WHERE workflow_status = 'leaser_docs_requested' 
AND leaser_score IS NULL;

UPDATE public.offers 
SET internal_score = 'C'
WHERE workflow_status = 'internal_rejected' 
AND internal_score IS NULL;

UPDATE public.offers 
SET leaser_score = 'C'
WHERE workflow_status = 'leaser_rejected' 
AND leaser_score IS NULL;