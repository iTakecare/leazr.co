-- Ajouter la colonne sub_reason aux logs de workflow
ALTER TABLE public.offer_workflow_logs 
ADD COLUMN IF NOT EXISTS sub_reason TEXT;

-- Ajouter un commentaire descriptif
COMMENT ON COLUMN public.offer_workflow_logs.sub_reason IS 
  'Sous-raison pour les statuts without_follow_up (no_response, project_postponed, went_competitor, budget_issue, project_cancelled, other)';