-- Ajouter les colonnes pour les scores séparés dans la table offers
ALTER TABLE public.offers 
ADD COLUMN internal_score text DEFAULT NULL,
ADD COLUMN leaser_score text DEFAULT NULL;

-- Ajouter une colonne pour identifier qui a demandé les documents
ALTER TABLE public.offer_documents 
ADD COLUMN requested_by text DEFAULT 'internal';

-- Mettre à jour les scores existants selon le workflow_status actuel
UPDATE public.offers 
SET internal_score = CASE 
  WHEN workflow_status IN ('internal_approved', 'leaser_review', 'leaser_approved', 'leaser_docs_requested', 'validated', 'contract_sent') THEN 'A'
  WHEN workflow_status = 'internal_docs_requested' THEN 'B'
  WHEN workflow_status = 'internal_rejected' THEN 'C'
  ELSE NULL
END;

UPDATE public.offers 
SET leaser_score = CASE 
  WHEN workflow_status IN ('leaser_approved', 'validated', 'contract_sent') THEN 'A'
  WHEN workflow_status = 'leaser_docs_requested' THEN 'B'
  WHEN workflow_status = 'leaser_rejected' THEN 'C'
  ELSE NULL
END;

-- Mettre à jour les documents existants pour indiquer qui les a demandés
UPDATE public.offer_documents 
SET requested_by = CASE 
  WHEN offer_id IN (
    SELECT id FROM public.offers 
    WHERE workflow_status IN ('internal_docs_requested', 'internal_review')
  ) THEN 'internal'
  WHEN offer_id IN (
    SELECT id FROM public.offers 
    WHERE workflow_status IN ('leaser_docs_requested', 'leaser_review')
  ) THEN 'leaser'
  ELSE 'internal'
END;